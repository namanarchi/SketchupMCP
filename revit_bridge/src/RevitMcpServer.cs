using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using Autodesk.Revit.DB;
using Autodesk.Revit.UI;

namespace RevitMCPBridge
{
    public class RevitMcpServer
    {
        public const int PORT = 9877;
        private HttpListener _listener;
        private bool _isRunning = false;
        private readonly RevitMcpHandler _handler;
        private readonly ExternalEvent _externalEvent;
        private readonly JavaScriptSerializer _serializer = new JavaScriptSerializer();

        public bool IsRunning
        {
            get { return _isRunning; }
        }

        public RevitMcpServer(RevitMcpHandler handler, ExternalEvent externalEvent)
        {
            _handler = handler;
            _externalEvent = externalEvent;
        }

        public void Start()
        {
            if (_isRunning) return;

            try
            {
                _listener = new HttpListener();
                _listener.Prefixes.Add(string.Format("http://127.0.0.1:{0}/", PORT));
                _listener.Start();
                _isRunning = true;
                Task.Run((Action)ListenLoop);
            }
            catch (Exception ex)
            {
                _isRunning = false;
                TaskDialog.Show("Revit MCP Server", "Lỗi khởi động Server: " + ex.Message);
            }
        }

        public void Stop()
        {
            _isRunning = false;
            try
            {
                if (_listener != null)
                {
                    _listener.Stop();
                    _listener.Close();
                }
            }
            catch { }
        }

        private async void ListenLoop()
        {
            while (_isRunning && _listener != null && _listener.IsListening)
            {
                try
                {
                    var context = await _listener.GetContextAsync();
                    ProcessRequest(context);
                }
                catch (HttpListenerException) { break; }
                catch (Exception) { }
            }
        }

        private async void ProcessRequest(HttpListenerContext context)
        {
            var req = context.Request;
            var res = context.Response;

            res.Headers.Add("Access-Control-Allow-Origin", "*");
            res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.Headers.Add("Access-Control-Allow-Headers", "Content-Type");

            if (req.HttpMethod == "OPTIONS")
            {
                res.StatusCode = 200;
                res.Close();
                return;
            }

            string path = req.Url.AbsolutePath.ToLower().TrimEnd('/');
            string body = "";
            if (req.HasEntityBody)
            {
                using (var reader = new StreamReader(req.InputStream, req.ContentEncoding))
                {
                    body = await reader.ReadToEndAsync();
                }
            }

            try
            {
                object resultData = await RouteRequestAsync(req.HttpMethod, path, body);
                SendJsonResponse(res, 200, new { success = true, result = resultData });
            }
            catch (Exception ex)
            {
                SendJsonResponse(res, 500, new { success = false, error = ex.Message, stack = ex.StackTrace });
            }
        }

        private Task<object> RouteRequestAsync(string method, string path, string body)
        {
            Dictionary<string, object> payload = new Dictionary<string, object>();
            if (!string.IsNullOrEmpty(body))
            {
                try { payload = _serializer.Deserialize<Dictionary<string, object>>(body) ?? new Dictionary<string, object>(); }
                catch { }
            }

            switch (path)
            {
                case "":
                case "/health":
                case "/status":
                    return ExecuteInRevit(app => HandleGetStatus(app));

                case "/api/floor":
                    return ExecuteInRevit(app => HandleCreateFloor(app, payload));

                case "/api/wall":
                    return ExecuteInRevit(app => HandleCreateWall(app, payload));

                case "/api/level":
                    return ExecuteInRevit(app => HandleCreateLevel(app, payload));

                case "/api/grid":
                    return ExecuteInRevit(app => HandleCreateGrid(app, payload));

                case "/api/view":
                    return ExecuteInRevit(app => HandleViewControl(app, payload));

                default:
                    throw new Exception(string.Format("Endpoint không tồn tại: {0}", path));
            }
        }

        private Task<object> ExecuteInRevit(Func<UIApplication, object> action)
        {
            var task = _handler.EnqueueTask(action);
            _externalEvent.Raise();
            return task;
        }

        private void SendJsonResponse(HttpListenerResponse res, int statusCode, object data)
        {
            try
            {
                string json = _serializer.Serialize(data);
                byte[] bytes = Encoding.UTF8.GetBytes(json);
                res.StatusCode = statusCode;
                res.ContentType = "application/json; charset=utf-8";
                res.ContentLength64 = bytes.Length;
                res.OutputStream.Write(bytes, 0, bytes.Length);
            }
            catch { }
            finally
            {
                try { res.Close(); } catch { }
            }
        }

        // ================= HANDLERS TRÊN MAIN UI THREAD CỦA REVIT =================

        private object HandleGetStatus(UIApplication uiapp)
        {
            var doc = uiapp.ActiveUIDocument != null ? uiapp.ActiveUIDocument.Document : null;
            if (doc == null)
            {
                return new { status = "ready", document_open = false, message = "Chưa có dự án Revit nào đang mở." };
            }

            var levels = new FilteredElementCollector(doc)
                .OfClass(typeof(Level))
                .Cast<Level>()
                .OrderBy(l => l.Elevation)
                .Select(l => new { id = l.Id.IntegerValue, name = l.Name, elevation_mm = Math.Round(RevitGeometryHelper.ToMm(l.Elevation), 1) })
                .ToList();

            var floorTypes = new FilteredElementCollector(doc)
                .OfClass(typeof(FloorType))
                .Cast<FloorType>()
                .Select(ft => ft.Name)
                .Take(10)
                .ToList();

            var activeView = doc.ActiveView;

            return new
            {
                status = "ready",
                document_open = true,
                project_title = doc.Title,
                file_path = doc.PathName,
                active_view = activeView != null ? activeView.Name : "None",
                view_type = activeView != null ? activeView.ViewType.ToString() : "None",
                levels = levels,
                sample_floor_types = floorTypes,
                revit_version = uiapp.Application.VersionNumber
            };
        }

        private object HandleCreateFloor(UIApplication uiapp, Dictionary<string, object> payload)
        {
            var uidoc = uiapp.ActiveUIDocument;
            var doc = uidoc != null ? uidoc.Document : null;
            if (doc == null) throw new Exception("Không tìm thấy Document Revit đang hoạt động.");

            // Lấy danh sách điểm 2D
            if (!payload.ContainsKey("points")) throw new Exception("Thiếu tham số 'points' (mảng các điểm [[x,y], ...]).");
            var rawPoints = payload["points"] as System.Collections.ArrayList;
            if (rawPoints == null || rawPoints.Count < 3) throw new Exception("Cần tối thiểu 3 điểm để tạo đường bao sàn.");

            var pointsList = new List<IList<double>>();
            foreach (var pt in rawPoints)
            {
                var arr = pt as System.Collections.ArrayList;
                if (arr != null && arr.Count >= 2)
                {
                    double x = Convert.ToDouble(arr[0]);
                    double y = Convert.ToDouble(arr[1]);
                    pointsList.Add(new double[] { x, y });
                }
            }

            string levelName = payload.ContainsKey("level") && payload["level"] != null ? payload["level"].ToString() : "Level 1";
            string floorTypeName = payload.ContainsKey("floor_type") && payload["floor_type"] != null ? payload["floor_type"].ToString() : null;
            bool structural = payload.ContainsKey("structural") ? Convert.ToBoolean(payload["structural"]) : true;

            Floor createdFloor = null;

            using (var tx = new Transaction(doc, "Antigravity AI Tạo Sàn Native"))
            {
                tx.Start();

                var level = RevitGeometryHelper.FindOrCreateLevel(doc, levelName);
                var floorType = RevitGeometryHelper.FindFloorType(doc, floorTypeName);
                var curveArray = RevitGeometryHelper.PointsToCurveArray(pointsList, RevitGeometryHelper.ToMm(level.Elevation));

                if (floorType != null)
                {
                    createdFloor = doc.Create.NewFloor(curveArray, floorType, level, structural);
                }
                else
                {
                    createdFloor = doc.Create.NewFloor(curveArray, structural);
                }

                tx.Commit();
            }

            double areaSqM = 0;
            var areaParam = createdFloor.get_Parameter(BuiltInParameter.HOST_AREA_COMPUTED);
            if (areaParam != null)
            {
                areaSqM = Math.Round(areaParam.AsDouble() * 0.092903, 2);
            }

            return new
            {
                success = true,
                floor_id = createdFloor.Id.IntegerValue,
                level = levelName,
                floor_type = createdFloor.FloorType.Name,
                area_m2 = areaSqM,
                message = string.Format("Đã tạo thành công Sàn Bê Tông Native 100% trong Revit (Id: {0}, Diện tích: {1} m²)", createdFloor.Id.IntegerValue, areaSqM)
            };
        }

        private object HandleCreateWall(UIApplication uiapp, Dictionary<string, object> payload)
        {
            var uidoc = uiapp.ActiveUIDocument;
            var doc = uidoc != null ? uidoc.Document : null;
            if (doc == null) throw new Exception("Không tìm thấy Document Revit đang mở.");

            var rawStart = payload["start"] as System.Collections.ArrayList;
            var rawEnd = payload["end"] as System.Collections.ArrayList;
            if (rawStart == null || rawEnd == null) throw new Exception("Cần cung cấp điểm 'start' [x, y] và 'end' [x, y] (mm).");

            double x1 = Convert.ToDouble(rawStart[0]);
            double y1 = Convert.ToDouble(rawStart[1]);
            double x2 = Convert.ToDouble(rawEnd[0]);
            double y2 = Convert.ToDouble(rawEnd[1]);
            double heightMm = payload.ContainsKey("height") ? Convert.ToDouble(payload["height"]) : 2800.0;
            string levelName = payload.ContainsKey("level") && payload["level"] != null ? payload["level"].ToString() : "Level 1";
            string wallTypeName = payload.ContainsKey("wall_type") && payload["wall_type"] != null ? payload["wall_type"].ToString() : null;

            Wall createdWall = null;

            using (var tx = new Transaction(doc, "Antigravity AI Tạo Tường Native"))
            {
                tx.Start();

                var level = RevitGeometryHelper.FindOrCreateLevel(doc, levelName);
                var wallType = RevitGeometryHelper.FindWallType(doc, wallTypeName);

                XYZ p1 = RevitGeometryHelper.PointToXyz(x1, y1, RevitGeometryHelper.ToMm(level.Elevation));
                XYZ p2 = RevitGeometryHelper.PointToXyz(x2, y2, RevitGeometryHelper.ToMm(level.Elevation));
                Line line = Line.CreateBound(p1, p2);

                if (wallType != null)
                {
                    createdWall = Wall.Create(doc, line, wallType.Id, level.Id, RevitGeometryHelper.ToFeet(heightMm), 0, false, false);
                }
                else
                {
                    createdWall = Wall.Create(doc, line, level.Id, false);
                }

                tx.Commit();
            }

            return new
            {
                success = true,
                wall_id = createdWall.Id.IntegerValue,
                length_m = Math.Round(createdWall.get_Parameter(BuiltInParameter.CURVE_ELEM_LENGTH).AsDouble() * 0.3048, 2),
                level = levelName,
                wall_type = createdWall.WallType.Name
            };
        }

        private object HandleCreateLevel(UIApplication uiapp, Dictionary<string, object> payload)
        {
            var uidoc = uiapp.ActiveUIDocument;
            var doc = uidoc != null ? uidoc.Document : null;
            if (doc == null) throw new Exception("Không có dự án đang mở.");

            string name = payload["name"] != null ? payload["name"].ToString() : null;
            double elevMm = Convert.ToDouble(payload["elevation"]);

            Level level = null;
            using (var tx = new Transaction(doc, "Antigravity AI Tạo Level"))
            {
                tx.Start();
                level = RevitGeometryHelper.FindOrCreateLevel(doc, name, elevMm);
                tx.Commit();
            }

            return new
            {
                success = true,
                level_id = level.Id.IntegerValue,
                name = level.Name,
                elevation_mm = Math.Round(RevitGeometryHelper.ToMm(level.Elevation), 1)
            };
        }

        private object HandleCreateGrid(UIApplication uiapp, Dictionary<string, object> payload)
        {
            var uidoc = uiapp.ActiveUIDocument;
            var doc = uidoc != null ? uidoc.Document : null;
            if (doc == null) throw new Exception("Không có dự án đang mở.");

            var rawStart = payload["start"] as System.Collections.ArrayList;
            var rawEnd = payload["end"] as System.Collections.ArrayList;
            string name = payload.ContainsKey("name") && payload["name"] != null ? payload["name"].ToString() : null;

            double x1 = Convert.ToDouble(rawStart[0]);
            double y1 = Convert.ToDouble(rawStart[1]);
            double x2 = Convert.ToDouble(rawEnd[0]);
            double y2 = Convert.ToDouble(rawEnd[1]);

            Grid grid = null;
            using (var tx = new Transaction(doc, "Antigravity AI Tạo Grid"))
            {
                tx.Start();
                XYZ p1 = RevitGeometryHelper.PointToXyz(x1, y1);
                XYZ p2 = RevitGeometryHelper.PointToXyz(x2, y2);
                Line line = Line.CreateBound(p1, p2);
                grid = Grid.Create(doc, line);
                if (!string.IsNullOrEmpty(name))
                {
                    try { grid.Name = name; } catch { }
                }
                tx.Commit();
            }

            return new
            {
                success = true,
                grid_id = grid.Id.IntegerValue,
                name = grid.Name
            };
        }

        private object HandleViewControl(UIApplication uiapp, Dictionary<string, object> payload)
        {
            var uidoc = uiapp.ActiveUIDocument;
            if (uidoc == null) throw new Exception("Không có cửa sổ view đang mở.");

            string action = payload.ContainsKey("action") && payload["action"] != null ? payload["action"].ToString() : "zoom_extents";

            if (action == "zoom_extents")
            {
                var uiview = uidoc.GetOpenUIViews().FirstOrDefault(v => v.ViewId == uidoc.ActiveView.Id);
                if (uiview != null)
                {
                    uiview.ZoomToFit();
                }
            }

            return new { success = true, action = action, view = uidoc.ActiveView.Name };
        }
    }
}

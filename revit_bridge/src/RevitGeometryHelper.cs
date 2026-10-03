using System;
using System.Collections.Generic;
using System.Linq;
using Autodesk.Revit.DB;

namespace RevitMCPBridge
{
    public static class RevitGeometryHelper
    {
        public const double MM_TO_FEET = 1.0 / 304.8;
        public const double FEET_TO_MM = 304.8;

        public static double ToFeet(double mm)
        {
            return mm * MM_TO_FEET;
        }

        public static double ToMm(double feet)
        {
            return feet * FEET_TO_MM;
        }

        public static XYZ PointToXyz(double xMm, double yMm, double zMm = 0.0)
        {
            return new XYZ(ToFeet(xMm), ToFeet(yMm), ToFeet(zMm));
        }

        public static Level FindOrCreateLevel(Document doc, string name, double elevationMm = 0.0)
        {
            var collector = new FilteredElementCollector(doc).OfClass(typeof(Level)).Cast<Level>();
            var existing = collector.FirstOrDefault(l => l.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
            if (existing != null) return existing;

            double elevFeet = ToFeet(elevationMm);
            Level newLevel = Level.Create(doc, elevFeet);
            if (!string.IsNullOrEmpty(name))
            {
                try { newLevel.Name = name; } catch { }
            }
            return newLevel;
        }

        public static FloorType FindFloorType(Document doc, string typeName = null)
        {
            var collector = new FilteredElementCollector(doc).OfClass(typeof(FloorType)).Cast<FloorType>();
            if (!string.IsNullOrEmpty(typeName))
            {
                var match = collector.FirstOrDefault(ft => ft.Name.IndexOf(typeName, StringComparison.OrdinalIgnoreCase) >= 0);
                if (match != null) return match;
            }
            return collector.FirstOrDefault();
        }

        public static WallType FindWallType(Document doc, string typeName = null)
        {
            var collector = new FilteredElementCollector(doc).OfClass(typeof(WallType)).Cast<WallType>();
            if (!string.IsNullOrEmpty(typeName))
            {
                var match = collector.FirstOrDefault(wt => wt.Name.IndexOf(typeName, StringComparison.OrdinalIgnoreCase) >= 0);
                if (match != null) return match;
            }
            return collector.FirstOrDefault(wt => wt.Kind == WallKind.Basic);
        }

        public static CurveArray PointsToCurveArray(IList<IList<double>> points, double zMm = 0.0)
        {
            var curveArray = new CurveArray();
            if (points == null || points.Count < 3)
            {
                throw new ArgumentException("Chu vi sàn yêu cầu tối thiểu 3 điểm tọa độ 2D.");
            }

            int count = points.Count;
            for (int i = 0; i < count; i++)
            {
                int next = (i + 1) % count;
                XYZ p1 = PointToXyz(points[i][0], points[i][1], zMm);
                XYZ p2 = PointToXyz(points[next][0], points[next][1], zMm);

                if (p1.DistanceTo(p2) > 0.001) // Tránh đoạn thẳng vi mô trùng điểm
                {
                    Line line = Line.CreateBound(p1, p2);
                    curveArray.Append(line);
                }
            }

            return curveArray;
        }
    }
}

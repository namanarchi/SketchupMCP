using System;
using System.Reflection;
using Autodesk.Revit.Attributes;
using Autodesk.Revit.DB;
using Autodesk.Revit.UI;

namespace RevitMCPBridge
{
    [Transaction(TransactionMode.Manual)]
    [Regeneration(RegenerationOption.Manual)]
    public class RevitApp : IExternalApplication
    {
        private static RevitMcpHandler _handler;
        private static ExternalEvent _externalEvent;
        private static RevitMcpServer _server;

        public Result OnStartup(UIControlledApplication application)
        {
            try
            {
                // 1. Khởi tạo External Event Handler để dispatch lệnh an toàn vào Main UI Thread
                _handler = new RevitMcpHandler();
                _externalEvent = ExternalEvent.Create(_handler);

                // 2. Khởi động HTTP Server trên Port 9877
                _server = new RevitMcpServer(_handler, _externalEvent);
                _server.Start();

                // 3. Tạo Ribbon Tab & Panel trên giao diện Revit 2020
                string tabName = "Antigravity MCP";
                try { application.CreateRibbonTab(tabName); } catch { }

                RibbonPanel panel = null;
                try { panel = application.CreateRibbonPanel(tabName, "Bridge Server"); } catch { }
                if (panel == null)
                {
                    panel = application.CreateRibbonPanel("Bridge Server");
                }

                string assemblyPath = Assembly.GetExecutingAssembly().Location;
                PushButtonData buttonData = new PushButtonData(
                    "BtnMcpStatus",
                    "MCP Server\nStatus (9877)",
                    assemblyPath,
                    "RevitMCPBridge.RevitMcpStatusCommand"
                )
                {
                    ToolTip = "Kiểm tra trạng thái kết nối Antigravity Revit MCP Bridge Server trên cổng 9877."
                };

                panel.AddItem(buttonData);

                return Result.Succeeded;
            }
            catch (Exception ex)
            {
                TaskDialog.Show("Antigravity MCP", "Lỗi khởi động Revit MCP Bridge: " + ex.Message);
                return Result.Failed;
            }
        }

        public Result OnShutdown(UIControlledApplication application)
        {
            if (_server != null)
            {
                _server.Stop();
            }
            return Result.Succeeded;
        }

        public static RevitMcpServer ServerInstance
        {
            get { return _server; }
        }
    }

    [Transaction(TransactionMode.Manual)]
    public class RevitMcpStatusCommand : IExternalCommand
    {
        public Result Execute(ExternalCommandData commandData, ref string message, ElementSet elements)
        {
            bool isRunning = RevitApp.ServerInstance != null && RevitApp.ServerInstance.IsRunning;
            string status = isRunning
                ? "ĐANG CHẠY (Ready trên http://127.0.0.1:9877/)"
                : "ĐÃ DỪNG";

            string msg = string.Format(
                "Trạng thái máy chủ: {0}\n\n" +
                "AI Agent Antigravity có thể giao tiếp hai chiều thời gian thực với Revit 2020 để tự động hóa mô hình BIM.",
                status);

            TaskDialog.Show("Antigravity Revit MCP Bridge", msg);

            return Result.Succeeded;
        }
    }
}

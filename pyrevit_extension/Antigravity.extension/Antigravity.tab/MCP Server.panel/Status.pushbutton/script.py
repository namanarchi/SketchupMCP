# -*- coding: utf-8 -*-
import sys
import os

current_dir = os.path.dirname(__file__)
ext_dir = os.path.abspath(os.path.join(current_dir, '..', '..', '..'))
lib_dir = os.path.join(ext_dir, 'lib')
if lib_dir not in sys.path:
    sys.path.insert(0, lib_dir)

import clr
clr.AddReference('RevitAPI')
clr.AddReference('RevitAPIUI')
from Autodesk.Revit.UI import TaskDialog

from antigravity_bridge.server import get_server

server = get_server()
status_str = "ĐANG CHẠY trên cổng 9878" if server.is_running else "ĐÃ DỪNG"

doc = __revit__.ActiveUIDocument.Document if __revit__.ActiveUIDocument else None
doc_info = "Chưa có dự án nào đang mở" if not doc else "{0} ({1})".format(doc.Title, doc.PathName or "Chưa lưu")

msg = (
    "=== TRẠNG THÁI ANTIGRAVITY MCP BRIDGE ===\n\n"
    "• Trạng thái máy chủ: {0}\n"
    "• Địa chỉ API: http://127.0.0.1:9878/\n"
    "• Dự án đang mở: {1}\n"
    "• Phiên bản Revit: {2}\n\n"
    "AI Agent Antigravity sẵn sàng nhận lệnh Python để tự động hóa dựng hình 100% chi tiết!"
).format(status_str, doc_info, __revit__.Application.VersionNumber)

TaskDialog.Show("Antigravity pyRevit MCP Status", msg)

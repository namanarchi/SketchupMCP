# -*- coding: utf-8 -*-
import sys
import os

current_dir = os.path.dirname(__file__)
ext_dir = os.path.abspath(os.path.join(current_dir, '..', '..', '..'))
lib_dir = os.path.join(ext_dir, 'lib')
if lib_dir not in sys.path:
    sys.path.insert(0, lib_dir)

import clr
clr.AddReference('RevitAPIUI')
from Autodesk.Revit.UI import ExternalEvent, TaskDialog

from antigravity_bridge.server import get_server

server = get_server()
if not server.is_running:
    try:
        ext_event = ExternalEvent.Create(server.handler)
        server.handler.set_external_event(ext_event)
        started = server.start()
        if started:
            TaskDialog.Show("Antigravity MCP Bridge",
                            "Máy chủ Antigravity MCP đã khởi động thành công trên cổng 9878!\n\n"
                            "AI Agent có thể thực thi lệnh Python động và dựng hình Revit từ xa.")
        else:
            TaskDialog.Show("Antigravity MCP Bridge", "Không thể khởi động máy chủ trên cổng 9878.")
    except Exception as ex:
        TaskDialog.Show("Lỗi", "Lỗi khởi động: {0}".format(ex))
else:
    TaskDialog.Show("Antigravity MCP Bridge", "Máy chủ đã ĐANG CHẠY trên cổng 9878!")

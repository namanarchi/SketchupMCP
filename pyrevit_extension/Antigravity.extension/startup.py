# -*- coding: utf-8 -*-
"""
Tập tin khởi động tự động khi Autodesk Revit nạp pyRevit (startup.py)
Tự động đăng ký ExternalEvent và kích hoạt HTTP Server trên Port 9878
"""

import sys
import os

# Đưa thư mục lib vào sys.path để có thể import antigravity_bridge
current_dir = os.path.dirname(__file__)
lib_dir = os.path.join(current_dir, 'lib')
if lib_dir not in sys.path:
    sys.path.insert(0, lib_dir)

import clr
clr.AddReference('RevitAPIUI')
from Autodesk.Revit.UI import ExternalEvent

try:
    from antigravity_bridge.server import get_server

    server = get_server()
    ext_event = ExternalEvent.Create(server.handler)
    server.handler.set_external_event(ext_event)
    started = server.start()
    if started:
        print("[Antigravity MCP Bridge] Server tu dong khoi dong thanh cong tren Port 9878.")
    else:
        print("[Antigravity MCP Bridge] Chua the khoi dong HTTP Listener tren Port 9878.")
except Exception as ex:
    print("[Antigravity MCP Bridge] Khoi dong that bai: {0}".format(ex))

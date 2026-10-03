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
from Autodesk.Revit.UI import TaskDialog

from antigravity_bridge.server import get_server

server = get_server()
if server.is_running:
    server.stop()
    TaskDialog.Show("Antigravity MCP Bridge", "Máy chủ Antigravity MCP (Port 9878) đã DỪNG.")
else:
    TaskDialog.Show("Antigravity MCP Bridge", "Máy chủ hiện chưa chạy.")

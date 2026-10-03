# -*- coding: utf-8 -*-
"""
Máy chủ HTTP MCP Bridge cho pyRevit (Port 9878)
Sử dụng System.Net.HttpListener (.NET Framework) đảm bảo ổn định tuyệt đối trên Revit 2020
"""

import sys
import json
import threading
import traceback
import clr
clr.AddReference('System')
from System.Net import HttpListener, HttpListenerException
from System.IO import StreamReader
from System.Text import Encoding

from .executor import McpExternalEventHandler
from .bim_builder import get_document_summary

PORT = 9878
_server_instance = None


class McpBridgeServer(object):
    def __init__(self, port=PORT):
        self.port = port
        self._listener = None
        self._thread = None
        self._is_running = False
        self.handler = McpExternalEventHandler()

    @property
    def is_running(self):
        return self._is_running

    def start(self):
        if self._is_running:
            return True

        try:
            self._listener = HttpListener()
            self._listener.Prefixes.Add("http://127.0.0.1:{0}/".format(self.port))
            self._listener.Prefixes.Add("http://localhost:{0}/".format(self.port))
            self._listener.Start()
            self._is_running = True

            self._thread = threading.Thread(target=self._listen_loop)
            self._thread.daemon = True
            self._thread.start()
            print("[OK] Antigravity pyRevit MCP Bridge da khoi dong tren cong {0}".format(self.port))
            return True
        except Exception as ex:
            self._is_running = False
            print("[!] Loi khoi dong MCP Server tren port {0}: {1}".format(self.port, ex))
            return False

    def stop(self):
        self._is_running = False
        if self._listener:
            try:
                self._listener.Stop()
                self._listener.Close()
            except Exception:
                pass
            self._listener = None
        print("[INFO] Antigravity pyRevit MCP Bridge da dung.")

    def _listen_loop(self):
        while self._is_running and self._listener and self._listener.IsListening:
            try:
                context = self._listener.GetContext()
                # Xử lý request trong thread pool hoặc luồng độc lập
                req_thread = threading.Thread(target=self._process_request, args=(context,))
                req_thread.daemon = True
                req_thread.start()
            except HttpListenerException:
                break
            except Exception as ex:
                if not self._is_running:
                    break

    def _process_request(self, context):
        req = context.Request
        res = context.Response

        # Thêm Header CORS cho phép kết nối từ Node.js MCP Server & Browser
        res.Headers.Add("Access-Control-Allow-Origin", "*")
        res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        res.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

        if req.HttpMethod == "OPTIONS":
            res.StatusCode = 200
            res.Close()
            return

        path = req.Url.AbsolutePath.lower().rstrip('/')
        body_text = ""
        if req.HasEntityBody:
            reader = StreamReader(req.InputStream, req.ContentEncoding)
            body_text = reader.ReadToEnd()
            reader.Close()

        try:
            res_payload = self._route(req.HttpMethod, path, body_text)
            self._send_json(res, 200, res_payload)
        except Exception as ex:
            err_payload = {
                "success": False,
                "error": str(ex),
                "traceback": traceback.format_exc()
            }
            self._send_json(res, 500, err_payload)

    def _route(self, method, path, body_text):
        payload = {}
        if body_text:
            try:
                payload = json.loads(body_text)
            except Exception:
                pass

        if path in ("", "/health", "/status"):
            # Chạy qua handler để lấy thông tin tài liệu trên UI thread an toàn
            task = {
                "action": "execute_python",
                "script": "__result__ = bim.get_document_summary(doc, uiapp)",
                "auto_transaction": False
            }
            exec_res = self.handler.queue_task(task, timeout_sec=15)
            if exec_res.get("success") and exec_res.get("result"):
                return exec_res.get("result")
            return {
                "status": "ready",
                "bridge": "pyRevit MCP Bridge (Port {0})".format(self.port),
                "is_running": self._is_running,
                "details": exec_res
            }

        elif path == "/api/execute_python":
            if "script" not in payload:
                raise Exception("Thiếu trường 'script' trong payload JSON.")
            task = {
                "action": "execute_python",
                "script": payload.get("script"),
                "transaction_name": payload.get("transaction_name", "Antigravity Python MCP"),
                "auto_transaction": payload.get("auto_transaction", True)
            }
            timeout = int(payload.get("timeout", 60))
            return self.handler.queue_task(task, timeout_sec=timeout)

        elif path == "/api/materials":
            # Tạo hàng loạt vật liệu từ danh sách
            mats = payload.get("materials", [])
            script = """
created = []
for m in {materials}:
    name = m.get('name')
    rgb = m.get('rgb', [71, 97, 240])
    trans = m.get('transparency', 0)
    shin = m.get('shininess', 50)
    mat = bim.get_or_create_material(doc, name, rgb, trans, shin)
    if mat:
        created.append(mat.Name)
__result__ = {{"created_materials": created}}
""".format(materials=repr(mats))
            task = {
                "action": "execute_python",
                "script": script,
                "transaction_name": "Tạo Bảng Vật Liệu Dự Án",
                "auto_transaction": True
            }
            return self.handler.queue_task(task, timeout_sec=30)

        elif path == "/api/levels_grids":
            levels = payload.get("levels", [])
            grids = payload.get("grids", [])
            script = """
created_levels = []
for l in {levels}:
    lvl = bim.get_or_create_level(doc, l['name'], l['elevation_mm'])
    created_levels.append(lvl.Name)

created_grids = []
for g in {grids}:
    grd = bim.create_grid(doc, g['name'], g['start'], g['end'])
    created_grids.append(grd.Name)

__result__ = {{"levels": created_levels, "grids": created_grids}}
""".format(levels=repr(levels), grids=repr(grids))
            task = {
                "action": "execute_python",
                "script": script,
                "transaction_name": "Tạo Mốc Cao Độ và Trục Dự Án",
                "auto_transaction": True
            }
            return self.handler.queue_task(task, timeout_sec=30)

        else:
            raise Exception("Endpoint khong hop le: {0}".format(path))

    def _send_json(self, res, status_code, data):
        try:
            json_str = json.dumps(data)
            bytes_data = Encoding.UTF8.GetBytes(json_str)
            res.StatusCode = status_code
            res.ContentType = "application/json; charset=utf-8"
            res.ContentLength64 = len(bytes_data)
            res.OutputStream.Write(bytes_data, 0, len(bytes_data))
        except Exception:
            pass
        finally:
            try:
                res.Close()
            except Exception:
                pass


def get_server():
    global _server_instance
    if _server_instance is None:
        _server_instance = McpBridgeServer()
    return _server_instance


def start_server():
    srv = get_server()
    return srv.start()


def stop_server():
    srv = get_server()
    srv.stop()

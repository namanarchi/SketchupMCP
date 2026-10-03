# -*- coding: utf-8 -*-
"""
Mô-đun thực thi lệnh Python an toàn trên Main UI Thread của Autodesk Revit
Sử dụng Revit API ExternalEvent để đảm bảo 100% Thread-Safety
"""

import sys
import traceback
import threading

try:
    from StringIO import StringIO  # Python 2 / IronPython
except ImportError:
    from io import StringIO        # Python 3

import clr
clr.AddReference('RevitAPI')
clr.AddReference('RevitAPIUI')
import Autodesk.Revit.DB as DB
import Autodesk.Revit.UI as UI
from Autodesk.Revit.UI import IExternalEventHandler, ExternalEvent

try:
    from pyrevit import revit, forms, script
except ImportError:
    revit = None
    forms = None
    script = None


class McpExternalEventHandler(IExternalEventHandler):
    """
    Handler thực thi mã Python trên Main Thread của Revit khi nhận được lệnh từ MCP Server.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._pending_task = None
        self._done_event = threading.Event()
        self._task_result = None

    def queue_task(self, task_payload, timeout_sec=60):
        """
        Đưa nhiệm vụ vào hàng đợi và chờ Main Thread của Revit hoàn thành.
        Gọi từ worker thread của HttpListener.
        """
        with self._lock:
            self._pending_task = task_payload
            self._done_event.clear()
            self._task_result = None

        # Kích hoạt sự kiện bên ngoài của Revit
        if hasattr(self, '_external_event') and self._external_event is not None:
            self._external_event.Raise()
        else:
            raise Exception("ExternalEvent chưa được khởi tạo!")

        # Chờ Revit xử lý xong
        finished = self._done_event.wait(timeout_sec)
        if not finished:
            return {
                "success": False,
                "error": "Timeout ({0}s) khi chờ Revit Main UI Thread xử lý lệnh.".format(timeout_sec),
                "output": ""
            }

        return self._task_result

    def set_external_event(self, ext_event):
        self._external_event = ext_event

    def Execute(self, uiapp):
        """
        Phương thức callback của Revit API - Chạy trực tiếp trên Main UI Thread!
        """
        task = self._pending_task
        if not task:
            self._done_event.set()
            return

        action_type = task.get("action", "execute_python")
        code_str = task.get("script", "")
        tx_name = task.get("transaction_name", "Antigravity MCP Python Action")
        auto_transaction = task.get("auto_transaction", True)

        uidoc = uiapp.ActiveUIDocument
        doc = uidoc.Document if uidoc else None
        app = uiapp.Application

        # Chuyển hướng stdout & stderr để thu lại toàn bộ output (print)
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        redirected_out = StringIO()
        redirected_err = StringIO()
        sys.stdout = redirected_out
        sys.stderr = redirected_err

        res_data = {
            "success": False,
            "output": "",
            "result": None,
            "error": None
        }

        try:
            # Xây dựng không gian biến toàn cục (Scope) chuẩn bị cho script
            from . import bim_builder

            scope = {
                '__name__': '__main__',
                '__revit__': uiapp,
                'uiapp': uiapp,
                'app': app,
                'uidoc': uidoc,
                'doc': doc,
                'DB': DB,
                'UI': UI,
                'revit': revit,
                'forms': forms,
                'script': script,
                'bim': bim_builder,
                'XYZ': DB.XYZ,
                'Point': DB.XYZ,
                'mm_to_feet': bim_builder.mm_to_feet,
                'feet_to_mm': bim_builder.feet_to_mm,
                'xyz_mm': bim_builder.xyz_mm,
                '__result__': None
            }

            # Kiểm tra xem có cần tự động bọc Transaction không
            if auto_transaction and doc and not doc.IsReadOnly:
                with DB.Transaction(doc, tx_name) as tx:
                    tx.Start()
                    exec(code_str, scope)
                    if tx.HasStarted() and not tx.HasEnded():
                        tx.Commit()
            else:
                exec(code_str, scope)

            res_data["success"] = True
            res_data["result"] = scope.get('__result__')

        except Exception as ex:
            res_data["success"] = False
            res_data["error"] = str(ex)
            res_data["traceback"] = traceback.format_exc()
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr
            res_data["output"] = redirected_out.getvalue()
            if redirected_err.getvalue():
                res_data["output"] += "\n[STDERR]: " + redirected_err.getvalue()

            self._task_result = res_data
            self._pending_task = None
            self._done_event.set()

    def GetName(self):
        return "AntigravityMcpHandler"

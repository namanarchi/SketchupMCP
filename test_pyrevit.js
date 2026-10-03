const { handleRevitTool, PYREVIT_BRIDGE_URL, CS_BRIDGE_URL } = require('./modules/revit');

async function testPyRevitBridge() {
  console.log('========================================================');
  console.log('  KIỂM TRA HỆ THỐNG KẾT NỐI ANTIGRAVITY PYREVIT BRIDGE  ');
  console.log('========================================================');
  console.log(`• pyRevit Bridge Target URL: ${PYREVIT_BRIDGE_URL}`);
  console.log(`• Revit C# Bridge Target URL: ${CS_BRIDGE_URL}`);
  console.log('--------------------------------------------------------');

  // 1. Kiểm tra trạng thái chung (revit_get_status)
  try {
    console.log('[1/2] Đang kiểm tra trạng thái máy chủ Revit...');
    const status = await handleRevitTool('revit_get_status', {});
    console.log('[OK] Đã kết nối thành công tới Revit Bridge!');
    console.log(JSON.stringify(status, null, 2));
  } catch (err) {
    console.log('[!] Máy chủ Revit hiện chưa mở hoặc chưa nạp add-in:');
    console.log('    ' + err.message.replace(/\n/g, '\n    '));
  }

  // 2. Thử nghiệm gửi lệnh Python (revit_execute_python)
  try {
    console.log('\n[2/2] Thử nghiệm thực thi lệnh Python qua pyRevit (Port 9878)...');
    const testScript = `
print(">>> XIN CHAO TU ANTIGRAVITY MCP BRIDGE! <<<")
print("Revit Version: " + str(app.VersionNumber))
if doc:
    print("Project: " + doc.Title)
else:
    print("No document is currently active.")
__result__ = {"status": "success", "engine": "pyRevit IronPython/CPython"}
`;
    const res = await handleRevitTool('revit_execute_python', {
      script: testScript,
      transaction_name: 'Antigravity Test Connection'
    });
    console.log('[OK] Kết quả thực thi Python:');
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.log('[!] Chưa thể gửi lệnh Python (Port 9878): ' + err.message);
  }

  console.log('--------------------------------------------------------');
  console.log('[INFO] Cấu trúc Antigravity.extension đã sẵn sàng tại:');
  console.log('  1. Workspace: pyrevit_extension/Antigravity.extension');
  console.log('  2. pyRevit Extensions: %APPDATA%\\pyRevit\\Extensions\\Antigravity.extension');
  console.log('========================================================');
}

testPyRevitBridge();

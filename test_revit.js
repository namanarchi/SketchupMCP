const { handleRevitTool } = require('./modules/revit');

async function testRevitConnection() {
  console.log('--- KIỂM TRA KẾT NỐI TỚI REVIT 2020 MCP BRIDGE (Port 9877) ---');
  try {
    const res = await handleRevitTool('revit_get_status', {});
    console.log('[OK] Đã kết nối thành công tới Revit 2020!');
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.log('[!] Chưa phát hiện máy chủ Revit chạy (Revit cần khởi động lại để nạp Add-in):');
    console.log(err.message);
  }
}

testRevitConnection();

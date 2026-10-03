const { handleRevitTool } = require('./modules/revit');

async function testCreateFloor() {
  console.log('--- GỬI LỆNH TỰ ĐỘNG TẠO SÀN NATIVE QUA REVIT MCP BRIDGE ---');
  try {
    // Tọa độ bãi gia công và kho bãi
    // Hãy thử tạo một sàn thử nghiệm hoặc sàn mẫu
    const res = await handleRevitTool('revit_create_floor', {
      points: [
        [30000, 30000],
        [50000, 30000],
        [50000, 45000],
        [30000, 45000]
      ],
      level: 'NỀN ĐẤT TỰ NHIÊN',
      structural: true
    });
    console.log('[THÀNH CÔNG] Kết quả từ Revit:');
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('[LỖI]', err.message);
  }
}

testCreateFloor();

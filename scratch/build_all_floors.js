const http = require('http');

function postRevit(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(payload), 'utf8');
    const req = http.request({
      hostname: '127.0.0.1',
      port: 9877,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': data.length
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ success: false, raw: body, error: e.message });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const floorsToCreate = [
  {
    name: "Sàn Bãi Gia Công Cốt Thép & Cốp Pha (70x8m)",
    points: [
      [10219.7, 152744.5],
      [74490.9, 125009.8],
      [77660.6, 132355.1],
      [13389.4, 160089.8]
    ]
  },
  {
    name: "Sàn Nền Ký Túc Xá 2 Tầng",
    points: [
      [128614.3, 58358.4],
      [135620.3, 62992.6],
      [111798.2, 99006.7],
      [104792.2, 94372.5]
    ]
  },
  {
    name: "Sàn Nền Cụm Nhà Ăn Cantin + Bếp + Kho",
    points: [
      [131331.9, 39556.7],
      [131331.9, 47956.7],
      [113255.1, 47956.7],
      [113255.1, 53856.7],
      [94191.1, 53856.7],
      [94191.1, 39556.7]
    ]
  },
  {
    name: "Sàn Nền Khu Vệ Sinh Nhà Tắm Nam",
    points: [
      [85791.1, 56856.7],
      [94191.1, 56856.7],
      [94191.1, 81461.7],
      [85791.1, 81461.7]
    ]
  },
  {
    name: "Sàn Nền Khu Vệ Sinh Nhà Tắm Nữ",
    points: [
      [85791.1, 86461.7],
      [94191.1, 86461.7],
      [94191.1, 99006.7],
      [85791.1, 99006.7]
    ]
  }
];

async function main() {
  console.log("=== BẮT ĐẦU TỰ ĐỘNG TẠO TOÀN BỘ SÀN NỀN BÊ TÔNG TRONG REVIT ===");
  const results = [];

  for (const f of floorsToCreate) {
    console.log(`\nĐang tạo: ${f.name}...`);
    const payload = {
      level: "NỀN ĐẤT TỰ NHIÊN",
      floor_type: "Generic Floor - 400mm",
      points: f.points,
      structural: true
    };
    const res = await postRevit('/api/floor', payload);
    if (res.success && res.result && res.result.success) {
      console.log(`-> THÀNH CÔNG: Floor ID = ${res.result.floor_id}, Diện tích = ${res.result.area_m2} m²`);
      results.push({ name: f.name, id: res.result.floor_id, area: res.result.area_m2, success: true });
    } else {
      console.log(`-> THẤT BẠI:`, res);
      results.push({ name: f.name, success: false, error: res });
    }
  }

  // Zoom extents in Revit 3D view
  await postRevit('/api/view', { action: 'zoom_extents' });
  console.log("\n=== TỔNG KẾT TẠO SÀN NỀN ===");
  console.table(results);
}

main();

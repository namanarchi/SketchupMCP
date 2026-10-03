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

async function main() {
  const c = {
    container_name: "Container_KTX_Cong_Nhan_3000x5900x2800",
    parent: "Day_Container_Tang_1_13_Can",
    level: "NỀN ĐẤT TỰ NHIÊN",
    height: 2800,
    corners: [
      [107542.8, 93794.0],
      [109197.9, 91291.9],
      [114139.6, 94560.7],
      [112484.5, 97062.8]
    ]
  };

  console.log("Creating 4 walls for 1 sample KTX container...");
  const corners = c.corners;
  for (let i = 0; i < 4; i++) {
    const p1 = corners[i];
    const p2 = corners[(i + 1) % 4];
    const wallRes = await postRevit('/api/wall', {
      level: c.level,
      start: p1,
      end: p2,
      height: c.height
    });
    console.log(`Wall ${i + 1}:`, wallRes.result ? `Id ${wallRes.result.wall_id}, Length ${wallRes.result.length_m}m` : wallRes);
  }
}

main();

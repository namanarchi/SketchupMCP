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
  const payload = {
    level: "NỀN ĐẤT TỰ NHIÊN",
    floor_type: "Generic Floor - 400mm",
    points: [
      [4220.0, 103007.0],
      [70220.0, 103007.0],
      [70220.0, 111007.0],
      [10220.0, 111007.0],
      [10220.0, 133007.0],
      [4220.0, 133007.0]
    ],
    structural: true
  };

  console.log("Posting floor 'Kho Vật Tư L-Shape' to Revit...");
  const res = await postRevit('/api/floor', payload);
  console.log("Revit Response:", JSON.stringify(res, null, 2));

  // Also call zoom_extents
  await postRevit('/api/view', { action: 'zoom_extents' });
}

main();

/**
 * Test script để kiểm tra kết nối với SketchUp 2025 Bridge
 */
const http = require('http');

async function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve) => {
    const postData = data ? JSON.stringify(data) : '';
    const req = http.request({
      hostname: '127.0.0.1',
      port: 9876,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 3000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ error: err.message, code: err.code });
    });

    if (postData) req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('--- KIỂM TRA KẾT NỐI TỚI SKETCHUP 2025 (Port 9876) ---');
  const health = await testEndpoint('/health');
  if (health.error) {
    console.log('[!] Chưa kết nối được:', health.error);
    console.log('[i] Gợi ý: Nếu SketchUp 2025 đang mở, mở Ruby Console (Window > Ruby Console) và chạy dòng:');
    console.log('    load "C:/Users/MAI KHANH/AppData/Roaming/SketchUp/SketchUp 2025/SketchUp/Plugins/sketchup_mcp_bridge.rb"');
    console.log('    Sau đó chạy lại script này: node test_client.js');
    return;
  }

  console.log('[OK] SketchUp 2025 đã kết nối thành công!');
  console.log(JSON.stringify(health.data, null, 2));

  console.log('\n--- THỰC THI THỬ LỆNH VẼ BOX 1000x1000x500mm ---');
  const drawRes = await testEndpoint('/api/geometry', 'POST', {
    type: 'box',
    name: 'Antigravity_Test_Box',
    width: 1000,
    depth: 1000,
    height: 500,
    x: 0,
    y: 0,
    z: 0
  });
  console.log('Kết quả vẽ:', drawRes);
}

main();

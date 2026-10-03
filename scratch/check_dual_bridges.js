const http = require('http');

function checkHttp(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 3000 }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ ok: true, data: JSON.parse(d) }); }
        catch { resolve({ ok: true, raw: d }); }
      });
    });
    req.on('error', e => resolve({ ok: false, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'Timeout' }); });
  });
}

async function main() {
  const skp = await checkHttp('http://127.0.0.1:9876/health');
  const rvt = await checkHttp('http://127.0.0.1:9877/health');

  console.log('--- TRẠNG THÁI KẾT NỐI HAI CẦU NỐI ---');
  console.log('1. SketchUp 2025 (Port 9876):', skp.ok ? 'ĐANG KẾT NỐI' : 'LỖI: ' + skp.error);
  if (skp.ok) console.log('   Model:', skp.data.model_title, '| Path:', skp.data.model_path);

  console.log('2. Revit 2020 (Port 9877):', rvt.ok ? 'ĐANG KẾT NỐI' : 'LỖI: ' + rvt.error);
  if (rvt.ok) console.log('   Project:', rvt.data.result.project_title, '| View:', rvt.data.result.active_view);
}

main();

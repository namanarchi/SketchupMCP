const http = require('http');

function callRuby(code) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ code });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 9876,
      path: '/execute',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  const ruby = `
model = Sketchup.active_model
kho = model.entities.find { |e| e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
ton = kho.entities.find { |e| e.name =~ /He_Ton_Mai/i }
xago = kho.entities.find { |e| e.name =~ /He_Xa_Go/i }

tb = ton.bounds
xb = xago.bounds

# Lấy 1 xà gồ cụ thể gần đỉnh nóc và mép eave
xg_top = xago.entities.find { |e| e.name =~ /Ngang_Nam_5/ }
xg_bot = xago.entities.find { |e| e.name =~ /Ngang_Nam_1/ }
mai_nam = ton.entities.find { |e| e.name =~ /Mai_Ngang_Doc_Nam/ }

{
  ton_bounds_z: [tb.min.z.to_mm.round(1), tb.max.z.to_mm.round(1)],
  xago_bounds_z: [xb.min.z.to_mm.round(1), xb.max.z.to_mm.round(1)],
  xg_top_z: [xg_top.bounds.min.z.to_mm.round(1), xg_top.bounds.max.z.to_mm.round(1)],
  xg_bot_z: [xg_bot.bounds.min.z.to_mm.round(1), xg_bot.bounds.max.z.to_mm.round(1)],
  mai_nam_z: [mai_nam.bounds.min.z.to_mm.round(1), mai_nam.bounds.max.z.to_mm.round(1)]
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== KIỂM TRA TIẾP XÚC MÁI TÔN & XÀ GỒ ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

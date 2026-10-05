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
m = ton.entities.find { |e| e.name =~ /Mai_Ngang_Doc_Nam/ }

bottom_face = m.entities.grep(Sketchup::Face).find { |f| f.normal.z < -0.9 }
pts = bottom_face.vertices.map { |v| [v.position.x.to_mm.round(1), v.position.y.to_mm.round(1), v.position.z.to_mm.round(1)] }

xg1 = xago.entities.find { |e| e.name =~ /Ngang_Nam_1/ }
xg5 = xago.entities.find { |e| e.name =~ /Ngang_Nam_5/ }

{
  bottom_face_vertices: pts,
  xg1_max_z: xg1.bounds.max.z.to_mm.round(1),
  xg5_max_z: xg5.bounds.max.z.to_mm.round(1)
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== ĐỈNH CỦA MẶT ĐÁY MÁI TÔN NAM ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

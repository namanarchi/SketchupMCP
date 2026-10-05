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
keo_group = kho.entities.find { |e| e.name =~ /He_Keo/i }
k1 = keo_group.entities.find { |e| e.name =~ /X15220/ }

faces_info = []
k1.entities.grep(Sketchup::Face).each_with_index do |f, i|
  pts = f.vertices.map { |v| [v.position.x.to_mm.round(1), v.position.y.to_mm.round(1), v.position.z.to_mm.round(1)] }
  faces_info << {
    face_idx: i,
    area_m2: (f.area * 0.00064516).round(3),
    normal: [f.normal.x.round(2), f.normal.y.round(2), f.normal.z.round(2)],
    pts: pts
  }
end

{
  truss_name: k1.name,
  face_count: faces_info.size,
  faces: faces_info
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("Truss:", parsed.truss_name, "Faces:", parsed.face_count);
    parsed.faces.forEach(f => {
      console.log(`Face ${f.face_idx} | normal: [${f.normal}] | pts count: ${f.pts.length}`);
      f.pts.forEach(p => console.log(`   [${p[0]}, ${p[1]}, ${p[2]}]`));
    });
  } else {
    console.error("Error:", res.error);
  }
}

main();

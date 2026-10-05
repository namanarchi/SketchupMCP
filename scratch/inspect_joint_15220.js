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
cot_group = kho.entities.find { |e| e.name =~ /He_Cot/i }
dam_group = kho.entities.find { |e| e.name =~ /He_Dam/i }
keo_group = kho.entities.find { |e| e.name =~ /He_Keo/i }

# Lấy 1 cột biên (Cot_Ngang_1), 1 cột giữa nóc (Cot_Ngang_2), dầm eave nam, dầm nóc ngang, kèo X15220
c1 = cot_group.entities.find { |e| e.name == "Cot_Ngang_1" }
c2 = cot_group.entities.find { |e| e.name == "Cot_Ngang_2" }
d_eave = dam_group.entities.find { |e| e.name =~ /Eave_Nam/i }
d_noc = dam_group.entities.find { |e| e.name =~ /Dinh_Noc_Ngang/i }
k1 = keo_group.entities.find { |e| e.name =~ /X15220/ }

def get_b(e)
  b = e.bounds
  {
    name: e.name,
    min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
    max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)],
    dim: [(b.max.x - b.min.x).to_mm.round(1), (b.max.y - b.min.y).to_mm.round(1), (b.max.z - b.min.z).to_mm.round(1)]
  }
end

{
  cot_bien_nam: get_b(c1),
  cot_giua_noc: get_b(c2),
  dam_eave_nam: get_b(d_eave),
  dam_noc_ngang: get_b(d_noc),
  keo_x15220: get_b(k1)
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== MỐI LIÊN KẾT TẠI TRỤC X=15220 (CỘT - DẦM - KÈO) ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

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
up_noc = ton.entities.find { |e| e.name =~ /Up_Noc/i }

up_noc_info = []
if up_noc
  up_noc.entities.each do |c|
    b = c.bounds
    up_noc_info << {
      name: c.name,
      class: c.class.to_s,
      min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
      max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)],
      dim: [(b.max.x - b.min.x).to_mm.round(1), (b.max.y - b.min.y).to_mm.round(1), (b.max.z - b.min.z).to_mm.round(1)]
    }
  end
end

# Kiểm tra vì kèo tại góc giao L:
keo = kho.entities.find { |e| e.name =~ /He_Keo/i }
keo_giao = keo.entities.find { |e| e.name =~ /Giao/i }

{
  up_noc_group_name: up_noc ? up_noc.name : "nil",
  up_noc_children: up_noc_info,
  keo_giao_chu_L: keo_giao ? {
    name: keo_giao.name,
    min: [keo_giao.bounds.min.x.to_mm.round(1), keo_giao.bounds.min.y.to_mm.round(1), keo_giao.bounds.min.z.to_mm.round(1)],
    max: [keo_giao.bounds.max.x.to_mm.round(1), keo_giao.bounds.max.y.to_mm.round(1), keo_giao.bounds.max.z.to_mm.round(1)],
    child_count: keo_giao.is_a?(Sketchup::Group) ? keo_giao.entities.count : 0
  } : nil
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== THÔNG TIN ÚP NÓC VÀ GIAO CHỮ L ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

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

overlaps = []
ton.entities.each do |t|
  xago.entities.each do |xg|
    ib = t.bounds.intersect(xg.bounds)
    if ib.valid? && ib.width.to_mm > 1 && ib.height.to_mm > 1 && ib.depth.to_mm > 1
      overlaps << {
        ton: t.name,
        xago: xg.name,
        overlap_depth_z: ib.depth.to_mm.round(1)
      }
    end
  end
end

{
  total_overlaps: overlaps.size,
  max_depth: overlaps.map { |o| o[:overlap_depth_z] }.max,
  sample: overlaps.first(5)
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== KIỂM TOÁN GIAO CẮT TÔN MÁI & XÀ GỒ ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

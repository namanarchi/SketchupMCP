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

info = []
keo_group.entities.each do |k|
  next unless k.is_a?(Sketchup::Group)
  sub_elements = []
  k.entities.each do |sub|
    if sub.is_a?(Sketchup::Group) || sub.is_a?(Sketchup::ComponentInstance)
      b = sub.bounds
      sub_elements << {
        name: sub.name,
        bounds_min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
        bounds_max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)],
        dim: [(b.max.x - b.min.x).to_mm.round(1), (b.max.y - b.min.y).to_mm.round(1), (b.max.z - b.min.z).to_mm.round(1)]
      }
    elsif sub.is_a?(Sketchup::Face)
      # Loose geometry?
      sub_elements << { type: "Loose Face" }
    end
  end
  kb = k.bounds
  info << {
    name: k.name,
    bounds: {
      min: [kb.min.x.to_mm.round(1), kb.min.y.to_mm.round(1), kb.min.z.to_mm.round(1)],
      max: [kb.max.x.to_mm.round(1), kb.max.y.to_mm.round(1), kb.max.z.to_mm.round(1)]
    },
    sub_elements_count: sub_elements.size,
    sub_elements: sub_elements
  }
end

info.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("Found trusses:", parsed.length);
    parsed.forEach(t => {
      console.log(`\nTruss: ${t.name} (Z: ${t.bounds.min[2]} -> ${t.bounds.max[2]})`);
      console.log(`Sub elements count: ${t.sub_elements_count}`);
      t.sub_elements.forEach(se => {
        if (se.name) {
          console.log(`  - ${se.name} | Dim: [${se.dim.join(' x ')}] | Z: [${se.bounds_min[2]} -> ${se.bounds_max[2]}]`);
        } else {
          console.log(`  - ${JSON.stringify(se)}`);
        }
      });
    });
  } else {
    console.error("Error:", res.error);
  }
}

main();

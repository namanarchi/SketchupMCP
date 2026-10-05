const http = require('http');
const fs = require('fs');
const path = require('path');

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
kho = model.entities.find { |e| e.is_a?(Sketchup::Group) && e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
unless kho
  puts "KHO NOT FOUND"
  return { error: "Kho not found" }.to_json
end

result = {
  name: kho.name,
  tag: kho.layer.name,
  bounds: {
    min: [kho.bounds.min.x.to_mm.round(1), kho.bounds.min.y.to_mm.round(1), kho.bounds.min.z.to_mm.round(1)],
    max: [kho.bounds.max.x.to_mm.round(1), kho.bounds.max.y.to_mm.round(1), kho.bounds.max.z.to_mm.round(1)]
  },
  subgroups: []
}

kho.entities.each do |sub|
  next unless sub.is_a?(Sketchup::Group) || sub.is_a?(Sketchup::ComponentInstance)
  
  sub_info = {
    name: sub.name,
    tag: sub.layer.name,
    bounds: {
      min: [sub.bounds.min.x.to_mm.round(1), sub.bounds.min.y.to_mm.round(1), sub.bounds.min.z.to_mm.round(1)],
      max: [sub.bounds.max.x.to_mm.round(1), sub.bounds.max.y.to_mm.round(1), sub.bounds.max.z.to_mm.round(1)],
      width: sub.bounds.width.to_mm.round(1),
      height: sub.bounds.height.to_mm.round(1),
      depth: sub.bounds.depth.to_mm.round(1)
    },
    child_count: sub.is_a?(Sketchup::Group) ? sub.entities.count : sub.definition.entities.count,
    children: []
  }

  entities_list = sub.is_a?(Sketchup::Group) ? sub.entities : sub.definition.entities
  entities_list.each do |c|
    if c.is_a?(Sketchup::Group) || c.is_a?(Sketchup::ComponentInstance)
      cb = c.bounds
      sub_info[:children] << {
        name: c.name,
        tag: c.layer.name,
        bounds: {
          min: [cb.min.x.to_mm.round(1), cb.min.y.to_mm.round(1), cb.min.z.to_mm.round(1)],
          max: [cb.max.x.to_mm.round(1), cb.max.y.to_mm.round(1), cb.max.z.to_mm.round(1)],
          dim: [(cb.max.x - cb.min.x).to_mm.round(1), (cb.max.y - cb.min.y).to_mm.round(1), (cb.max.z - cb.min.z).to_mm.round(1)]
        }
      }
    end
  end
  
  result[:subgroups] << sub_info
end

result.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const data = JSON.parse(res.result.slice(1, -1).replace(/\\\\"/g, '"').replace(/\\"/g, '"'));
    fs.writeFileSync(path.join(__dirname, 'full_kho_audit.json'), JSON.stringify(data, null, 2), 'utf8');
    console.log("Audit saved successfully. Subgroups count:", data.subgroups.length);
    data.subgroups.forEach(sg => {
      console.log("- " + sg.name + " (" + sg.tag + "): " + sg.children.length + " items. Bounds Z: [" + sg.bounds.min[2] + ", " + sg.bounds.max[2] + "]");
    });
  } else {
    console.error("Ruby error:", res.error);
  }
}

main();

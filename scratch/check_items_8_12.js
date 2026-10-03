const http = require('http');

function execRuby(code) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ code });
    const req = http.request({
      hostname: '127.0.0.1', port: 9876, path: '/execute', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => resolve(JSON.parse(b)));
    });
    req.write(data); req.end();
  });
}

function postRevit(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(payload), 'utf8');
    const req = http.request({
      hostname: '127.0.0.1', port: 9877, path: endpoint, method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': data.length }
    }, res => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => resolve(JSON.parse(b)));
    });
    req.write(data); req.end();
  });
}

async function main() {
  const ruby = `
    model = Sketchup.active_model
    items = []
    model.entities.each do |top|
      next unless top.is_a?(Sketchup::Group) || top.is_a?(Sketchup::ComponentInstance)
      tname = (top.name && !top.name.empty?) ? top.name : (top.respond_to?(:definition) ? top.definition.name : '')
      next unless tname == 'KHU KTX'
      tf = top.transformation
      top.entities.each do |sub|
        next unless sub.is_a?(Sketchup::Group) && sub.name == 'Day_Container_Tang_1_13_Can'
        full_tf = tf * sub.transformation
        sub.entities.each do |e|
          next unless e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)
          bb = e.bounds
          p0 = Geom::Point3d.new(bb.min.x, bb.min.y, bb.min.z).transform(full_tf)
          p1 = Geom::Point3d.new(bb.max.x, bb.min.y, bb.min.z).transform(full_tf)
          p2 = Geom::Point3d.new(bb.max.x, bb.max.y, bb.min.z).transform(full_tf)
          p3 = Geom::Point3d.new(bb.min.x, bb.max.y, bb.min.z).transform(full_tf)
          items << {
            name: (e.name.empty? ? (e.respond_to?(:definition) ? e.definition.name : 'Unit') : e.name),
            corners: [
              [p0.x.to_mm.round(1), p0.y.to_mm.round(1)],
              [p1.x.to_mm.round(1), p1.y.to_mm.round(1)],
              [p2.x.to_mm.round(1), p2.y.to_mm.round(1)],
              [p3.x.to_mm.round(1), p3.y.to_mm.round(1)]
            ]
          }
        end
      end
    end
    items.to_json
  `;
  const res = await execRuby(ruby);
  console.log("SU response:", res);
  let parsed = res.result;
  if (typeof parsed === 'string') parsed = JSON.parse(parsed);
  if (typeof parsed === 'string') parsed = JSON.parse(parsed);

  console.log('Total KTX T1 items:', parsed.length);
  for (let i = 7; i <= 11; i++) {
    console.log(`Testing item ${i + 1}:`, parsed[i].name);
    const corners = parsed[i].corners;
    for (let c = 0; c < 4; c++) {
      const p1 = corners[c];
      const p2 = corners[(c + 1) % 4];
      const r = await postRevit('/api/wall', {
        level: 'NỀN ĐẤT TỰ NHIÊN',
        start: p1,
        end: p2,
        height: 2800.0
      });
      console.log(`  Wall ${c+1}: [${p1}] -> [${p2}] :`, r);
    }
  }
}
main();

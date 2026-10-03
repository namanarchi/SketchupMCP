const http = require('http');

function execRuby(code) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ code });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 9876,
      path: '/execute',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ success: false, raw: body, error: e.message });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const ruby = `
    model = Sketchup.active_model
    items = []

    model.entities.each do |e|
      next unless e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)
      name = (e.name && !e.name.empty?) ? e.name : (e.respond_to?(:definition) ? e.definition.name : '')
      if name.include?('Bốt Bảo Vệ') || name.include?('Giam_Doc') || name.include?('Phe_Lieu')
        bb = e.bounds
        tf = e.transformation
        # 4 corners of horizontal bounding footprint
        p0 = Geom::Point3d.new(bb.min.x, bb.min.y, bb.min.z).transform(tf)
        p1 = Geom::Point3d.new(bb.max.x, bb.min.y, bb.min.z).transform(tf)
        p2 = Geom::Point3d.new(bb.max.x, bb.max.y, bb.min.z).transform(tf)
        p3 = Geom::Point3d.new(bb.min.x, bb.max.y, bb.min.z).transform(tf)
        items << {
          name: name,
          min: [bb.min.x.to_mm.round(1), bb.min.y.to_mm.round(1), bb.min.z.to_mm.round(1)],
          max: [bb.max.x.to_mm.round(1), bb.max.y.to_mm.round(1), bb.max.z.to_mm.round(1)],
          footprint: [
            [p0.x.to_mm.round(1), p0.y.to_mm.round(1)],
            [p1.x.to_mm.round(1), p1.y.to_mm.round(1)],
            [p2.x.to_mm.round(1), p2.y.to_mm.round(1)],
            [p3.x.to_mm.round(1), p3.y.to_mm.round(1)]
          ]
        }
      end
    end
    items.to_json
  `;

  const res = await execRuby(ruby);
  let parsed = res.result;
  if (typeof parsed === 'string') parsed = JSON.parse(parsed);
  if (typeof parsed === 'string') parsed = JSON.parse(parsed);
  console.log("Other facilities:", JSON.stringify(parsed, null, 2));
}

main();

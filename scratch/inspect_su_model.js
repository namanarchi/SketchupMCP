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
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const ruby = `
    model = Sketchup.active_model
    entities = model.entities
    res = []
    entities.each { |e|
      next unless e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)
      name = e.name.empty? ? (e.is_a?(Sketchup::ComponentInstance) ? e.definition.name : 'Unnamed') : e.name
      bb = e.bounds
      res << {
        name: name,
        class: e.class.to_s,
        min: [bb.min.x.to_mm.round(1), bb.min.y.to_mm.round(1), bb.min.z.to_mm.round(1)],
        max: [bb.max.x.to_mm.round(1), bb.max.y.to_mm.round(1), bb.max.z.to_mm.round(1)],
        layer: e.layer.name
      }
    }
    res
  `;
  const result = await execRuby(ruby);
  console.log(JSON.stringify(result, null, 2));
}

main();

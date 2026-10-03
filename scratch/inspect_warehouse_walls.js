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

    model.entities.each do |top|
      next unless top.is_a?(Sketchup::Group) || top.is_a?(Sketchup::ComponentInstance)
      tname = (top.name && !top.name.empty?) ? top.name : (top.respond_to?(:definition) ? top.definition.name : '')
      next unless tname == 'KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE'

      ents = top.respond_to?(:entities) ? top.entities : (top.respond_to?(:definition) ? top.definition.entities : [])
      tf = top.transformation

      ents.each do |sub|
        next unless sub.is_a?(Sketchup::Group)
        if sub.name == 'He_Vach_Ton_Bao_Che'
          sub_tf = tf * sub.transformation
          sub.entities.each do |e|
            next unless e.is_a?(Sketchup::Face)
            # Check vertical faces
            if e.normal.z.abs < 0.1
              bb = e.bounds
              p_min = bb.min.transform(sub_tf)
              p_max = bb.max.transform(sub_tf)
              items << {
                type: 'Face',
                min: [p_min.x.to_mm.round(1), p_min.y.to_mm.round(1), p_min.z.to_mm.round(1)],
                max: [p_max.x.to_mm.round(1), p_max.y.to_mm.round(1), p_max.z.to_mm.round(1)]
              }
            end
          end
        end
      end
    end

    items.to_json
  `;

  const res = await execRuby(ruby);
  let parsed = res.result;
  if (typeof parsed === 'string') parsed = JSON.parse(parsed);
  if (typeof parsed === 'string') parsed = JSON.parse(parsed);
  console.log(`Kho L-Shape vách tôn faces count: ${parsed.length}`);
  if (parsed.length > 0) {
    console.log("Sample face:", parsed[0]);
  }
}

main();

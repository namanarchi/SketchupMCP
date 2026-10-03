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
    info = {}
    
    # Check top level entities
    model.entities.each do |e|
      next unless e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)
      name = (e.name && !e.name.empty?) ? e.name : (e.respond_to?(:definition) ? e.definition.name : 'Unnamed')
      next unless ['KHU GIA CONG', 'KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE', 'KHU KTX', 'KHU CANTIN', 'KHU NVS'].include?(name)
      
      sub_items = []
      ents = e.respond_to?(:entities) ? e.entities : (e.respond_to?(:definition) ? e.definition.entities : [])
      tf = e.transformation
      
      ents.each do |sub|
        next unless sub.is_a?(Sketchup::Group) || sub.is_a?(Sketchup::ComponentInstance) || sub.is_a?(Sketchup::Face)
        sname = 'Face'
        if sub.respond_to?(:name) && sub.name && !sub.name.empty?
          sname = sub.name
        elsif sub.respond_to?(:definition)
          sname = sub.definition.name
        end
        
        bb = sub.bounds
        p_min = bb.min.transform(tf)
        p_max = bb.max.transform(tf)
        sub_items << {
          name: sname,
          class: sub.class.to_s,
          min: [p_min.x.to_mm.round(1), p_min.y.to_mm.round(1), p_min.z.to_mm.round(1)],
          max: [p_max.x.to_mm.round(1), p_max.y.to_mm.round(1), p_max.z.to_mm.round(1)]
        }
      end
      info[name] = {
        total_children: ents.count,
        children: sub_items.first(25)
      }
    end
    info.to_json
  `;

  const res = await execRuby(ruby);
  console.log("RESULT:");
  if (res.result) {
    try {
      console.log(JSON.stringify(JSON.parse(res.result), null, 2));
    } catch(e) {
      console.log(res.result);
    }
  } else {
    console.log(res);
  }
}

main();

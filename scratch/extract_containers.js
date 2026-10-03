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
    res = {}

    def analyze_containers(parent_name, group, parent_tf)
      full_tf = parent_tf * group.transformation
      items = []
      group.entities.each do |e|
        next unless e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)
        c_tf = full_tf * e.transformation
        bb = e.bounds
        c_name = (e.name && !e.name.empty?) ? e.name : (e.respond_to?(:definition) ? e.definition.name : 'Container')
        
        # Origin and axes
        origin = Geom::Point3d.new(0, 0, 0).transform(c_tf)
        x_axis = Geom::Vector3d.new(1, 0, 0).transform(c_tf)
        y_axis = Geom::Vector3d.new(0, 1, 0).transform(c_tf)
        
        # Min/Max in world
        p_min = bb.min.transform(full_tf)
        p_max = bb.max.transform(full_tf)

        items << {
          name: c_name,
          origin: [origin.x.to_mm.round(1), origin.y.to_mm.round(1), origin.z.to_mm.round(1)],
          x_axis: [x_axis.x.round(3), x_axis.y.round(3), x_axis.z.round(3)],
          dim: [(bb.width.to_mm).round(1), (bb.height.to_mm).round(1), (bb.depth.to_mm).round(1)],
          min: [p_min.x.to_mm.round(1), p_min.y.to_mm.round(1), p_min.z.to_mm.round(1)],
          max: [p_max.x.to_mm.round(1), p_max.y.to_mm.round(1), p_max.z.to_mm.round(1)]
        }
      end
      items
    end

    model.entities.each do |top|
      next unless top.is_a?(Sketchup::Group) || top.is_a?(Sketchup::ComponentInstance)
      tname = (top.name && !top.name.empty?) ? top.name : (top.respond_to?(:definition) ? top.definition.name : '')
      ents = top.respond_to?(:entities) ? top.entities : (top.respond_to?(:definition) ? top.definition.entities : [])
      tf = top.transformation

      if tname == 'KHU KTX'
        ents.each do |sub|
          next unless sub.is_a?(Sketchup::Group)
          if sub.name == 'Day_Container_Tang_1_13_Can' || sub.name == 'Day_Container_Tang_2_13_Can'
            res[sub.name] = analyze_containers(tname, sub, tf)
          end
        end
      elsif tname == 'KHU CANTIN'
        ents.each do |sub|
          next unless sub.is_a?(Sketchup::Group)
          if sub.name.include?('Container')
            res[sub.name] = analyze_containers(tname, sub, tf)
          end
        end
      elsif tname == 'KHU NVS'
        ents.each do |sub|
          next unless sub.is_a?(Sketchup::Group)
          if sub.name.include?('Container')
            res[sub.name] = analyze_containers(tname, sub, tf)
          end
        end
      end
    end

    res.to_json
  `;

  const res = await execRuby(ruby);
  if (res.result) {
    try {
      let parsed = res.result;
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      console.log("Groups found:", Object.keys(parsed));
      for (const k of Object.keys(parsed)) {
        console.log(`- ${k}: ${parsed[k].length} items.`);
        if (parsed[k].length > 0) {
          console.log(`  Item 0: name=${parsed[k][0].name}, origin=${JSON.stringify(parsed[k][0].origin)}, dim=${JSON.stringify(parsed[k][0].dim)}, min=${JSON.stringify(parsed[k][0].min)}, max=${JSON.stringify(parsed[k][0].max)}`);
        }
      }
    } catch(e) {
      console.log("Error parsing:", e.message);
    }
  } else {
    console.log(res);
  }
}

main();

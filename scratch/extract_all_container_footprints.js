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
    all_containers = []

    def process_container_group(parent_name, group, parent_tf, level_name, height_mm)
      full_tf = parent_tf * group.transformation
      results = []
      group.entities.each do |e|
        next unless e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)
        c_name = (e.name && !e.name.empty?) ? e.name : (e.respond_to?(:definition) ? e.definition.name : 'Container')
        # Skip stairs, railings, etc.
        next if c_name.downcase.include?('cau_thang') || c_name.downcase.include?('lan_can') || c_name.downcase.include?('mai')
        
        c_tf = full_tf * e.transformation
        bb = e.bounds
        
        # 4 corners in local space of e
        # To get the real horizontal footprint in world coordinates:
        # e.bounds gives local bounds in e's coordinates if e is ComponentInstance, or in world if untransformed.
        # Let's inspect e's corners:
        corners = [
          Geom::Point3d.new(bb.min.x, bb.min.y, bb.min.z),
          Geom::Point3d.new(bb.max.x, bb.min.y, bb.min.z),
          Geom::Point3d.new(bb.max.x, bb.max.y, bb.min.z),
          Geom::Point3d.new(bb.min.x, bb.max.y, bb.min.z)
        ].map { |pt| pt.transform(full_tf) }

        results << {
          container_name: c_name,
          parent: parent_name,
          level: level_name,
          height: height_mm,
          corners: corners.map { |pt| [pt.x.to_mm.round(1), pt.y.to_mm.round(1)] }
        }
      end
      results
    end

    model.entities.each do |top|
      next unless top.is_a?(Sketchup::Group) || top.is_a?(Sketchup::ComponentInstance)
      tname = (top.name && !top.name.empty?) ? top.name : (top.respond_to?(:definition) ? top.definition.name : '')
      ents = top.respond_to?(:entities) ? top.entities : (top.respond_to?(:definition) ? top.definition.entities : [])
      tf = top.transformation

      if tname == 'KHU KTX'
        ents.each do |sub|
          next unless sub.is_a?(Sketchup::Group)
          if sub.name == 'Day_Container_Tang_1_13_Can'
            all_containers.concat(process_container_group(sub.name, sub, tf, 'NỀN ĐẤT TỰ NHIÊN', 2800.0))
          elsif sub.name == 'Day_Container_Tang_2_13_Can'
            all_containers.concat(process_container_group(sub.name, sub, tf, 'TẦNG 1', 2800.0))
          end
        end
      elsif tname == 'KHU CANTIN'
        ents.each do |sub|
          next unless sub.is_a?(Sketchup::Group)
          if sub.name.include?('Container')
            all_containers.concat(process_container_group(sub.name, sub, tf, 'NỀN ĐẤT TỰ NHIÊN', 2800.0))
          end
        end
      elsif tname == 'KHU NVS'
        ents.each do |sub|
          next unless sub.is_a?(Sketchup::Group)
          if sub.name.include?('Container')
            all_containers.concat(process_container_group(sub.name, sub, tf, 'NỀN ĐẤT TỰ NHIÊN', 2800.0))
          end
        end
      end
    end

    all_containers.to_json
  `;

  const res = await execRuby(ruby);
  let parsed = res.result;
  if (typeof parsed === 'string') parsed = JSON.parse(parsed);
  if (typeof parsed === 'string') parsed = JSON.parse(parsed);
  console.log(`Total container units extracted: ${parsed.length}`);
  if (parsed.length > 0) {
    console.log("Sample container:", JSON.stringify(parsed[0], null, 2));
  }
}

main();

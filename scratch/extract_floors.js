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
    floors = {}

    def extract_floor_polygon(group, parent_tf)
      full_tf = parent_tf * group.transformation
      # Find the horizontal face with normal.z > 0 and largest area
      best_face = nil
      max_area = 0
      ents = group.entities
      ents.each do |e|
        if e.is_a?(Sketchup::Face) && e.normal.z > 0.9
          area = e.area
          if area > max_area
            max_area = area
            best_face = e
          end
        end
      end
      return nil unless best_face

      # Outer loop vertices
      loop_pts = best_face.outer_loop.vertices.map do |v|
        pt = v.position.transform(full_tf)
        [pt.x.to_mm.round(1), pt.y.to_mm.round(1), pt.z.to_mm.round(1)]
      end
      {
        area_m2: (max_area * 0.00064516).round(2), # sq inch to sq meter
        points: loop_pts
      }
    end

    # 1. Kho L-Shape
    model.entities.each do |top|
      next unless top.is_a?(Sketchup::Group) || top.is_a?(Sketchup::ComponentInstance)
      top_name = (top.name && !top.name.empty?) ? top.name : (top.respond_to?(:definition) ? top.definition.name : '')
      ents = top.respond_to?(:entities) ? top.entities : (top.respond_to?(:definition) ? top.definition.entities : [])
      tf = top.transformation

      ents.each do |sub|
        next unless sub.is_a?(Sketchup::Group)
        sname = sub.name
        if sname == 'He_San_Be_Tong_L_Shape_Chuan_CAD' ||
           sname == 'He_San_Be_Tong_Khu_Gia_Cong_Thep_Nha_Thau_B_70x8m' ||
           sname == 'NEN KTX' ||
           sname == 'Nen Cantin 100m' ||
           sname == 'Nen_BT100_Khu_WC_Tam_Nu' ||
           sname == 'Nen_BT100_Khu_WC_Tam_Nam'
          poly = extract_floor_polygon(sub, tf)
          floors[sname] = poly if poly
        end
      end
    end

    floors.to_json
  `;

  const res = await execRuby(ruby);
  console.log("EXTRACTED FLOORS:");
  if (res.result) {
    try {
      const parsed = JSON.parse(res.result);
      console.log(JSON.stringify(parsed, null, 2));
    } catch(e) {
      console.log(res.result);
    }
  } else {
    console.log(res);
  }
}

main();

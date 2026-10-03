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

function postRevit(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(payload), 'utf8');
    const req = http.request({
      hostname: '127.0.0.1',
      port: 9877,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': data.length
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
  console.log("=== BƯỚC 1: TRÍCH XUẤT TỌA ĐỘ TOÀN BỘ KHỐI CONTAINER TỪ SKETCHUP ===");

  const ruby = `
    model = Sketchup.active_model
    all_units = []

    def extract_corners(entity, parent_tf)
      # Calculate world corners of bounding box
      tf = parent_tf * entity.transformation
      bb = entity.bounds
      # The 4 horizontal corners in local bounds
      # We transform through full hierarchy
      pts = [
        Geom::Point3d.new(bb.min.x, bb.min.y, bb.min.z),
        Geom::Point3d.new(bb.max.x, bb.min.y, bb.min.z),
        Geom::Point3d.new(bb.max.x, bb.max.y, bb.min.z),
        Geom::Point3d.new(bb.min.x, bb.max.y, bb.min.z)
      ].map { |p| p.transform(parent_tf) }
      pts.map { |p| [p.x.to_mm.round(1), p.y.to_mm.round(1)] }
    end

    def process_group(group, parent_tf, level, height, group_label)
      res = []
      full_tf = parent_tf * group.transformation
      group.entities.each do |e|
        next unless e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)
        c_name = (e.name && !e.name.empty?) ? e.name : (e.respond_to?(:definition) ? e.definition.name : 'Unit')
        next if c_name.downcase.include?('cau_thang') || c_name.downcase.include?('lan_can') || c_name.downcase.include?('mai')
        
        # Get 4 corners
        bb = e.bounds
        p0 = Geom::Point3d.new(bb.min.x, bb.min.y, bb.min.z).transform(full_tf)
        p1 = Geom::Point3d.new(bb.max.x, bb.min.y, bb.min.z).transform(full_tf)
        p2 = Geom::Point3d.new(bb.max.x, bb.max.y, bb.min.z).transform(full_tf)
        p3 = Geom::Point3d.new(bb.min.x, bb.max.y, bb.min.z).transform(full_tf)
        
        res << {
          name: c_name,
          category: group_label,
          level: level,
          height: height,
          corners: [
            [p0.x.to_mm.round(1), p0.y.to_mm.round(1)],
            [p1.x.to_mm.round(1), p1.y.to_mm.round(1)],
            [p2.x.to_mm.round(1), p2.y.to_mm.round(1)],
            [p3.x.to_mm.round(1), p3.y.to_mm.round(1)]
          ]
        }
      end
      res
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
            all_units.concat(process_group(sub, tf, 'NỀN ĐẤT TỰ NHIÊN', 2800.0, 'KTX Tầng 1 (13 Container)'))
          elsif sub.name == 'Day_Container_Tang_2_13_Can'
            all_units.concat(process_group(sub, tf, 'TẦNG 1', 2800.0, 'KTX Tầng 2 (13 Container)'))
          end
        end
      elsif tname == 'KHU CANTIN'
        ents.each do |sub|
          next unless sub.is_a?(Sketchup::Group)
          if sub.name.include?('Nha_An')
            all_units.concat(process_group(sub, tf, 'NỀN ĐẤT TỰ NHIÊN', 2800.0, 'Nhà Ăn Cantin (12 Container)'))
          elsif sub.name.include?('Nha_Bep')
            all_units.concat(process_group(sub, tf, 'NỀN ĐẤT TỰ NHIÊN', 2800.0, 'Nhà Bếp (4 Container)'))
          elsif sub.name.include?('Nha_Kho')
            all_units.concat(process_group(sub, tf, 'NỀN ĐẤT TỰ NHIÊN', 2800.0, 'Nhà Kho (2 Container)'))
          end
        end
      elsif tname == 'KHU NVS'
        ents.each do |sub|
          next unless sub.is_a?(Sketchup::Group)
          if sub.name.include?('Container')
            all_units.concat(process_group(sub, tf, 'NỀN ĐẤT TỰ NHIÊN', 2800.0, 'Khu Vệ Sinh Nhà Tắm (12 Container)'))
          end
        end
      elsif tname.include?('Giam_Doc')
        bb = top.bounds
        all_units << {
          name: tname,
          category: 'Văn Phòng Giám Đốc (1 Container)',
          level: 'NỀN ĐẤT TỰ NHIÊN',
          height: 2800.0,
          corners: [
            [bb.min.x.to_mm.round(1), bb.min.y.to_mm.round(1)],
            [bb.max.x.to_mm.round(1), bb.min.y.to_mm.round(1)],
            [bb.max.x.to_mm.round(1), bb.max.y.to_mm.round(1)],
            [bb.min.x.to_mm.round(1), bb.max.y.to_mm.round(1)]
          ]
        }
      end
    end

    all_units.to_json
  `;

  const suRes = await execRuby(ruby);
  let units = suRes.result;
  if (typeof units === 'string') units = JSON.parse(units);
  if (typeof units === 'string') units = JSON.parse(units);

  console.log(`Đã trích xuất tổng cộng: ${units.length} khối container/phòng chức năng.`);
  
  // Group summary
  const summary = {};
  for (const u of units) {
    summary[u.category] = (summary[u.category] || 0) + 1;
  }
  console.log("Thống kê số lượng:", summary);

  console.log("\n=== BƯỚC 2: TỰ ĐỘNG DỰNG TOÀN BỘ TƯỜNG CONTAINER TRONG REVIT ===");
  let totalWallsCreated = 0;
  let successCount = 0;

  for (let idx = 0; idx < units.length; idx++) {
    const u = units[idx];
    const corners = u.corners;
    process.stdout.write(`[${idx + 1}/${units.length}] Dựng ${u.category} - ${u.name}... `);

    let unitSuccess = true;
    for (let i = 0; i < 4; i++) {
      const p1 = corners[i];
      const p2 = corners[(i + 1) % 4];

      // Avoid zero-length edges
      const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      if (dist < 100) continue;

      const wallRes = await postRevit('/api/wall', {
        level: u.level,
        start: p1,
        end: p2,
        height: u.height
      });

      if (wallRes.success && wallRes.result && wallRes.result.success) {
        totalWallsCreated++;
      } else {
        unitSuccess = false;
      }
    }

    if (unitSuccess) {
      successCount++;
      console.log("XONG (4 vách)");
    } else {
      console.log("LỖI");
    }
  }

  // Zoom to fit in Revit
  await postRevit('/api/view', { action: 'zoom_extents' });

  console.log(`\n=== HOÀN TẤT DỰNG KHỐI CONTAINER ===`);
  console.log(`- Tổng số container/phòng hoàn thành: ${successCount}/${units.length}`);
  console.log(`- Tổng số tường Native tạo mới trong Revit: ${totalWallsCreated}`);
}

main();

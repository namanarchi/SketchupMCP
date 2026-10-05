const http = require("http");

function postRuby(code) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ code });
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 9876,
        path: "/execute",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ raw: body });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const ruby = `
    model = Sketchup.active_model
    
    # Find NT_B1
    b1 = nil
    model.entities.each do |e|
      if e.respond_to?(:name) && e.name == "He_Khung_Mai_Ton_Khu_Gia_Cong_Co_Khi_36x8m"
        b1 = e.entities.find { |c| c.name == "He_Khung_Mai_Ton_Xuong_Gia_Cong_NT_B1_12x8m" }
      end
      if e.is_a?(Sketchup::ComponentInstance)
        e.definition.entities.each do |c|
          if c.respond_to?(:name) && c.name == "He_Khung_Mai_Ton_Khu_Gia_Cong_Co_Khi_36x8m"
            b1 = c.entities.find { |k| k.name == "He_Khung_Mai_Ton_Xuong_Gia_Cong_NT_B1_12x8m" }
          end
        end
      end
      break if b1
    end

    unless b1
      return { error: "NT_B1 not found" }.to_json
    end

    # Inspect Canh_Keo_Doc_Hop_60x120 of frame 1
    k1 = b1.entities.find { |c| c.name == "Khung_Truc_1_X15000" }
    keo = k1.entities.find { |c| c.name =~ /He_Keo_Mai/ }
    canh_keo = keo.entities.find { |c| c.name == "Canh_Keo_Doc_Hop_60x120" }
    
    # Vertices of Canh_Keo
    verts = []
    canh_keo.entities.grep(Sketchup::Face).each do |f|
      verts.concat(f.vertices.map { |v| [v.position.x.to_mm.round(1), v.position.y.to_mm.round(1), v.position.z.to_mm.round(1)] })
    end
    verts = verts.uniq.sort_by { |v| [v[1], v[2]] }

    # Inspect Roof sheets
    roof_group = b1.entities.find { |c| c.name == "He_Ton_Mai_Xanh_Navy" }
    roof_faces = []
    roof_group.entities.each do |r_sub|
      r_sub.entities.grep(Sketchup::Face).each do |f|
        roof_faces << {
          sub_name: r_sub.name,
          normal: [f.normal.x.round(4), f.normal.y.round(4), f.normal.z.round(4)],
          area: f.area.to_m.round(2),
          pts: f.vertices.map { |v| [v.position.x.to_mm.round(1), v.position.y.to_mm.round(1), v.position.z.to_mm.round(1)] }
        }
      end
    end

    # Inspect Purlins
    xago_group = b1.entities.find { |c| c.name == "He_Xa_Go_Mai_30x70" }
    xago_info = []
    xago_group.entities.each do |xg|
      bb = xg.bounds
      xago_info << {
        name: xg.name,
        min: [bb.min.x.to_mm.round(1), bb.min.y.to_mm.round(1), bb.min.z.to_mm.round(1)],
        max: [bb.max.x.to_mm.round(1), bb.max.y.to_mm.round(1), bb.max.z.to_mm.round(1)],
        dim: [bb.width.to_mm.round(1), bb.height.to_mm.round(1), bb.depth.to_mm.round(1)]
      }
    end

    # Inspect Columns in frame 1 and 4
    k4 = b1.entities.find { |c| c.name == "Khung_Truc_4_X27000" }
    cols = []
    [k1, k4].each do |k|
      k.entities.select { |c| c.name =~ /Cot_Thep/ }.each do |col|
        bb = col.bounds
        cols << {
          frame: k.name,
          name: col.name,
          min: [bb.min.x.to_mm.round(1), bb.min.y.to_mm.round(1), bb.min.z.to_mm.round(1)],
          max: [bb.max.x.to_mm.round(1), bb.max.y.to_mm.round(1), bb.max.z.to_mm.round(1)],
          dim: [bb.width.to_mm.round(1), bb.height.to_mm.round(1), bb.depth.to_mm.round(1)]
        }
      end
    end

    {
      canh_keo_verts: verts,
      roof_faces: roof_faces,
      purlins: xago_info,
      columns: cols
    }.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  console.log("=== Canh Keo Vertices (Y, Z) ===");
  data.canh_keo_verts.forEach((v) => console.log(`  X: ${v[0]}, Y: ${v[1]}, Z: ${v[2]}`));
  console.log("\n=== Columns ===");
  data.columns.forEach((c) => console.log(`  ${c.frame} - ${c.name} min:${c.min} max:${c.max} dim:${c.dim}`));
  console.log("\n=== Purlins ===");
  data.purlins.forEach((p) => console.log(`  ${p.name}: Y:[${p.min[1]}..${p.max[1]}], Z:[${p.min[2]}..${p.max[2]}] dim:${p.dim}`));
  console.log("\n=== Roof Faces ===");
  data.roof_faces.forEach((f) => console.log(`  ${f.sub_name} normal:${f.normal} pts:`, f.pts));
}

main().catch(console.error);

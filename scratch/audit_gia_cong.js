const http = require("http");
const fs = require("fs");

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
    
    # Find Target Parent Group
    target_parent = nil
    model.entities.each do |e|
      if e.respond_to?(:name) && e.name == "He_Khung_Mai_Ton_Khu_Gia_Cong_Co_Khi_36x8m"
        target_parent = e
        break
      end
      if e.is_a?(Sketchup::ComponentInstance)
        e.definition.entities.each do |c|
          if c.respond_to?(:name) && c.name == "He_Khung_Mai_Ton_Khu_Gia_Cong_Co_Khi_36x8m"
            target_parent = c
            break
          end
        end
      end
      break if target_parent
    end

    audit = []
    target_parent.entities.each do |ws|
      next unless ws.is_a?(Sketchup::Group)
      ws_info = {
        name: ws.name,
        bounds: [ws.bounds.min.to_a.map { |v| v.to_mm.round(1) }, ws.bounds.max.to_a.map { |v| v.to_mm.round(1) }],
        subgroups: []
      }
      ws.entities.each do |sub|
        next unless sub.is_a?(Sketchup::Group)
        bb = sub.bounds
        s_data = {
          name: sub.name,
          layer: sub.layer.name,
          min: [bb.min.x.to_mm.round(1), bb.min.y.to_mm.round(1), bb.min.z.to_mm.round(1)],
          max: [bb.max.x.to_mm.round(1), bb.max.y.to_mm.round(1), bb.max.z.to_mm.round(1)],
          dim: [bb.width.to_mm.round(1), bb.height.to_mm.round(1), bb.depth.to_mm.round(1)],
          child_count: sub.entities.count,
          manifold: sub.manifold?
        }
        
        # Check specific details
        if sub.name =~ /Dam_Giang/
          s_data[:beams] = sub.entities.map { |be| { name: be.name, layer: be.layer.name, dim: [be.bounds.width.to_mm.round(1), be.bounds.height.to_mm.round(1), be.bounds.depth.to_mm.round(1)] } }
        elsif sub.name =~ /Xa_Go/
          s_data[:purlins_count] = sub.entities.count
          sample_p = sub.entities.first
          s_data[:sample_purlin] = { name: sample_p.name, layer: sample_p.layer.name, dim: [sample_p.bounds.width.to_mm.round(1), sample_p.bounds.height.to_mm.round(1), sample_p.bounds.depth.to_mm.round(1)] }
        elsif sub.name =~ /He_Ton/
          s_data[:roof_elements] = sub.entities.map { |re| { name: re.name, layer: re.layer.name, dim: [re.bounds.width.to_mm.round(1), re.bounds.height.to_mm.round(1), re.bounds.depth.to_mm.round(1)] } }
        elsif sub.name =~ /Giang_Vach/
          s_data[:girts_count] = sub.entities.count
          sample_g = sub.entities.first
          s_data[:sample_girt] = { name: sample_g.name, layer: sample_g.layer.name, dim: [sample_g.bounds.width.to_mm.round(1), sample_g.bounds.height.to_mm.round(1), sample_g.bounds.depth.to_mm.round(1)] }
        end

        ws_info[:subgroups] << s_data
      end
      audit << ws_info
    end

    # Check Zero-gap in NT_B1: distance between top of purlin and bottom of roof
    b1 = target_parent.entities.find { |c| c.name =~ /NT_B1/ }
    xago_b1 = b1.entities.find { |c| c.name =~ /Xa_Go/ }
    roof_b1 = b1.entities.find { |c| c.name =~ /He_Ton/ }
    mai_nam = roof_b1.entities.find { |c| c.name == "Mai_Doc_Nam" }
    purlin_1 = xago_b1.entities.find { |c| c.name == "XaGo_C100_Nam_1" }
    purlin_6 = xago_b1.entities.find { |c| c.name == "XaGo_C100_Nam_6" }

    # Top point of purlin 1:
    top_p1 = purlin_1.bounds.max.z.to_mm.round(2)
    top_p6 = purlin_6.bounds.max.z.to_mm.round(2)

    # Roof bottom face vertices:
    roof_bot_z_y200 = nil
    roof_bot_z_y3800 = nil
    mai_nam.entities.grep(Sketchup::Face).each do |f|
      if f.normal.z < 0 # bottom face
        f.vertices.each do |v|
          # calculate z at y=200 and y=3800
        end
      end
    end

    {
      audit: audit,
      purlin_1_top_z: top_p1,
      purlin_6_top_z: top_p6
    }.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  fs.writeFileSync("scratch/audit_gia_cong.json", JSON.stringify(data, null, 2));
  console.log("Audit data saved to audit_gia_cong.json");
  data.audit.forEach(ws => {
    console.log(`\n=== ${ws.name} ===`);
    ws.subgroups.forEach(s => {
      console.log(`  - ${s.name} [${s.layer}] Dim: ${s.dim} subs: ${s.child_count}`);
      if (s.beams) {
        s.beams.forEach(b => console.log(`      beam: ${b.name} [${b.layer}] dim: ${b.dim}`));
      }
      if (s.sample_purlin) {
        console.log(`      purlins total: ${s.purlins_count}, sample: ${s.sample_purlin.name} [${s.sample_purlin.layer}] dim: ${s.sample_purlin.dim}`);
      }
      if (s.roof_elements) {
        s.roof_elements.forEach(r => console.log(`      roof: ${r.name} [${r.layer}] dim: ${r.dim}`));
      }
      if (s.sample_girt) {
        console.log(`      girts total: ${s.girts_count}, sample: ${s.sample_girt.name} [${s.sample_girt.layer}] dim: ${s.sample_girt.dim}`);
      }
    });
  });
}

main().catch(console.error);

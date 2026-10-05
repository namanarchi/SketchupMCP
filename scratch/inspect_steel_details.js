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
    
    # Check specific areas:
    # 1. Kho vat tu
    kho = model.entities.find { |e| e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
    kho_items = []
    if kho
      kho.entities.each do |sub|
        next unless sub.is_a?(Sketchup::Group)
        sub.entities.each do |c|
          next unless c.is_a?(Sketchup::Group) || c.is_a?(Sketchup::ComponentInstance)
          kho_items << {
            parent: sub.name,
            name: c.name,
            material: c.material ? c.material.name : "nil",
            layer: c.layer.name
          }
        end
      end
    end

    # 2. Khu gia cong
    inst_gc = model.entities.find { |e| e.is_a?(Sketchup::ComponentInstance) && e.definition.name == "KHU GIA CONG" }
    gc_items = []
    if inst_gc
      cdef = inst_gc.definition
      target = cdef.entities.find { |e| e.name == "He_Khung_Mai_Ton_Khu_Gia_Cong_Co_Khi_36x8m" }
      if target
        target.entities.each do |ws|
          next unless ws.is_a?(Sketchup::Group)
          ws.entities.each do |sub|
            next unless sub.is_a?(Sketchup::Group)
            if sub.name =~ /Khung_Truc/
              sub.entities.each do |fe|
                gc_items << {
                  parent: "#{ws.name} > #{sub.name}",
                  name: fe.name,
                  material: fe.material ? fe.material.name : "nil",
                  layer: fe.layer.name
                }
              end
            else
              gc_items << {
                parent: ws.name,
                name: sub.name,
                material: sub.material ? sub.material.name : "nil",
                layer: sub.layer.name
              }
            end
          end
        end
      end
    end

    # 3. Cong chinh & Hang rao
    cong_items = []
    hang_rao = model.entities.find { |e| e.name =~ /Hang_Rao/ }
    if hang_rao
      cong_items << { name: hang_rao.name, material: hang_rao.material ? hang_rao.material.name : "nil" }
    end
    cong = model.entities.find { |e| e.name =~ /Cong_Chinh/ }
    if cong
      cong_items << { name: cong.name, material: cong.material ? cong.material.name : "nil" }
    end

    {
      kho_sample: kho_items.first(25),
      kho_total: kho_items.size,
      kho_materials: kho_items.map { |i| i[:material] }.uniq,
      gc_items: gc_items,
      gc_materials: gc_items.map { |i| i[:material] }.uniq,
      cong_items: cong_items
    }.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  fs.writeFileSync("scratch/steel_details_report.json", JSON.stringify(data, null, 2));
  console.log("Kho materials used:", data.kho_materials);
  console.log("Gia Cong materials used:", data.gc_materials);
  console.log("Sample items with non-Thep_Cot_Xam_Ghi materials:");
  data.gc_items.filter(i => i.material !== "Thep_Cot_Xam_Ghi").forEach(i => console.log(`  GC: ${i.parent} > ${i.name} [${i.material}]`));
  data.kho_sample.filter(i => i.material !== "Thep_Cot_Xam_Ghi").forEach(i => console.log(`  Kho: ${i.parent} > ${i.name} [${i.material}]`));
}

main().catch(console.error);

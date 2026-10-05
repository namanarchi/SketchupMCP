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

    k1 = b1.entities.find { |c| c.name == "Khung_Truc_1_X15000" }
    
    # Detailed sub entities of k1
    k1_subs = k1.entities.map do |e|
      bb = e.bounds
      {
        name: e.name,
        layer: e.layer.name,
        min: [bb.min.x.to_mm.round(1), bb.min.y.to_mm.round(1), bb.min.z.to_mm.round(1)],
        max: [bb.max.x.to_mm.round(1), bb.max.y.to_mm.round(1), bb.max.z.to_mm.round(1)],
        dim: [bb.width.to_mm.round(1), bb.height.to_mm.round(1), bb.depth.to_mm.round(1)]
      }
    end

    # Detailed entities of He_Dam_Giang_Doc_ST1
    dam = b1.entities.find { |c| c.name == "He_Dam_Giang_Doc_ST1" }
    dam_subs = dam.entities.map do |e|
      bb = e.bounds
      {
        name: e.name,
        layer: e.layer.name,
        min: [bb.min.x.to_mm.round(1), bb.min.y.to_mm.round(1), bb.min.z.to_mm.round(1)],
        max: [bb.max.x.to_mm.round(1), bb.max.y.to_mm.round(1), bb.max.z.to_mm.round(1)],
        dim: [bb.width.to_mm.round(1), bb.height.to_mm.round(1), bb.depth.to_mm.round(1)]
      }
    end

    { k1_subs: k1_subs, dam_subs: dam_subs }.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  console.log("=== Khung Truc 1 Subs ===");
  data.k1_subs.forEach(s => console.log(`  ${s.name} [${s.layer}] Dim: ${s.dim} Min: ${s.min} Max: ${s.max}`));
  console.log("\n=== Dam Giang Doc ST1 Subs ===");
  data.dam_subs.forEach(s => console.log(`  ${s.name} [${s.layer}] Dim: ${s.dim} Min: ${s.min} Max: ${s.max}`));
}

main().catch(console.error);

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
    inst = model.entities.find { |e| e.is_a?(Sketchup::ComponentInstance) && e.definition.name == "KHU GIA CONG" }
    
    tf = inst.transformation
    bb_world = inst.bounds
    
    # Target parent group inside
    target_parent = inst.definition.entities.find { |e| e.name == "He_Khung_Mai_Ton_Khu_Gia_Cong_Co_Khi_36x8m" }
    bb_local = target_parent.bounds
    
    # B1 local bounds vs world bounds
    b1 = target_parent.entities.find { |e| e.name =~ /NT_B1/ }
    p_min_world = b1.bounds.min.transform(tf)
    p_max_world = b1.bounds.max.transform(tf)

    {
      inst_tf: tf.to_a,
      bb_world: [bb_world.min.to_a.map { |v| v.to_mm.round(1) }, bb_world.max.to_a.map { |v| v.to_mm.round(1) }],
      b1_world: [[p_min_world.x.to_mm.round(1), p_min_world.y.to_mm.round(1), p_min_world.z.to_mm.round(1)], [p_max_world.x.to_mm.round(1), p_max_world.y.to_mm.round(1), p_max_world.z.to_mm.round(1)]]
    }.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  console.log("KHU GIA CONG Transformation and World Bounds:");
  console.log("Instance World Bounds:", data.bb_world);
  console.log("NT_B1 World Bounds:", data.b1_world);
}

main().catch(console.error);

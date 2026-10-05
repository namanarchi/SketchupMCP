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
    kho_group = model.entities.find { |e| e.is_a?(Sketchup::Group) && e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
    keo_group = kho_group.entities.find { |e| e.name =~ /Vi_Keo/ || e.name =~ /Khung_Vi_Keo/ }
    sample_keo = keo_group.entities.first
    
    verts = []
    sample_keo.entities.grep(Sketchup::Face).each do |f|
      verts.concat(f.vertices.map { |v| [v.position.x.to_mm.round(1), v.position.y.to_mm.round(1), v.position.z.to_mm.round(1)] })
    end
    verts = verts.uniq.sort_by { |v| [v[1], v[2]] }

    { name: sample_keo.name, bounds: [sample_keo.bounds.min.to_a.map(&:to_mm), sample_keo.bounds.max.to_a.map(&:to_mm)], verts: verts.first(15) }.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  console.log("Sample Keo at Kho:", data.name);
  console.log("Bounds:", data.bounds);
  console.log("Verts:", data.verts);
}

main().catch(console.error);

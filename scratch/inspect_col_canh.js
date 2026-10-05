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
    col_b = k1.entities.find { |c| c.name == "Cot_Thep_TrucB" }
    keo = k1.entities.find { |c| c.name =~ /He_Keo_Mai/ }
    canh_keo = keo.entities.find { |c| c.name == "Canh_Keo_Doc_Hop_60x120" }
    qua_giang = keo.entities.find { |c| c.name =~ /Qua_Giang/ }

    col_faces = col_b.entities.grep(Sketchup::Face).map { |f| { normal: f.normal.to_a.map(&:round), z: f.vertices.map { |v| v.position.z.to_mm.round(1) }.uniq } }
    canh_faces = canh_keo.entities.grep(Sketchup::Face).map { |f| { normal: f.normal.to_a.map { |n| n.round(4) }, pts: f.vertices.map { |v| [v.position.y.to_mm.round(1), v.position.z.to_mm.round(1)] } } }

    { col_faces: col_faces, canh_faces: canh_faces }.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  console.log("Col B faces:", data.col_faces);
  console.log("\nCanh Keo faces:");
  data.canh_faces.forEach((f, i) => console.log(`  Face ${i} normal: ${f.normal} pts:`, f.pts));
}

main().catch(console.error);

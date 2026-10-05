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
  const artifactDir = "C:/Users/MAI KHANH/.gemini/antigravity-ide/brain/6fd06416-4d7c-4d10-9e51-d13c62b21ab2";

  const ruby = `
    model = Sketchup.active_model
    view = model.active_view
    inst = model.entities.find { |e| e.is_a?(Sketchup::ComponentInstance) && e.definition.name == "KHU GIA CONG" }
    tf = inst.transformation
    target_parent = inst.definition.entities.find { |e| e.name == "He_Khung_Mai_Ton_Khu_Gia_Cong_Co_Khi_36x8m" }
    b1 = target_parent.entities.find { |e| e.name =~ /NT_B1/ }

    # Frame 1 local center: X=15000, Y=4000, Z=2500
    pt_f1_world = Geom::Point3d.new(15000.mm, 4000.mm, 2500.mm).transform(tf)
    pt_b1_center_world = Geom::Point3d.new(21000.mm, 4000.mm, 2500.mm).transform(tf)

    # Shot 1: Front perspective of NT_B1 showing open gable truss, eave and ridge beam
    # Eye is in front of B1 (South, local Y = -4000, Z = 2000)
    eye_1_world = Geom::Point3d.new(12000.mm, -4000.mm, 2500.mm).transform(tf)
    target_1_world = Geom::Point3d.new(19000.mm, 3500.mm, 3200.mm).transform(tf)
    
    cam_1 = Sketchup::Camera.new(eye_1_world, target_1_world, [0, 0, 1], true, 40.0)
    view.camera = cam_1
    view.refresh
    view.write_image("${artifactDir}/gia_cong_b1_perspective.png", 1280, 720, false, 0.0)

    # Shot 2: Under-roof looking up at C100 purlins & Ridge beam 60x120 vertical
    eye_2_world = Geom::Point3d.new(17000.mm, 2500.mm, 1500.mm).transform(tf)
    target_2_world = Geom::Point3d.new(18000.mm, 4000.mm, 4000.mm).transform(tf)
    
    cam_2 = Sketchup::Camera.new(eye_2_world, target_2_world, [0, 0, 1], true, 45.0)
    view.camera = cam_2
    view.refresh
    view.write_image("${artifactDir}/gia_cong_under_roof_c100.png", 1280, 720, false, 0.0)

    { success: true }.to_json
  `;

  const resp = await postRuby(ruby);
  console.log(resp.result);
}

main().catch(console.error);

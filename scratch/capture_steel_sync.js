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
    
    # 1. Close-up on Foundation + Baseplate + Bolts + Column Foot in Kho Vat Tu
    # Col 1 is around (4320, 103107, 110)
    eye_kho = Geom::Point3d.new(3500.0.mm, 102200.0.mm, 800.0.mm)
    tgt_kho = Geom::Point3d.new(4320.0.mm, 103107.0.mm, 350.0.mm)
    cam_kho = Sketchup::Camera.new(eye_kho, tgt_kho, [0, 0, 1], true, 35.0)
    view.camera = cam_kho
    view.refresh
    view.write_image("${artifactDir}/steel_sync_baseplates_bolts_kho.png", 1280, 720, false, 0.0)

    # 2. Close-up on Foundation + Baseplate + Column in Khu Gia Cong
    inst_gc = model.entities.find { |e| e.is_a?(Sketchup::ComponentInstance) && e.definition.name == "KHU GIA CONG" }
    tf = inst_gc.transformation
    # Frame 1 Col B is local (15000, 210, 15), in world:
    pt_col_gc = Geom::Point3d.new(15000.mm, 210.mm, 100.mm).transform(tf)
    eye_gc = Geom::Point3d.new(13500.mm, -1500.mm, 600.mm).transform(tf)
    cam_gc = Sketchup::Camera.new(eye_gc, pt_col_gc, [0, 0, 1], true, 35.0)
    view.camera = cam_gc
    view.refresh
    view.write_image("${artifactDir}/steel_sync_baseplates_bolts_gc.png", 1280, 720, false, 0.0)

    # 3. Overall 3D Project Scene
    page_toan_bo = model.pages["3D TOAN BO  DU AN"]
    if page_toan_bo
      model.pages.selected_page = page_toan_bo
      view.refresh
      view.write_image("${artifactDir}/steel_sync_overall_project.png", 1280, 720, false, 0.0)
    end

    # 4. Cong Chinh 6m View
    cong = model.entities.find { |e| e.name =~ /Cong_Chinh/i }
    if cong
      bb = cong.bounds
      eye_cong = Geom::Point3d.new(bb.center.x - 8000.mm, bb.center.y - 12000.mm, bb.center.z + 4000.mm)
      cam_cong = Sketchup::Camera.new(eye_cong, bb.center, [0, 0, 1], true, 40.0)
      view.camera = cam_cong
      view.refresh
      view.write_image("${artifactDir}/steel_sync_gate_6m.png", 1280, 720, false, 0.0)
    end

    { success: true }.to_json
  `;

  const resp = await postRuby(ruby);
  console.log(resp.result);
}

main().catch(console.error);

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
    
    # 1. Capture 3D KHO VAT TU with full textures
    p_kho = model.pages["3D KHO VAT TU"]
    if p_kho
      model.pages.selected_page = p_kho
      model.rendering_options["RenderMode"] = 2
      model.rendering_options["DisplayColorByLayer"] = false
      view.refresh
      view.write_image("${artifactDir}/scene_3d_kho_vat_tu_color.png", 1280, 720, false, 0.0)
    end

    # 2. Capture 3D GIA CONG with full textures
    p_gc = model.pages["3D GIA CONG"]
    if p_gc
      model.pages.selected_page = p_gc
      model.rendering_options["RenderMode"] = 2
      model.rendering_options["DisplayColorByLayer"] = false
      view.refresh
      view.write_image("${artifactDir}/scene_3d_gia_cong_color.png", 1280, 720, false, 0.0)
    end

    # 3. Structural steel view of Kho: hide roof sheets to see all columns, trusses, eave/ridge beams, purlins in Thep_Cot_Xam_Ghi
    kho = model.entities.find { |e| e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
    ton_kho = kho ? kho.entities.find { |e| e.name =~ /He_Ton_Mai/ } : nil
    if ton_kho
      ton_kho.visible = false
      # Perspective of Kho framing
      eye_kf = Geom::Point3d.new(15000.0.mm, 96000.0.mm, 12000.0.mm)
      tgt_kf = Geom::Point3d.new(20000.0.mm, 108000.0.mm, 3500.0.mm)
      cam_kf = Sketchup::Camera.new(eye_kf, tgt_kf, [0, 0, 1], true, 45.0)
      view.camera = cam_kf
      view.refresh
      view.write_image("${artifactDir}/steel_sync_kho_framing_view.png", 1280, 720, false, 0.0)
      ton_kho.visible = true # restore
    end

    { success: true }.to_json
  `;

  const resp = await postRuby(ruby);
  console.log(resp.result);
}

main().catch(console.error);

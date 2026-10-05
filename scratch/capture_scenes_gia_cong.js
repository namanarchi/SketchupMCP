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
    
    # 1. Capture from Scene 3D GIA CONG
    page_3d = model.pages["3D GIA CONG"]
    if page_3d
      model.pages.selected_page = page_3d
      view.refresh
      view.write_image("${artifactDir}/scene_3d_gia_cong.png", 1280, 720, false, 0.0)
    end

    # 2. Capture from Scene KHU GIA CONG
    page_khu = model.pages["KHU GIA CONG"]
    if page_khu
      model.pages.selected_page = page_khu
      view.refresh
      view.write_image("${artifactDir}/scene_khu_gia_cong.png", 1280, 720, false, 0.0)
    end

    # 3. Capture from Scene GIACONG-MDUNG
    page_md = model.pages["GIACONG-MDUNG"]
    if page_md
      model.pages.selected_page = page_md
      view.refresh
      view.write_image("${artifactDir}/scene_giacong_mdung.png", 1280, 720, false, 0.0)
    end

    { success: true }.to_json
  `;

  const resp = await postRuby(ruby);
  console.log(resp.result);
}

main().catch(console.error);

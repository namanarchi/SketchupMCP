const http = require("http");
const fs = require("fs");
const path = require("path");

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
    
    # Ensure styles show textures/materials
    model.rendering_options["DisplayColorByLayer"] = false

    shots = [
      {
        filename: "${artifactDir}/gia_cong_b1_framing_open_truss.png",
        eye: [12000.0.mm, -2000.0.mm, 2500.0.mm],
        target: [21000.0.mm, 4000.0.mm, 3500.0.mm],
        up: [0, 0, 1]
      },
      {
        filename: "${artifactDir}/gia_cong_c100_upright_purlins.png",
        eye: [19000.0.mm, 1500.0.mm, 2800.0.mm],
        target: [22000.0.mm, 3500.0.mm, 4000.0.mm],
        up: [0, 0, 1]
      },
      {
        filename: "${artifactDir}/gia_cong_wall_girts_truca.png",
        eye: [21000.0.mm, 9500.0.mm, 2000.0.mm],
        target: [21000.0.mm, 7800.0.mm, 2000.0.mm],
        up: [0, 0, 1]
      },
      {
        filename: "${artifactDir}/gia_cong_overall_roof_v1.png",
        eye: [35000.0.mm, -18000.0.mm, 16000.0.mm],
        target: [35000.0.mm, 4000.0.mm, 3000.0.mm],
        up: [0, 0, 1]
      }
    ]

    results = []
    shots.each do |s|
      cam = Sketchup::Camera.new(s[:eye], s[:target], s[:up], true, 35.0)
      view.camera = cam
      view.refresh
      view.write_image(s[:filename], 1280, 720, false, 0.0)
      results << { file: s[:filename], exists: File.exist?(s[:filename]), size: File.size(s[:filename]) }
    end

    results.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  console.log("Captured screenshots:", data);
}

main().catch(console.error);

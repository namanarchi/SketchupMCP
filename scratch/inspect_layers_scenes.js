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
    layers = model.layers.map { |l| { name: l.name, visible: l.visible? } }
    
    # Check what scenes exist and their layer states for gia cong if any
    scenes = model.pages.map { |p| p.name }

    { layers: layers, scenes: scenes }.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  fs.writeFileSync("scratch/model_layers_scenes.json", JSON.stringify(data, null, 2));
  console.log("Total layers:", data.layers.length);
  console.log("Layers matching gia cong / bsq:", data.layers.map(l => l.name).filter(n => /gia.*cong|bsq/i.test(n)));
  console.log("Total scenes:", data.scenes.length);
}

main().catch(console.error);

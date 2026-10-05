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
    layers = model.layers
    
    folder_map = {}
    layers.folders.each do |f|
      folder_map[f.name] = {
        name: f.name,
        visible: f.visible?,
        layers: f.layers.map { |l| { name: l.name, visible: l.visible? } }
      }
    end

    unorganized = []
    layers.each do |l|
      next if l.name == "Layer0"
      if !l.folder
        unorganized << { name: l.name, visible: l.visible? }
      end
    end

    { folders: folder_map, unorganized: unorganized }.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  fs.writeFileSync("scratch/tag_folders_detail.json", JSON.stringify(data, null, 2));
  console.log("Unorganized layers (outside folders):", data.unorganized.map(l => l.name));
  console.log("\nExisting Folder structure:");
  Object.keys(data.folders).forEach(fname => {
    console.log(`📁 ${fname} (${data.folders[fname].layers.length} tags):`);
    data.folders[fname].layers.forEach(l => console.log(`   - ${l.name}`));
  });
}

main().catch(console.error);

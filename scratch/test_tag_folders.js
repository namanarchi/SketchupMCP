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
    layers = model.layers
    
    # Check if LayerFolder or TagFolder methods exist
    has_tag_folders = model.respond_to?(:tag_folders)
    has_layer_folders = layers.respond_to?(:folders)
    
    folders_list = []
    if has_layer_folders
      folders_list = layers.folders.map { |f| { name: f.name, count: f.layers.count } }
    end

    all_layers = layers.map do |l|
      folder_name = (l.respond_to?(:folder) && l.folder) ? l.folder.name : nil
      {
        name: l.name,
        visible: l.visible?,
        folder: folder_name
      }
    end

    {
      has_tag_folders: has_tag_folders,
      has_layer_folders: has_layer_folders,
      existing_folders: folders_list,
      total_layers: all_layers.size,
      sample_layers: all_layers
    }.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  console.log("Tag Folders support:", {
    has_tag_folders: data.has_tag_folders,
    has_layer_folders: data.has_layer_folders,
    existing_folders: data.existing_folders
  });
  console.log("Total layers:", data.total_layers);
}

main().catch(console.error);

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
    
    # Check LayerFolder methods
    first_folder = layers.folders.first
    methods = first_folder ? (first_folder.methods - Object.methods) : []
    
    # Check layers.folders methods
    folder_coll_methods = layers.folders ? (layers.folders.methods - Object.methods) : []

    {
      folder_methods: methods,
      folder_coll_methods: folder_coll_methods
    }.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  console.log("Folder methods:", data.folder_methods);
  console.log("Folder collection methods:", data.folder_coll_methods);
}

main().catch(console.error);

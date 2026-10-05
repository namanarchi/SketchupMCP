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
    scenes_to_check = ["KHU GIA CONG", "3D GIA CONG", "GIACONG-MDUNG", "3D KHO VAT TU", "3D TOAN BO  DU AN"]
    res = {}
    
    scenes_to_check.each do |sname|
      page = model.pages[sname]
      next unless page
      # In SketchUp Ruby API: page.layers gives the layers whose visibility is hidden/changed or page.hidden_layers
      hidden_layers = page.layers.map(&:name)
      res[sname] = {
        hidden_layers: hidden_layers
      }
    end

    res.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);

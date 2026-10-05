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
    cdef = model.definitions["KHU GIA CONG"]
    res = []
    if cdef
      cdef.entities.each do |e|
        next unless e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)
        bb = e.bounds
        res << {
          name: e.name,
          class: e.class.name,
          layer: e.layer.name,
          visible: e.visible?,
          bounds: {
            min: [bb.min.x.to_mm.round(1), bb.min.y.to_mm.round(1), bb.min.z.to_mm.round(1)],
            max: [bb.max.x.to_mm.round(1), bb.max.y.to_mm.round(1), bb.max.z.to_mm.round(1)],
            width: bb.width.to_mm.round(1),
            height: bb.height.to_mm.round(1),
            depth: bb.depth.to_mm.round(1)
          }
        }
      end
    end
    res.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  console.log("Entities in KHU GIA CONG definition:");
  data.forEach((e) => {
    console.log(`- ${e.name} [${e.layer}] (${e.class}) Dim: [${e.bounds.width}, ${e.bounds.height}, ${e.bounds.depth}] min:${e.bounds.min} max:${e.bounds.max}`);
  });
}

main().catch(console.error);

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
    cong = model.entities.find { |e| e.name =~ /Cong_Chinh/i }
    c1 = cong.entities.find { |e| e.is_a?(Sketchup::Group) }
    subs = []
    if c1
      c1.entities.each do |e|
        subs << {
          name: e.name,
          class: e.class.name,
          mat: e.material ? e.material.name : "nil",
          inner_subs: (e.respond_to?(:entities) ? e.entities.map { |x| "#{x.name} [#{x.material ? x.material.name : 'nil'}]" }.first(10) : [])
        }
      end
    end
    subs.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);

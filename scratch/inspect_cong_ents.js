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
    res = []
    if cong
      cong.entities.each do |e|
        res << { name: e.name, class: e.class.name, count: (e.respond_to?(:entities) ? e.entities.count : 0), def_name: (e.respond_to?(:definition) ? e.definition.name : "") }
      end
    end
    res.to_json
  `;

  const resp = await postRuby(ruby);
  console.log(resp.result);
}

main().catch(console.error);

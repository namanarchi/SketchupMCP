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
    
    res = {}
    
    # Check Cong Chinh
    cong = model.entities.find { |e| e.name =~ /Cong_Chinh/i }
    if cong
      cong_subs = []
      cong.entities.each do |c|
        cong_subs << {
          name: c.name,
          mat: c.material ? c.material.name : "nil",
          inner_mats: (c.respond_to?(:entities) ? c.entities.grep(Sketchup::Face).map { |f| f.material ? f.material.name : "nil" }.uniq : [])
        }
      end
      res[:cong_chinh] = cong_subs
    end

    # Check Hang Rao
    hang_rao = model.entities.find { |e| e.name =~ /Hang_Rao/i }
    if hang_rao
      hr_subs = []
      hang_rao.entities.each do |c|
        next unless c.is_a?(Sketchup::Group) || c.is_a?(Sketchup::ComponentInstance)
        hr_subs << {
          name: c.name,
          mat: c.material ? c.material.name : "nil",
          inner_mats: (c.respond_to?(:entities) ? c.entities.grep(Sketchup::Face).map { |f| f.material ? f.material.name : "nil" }.uniq.first(5) : [])
        }
      end
      res[:hang_rao] = hr_subs.first(15)
    end

    # Check Container Van Phong Kho
    vp = model.entities.find { |e| e.name =~ /Container_Van_Phong/i }
    if vp
      res[:container_vp] = {
        name: vp.name,
        mat: vp.material ? vp.material.name : "nil"
      }
    end

    res.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  console.log("Cong chinh subs:", data.cong_chinh);
  console.log("Hang rao subs sample:", data.hang_rao);
}

main().catch(console.error);

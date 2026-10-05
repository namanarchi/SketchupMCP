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
    
    # 1. Definitions inspection
    defs = model.definitions.reject { |d| d.image? }.map do |d|
      {
        name: d.name,
        instances: d.instances.count,
        sub_groups: d.entities.grep(Sketchup::Group).map(&:name),
        sub_components: d.entities.grep(Sketchup::ComponentInstance).map { |ci| ci.definition.name }
      }
    end

    # 2. Check all materials currently in model that relate to steel
    steel_mats = model.materials.select { |m| m.name =~ /thep|sat|steel|iron|metal|ban_ma|bu_long|bulon/i }.map(&:name)

    {
      definitions: defs,
      steel_mats: steel_mats
    }.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  fs.writeFileSync("scratch/definitions_steel.json", JSON.stringify(data, null, 2));
  console.log("Total definitions:", data.definitions.length);
  console.log("Steel materials in model:", data.steel_mats);
  console.log("Sample definitions:");
  data.definitions.forEach(d => {
    if (d.name =~ /cong|rao|cot|keo|kho|gia cong|thep|ban_ma|bulon|khung/i) {
      console.log(`- ${d.name} (${d.instances} insts):`, d.sub_groups.concat(d.sub_components).slice(0, 5));
    }
  });
}

main().catch(console.error);

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
    
    # Find He_Khung_Mai_Ton_Khu_Gia_Cong_Co_Khi_36x8m
    target = nil
    model.entities.each do |e|
      if e.respond_to?(:name) && e.name == "He_Khung_Mai_Ton_Khu_Gia_Cong_Co_Khi_36x8m"
        target = e
        break
      end
      if e.is_a?(Sketchup::ComponentInstance)
        e.definition.entities.each do |c|
          if c.respond_to?(:name) && c.name == "He_Khung_Mai_Ton_Khu_Gia_Cong_Co_Khi_36x8m"
            target = c
            break
          end
        end
      end
      break if target
    end

    report = {
      target_name: target.name,
      target_bounds: [target.bounds.min.to_a.map { |v| v.to_mm.round(1) }, target.bounds.max.to_a.map { |v| v.to_mm.round(1) }],
      children: []
    }

    target.entities.each do |child|
      c_info = {
        name: child.name,
        bounds: [child.bounds.min.to_a.map { |v| v.to_mm.round(1) }, child.bounds.max.to_a.map { |v| v.to_mm.round(1) }],
        subgroups: []
      }
      if child.is_a?(Sketchup::Group)
        child.entities.each do |sub|
          next unless sub.is_a?(Sketchup::Group) || sub.is_a?(Sketchup::ComponentInstance)
          s_info = {
            name: sub.name,
            layer: sub.layer.name,
            bounds: [sub.bounds.min.to_a.map { |v| v.to_mm.round(1) }, sub.bounds.max.to_a.map { |v| v.to_mm.round(1) }],
            dim: [sub.bounds.width.to_mm.round(1), sub.bounds.height.to_mm.round(1), sub.bounds.depth.to_mm.round(1)],
            sub_count: sub.is_a?(Sketchup::Group) ? sub.entities.grep(Sketchup::Group).count : 0
          }
          c_info[:subgroups] << s_info
        end
      end
      report[:children] << c_info
    end

    report.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  fs.writeFileSync("scratch/detailed_gia_cong_report.json", JSON.stringify(data, null, 2));
  console.log("Saved detailed_gia_cong_report.json");
  console.log("Children of target:", data.children.map(c => c.name));
  data.children.forEach(c => {
    console.log(`\n=== ${c.name} ===`);
    c.subgroups.forEach(s => {
      console.log(`  - ${s.name} [${s.layer}] Dim: ${s.dim} Min: ${s.bounds[0]} Max: ${s.bounds[1]}`);
    });
  });
}

main().catch(console.error);

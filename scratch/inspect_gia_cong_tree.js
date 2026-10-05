const http = require("http");
const fs = require("fs");
const path = require("path");

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
      # check inside components
      if e.is_a?(Sketchup::ComponentInstance)
        e.definition.entities.each do |c|
          if c.respond_to?(:name) && c.name == "He_Khung_Mai_Ton_Khu_Gia_Cong_Co_Khi_36x8m"
            target = c
            break
          end
        end
      elsif e.is_a?(Sketchup::Group)
        e.entities.each do |c|
          if c.respond_to?(:name) && c.name == "He_Khung_Mai_Ton_Khu_Gia_Cong_Co_Khi_36x8m"
            target = c
            break
          end
        end
      end
      break if target
    end

    unless target
      return { error: "Target not found" }.to_json
    end

    def dump_tree(ent, depth = 0)
      res = {
        name: ent.name.to_s,
        class: ent.class.name,
        layer: ent.layer.name,
        visible: ent.visible?,
        material: ent.material ? ent.material.name : "nil"
      }
      bb = ent.bounds
      res[:bounds] = {
        min: [bb.min.x.to_mm.round(1), bb.min.y.to_mm.round(1), bb.min.z.to_mm.round(1)],
        max: [bb.max.x.to_mm.round(1), bb.max.y.to_mm.round(1), bb.max.z.to_mm.round(1)],
        width: bb.width.to_mm.round(1),
        height: bb.height.to_mm.round(1),
        depth: bb.depth.to_mm.round(1)
      }
      
      children = ent.is_a?(Sketchup::Group) ? ent.entities : (ent.is_a?(Sketchup::ComponentInstance) ? ent.definition.entities : nil)
      if children && depth < 5
        sub_groups = children.select { |c| c.is_a?(Sketchup::Group) || c.is_a?(Sketchup::ComponentInstance) }
        res[:sub_count] = sub_groups.size
        res[:raw_faces] = children.grep(Sketchup::Face).count
        res[:raw_edges] = children.grep(Sketchup::Edge).count
        res[:children] = sub_groups.map { |c| dump_tree(c, depth + 1) }
      end
      res
    end

    tree = dump_tree(target)
    
    # Also find parent chain of target
    parent_info = {
      target_name: target.name,
      parent_name: target.parent.is_a?(Sketchup::ComponentDefinition) ? target.parent.name : target.parent.class.name
    }

    { parent_info: parent_info, tree: tree }.to_json
  `;

  const resp = await postRuby(ruby);
  const data = JSON.parse(resp.result);
  fs.writeFileSync(
    path.join(__dirname, "survey_gia_cong_tree.json"),
    JSON.stringify(data, null, 2),
    "utf8"
  );
  console.log("Survey tree saved to survey_gia_cong_tree.json");
  console.log("Target parent:", data.parent_info);
  console.log("Children of target:");
  if (data.tree && data.tree.children) {
    data.tree.children.forEach((c) => {
      console.log(`- ${c.name} (${c.layer}) [${c.bounds.width} x ${c.bounds.height} x ${c.bounds.depth}] min:${c.bounds.min} max:${c.bounds.max}, subs: ${c.sub_count}`);
      if (c.children) {
        c.children.forEach((cc) => {
          console.log(`    * ${cc.name} (${cc.layer}) [${cc.bounds.width} x ${cc.bounds.height} x ${cc.bounds.depth}] min:${cc.bounds.min} max:${cc.bounds.max}`);
        });
      }
    });
  }
}

main().catch(console.error);

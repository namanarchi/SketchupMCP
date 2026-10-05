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
    
    # 1. Inspect materials
    mats = model.materials.map do |m|
      c = m.color
      {
        name: m.name,
        color: [c.red, c.green, c.blue],
        alpha: m.alpha,
        texture: m.texture ? File.basename(m.texture.filename) : nil
      }
    end

    # 2. Find all entities related to steel box, frames, bolts, baseplates
    steel_keywords = /(cot|thep|hop|khung|keo|dam|giang|xa_go|ban_ma|bulon|bu_long|bolt|plate|steelframe|tru|trụ|cột|kèo|dầm)/i
    
    steel_entities = []
    
    def scan_steel(ent, path = "", depth = 0, results = [])
      return if depth > 7
      children = ent.is_a?(Sketchup::Group) ? ent.entities : (ent.is_a?(Sketchup::ComponentInstance) ? ent.definition.entities : (ent.is_a?(Sketchup::ComponentDefinition) ? ent.entities : nil))
      return unless children
      
      sub_items = children.select { |c| c.is_a?(Sketchup::Group) || c.is_a?(Sketchup::ComponentInstance) }
      sub_items.each do |c|
        cname = c.name.to_s
        cdef = c.is_a?(Sketchup::ComponentInstance) ? c.definition.name.to_s : ""
        cur_path = path.empty? ? cname : "#{path} > #{cname}"
        
        # Check if match steel keywords
        is_match = (cname =~ /(thep|hop|khung|keo|dam|giang|ban_ma|bulon|bu_long|bolt|plate|cot_thep)/i) || 
                   (cdef =~ /(thep|hop|khung|keo|dam|giang|ban_ma|bulon|bu_long|bolt|plate|cot_thep)/i)
        
        # Exclude concrete footing / foundations from matching
        is_concrete = (cname =~ /mong|be_tong|nen|slab|dat/i) && !(cname =~ /ban_ma|cot/i)
        
        if is_match && !is_concrete
          mat_name = c.material ? c.material.name : "nil"
          results << {
            path: cur_path,
            name: cname.empty? ? cdef : cname,
            class: c.class.name,
            layer: c.layer.name,
            material: mat_name
          }
        end
        scan_steel(c, cur_path, depth + 1, results)
      end
      results
    end

    # Scan top level entities
    model.entities.each do |e|
      if e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)
        scan_steel(e, e.name.to_s, 0, steel_entities)
      end
    end

    # Also check definitions
    model.definitions.each do |d|
      next if d.image? || d.group?
      scan_steel(d, "Def:#{d.name}", 0, steel_entities)
    end

    {
      total_materials: mats.size,
      materials: mats,
      total_steel_entities_found: steel_entities.size,
      steel_samples: steel_entities.first(30),
      materials_used_by_steel: steel_entities.map { |s| s[:material] }.uniq
    }.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  fs.writeFileSync("scratch/steel_survey.json", JSON.stringify(data, null, 2));
  console.log("Total materials:", data.total_materials);
  console.log("Thep_Cot_Xam_Ghi exists:", data.materials.find(m => m.name === "Thep_Cot_Xam_Ghi"));
  console.log("Total steel entities found:", data.total_steel_entities_found);
  console.log("Materials used by steel:", data.materials_used_by_steel);
  console.log("Sample steel entities (first 10):", data.steel_samples.slice(0, 10));
}

main().catch(console.error);

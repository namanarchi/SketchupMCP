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
    entities = model.entities
    
    # List top level entities
    top_level = []
    entities.each do |e|
      next unless e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)
      top_level << {
        name: e.name,
        def_name: e.is_a?(Sketchup::ComponentInstance) ? e.definition.name : "",
        class: e.class.name,
        layer: e.layer.name
      }
    end

    # Search deep for "36" or "Gia_Cong" or "Mai_Ton" or "Khung"
    deep_matches = []
    def search_deep(ent, path = "", depth = 0, matches = [])
      return if depth > 6
      children = ent.is_a?(Sketchup::Group) ? ent.entities : (ent.is_a?(Sketchup::ComponentInstance) ? ent.definition.entities : nil)
      return unless children
      sub_ents = children.select { |c| c.is_a?(Sketchup::Group) || c.is_a?(Sketchup::ComponentInstance) }
      sub_ents.each do |c|
        cname = c.name.to_s
        cdef = c.is_a?(Sketchup::ComponentInstance) ? c.definition.name.to_s : ""
        cur_path = path.empty? ? cname : "#{path} > #{cname}"
        if cname =~ /36/i || cname =~ /gia.*cong/i || cname =~ /co.*khi/i || cdef =~ /36/i || cdef =~ /gia.*cong/i || cdef =~ /co.*khi/i || cname =~ /khung.*mai/i
          bb = c.bounds
          matches << {
            path: cur_path,
            name: cname,
            def_name: cdef,
            class: c.class.name,
            layer: c.layer.name,
            bounds: {
              min: [bb.min.x.to_mm.round(1), bb.min.y.to_mm.round(1), bb.min.z.to_mm.round(1)],
              max: [bb.max.x.to_mm.round(1), bb.max.y.to_mm.round(1), bb.max.z.to_mm.round(1)],
              width: bb.width.to_mm.round(1),
              height: bb.height.to_mm.round(1),
              depth: bb.depth.to_mm.round(1)
            }
          }
        end
        search_deep(c, cur_path, depth + 1, matches)
      end
      matches
    end

    model.entities.each do |e|
      if e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)
        search_deep(e, e.name.to_s, 0, deep_matches)
      end
    end

    { top_level: top_level, deep_matches: deep_matches }.to_json


  `;

  const resp = await postRuby(ruby);
  console.log("Full resp:", JSON.stringify(resp, null, 2));
}

main().catch(console.error);

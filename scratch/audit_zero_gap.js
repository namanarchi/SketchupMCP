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
    target_parent = nil
    model.entities.each do |e|
      if e.respond_to?(:name) && e.name == "He_Khung_Mai_Ton_Khu_Gia_Cong_Co_Khi_36x8m"
        target_parent = e
        break
      end
      if e.is_a?(Sketchup::ComponentInstance)
        e.definition.entities.each do |c|
          if c.respond_to?(:name) && c.name == "He_Khung_Mai_Ton_Khu_Gia_Cong_Co_Khi_36x8m"
            target_parent = c
            break
          end
        end
      end
      break if target_parent
    end

    b1 = target_parent.entities.find { |c| c.name =~ /NT_B1/ }
    xago = b1.entities.find { |c| c.name =~ /Xa_Go/ }
    roof = b1.entities.find { |c| c.name =~ /He_Ton/ }
    mai_nam = roof.entities.find { |c| c.name == "Mai_Doc_Nam" }
    mai_bac = roof.entities.find { |c| c.name == "Mai_Doc_Bac" }

    # Get bottom face of mai_nam and mai_bac
    f_nam_bot = mai_nam.entities.grep(Sketchup::Face).find { |f| f.normal.z < -0.9 }
    plane_nam = f_nam_bot.plane # [a, b, c, d] where ax + by + cz + d = 0

    f_bac_bot = mai_bac.entities.grep(Sketchup::Face).find { |f| f.normal.z < -0.9 }
    plane_bac = f_bac_bot.plane

    gaps = []
    xago.entities.each do |p|
      # Top face of purlin has normal pointing up along roof normal
      # Find maximum Z or vertices on top flange
      top_pts = []
      p.entities.grep(Sketchup::Face).each do |pf|
        if pf.normal.z > 0.9 # top flange
          top_pts.concat(pf.vertices.map(&:position))
        end
      end
      
      plane = (p.name =~ /Nam/) ? plane_nam : plane_bac
      
      distances = top_pts.map do |pt|
        # distance from point to plane: (a*x + b*y + c*z + d) / sqrt(a^2 + b^2 + c^2)
        dist = (plane[0] * pt.x + plane[1] * pt.y + plane[2] * pt.z + plane[3]).abs
        dist.to_mm.round(3)
      end
      
      max_gap = distances.max
      min_gap = distances.min
      avg_gap = (distances.sum / distances.size).round(3) if distances.size > 0
      
      gaps << {
        name: p.name,
        pts_tested: top_pts.size,
        min_gap_mm: min_gap,
        max_gap_mm: max_gap,
        avg_gap_mm: avg_gap
      }
    end

    gaps.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  console.log("=== ZERO-GAP AUDIT ON 12 PURLINS OF NT_B1 ===");
  data.forEach(g => {
    console.log(`  ${g.name}: tested ${g.pts_tested} pts -> Min Gap: ${g.min_gap_mm}mm, Max Gap: ${g.max_gap_mm}mm, Avg: ${g.avg_gap_mm}mm`);
  });
}

main().catch(console.error);

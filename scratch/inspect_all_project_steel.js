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
    
    # Check all entities in root that have steel elements
    summary = {}
    
    # 1. Cong Chinh 6m
    cdef_cong = model.definitions["Cong_Chinh_6m_Hoan_Thien"]
    if cdef_cong
      summary[:cong_chinh_parts] = cdef_cong.entities.map do |e|
        { name: e.name, class: e.class.name, mat: e.material ? e.material.name : "nil" }
      end
    end

    # 2. Hang Rao
    hang_rao = model.entities.find { |e| e.name =~ /Hang_Rao/ }
    if hang_rao
      # Find first span
      first_sub = hang_rao.entities.find { |e| e.is_a?(Sketchup::Group) }
      if first_sub
        summary[:hang_rao_sub1] = first_sub.name
        summary[:hang_rao_parts] = first_sub.entities.grep(Sketchup::Group).map { |g| { name: g.name, mat: g.material ? g.material.name : "nil" } }.first(10)
      end
    end

    # 3. Barie An Toan
    barie = nil
    model.definitions.each do |d|
      if d.name =~ /Barie/i
        barie = d
        break
      end
    end
    if barie
      summary[:barie_parts] = barie.entities.map { |e| { name: e.name, mat: e.material ? e.material.name : "nil" } }.first(10)
    end

    # 4. Cau Thang Thep KTX
    cdef_ktx = model.definitions["KHU KTX"]
    if cdef_ktx
      ct = cdef_ktx.entities.find { |e| e.name =~ /Cau_Thang/i }
      if ct
        summary[:cau_thang_thep] = { name: ct.name, mat: ct.material ? ct.material.name : "nil", sub_count: (ct.respond_to?(:entities) ? ct.entities.count : 0) }
      end
    end

    summary.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);

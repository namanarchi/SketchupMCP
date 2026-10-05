const http = require('http');

function callRuby(code) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ code });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 9876,
      path: '/execute',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  const ruby = `
model = Sketchup.active_model
model.start_operation("Trim Beam Ends at Valley Junction", true)

kho = model.entities.find { |e| e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
dam_group = kho.entities.find { |e| e.name =~ /He_Dam/i }

# 1. Dầm nóc ngang nhịp 1: bắt đầu từ X=10220, thụt vào X=10255 (+35mm)
d1 = dam_group.entities.find { |e| e.name =~ /Dinh_Noc_Ngang_Nhip_1/ }
if d1
  # tìm face phía Tây (normal.x < -0.9)
  w_face = d1.entities.grep(Sketchup::Face).find { |f| f.normal.x < -0.9 }
  w_face.pushpull(-35.mm) if w_face
end

# 2. Dầm nóc dọc nhịp 1: bắt đầu từ Y=111007, thụt vào Y=111040 (+33mm)
d2 = dam_group.entities.find { |e| e.name =~ /Dinh_Noc_Doc_Nhip_1/ }
if d2
  # tìm face phía Nam (normal.y < -0.9)
  s_face = d2.entities.grep(Sketchup::Face).find { |f| f.normal.y < -0.9 }
  s_face.pushpull(-35.mm) if s_face
end

model.commit_operation

{
  d1_min_x: d1 ? d1.bounds.min.x.to_mm.round(1) : nil,
  d2_min_y: d2 ? d2.bounds.min.y.to_mm.round(1) : nil
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== THỤT ĐẦU MÚT DẦM NÓC KHỚP KÈO XỐI ÂM ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

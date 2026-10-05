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
kho = model.entities.find { |e| e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
ton = kho.entities.find { |e| e.name =~ /He_Ton_Mai/i }
xago = kho.entities.find { |e| e.name =~ /He_Xa_Go/i }

# Lấy mặt đáy của tấm tôn mái Mai_Ngang_Doc_Nam
m = ton.entities.find { |e| e.name =~ /Mai_Ngang_Doc_Nam/ }
bottom_face = nil
m.entities.grep(Sketchup::Face).each do |f|
  # Mặt đáy của mái tôn Nam dốc lên từ Nam sang Bắc, normal hướng xuống dưới: normal.z < 0
  if f.normal.z < -0.9 || (f.normal.z < 0 && f.normal.y < 0)
    bottom_face = f
  end
end

# Lấy mặt trên của xà gồ XaGo_C100_Ngang_Nam_3 (tại Y ~ 104800)
xg3 = xago.entities.find { |e| e.name =~ /Ngang_Nam_3/ }
xg3_top_face = nil
xg3.entities.grep(Sketchup::Face).each do |f|
  # Mặt trên của xà gồ có normal.z > 0.9
  if f.normal.z > 0.8
    xg3_top_face = f
  end
end

# Lấy cao độ Z của mặt đáy mái tôn và mặt trên xà gồ tại Y = 104800, X = 15000
# Trong SketchUp: mặt phẳng có plane = face.plane: [a, b, c, d] với a*x + b*y + c*z + d = 0 => z = (-d - a*x - b*y) / c
def get_z_at(face, x_mm, y_mm)
  return nil unless face
  pl = face.plane
  # pl = [a, b, c, d] với đơn vị nội bộ inches
  a, b, c, d = pl
  x_inch = x_mm.mm
  y_inch = y_mm.mm
  z_inch = (-d - a * x_inch - b * y_inch) / c
  z_inch.to_mm.round(2)
end

{
  z_day_ton_at_104800: get_z_at(bottom_face, 15000, 104800),
  z_dinh_xago_at_104800: get_z_at(xg3_top_face, 15000, 104800),
  z_day_ton_at_103200: get_z_at(bottom_face, 15000, 103200),
  z_dinh_xago_at_103200: get_z_at(xago.entities.find { |e| e.name =~ /Ngang_Nam_1/ }.entities.grep(Sketchup::Face).find { |f| f.normal.z > 0.8 }, 15000, 103200)
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== KIỂM TRA CHÍNH XÁC CAO ĐỘ FACE-TO-FACE ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

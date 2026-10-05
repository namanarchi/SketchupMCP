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

# Lấy các tấm mái giao L
hip_tay = ton.entities.find { |e| e.name =~ /Mai_Giao_Song_Xien_Tay/ }
hip_nam = ton.entities.find { |e| e.name =~ /Mai_Giao_Song_Xien_Nam/ }
val_1 = ton.entities.find { |e| e.name =~ /Mai_Giao_Xoi_Am_1/ }
val_2 = ton.entities.find { |e| e.name =~ /Mai_Giao_Xoi_Am_2/ }

def face_pts(group)
  return [] unless group
  # lấy face lớn nhất
  max_face = group.entities.grep(Sketchup::Face).max_by { |f| f.area }
  return [] unless max_face
  max_face.vertices.map { |v| [v.position.x.to_mm.round(1), v.position.y.to_mm.round(1), v.position.z.to_mm.round(1)] }
end

{
  hip_tay_pts: face_pts(hip_tay),
  hip_nam_pts: face_pts(hip_nam),
  val_1_pts: face_pts(val_1),
  val_2_pts: face_pts(val_2)
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== CÁC ĐỈNH CỦA MÁI GIAO CHỮ L ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

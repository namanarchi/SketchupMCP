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
      timeout: 60000
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
view = model.active_view
cam_up = Geom::Vector3d.new(0, 0, 1)

# 1. Chụp cận cảnh tiết diện xà gồ C100 rỗng mạ kẽm và dầm nóc
cam_eye1 = Geom::Point3d.new(15500.mm, 106000.mm, 4100.mm)
cam_target1 = Geom::Point3d.new(15220.mm, 106400.mm, 4230.mm)
view.camera.set(cam_eye1, cam_target1, cam_up)
out_c100 = "c:/Users/MAI KHANH/source/repos/namanarchi/SketchupMCP/scratch/verify_real_c100_closeup.png"
view.write_image(out_c100, 1920, 1080, false, 0.0)

# 2. Chụp cận cảnh góc giao chữ L với xà gồ vát góc (Jack Purlins) và kèo sống nghiêng
cam_eye2 = Geom::Point3d.new(9000.mm, 102000.mm, 5500.mm)
cam_target2 = Geom::Point3d.new(6500.mm, 106000.mm, 4000.mm)
view.camera.set(cam_eye2, cam_target2, cam_up)
out_junction = "c:/Users/MAI KHANH/source/repos/namanarchi/SketchupMCP/scratch/verify_junction_jack_purlins.png"
view.write_image(out_junction, 1920, 1080, false, 0.0)

# 3. Chụp cận cảnh tấm úp nóc bẻ góc chữ V trên đỉnh mái
cam_eye3 = Geom::Point3d.new(16000.mm, 105500.mm, 5200.mm)
cam_target3 = Geom::Point3d.new(15220.mm, 107007.mm, 4350.mm)
view.camera.set(cam_eye3, cam_target3, cam_up)
out_ridge = "c:/Users/MAI KHANH/source/repos/namanarchi/SketchupMCP/scratch/verify_bent_ridge_cap.png"
view.write_image(out_ridge, 1920, 1080, false, 0.0)

# Lưu mô hình an toàn
model.save

{
  saved: true,
  c100_path: out_c100,
  junction_path: out_junction,
  ridge_path: out_ridge
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== CHỤP ẢNH NGHIỆM THU VÀ LƯU MODEL ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

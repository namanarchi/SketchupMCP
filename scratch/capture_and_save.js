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

# 1. Chụp ảnh góc nhìn tổng thể kho bãi (Isometric View)
cam_eye = Geom::Point3d.new(45000.mm, 85000.mm, 25000.mm)
cam_target = Geom::Point3d.new(20000.mm, 115000.mm, 3000.mm)
cam_up = Geom::Vector3d.new(0, 0, 1)
view.camera.set(cam_eye, cam_target, cam_up)
view.zoom_extents

out_iso = "c:/Users/MAI KHANH/source/repos/namanarchi/SketchupMCP/scratch/verify_kho_fixed_iso.png"
view.write_image(out_iso, 1920, 1080, false, 0.0)

# 2. Chụp ảnh cận cảnh hệ xà gồ C100 và vì kèo dưới mái
cam_eye2 = Geom::Point3d.new(25000.mm, 104000.mm, 2000.mm)
cam_target2 = Geom::Point3d.new(20000.mm, 107000.mm, 4200.mm)
view.camera.set(cam_eye2, cam_target2, cam_up)
out_framing = "c:/Users/MAI KHANH/source/repos/namanarchi/SketchupMCP/scratch/verify_kho_fixed_framing.png"
view.write_image(out_framing, 1920, 1080, false, 0.0)

# 3. Chụp ảnh chi tiết góc vách Tây và dầm Eave
cam_eye3 = Geom::Point3d.new(2000.mm, 101000.mm, 4500.mm)
cam_target3 = Geom::Point3d.new(4500.mm, 105000.mm, 3500.mm)
view.camera.set(cam_eye3, cam_target3, cam_up)
out_wall = "c:/Users/MAI KHANH/source/repos/namanarchi/SketchupMCP/scratch/verify_kho_fixed_wall_joint.png"
view.write_image(out_wall, 1920, 1080, false, 0.0)

# 4. Lưu mô hình an toàn
model.save

{
  saved: true,
  iso_path: out_iso,
  framing_path: out_framing,
  wall_path: out_wall
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== LƯU MÔ HÌNH VÀ XUẤT ẢNH NGHIỆM THU TRỰC QUAN ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

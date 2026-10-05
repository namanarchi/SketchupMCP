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
view = model.active_view
cam_up = Geom::Vector3d.new(0, 0, 1)

# Góc nhìn từ dưới nền góc giao L ngước nhìn lên hệ xà gồ C100 và kèo sống nghiêng
cam_eye = Geom::Point3d.new(6000.mm, 105000.mm, 1500.mm)
cam_target = Geom::Point3d.new(7220.mm, 107007.mm, 4200.mm)
view.camera.set(cam_eye, cam_target, cam_up)
out_under = "c:/Users/MAI KHANH/source/repos/namanarchi/SketchupMCP/scratch/verify_under_junction_c100.png"
view.write_image(out_under, 1920, 1080, false, 0.0)

{
  captured: true,
  path: out_under
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    console.log("Captured under junction view successfully.");
  } else {
    console.error("Error:", res.error);
  }
}

main();

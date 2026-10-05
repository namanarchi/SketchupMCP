const http = require('http');

const rubyScript = `
model = Sketchup.active_model
kho_group = model.entities.find { |e| e.is_a?(Sketchup::Group) && e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }

view = model.active_view
# Đặt camera nhìn cận cảnh Kho Vật Tư & Bãi Gia Công
eye = Geom::Point3d.new(-10000.mm, 85000.mm, 25000.mm)
target = kho_group.bounds.center
up = Geom::Vector3d.new(0, 0, 1)

view.camera.set(eye, target, up)
view.camera.perspective = true
view.zoom(kho_group)

out_img = "C:/Users/MAI KHANH/source/repos/namanarchi/SketchupMCP/scratch/verify_kho_closeup.png"
view.write_image(out_img, 1280, 720, false, 0.0)

{ success: true, img: out_img }.to_json
`;

const postData = JSON.stringify({ code: rubyScript });

const req = http.request({
  hostname: '127.0.0.1',
  port: 9876,
  path: '/execute',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  },
  timeout: 10000
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    let parsed = JSON.parse(body).result;
    while (typeof parsed === 'string') parsed = JSON.parse(parsed);
    console.log(parsed);
  });
});

req.write(postData);
req.end();

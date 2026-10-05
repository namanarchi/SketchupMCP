const http = require('http');

const rubyScript = `
model = Sketchup.active_model
view = model.active_view
view.camera.perspective = true

# Nhìn từ dưới xà gồ nhìn lên mái và vì kèo
eye = Geom::Point3d.new(22000.mm, 105500.mm, 3500.mm)
target = Geom::Point3d.new(22000.mm, 104000.mm, 3900.mm)
up = Geom::Vector3d.new(0, 0, 1)
view.camera.set(eye, target, up)

out_img = "C:/Users/MAI KHANH/source/repos/namanarchi/SketchupMCP/scratch/verify_under_roof.png"
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

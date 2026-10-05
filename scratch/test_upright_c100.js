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
model.start_operation("Test Upright C100 Profile", true)

g = model.entities.add_group
g.name = "Test_Upright_C100"

p0 = Geom::Point3d.new(0, 0, 5000.mm)
u = Geom::Vector3d.new(0, 1, 0) # phương dốc mái (rộng 50mm)
n = Geom::Vector3d.new(0, 0, 1) # phương vuông góc mái (cao 100mm)
l = Geom::Vector3d.new(1, 0, 0) # phương chiều dài
len = 2000.mm

def get_pt(p0, u, n, u_val, n_val)
  p0 + Geom::Vector3d.new(u.x * u_val.mm, u.y * u_val.mm, u.z * u_val.mm) + Geom::Vector3d.new(n.x * n_val.mm, n.y * n_val.mm, n.z * n_val.mm)
end

pts_2d = [
  [0.0, 0.0],
  [50.0, 0.0],
  [50.0, 15.0],
  [48.8, 15.0],
  [48.8, 1.2],
  [1.2, 1.2],
  [1.2, 98.8],
  [48.8, 98.8],
  [48.8, 85.0],
  [50.0, 85.0],
  [50.0, 100.0],
  [0.0, 100.0]
]

pts_3d = pts_2d.map { |u_val, n_val| get_pt(p0, u, n, u_val, n_val) }

face = g.entities.add_face(pts_3d)
if face
  face.pushpull(len)
  valid_solid = g.manifold?
else
  valid_solid = false
end

b = g.bounds
res = {
  face_created: !face.nil?,
  manifold_solid: valid_solid,
  dim: [(b.max.x - b.min.x).to_mm.round(1), (b.max.y - b.min.y).to_mm.round(1), (b.max.z - b.min.z).to_mm.round(1)]
}

g.erase!
model.abort_operation

res.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== TEST MẶT CẮT C100 DỰNG ĐỨNG CHUẨN XÂY DỰNG ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

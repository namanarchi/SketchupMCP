const http = require('http');

const rubyScript = `
model = Sketchup.active_model
kho_group = model.entities.find { |e| e.is_a?(Sketchup::Group) && e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
keo_group = kho_group.entities.find { |e| e.name =~ /He_Keo_Mai/i }
ton_group = kho_group.entities.find { |e| e.name =~ /He_Ton_Mai/i }
mai_nam = ton_group.entities.find { |e| e.name =~ /Mai_Ngang_Doc_Nam/i }

# Lấy 1 vì kèo mẫu
sample_keo = keo_group.entities.find { |e| e.name =~ /Vi_Keo_Ngang_K01_X15220/ }

# Tìm các mặt phẳng của thanh kèo
keo_faces = []
sample_keo.entities.grep(Sketchup::Face).each do |f|
  next unless f.normal.z > 0.05 # Mặt hướng lên trên (cánh trên)
  pts = f.vertices.map { |v| [v.position.x.to_mm.round(1), v.position.y.to_mm.round(1), v.position.z.to_mm.round(1)] }
  keo_faces << {
    normal: [f.normal.x.round(4), f.normal.y.round(4), f.normal.z.round(4)],
    pts: pts
  }
end

# Tìm các mặt phẳng của tấm tôn Nam
ton_faces = []
mai_nam.entities.grep(Sketchup::Face).each do |f|
  pts = f.vertices.map { |v| [v.position.x.to_mm.round(1), v.position.y.to_mm.round(1), v.position.z.to_mm.round(1)] }
  ton_faces << {
    normal: [f.normal.x.round(4), f.normal.y.round(4), f.normal.z.round(4)],
    pts: pts
  }
end

{
  keo_top_faces: keo_faces,
  ton_nam_faces: ton_faces.first(5)
}.to_json
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
    console.log(JSON.stringify(parsed, null, 2));
  });
});

req.write(postData);
req.end();

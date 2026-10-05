const http = require('http');

const rubyScript = `
model = Sketchup.active_model
kho_group = model.entities.find { |e| e.is_a?(Sketchup::Group) && e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
ton_group = kho_group.entities.find { |e| e.name =~ /He_Ton_Mai/i }
xago_group = kho_group.entities.find { |e| e.name =~ /He_Xa_Go/i }
keo_group = kho_group.entities.find { |e| e.name =~ /He_Keo_Mai/i }

ton_bounds = ton_group.bounds
xago_bounds = xago_group.bounds
keo_bounds = keo_group.bounds

# Lấy chi tiết các tấm tôn mái bên trong
ton_items = []
ton_group.entities.each do |e|
  b = e.bounds
  ton_items << {
    name: e.name,
    class: e.class.name,
    min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
    max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)]
  }
end

# Lấy 2 xà gồ mẫu (1 nam, 1 bắc)
xago_samples = xago_group.entities.first(3).map do |e|
  b = e.bounds
  {
    name: e.name,
    min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
    max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)]
  }
end

{
  keo_z: [keo_bounds.min.z.to_mm.round(1), keo_bounds.max.z.to_mm.round(1)],
  xago_z: [xago_bounds.min.z.to_mm.round(1), xago_bounds.max.z.to_mm.round(1)],
  ton_z: [ton_bounds.min.z.to_mm.round(1), ton_bounds.max.z.to_mm.round(1)],
  ton_items: ton_items,
  xago_samples: xago_samples
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

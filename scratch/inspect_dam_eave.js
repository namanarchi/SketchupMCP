const http = require('http');

const rubyCode = `
model = Sketchup.active_model
kho_group = model.entities.find { |e| e.is_a?(Sketchup::Group) && e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
dam_group = kho_group.entities.find { |e| e.name == "He_Dam_Giang_Doc_ST1" }
cot_group = kho_group.entities.find { |e| e.name == "He_Cot_Thep_Hop_60x120" }

dam_info = []
dam_group.entities.each do |e|
  b = e.bounds
  dam_info << {
    name: e.name,
    layer: e.layer.name,
    dim: [b.width.to_mm.round(1), b.height.to_mm.round(1), b.depth.to_mm.round(1)],
    min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
    max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)]
  }
end

cot_info = []
cot_group.entities.each do |c|
  b = c.bounds
  cot_info << {
    name: c.name,
    dim: [b.width.to_mm.round(1), b.height.to_mm.round(1), b.depth.to_mm.round(1)],
    min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
    max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)]
  }
end

{
  dam_items: dam_info,
  sample_cots: cot_info.first(10)
}.to_json
`;

const postData = JSON.stringify({ code: rubyCode });

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

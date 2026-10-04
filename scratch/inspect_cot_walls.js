const http = require('http');

const rubyCode = `
model = Sketchup.active_model
kho_group = model.entities.find { |e| e.is_a?(Sketchup::Group) && e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
cot_group = kho_group.entities.find { |e| e.name == "He_Cot_Thep_Hop_60x120" }

cots = []
cot_group.entities.each do |c|
  b = c.bounds
  cots << {
    name: c.name,
    center: [b.center.x.to_mm.round(1), b.center.y.to_mm.round(1), b.center.z.to_mm.round(1)],
    min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
    max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)]
  }
end

# Phân loại cột theo các vách biên
cots_tay = cots.select { |c| (c[:center][0] - 4320).abs < 150 }.sort_by { |c| c[:center][1] }
cots_nam = cots.select { |c| (c[:center][1] - 103107).abs < 150 }.sort_by { |c| c[:center][0] }
cots_bac = cots.select { |c| (c[:center][1] - 132950).abs < 200 }.sort_by { |c| c[:center][0] }
cots_dong = cots.select { |c| (c[:center][0] - 10120).abs < 150 }.sort_by { |c| c[:center][1] }

{
  total_cots: cots.size,
  cots_tay_y_coords: cots_tay.map { |c| { name: c[:name], y: c[:center][1] } },
  cots_nam_x_coords: cots_nam.map { |c| { name: c[:name], x: c[:center][0] } },
  cots_bac_x_coords: cots_bac.map { |c| { name: c[:name], x: c[:center][0] } },
  cots_dong_y_coords: cots_dong.map { |c| { name: c[:name], y: c[:center][1] } }
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

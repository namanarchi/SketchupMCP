const http = require('http');

const rubyCode = `
model = Sketchup.active_model
kho_group = model.entities.find { |e| e.is_a?(Sketchup::Group) && e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
keo_group = kho_group.entities.find { |e| e.name == "He_Keo_Mai_Khung_Hop_60x120" }
sample_keo = keo_group.entities.find { |e| e.name =~ /Vi_Keo_Ngang_K01_X15220/ }

items = []
sample_keo.entities.each do |e|
  name = (e.respond_to?(:name) ? e.name.to_s : "")
  layer_name = e.layer ? e.layer.name : "None"
  items << {
    class: e.class.name,
    name: name,
    layer: layer_name,
    dim: [e.bounds.width.to_mm.round(1), e.bounds.height.to_mm.round(1), e.bounds.depth.to_mm.round(1)],
    bounds_min: [e.bounds.min.x.to_mm.round(1), e.bounds.min.y.to_mm.round(1), e.bounds.min.z.to_mm.round(1)],
    bounds_max: [e.bounds.max.x.to_mm.round(1), e.bounds.max.y.to_mm.round(1), e.bounds.max.z.to_mm.round(1)]
  }
end

{
  sample_keo_name: sample_keo.name,
  entities_count: sample_keo.entities.count,
  items: items
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
    let data = JSON.parse(body);
    console.log("Raw result:", data);
    let parsed = data.result;
    while (typeof parsed === 'string') parsed = JSON.parse(parsed);
    console.log(JSON.stringify(parsed, null, 2));
  });
});

req.write(postData);
req.end();

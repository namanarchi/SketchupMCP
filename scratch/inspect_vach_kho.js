const http = require('http');

const rubyCode = `
model = Sketchup.active_model
kho_group = model.entities.find { |e| e.is_a?(Sketchup::Group) && e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
vach_group = kho_group.entities.find { |e| e.name =~ /vach/i }

items = []
if vach_group
  vach_group.entities.each do |e|
    b = e.bounds
    items << {
      name: e.name,
      class: e.class.name,
      layer: e.layer.name,
      dim: [b.width.to_mm.round(1), b.height.to_mm.round(1), b.depth.to_mm.round(1)],
      min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
      max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)]
    }
  end
end

# Tìm các tường / vách khác trong kho_group
other_walls = []
kho_group.entities.each do |e|
  if e.name =~ /(vach|tuong|bao_che|kin)/i
    other_walls << {
      name: e.name,
      dim: [e.bounds.width.to_mm.round(1), e.bounds.height.to_mm.round(1), e.bounds.depth.to_mm.round(1)],
      min: [e.bounds.min.x.to_mm.round(1), e.bounds.min.y.to_mm.round(1), e.bounds.min.z.to_mm.round(1)],
      max: [e.bounds.max.x.to_mm.round(1), e.bounds.max.y.to_mm.round(1), e.bounds.max.z.to_mm.round(1)]
    }
  end
end

{
  vach_group_name: vach_group ? vach_group.name : "None",
  vach_group_layer: vach_group ? vach_group.layer.name : "None",
  vach_items: items,
  other_walls: other_walls
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

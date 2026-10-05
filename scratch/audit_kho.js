const http = require('http');

const rubyScript = `
model = Sketchup.active_model
kho_group = model.entities.find { |e| e.is_a?(Sketchup::Group) && e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }

report = {}

# 1. Quét tất cả các group con cấp 1 trong kho_group
kho_children = []
kho_group.entities.each do |e|
  next unless e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)
  b = e.bounds
  kho_children << {
    name: e.name,
    layer: e.layer.name,
    visible: e.visible?,
    dim: [b.width.to_mm.round(1), b.height.to_mm.round(1), b.depth.to_mm.round(1)],
    min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
    max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)],
    sub_count: (e.is_a?(Sketchup::Group) ? e.entities : e.definition.entities).count
  }
end
report[:kho_children] = kho_children

# 2. Kiểm tra chi tiết He_Cot_Thep_Hop_60x120
cot_group = kho_group.entities.find { |e| e.name =~ /He_Cot/i }
if cot_group
  report[:cot_count] = cot_group.entities.count
  # Tìm các cột có Z min != 100 hoặc Z max != 3600/3675
  odd_cots = []
  cot_group.entities.each do |c|
    b = c.bounds
    if (b.min.z.to_mm - 110).abs > 20 || (b.max.z.to_mm - 3600).abs > 100
      odd_cots << { name: c.name, min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)], max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)] }
    end
  end
  report[:odd_cots] = odd_cots
end

# 3. Kiểm tra chi tiết He_Dam_Giang_Doc_ST1
dam_group = kho_group.entities.find { |e| e.name =~ /He_Dam/i }
if dam_group
  dams = dam_group.entities.map do |d|
    b = d.bounds
    {
      name: d.name,
      dim: [b.width.to_mm.round(1), b.height.to_mm.round(1), b.depth.to_mm.round(1)],
      min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
      max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)]
    }
  end
  report[:dam_items] = dams
end

# 4. Kiểm tra chi tiết He_Keo_Mai
keo_group = kho_group.entities.find { |e| e.name =~ /He_Keo/i }
if keo_group
  keos = keo_group.entities.map do |k|
    b = k.bounds
    {
      name: k.name,
      dim: [b.width.to_mm.round(1), b.height.to_mm.round(1), b.depth.to_mm.round(1)],
      min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
      max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)],
      inner_count: (k.is_a?(Sketchup::Group) ? k.entities : k.definition.entities).count
    }
  end
  report[:keo_items] = keos
end

# 5. Kiểm tra chi tiết He_Xa_Go_Mai
xago_group = kho_group.entities.find { |e| e.name =~ /He_Xa_Go/i }
if xago_group
  xagos = xago_group.entities.map do |x|
    b = x.bounds
    {
      name: x.name,
      dim: [b.width.to_mm.round(1), b.height.to_mm.round(1), b.depth.to_mm.round(1)],
      min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
      max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)]
    }
  end
  report[:xago_items] = xagos
end

# 6. Kiểm tra chi tiết He_Vach_Ton_Bao_Che và He_Giang_Ngang_Xa_Go_Vach_50x50
vach_group = kho_group.entities.find { |e| e.name =~ /He_Vach/i }
if vach_group
  vachs = vach_group.entities.map do |v|
    b = v.bounds
    {
      name: v.name,
      dim: [b.width.to_mm.round(1), b.height.to_mm.round(1), b.depth.to_mm.round(1)],
      min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
      max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)]
    }
  end
  report[:vach_items] = vachs
end

giang_group = kho_group.entities.find { |e| e.name =~ /He_Giang/i }
if giang_group
  giangs = giang_group.entities.map do |g|
    b = g.bounds
    {
      name: g.name,
      dim: [b.width.to_mm.round(1), b.height.to_mm.round(1), b.depth.to_mm.round(1)],
      min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
      max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)]
    }
  end
  report[:giang_items] = giangs
end

# 7. Kiểm tra các nhóm nội thất / thiết bị / phân khu bên trong Kho
sub_zones = []
kho_group.entities.each do |e|
  if e.name =~ /(Bai_|Khu_)/i
    b = e.bounds
    sub_zones << {
      name: e.name,
      layer: e.layer.name,
      dim: [b.width.to_mm.round(1), b.height.to_mm.round(1), b.depth.to_mm.round(1)],
      min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
      max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)]
    }
  end
end
report[:sub_zones] = sub_zones

report.to_json
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
  timeout: 30000
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      let parsed = JSON.parse(body).result;
      while (typeof parsed === 'string') parsed = JSON.parse(parsed);
      const fs = require('fs');
      fs.writeFileSync('scratch/deep_audit_kho.json', JSON.stringify(parsed, null, 2), 'utf8');
      console.log('Deep audit saved to scratch/deep_audit_kho.json');
    } catch (e) {
      console.error('Error:', e.message, body);
    }
  });
});

req.write(postData);
req.end();

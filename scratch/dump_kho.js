const http = require('http');

const rubyCode = `
model = Sketchup.active_model
kho_group = model.entities.find { |e| e.is_a?(Sketchup::Group) && e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }

unless kho_group
  puts "Không tìm thấy KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE"
  return { error: "Not found" }.to_json
end

def dump_group(grp, depth = 0)
  items = []
  grp.entities.each do |e|
    next unless e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)
    name = e.name.to_s
    def_name = e.is_a?(Sketchup::ComponentInstance) ? e.definition.name : ""
    
    b = e.bounds
    item = {
      depth: depth,
      type: e.class.name,
      name: name,
      def_name: def_name,
      layer: e.layer.name,
      dim: [b.width.to_mm.round(1), b.height.to_mm.round(1), b.depth.to_mm.round(1)],
      pos_min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
      pos_max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)]
    }
    
    child_ents = e.is_a?(Sketchup::Group) ? e.entities : e.definition.entities
    sub_count = child_ents.count { |c| c.is_a?(Sketchup::Group) || c.is_a?(Sketchup::ComponentInstance) }
    item[:sub_groups_count] = sub_count
    
    items << item
    if depth < 3 && sub_count > 0
      item[:children] = dump_group(e.is_a?(Sketchup::Group) ? e : e.definition, depth + 1)
    end
  end
  items
end

res = {
  name: kho_group.name,
  layer: kho_group.layer.name,
  bounds: [kho_group.bounds.width.to_mm.round(1), kho_group.bounds.height.to_mm.round(1), kho_group.bounds.depth.to_mm.round(1)],
  children: dump_group(kho_group)
}

res.to_json
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
  timeout: 30000
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      let parsed = JSON.parse(body).result;
      while (typeof parsed === 'string') parsed = JSON.parse(parsed);
      const fs = require('fs');
      fs.writeFileSync('scratch/kho_structure.json', JSON.stringify(parsed, null, 2), 'utf8');
      console.log('Saved to scratch/kho_structure.json');
      console.log('Root children:', parsed.children.map(c => `${c.name} [Layer: ${c.layer}] (Sub: ${c.sub_groups_count})`));
    } catch (e) {
      console.error('Error:', e.message, body);
    }
  });
});

req.write(postData);
req.end();

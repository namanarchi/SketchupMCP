const http = require('http');
const fs = require('fs');
const path = require('path');

const rubyCode = `
model = Sketchup.active_model

# 1. Quét tất cả Layers / Tags
layers = model.layers.map { |l| { name: l.name, visible: l.visible? } }

# 2. Tìm tất cả group/component liên quan
def scan_hierarchy(ents, parent_name = "Root", depth = 0)
  results = []
  ents.each do |e|
    next unless e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)
    name = e.name.to_s
    def_name = e.is_a?(Sketchup::ComponentInstance) ? e.definition.name : ""
    full_id = "#{name} (#{def_name})"
    
    # Kiểm tra từ khóa
    kw = /(kho|gia cong|dam|xa go|mai|st1|qua giang|chong dung|eave|dinh noc|c100|thep hop)/i
    is_match = (name =~ kw) || (def_name =~ kw) || (parent_name =~ kw)
    
    bbox = e.bounds
    min_pt = [bbox.min.x.to_mm.round(1), bbox.min.y.to_mm.round(1), bbox.min.z.to_mm.round(1)]
    max_pt = [bbox.max.x.to_mm.round(1), bbox.max.y.to_mm.round(1), bbox.max.z.to_mm.round(1)]
    dim = [(bbox.width).to_mm.round(1), (bbox.height).to_mm.round(1), (bbox.depth).to_mm.round(1)]

    child_ents = e.is_a?(Sketchup::Group) ? e.entities : e.definition.entities
    child_count = child_ents.count

    if is_match
      results << {
        depth: depth,
        parent: parent_name,
        name: name,
        def_name: def_name,
        layer: e.layer.name,
        dim_w_d_h: dim,
        bounds_min: min_pt,
        bounds_max: max_pt,
        children_count: child_count
      }
    end

    if depth < 5
      results.concat(scan_hierarchy(child_ents, name.empty? ? def_name : name, depth + 1))
    end
  end
  results
end

items = scan_hierarchy(model.entities)

# 3. Quét các Scene
scenes_info = model.pages.map do |p|
  {
    name: p.name,
    layers_count: p.layers.size
  }
end

{
  total_layers: layers.size,
  layers: layers,
  total_matching_items: items.size,
  matching_items: items,
  total_scenes: scenes_info.size,
  sample_scenes: scenes_info.first(15)
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
  timeout: 30000
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      let parsed = JSON.parse(body).result;
      while (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      fs.writeFileSync(path.join(__dirname, 'survey_result.json'), JSON.stringify(parsed, null, 2), 'utf8');
      console.log('Done! Total items found:', parsed.total_matching_items);
      console.log('Layers:', parsed.layers.map(l => l.name).filter(n => /kho|gia cong|mai|xa|dam|st1|bsq/i.test(n)));
    } catch (e) {
      console.error('Error parsing response:', e.message, body.substring(0, 500));
    }
  });
});

req.on('error', (err) => {
  console.error('HTTP Request error:', err.message);
});

req.write(postData);
req.end();

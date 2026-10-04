const http = require('http');

const rubyCode = `
model = Sketchup.active_model

# 1. Quét qua toàn bộ definitions
matching_defs = []
model.definitions.each do |d|
  name = d.name
  if name =~ /(dam|doc|st1|dinh|noc|qua_giang|chong|xa_go|30x70|mai|eave)/i
    matching_defs << {
      name: name,
      instances_count: d.instances.count,
      entities_count: d.entities.count,
      bounds_dim: [d.bounds.width.to_mm.round(1), d.bounds.height.to_mm.round(1), d.bounds.depth.to_mm.round(1)]
    }
  end
end

# 2. Quét qua toàn bộ entities của active_model (cả group và component)
matching_ents = []
model.entities.each do |e|
  name = e.name.to_s
  def_name = e.is_a?(Sketchup::ComponentInstance) ? e.definition.name : ""
  if (name + " " + def_name) =~ /(dam|doc|st1|dinh|noc|qua_giang|chong|xa_go|30x70|mai|eave|kho|gia_cong)/i
    matching_ents << {
      type: e.class.name,
      name: name,
      def_name: def_name,
      layer: e.layer.name,
      bounds_dim: [e.bounds.width.to_mm.round(1), e.bounds.height.to_mm.round(1), e.bounds.depth.to_mm.round(1)]
    }
  end
end

{
  matching_definitions_count: matching_defs.size,
  matching_definitions: matching_defs,
  root_matching_entities_count: matching_ents.size,
  root_matching_entities: matching_ents
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
      while (typeof parsed === 'string') parsed = JSON.parse(parsed);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.error('Error:', e.message, body);
    }
  });
});

req.write(postData);
req.end();

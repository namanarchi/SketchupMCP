const http = require('http');

const rubyCode = `
begin
  model = Sketchup.active_model
  tags = model.layers.map(&:name)
  top_entities = model.entities.map do |e|
    name = e.respond_to?(:name) && !e.name.empty? ? e.name : (e.respond_to?(:definition) ? e.definition.name : e.class.name)
    layer = e.layer ? e.layer.name : "None"
    type = e.class.name
    { name: name, layer: layer, type: type }
  end

  {
    model_name: model.title,
    tags: tags,
    entities_count: model.entities.count,
    sample_entities: top_entities.first(30)
  }.to_json
rescue => e
  { error: e.message }.to_json
end
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
  res.on('data', c => body += c);
  res.on('end', () => console.log(body));
});

req.write(postData);
req.end();

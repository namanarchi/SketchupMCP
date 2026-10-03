const http = require('http');

const rubyCode = `
begin
  model = Sketchup.active_model
  groups_comps = []
  model.entities.each do |e|
    if e.is_a?(Sketchup::Group)
      groups_comps << { type: "Group", name: e.name, layer: e.layer.name, num_children: e.entities.count }
    elsif e.is_a?(Sketchup::ComponentInstance)
      groups_comps << { type: "Component", name: e.name, def_name: e.definition.name, layer: e.layer.name }
    end
  end

  {
    total_groups_comps: groups_comps.size,
    items: groups_comps
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

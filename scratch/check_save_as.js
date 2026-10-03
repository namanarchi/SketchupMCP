const http = require('http');

const rubyCode = `
begin
  model = Sketchup.active_model
  comp = model.entities.grep(Sketchup::ComponentInstance).first
  raise "No component found" unless comp

  test_path = File.join(File.dirname(model.path), "test_def_save.skp")
  # Check method parameters
  method_obj = comp.definition.method(:save_as)
  arity = method_obj.arity
  params = method_obj.parameters rescue []

  # Test saving with version
  begin
    status = comp.definition.save_as(test_path, Sketchup::Model::VERSION_2020)
  rescue => e1
    status = comp.definition.save_as(test_path) rescue "failed: #{e1.message}"
  end

  exists = File.exist?(test_path)
  size = exists ? File.size(test_path) : 0
  File.delete(test_path) if exists

  {
    def_name: comp.definition.name,
    arity: arity,
    params: params,
    save_status: status,
    exists: exists,
    size: size
  }.to_json
rescue => e
  { error: e.message, backtrace: e.backtrace.first(5) }.to_json
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

const http = require('http');

const rubyCode = `
begin
  model = Sketchup.active_model
  raise "No model" unless model

  test_dir = File.join(File.dirname(model.path), "REVIT_2020_MODULES")
  Dir.mkdir(test_dir) unless Dir.exist?(test_dir)
  test_file = File.join(test_dir, "00_TEST_KTX_ORIGIN.skp")

  ktx_comp = model.entities.find { |e| e.is_a?(Sketchup::ComponentInstance) && e.definition.name.include?("KTX") }
  raise "KTX not found" unless ktx_comp

  model.start_operation("Test Export Origin", true)
  to_delete = model.entities.to_a - [ktx_comp]
  model.entities.erase_entities(to_delete)
  status = model.save_copy(test_file, Sketchup::Model::VERSION_2020)
  model.abort_operation

  exists = File.exist?(test_file)
  size_mb = exists ? (File.size(test_file).to_f / (1024 * 1024)).round(2) : 0
  File.delete(test_file) if exists

  {
    success: status,
    file_exists: exists,
    size_mb: size_mb,
    entities_count_after_abort: model.entities.count
  }.to_json
rescue => e
  model.abort_operation rescue nil
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
  timeout: 60000
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => console.log(body));
});

req.write(postData);
req.end();

const http = require('http');

const rubyCode = `
begin
  model = Sketchup.active_model
  raise "No active model" unless model && !model.path.empty?

  out_path = model.path.sub(/\\.skp$/i, "_Revit2020.skp")
  status = model.save_copy(out_path, Sketchup::Model::VERSION_2020)

  {
    success: status,
    source_model: model.path,
    output_model: out_path,
    file_exists: File.exist?(out_path),
    file_size_mb: File.exist?(out_path) ? (File.size(out_path).to_f / (1024 * 1024)).round(2) : 0
  }.to_json
rescue => e
  { success: false, error: e.message, backtrace: e.backtrace.first(5) }.to_json
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
  timeout: 180000 // 3 minutes timeout for large model save
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Result from SketchUp Bridge:');
    try {
      console.log(JSON.stringify(JSON.parse(body), null, 2));
    } catch {
      console.log(body);
    }
  });
});

req.on('error', (err) => {
  console.error('Request Error:', err.message);
});

req.write(postData);
req.end();

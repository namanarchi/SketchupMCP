const http = require('http');

const rubyCode = `
begin
  model = Sketchup.active_model
  raise "No active model" unless model && !model.path.empty?

  out_dwg = model.path.sub(/\\.skp$/i, "_Revit2020_3D.dwg")
  # Export 3D DWG
  status = model.export(out_dwg, false)

  {
    success: status,
    output_dwg: out_dwg,
    file_exists: File.exist?(out_dwg),
    file_size_mb: File.exist?(out_dwg) ? (File.size(out_dwg).to_f / (1024 * 1024)).round(2) : 0
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
  timeout: 180000
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      console.log(JSON.stringify(JSON.parse(body), null, 2));
    } catch {
      console.log(body);
    }
  });
});

req.on('error', err => console.error(err));
req.write(postData);
req.end();

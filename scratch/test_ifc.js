const http = require('http');

const rubyCode = `
begin
  model = Sketchup.active_model
  out_ifc = model.path.sub(/\\.skp$/i, "_BIM_Model.ifc")

  # Kiểm tra exporter IFC
  status = model.export(out_ifc, false)

  {
    success: status,
    out_file: out_ifc,
    exists: File.exist?(out_ifc),
    size_mb: File.exist?(out_ifc) ? (File.size(out_ifc).to_f / (1024 * 1024)).round(2) : 0
  }.to_json
rescue => e
  { success: false, error: e.message }.to_json
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
  res.on('data', c => body += c);
  res.on('end', () => console.log(body));
});

req.write(postData);
req.end();

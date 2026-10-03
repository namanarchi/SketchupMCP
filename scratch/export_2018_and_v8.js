const http = require('http');

const rubyCode = `
begin
  model = Sketchup.active_model
  out_dir = "C:/Users/MAI KHANH/Downloads/BPTC SKETCHUP/MODEL"

  # 1. Export as SketchUp 2018 (which Revit 2020 SketchUpAPI.dll 18.0 natively supports!)
  file_2018 = File.join(out_dir, "KTX_BAIGC_v2018.skp")
  res_2018 = model.save_copy(file_2018, Sketchup::Model::VERSION_2018)

  # 2. Export as SketchUp v8 (the most universal version supported by every Revit version since 2011)
  file_v8 = File.join(out_dir, "KTX_BAIGC_v8.skp")
  res_v8 = model.save_copy(file_v8, Sketchup::Model::VERSION_8)

  {
    success: true,
    file_2018: file_2018,
    file_2018_exists: File.exist?(file_2018),
    file_2018_size_mb: File.exist?(file_2018) ? (File.size(file_2018).to_f / (1024 * 1024)).round(2) : 0,
    file_v8: file_v8,
    file_v8_exists: File.exist?(file_v8),
    file_v8_size_mb: File.exist?(file_v8) ? (File.size(file_v8).to_f / (1024 * 1024)).round(2) : 0
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
  timeout: 120000
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => console.log(body));
});

req.write(postData);
req.end();

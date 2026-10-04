const http = require('http');

const rubyCode = `
model = Sketchup.active_model

tags_to_check = [
  "BSQ-CHUNG-XA-GO-MAI",
  "BSQ-CHUNG-KHUNG-VI-KEO",
  "BSQ-CHUNG-COT-THEP",
  "BSQ-CHUNG-MAI-TON",
  "BSQ-KHO-BAI-TONG-THE"
]

layers_obj = tags_to_check.map { |name| model.layers[name] }.compact

report = []
model.pages.each do |page|
  vis = {}
  layers_obj.each do |l|
    # Trong SketchUp Page, layer ẩn nếu nằm trong page.layers và page.use_hidden_layers?
    # Hoặc gọi page.layer_visible?(l) nếu có, nếu không kiểm tra hidden_layers
    is_hidden = page.layers.include?(l)
    vis[l.name] = !is_hidden
  end
  report << {
    scene: page.name,
    visibility: vis
  }
end

{
  total_scenes: model.pages.size,
  scenes: report
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
  timeout: 10000
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    let parsed = JSON.parse(body).result;
    while (typeof parsed === 'string') parsed = JSON.parse(parsed);
    console.log('Total scenes checked:', parsed.total_scenes);
    console.log('Sample scene visibility:', JSON.stringify(parsed.scenes.slice(0, 8), null, 2));
  });
});

req.write(postData);
req.end();

const http = require('http');

const rubyCode = `
model = Sketchup.active_model
p = model.pages.first
l = model.layers["BSQ-CHUNG-XA-GO-MAI"]

# Test reading visibility in page
# Trong SketchUp: p.layers trả về mảng các layer bị ẩn (nếu use_hidden_layers? là true) hoặc visible
is_in_layers = p.layers.include?(l)

{
  page_name: p.name,
  use_hidden_layers: p.use_hidden_layers?,
  is_in_page_layers: is_in_layers,
  sample_layers_in_page: p.layers.first(5).map(&:name)
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
    console.log(JSON.stringify(parsed, null, 2));
  });
});

req.write(postData);
req.end();

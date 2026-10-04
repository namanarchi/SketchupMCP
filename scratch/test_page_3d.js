const http = require('http');

const rubyCode = `
model = Sketchup.active_model
p = model.pages["3D TOAN BO  DU AN"]
l = model.layers["BSQ-CHUNG-XA-GO-MAI"]

{
  page_name: p.name,
  is_hidden_in_page: p.layers.include?(l),
  hidden_layers: p.layers.map(&:name)
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

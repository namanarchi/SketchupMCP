const http = require('http');

const rubyCode = `
model = Sketchup.active_model
page = model.pages.first
layer = model.layers.first

page_methods = page.methods.grep(/layer|visib/i).sort
layer_methods = layer.methods.grep(/page|visib/i).sort

{
  page_methods: page_methods,
  layer_methods: layer_methods
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

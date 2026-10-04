const http = require('http');

const rubyCode = `
model = Sketchup.active_model
scenes = model.pages.map do |p|
  {
    name: p.name,
    has_kho: p.name =~ /(kho|gia cong|bai|bptc_08)/i ? true : false,
    has_ktx: p.name =~ /(ktx|bptc_05|bptc_06)/i ? true : false,
    has_cantin: p.name =~ /(ctin|cantin|bptc_07)/i ? true : false,
    has_nvs: p.name =~ /(nvs|bth|bptc_09)/i ? true : false,
    is_toan_bo: p.name =~ /(toan bo|tong the|dinh vi|bptc_01|bptc_02|bptc_03)/i ? true : false
  }
end

{ total: scenes.size, scenes: scenes }.to_json
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

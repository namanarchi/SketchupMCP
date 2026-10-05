const http = require('http');

function executeRuby(rubyCode) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ code: rubyCode });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 9876,
      path: '/execute',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(postData, 'utf8')
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(postData, 'utf8');
    req.end();
  });
}

async function main() {
  const ruby = `
    model = Sketchup.active_model
    "Model name: #{model.title}, Layers: #{model.layers.count}, Folders: #{model.layers.folders.count}"
  `;
  const res = await executeRuby(ruby);
  console.log("Ping:", res);
}

main().catch(console.error);

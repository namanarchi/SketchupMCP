const http = require('http');

function callRuby(code) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ code });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 9876,
      path: '/execute',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
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
    req.write(postData);
    req.end();
  });
}

async function main() {
  const ruby = `
model = Sketchup.active_model
scenes = model.pages.map { |p| p.name }
layers = model.layers.map { |l| l.name }

# Kiểm tra xem các tag kho bãi mới có hiển thị trong scene nào không
kho_tags = layers.select { |l| l =~ /BSQ-KHO-BAI/i }

scene_kho_vis = {}
model.pages.each do |p|
  vis_tags = []
  kho_tags.each do |tname|
    layer = model.layers[tname]
    # Kiểm tra layer visible trong page
    # Trong SketchUp API: page.layer_folders hoặc kiểm tra page visibility
    # Lưu ý: page.layers sẽ trả về các layer có visibility được lưu riêng cho page
    # Hoặc layer.visible? khi page được active
  end
  scene_kho_vis[p.name] = vis_tags
end

{
  total_scenes: scenes.size,
  scene_names: scenes,
  total_layers: layers.size,
  kho_tags: kho_tags
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== THÔNG TIN SCENES & TAGS ===");
    console.log("Total scenes:", data.total_scenes);
    console.log("Scenes:", data.scene_names);
    console.log("\nKho tags:", data.kho_tags);
  } else {
    console.error("Error:", res.error);
  }
}

main();

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
model.start_operation("Bake Roof Transformation to Identity", true)

kho = model.entities.find { |e| e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
ton = kho.entities.find { |e| e.name =~ /He_Ton_Mai/i }

tf = ton.transformation
unless tf.identity?
  # Transform tất cả con bên trong theo tf
  ton.entities.each do |c|
    c.transform!(tf)
  end
  # Reset ton transformation về Identity
  ton.transformation = Geom::Transformation.new
end

model.commit_operation

{
  ton_tf_identity: ton.transformation.identity?,
  ton_bounds_z: [ton.bounds.min.z.to_mm.round(1), ton.bounds.max.z.to_mm.round(1)],
  sample_child: ton.entities.grep(Sketchup::Group).first.bounds.min.z.to_mm.round(1)
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== BAKE TRANSFORMATION CỦA MÁI TÔN ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

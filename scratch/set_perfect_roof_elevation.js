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
model.start_operation("Set Perfect Roof Elevation Touching C100 Purlins", true)

kho = model.entities.find { |e| e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
ton = kho.entities.find { |e| e.name =~ /He_Ton_Mai/i }

# 1. Reset transformation của tất cả các entity con về Identity
ton.entities.each do |c|
  c.transformation = Geom::Transformation.new
end
ton.transformation = Geom::Transformation.new

# 2. Bây giờ áp dụng đúng duy nhất một độ dời dZ = +50.0mm cho ton
t = Geom::Transformation.translation(Geom::Vector3d.new(0, 0, 50.mm))
ton.transform!(t)

# 3. Bake transformation của ton vào entities con để ton mang Identity
tf = ton.transformation
ton.entities.each do |c|
  c.transform!(tf)
end
ton.transformation = Geom::Transformation.new

model.commit_operation

{
  ton_bounds_min_z: ton.bounds.min.z.to_mm.round(1),
  ton_bounds_max_z: ton.bounds.max.z.to_mm.round(1),
  mai_nam_min_z: ton.entities.find { |e| e.name =~ /Mai_Ngang_Doc_Nam/ }.bounds.min.z.to_mm.round(1),
  mai_nam_max_z: ton.entities.find { |e| e.name =~ /Mai_Ngang_Doc_Nam/ }.bounds.max.z.to_mm.round(1)
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== KẾT QUẢ ĐỒNG BỘ CAO ĐỘ MÁI TÔN HOÀN HẢO ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

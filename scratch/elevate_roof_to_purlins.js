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
model.start_operation("Elevate Roof Panels to Sit on Top of C100 Purlins", true)

kho = model.entities.find { |e| e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
ton = kho.entities.find { |e| e.name =~ /He_Ton_Mai/i }
xago = kho.entities.find { |e| e.name =~ /He_Xa_Go/i }

# Tìm độ nâng dZ tối ưu
# Với mỗi bước nâng dZ từ 50mm đến 90mm, đếm số overlap
best_dz = 0
min_overlaps = 9999

(50..90).step(1) do |dz|
  # Thử nghiệm tính toán không áp dụng
  # overlap được tính bằng cách lấy bounds của t tịnh tiến dz so với bounds của xg
  count = 0
  ton.entities.each do |t|
    # bounding box tịnh tiến dz
    tb = t.bounds
    t_min_z = tb.min.z.to_mm + dz
    t_max_z = tb.max.z.to_mm + dz
    xago.entities.each do |xg|
      xb = xg.bounds
      # kiểm tra nếu X và Y giao nhau và Z giao nhau sâu > 1mm
      x_overlap = [tb.max.x.to_mm, xb.max.x.to_mm].min - [tb.min.x.to_mm, xb.min.x.to_mm].max
      y_overlap = [tb.max.y.to_mm, xb.max.y.to_mm].min - [tb.min.y.to_mm, xb.min.y.to_mm].max
      z_overlap = [t_max_z, xb.max.z.to_mm].min - [t_min_z, xb.min.z.to_mm].max
      if x_overlap > 1 && y_overlap > 1 && z_overlap > 1
        count += 1
      end
    end
  end
  if count < min_overlaps
    min_overlaps = count
    best_dz = dz
  end
  break if count == 0
end

# Áp dụng best_dz
t = Geom::Transformation.translation(Geom::Vector3d.new(0, 0, best_dz.mm))
ton.transform!(t)

# Đếm lại overlap thực tế sau khi áp dụng
real_overlaps = 0
ton.entities.each do |te|
  xago.entities.each do |xg|
    ib = te.bounds.intersect(xg.bounds)
    if ib.valid? && ib.width.to_mm > 1 && ib.height.to_mm > 1 && ib.depth.to_mm > 1
      real_overlaps += 1
    end
  end
end

model.commit_operation

{
  applied_dz: best_dz,
  remaining_overlaps: real_overlaps
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== KẾT QUẢ NÂNG MÁI TÔN TIẾP XÚC ĐỈNH XÀ GỒ ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

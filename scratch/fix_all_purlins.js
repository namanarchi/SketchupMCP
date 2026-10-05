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
      timeout: 60000
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
model.start_operation("Fix Step 3: Rebuild C100 Purlins with Accurate Geometry", true)

kho = model.entities.find { |e| e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
xago_group = kho.entities.find { |e| e.name =~ /He_Xa_Go/i }
tag_xago = model.layers["BSQ-KHO-BAI-XA-GO-MAI"] || model.layers.add("BSQ-KHO-BAI-XA-GO-MAI")

# Xóa toàn bộ các xà gồ cũ trong group He_Xa_Go
xago_group.entities.clear!

# Hàm tạo xà gồ C100x50x15x1.2mm
# p_start: điểm gốc tiếp xúc trên mặt trên vì kèo
# vec_up_slope: vector dốc lên theo mặt phẳng mái (chiều cao C100 = 100mm)
# vec_normal_roof: vector pháp tuyến mặt phẳng mái (hướng lên trên, chiều rộng cánh = 50mm)
# vec_length: vector chạy dọc theo chiều dài mái (chiều dài dầm)
# length_mm: chiều dài xà gồ (mm)
def create_c100_purlin(parent_group, name, tag, p_start, vec_up_slope, vec_normal_roof, vec_length, length_mm)
  g = parent_group.entities.add_group
  g.name = name
  g.layer = tag
  
  u = vec_up_slope.normalize
  n = vec_normal_roof.normalize
  l = vec_length.normalize
  
  # Kích thước C100x50x15x1.2mm (dựng dạng hộp kín hoặc chữ C)
  # Để đảm bảo tính solid manifold và render đẹp, dựng khối hộp nghiêng 100mm x 50mm
  # Cạnh 100mm nằm theo vec_up_slope, bề rộng 50mm theo vec_normal_roof
  h = 100.mm
  w = 50.mm
  len = length_mm.mm
  
  # 4 đỉnh của mặt cắt đầu xà gồ tại p_start
  p0 = p_start
  p1 = p0 + Geom::Vector3d.new(u.x * h, u.y * h, u.z * h)
  p2 = p1 + Geom::Vector3d.new(n.x * w, n.y * w, n.z * w)
  p3 = p0 + Geom::Vector3d.new(n.x * w, n.y * w, n.z * w)
  
  face = g.entities.add_face(p0, p1, p2, p3)
  
  # Kiểm tra hướng normal của face so với vec_length
  # Nếu face.normal cùng hướng vec_length thì pushpull(-len), ngược lại pushpull(len)
  dot = face.normal.dot(l)
  if dot > 0
    face.pushpull(len)
  else
    face.pushpull(-len)
  end
  
  g
end

results = []

# --- 1. MÁI NGANG (Khẩu độ 8000mm, Y: 103007 -> 111007, Đỉnh nóc Y=107007) ---
# Chiều dài: từ X=10220 đến 30370 (dài 20150mm theo hướng +X)
len_ngang = 20150.0
vec_len_ngang = Geom::Vector3d.new(1, 0, 0)
slope_ngang = (4250.0 - 3715.0) / 4000.0 # 0.13375

# 1.1 Mái Ngang Nam (dốc lên từ Y=103007 lên Y=107007)
# Vector dốc lên: dy = 1, dz = slope_ngang
v_up_nam = Geom::Vector3d.new(0, 1, slope_ngang).normalize
# Vector pháp tuyến mặt mái hướng lên trên: vuông góc v_up_nam, dy = -slope_ngang, dz = 1
v_norm_nam = Geom::Vector3d.new(0, -slope_ngang, 1).normalize

y_positions_nam = [103200.0, 104000.0, 104800.0, 105600.0, 106400.0]
y_positions_nam.each_with_index do |y, i|
  z_keo = 3715.0 + (y - 103007.0) * slope_ngang
  p_start = Geom::Point3d.new(10220.mm, y.mm, z_keo.mm)
  g = create_c100_purlin(xago_group, "XaGo_C100_Ngang_Nam_#{i+1}", tag_xago, p_start, v_up_nam, v_norm_nam, vec_len_ngang, len_ngang)
  b = g.bounds
  results << {
    name: g.name,
    min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
    max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)]
  }
end

# 1.2 Mái Ngang Bắc (dốc lên từ Y=111007 xuống Y=107007, tức từ Y=111007 đi về -Y là lên đỉnh)
# Vector dốc lên: dy = -1, dz = slope_ngang
v_up_bac = Geom::Vector3d.new(0, -1, slope_ngang).normalize
# Vector pháp tuyến mặt mái hướng lên trên: vuông góc v_up_bac, dy = slope_ngang, dz = 1
v_norm_bac = Geom::Vector3d.new(0, slope_ngang, 1).normalize

y_positions_bac = [110800.0, 110000.0, 109200.0, 108400.0, 107600.0]
y_positions_bac.each_with_index do |y, i|
  z_keo = 3715.0 + (111007.0 - y) * slope_ngang
  p_start = Geom::Point3d.new(10220.mm, y.mm, z_keo.mm)
  g = create_c100_purlin(xago_group, "XaGo_C100_Ngang_Bac_#{i+1}", tag_xago, p_start, v_up_bac, v_norm_bac, vec_len_ngang, len_ngang)
  b = g.bounds
  results << {
    name: g.name,
    min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
    max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)]
  }
end

# --- 2. MÁI DỌC (Khẩu độ 6000mm, X: 4220 -> 10220, Đỉnh nóc X=7220) ---
# Chiều dài: từ Y=111007 đến 133157 (dài 22150mm theo hướng +Y)
len_doc = 22150.0
vec_len_doc = Geom::Vector3d.new(0, 1, 0)
slope_doc = (4250.0 - 3715.0) / 3000.0 # 0.17833

# 2.1 Mái Dọc Tây (dốc lên từ X=4220 lên X=7220)
# Vector dốc lên: dx = 1, dz = slope_doc
v_up_tay = Geom::Vector3d.new(1, 0, slope_doc).normalize
# Vector pháp tuyến mặt mái: dx = -slope_doc, dz = 1
v_norm_tay = Geom::Vector3d.new(-slope_doc, 0, 1).normalize

x_positions_tay = [4450.0, 5150.0, 5850.0, 6550.0]
x_positions_tay.each_with_index do |x, i|
  z_keo = 3715.0 + (x - 4220.0) * slope_doc
  p_start = Geom::Point3d.new(x.mm, 111007.mm, z_keo.mm)
  g = create_c100_purlin(xago_group, "XaGo_C100_Doc_Tay_#{i+1}", tag_xago, p_start, v_up_tay, v_norm_tay, vec_len_doc, len_doc)
  b = g.bounds
  results << {
    name: g.name,
    min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
    max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)]
  }
end

# 2.2 Mái Dọc Đông (dốc lên từ X=10220 về X=7220, tức từ 10220 đi về -X là lên đỉnh)
# Vector dốc lên: dx = -1, dz = slope_doc
v_up_dong = Geom::Vector3d.new(-1, 0, slope_doc).normalize
# Vector pháp tuyến mặt mái: dx = slope_doc, dz = 1
v_norm_dong = Geom::Vector3d.new(slope_doc, 0, 1).normalize

x_positions_dong = [9990.0, 9290.0, 8590.0, 7890.0]
x_positions_dong.each_with_index do |x, i|
  z_keo = 3715.0 + (10220.0 - x) * slope_doc
  p_start = Geom::Point3d.new(x.mm, 111007.mm, z_keo.mm)
  g = create_c100_purlin(xago_group, "XaGo_C100_Doc_Dong_#{i+1}", tag_xago, p_start, v_up_dong, v_norm_dong, vec_len_doc, len_doc)
  b = g.bounds
  results << {
    name: g.name,
    min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
    max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)]
  }
end

model.commit_operation

{
  total_purlins: results.size,
  purlins: results
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== KẾT QUẢ BƯỚC 3: DỰNG LẠI XÀ GỒ C100 ===");
    console.log("Total purlins created:", data.total_purlins);
    data.purlins.forEach(p => {
      console.log(`- ${p.name.padEnd(24)} | X: [${p.min[0]}, ${p.max[0]}] | Y: [${p.min[1]}, ${p.max[1]}] | Z: [${p.min[2]}, ${p.max[2]}]`);
    });
  } else {
    console.error("Error:", res.error);
  }
}

main();

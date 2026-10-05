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
model.start_operation("Rebuild Upright C100 Purlins and Sync Roof Cladding", true)

kho = model.entities.find { |e| e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
keo_group = kho.entities.find { |e| e.name =~ /He_Keo/i }
xago_group = kho.entities.find { |e| e.name =~ /He_Xa_Go/i }
ton = kho.entities.find { |e| e.name =~ /He_Ton_Mai/i }

tag_xago = model.layers["BSQ-KHO-BAI-XA-GO-MAI"] || model.layers.add("BSQ-KHO-BAI-XA-GO-MAI")
tag_mai = model.layers["BSQ-KHO-BAI-MAI-TON"] || model.layers.add("BSQ-KHO-BAI-MAI-TON")

# =========================================================================
# 1. DỰNG LẠI TOÀN BỘ XÀ GỒ THÉP CHỮ C C100x50x15x1.2mm DỰNG ĐỨNG CHUẨN XÂY DỰNG
# =========================================================================
xago_group.entities.clear!

# Hàm tạo xà gồ C100 dựng đứng chuẩn kỹ thuật:
# u: phương dốc mái (chiều rộng cánh B = 50mm)
# n: phương vuông góc mặt phẳng mái (chiều cao bụng H = 100mm)
# l: phương chiều dài xà gồ
def create_upright_c100_purlin(parent, name, tag, p_start, vec_up_slope, vec_normal_roof, vec_length, length_mm)
  g = parent.entities.add_group
  g.name = name
  g.layer = tag
  
  u = vec_up_slope.normalize
  n = vec_normal_roof.normalize
  l = vec_length.normalize
  
  def pt(p0, u, n, u_val, n_val)
    p0 + Geom::Vector3d.new(u.x * u_val.mm, u.y * u_val.mm, u.z * u_val.mm) + Geom::Vector3d.new(n.x * n_val.mm, n.y * n_val.mm, n.z * n_val.mm)
  end
  
  # 12 đỉnh mặt cắt C100x50x15x1.2mm dựng đứng:
  # Chiều cao theo n là 100mm, chiều rộng theo u là 50mm
  pts_2d = [
    [0.0, 0.0],
    [50.0, 0.0],
    [50.0, 15.0],
    [48.8, 15.0],
    [48.8, 1.2],
    [1.2, 1.2],
    [1.2, 98.8],
    [48.8, 98.8],
    [48.8, 85.0],
    [50.0, 85.0],
    [50.0, 100.0],
    [0.0, 100.0]
  ]
  
  pts_3d = pts_2d.map { |u_val, n_val| pt(p_start, u, n, u_val, n_val) }
  f = g.entities.add_face(pts_3d)
  len = length_mm.mm
  if f.normal.dot(l) > 0
    f.pushpull(len)
  else
    f.pushpull(-len)
  end
  g
end

purlins_count = 0

# --- 1.1 NHÁNH NGANG CHÍNH: X in [10220, 30370] (dài 20150mm) ---
len_ngang_main = 20150.0
vec_l_x = Geom::Vector3d.new(1, 0, 0)
slope_ngang = (4250.0 - 3715.0) / 4000.0 # 0.13375

v_up_nam = Geom::Vector3d.new(0, 1, slope_ngang).normalize
v_norm_nam = Geom::Vector3d.new(0, -slope_ngang, 1).normalize

v_up_bac = Geom::Vector3d.new(0, -1, slope_ngang).normalize
v_norm_bac = Geom::Vector3d.new(0, slope_ngang, 1).normalize

# Mái Nam chính (5 thanh)
y_nam = [103200.0, 104000.0, 104800.0, 105600.0, 106400.0]
y_nam.each_with_index do |y, i|
  z_k = 3715.0 + (y - 103007.0) * slope_ngang
  p_start = Geom::Point3d.new(10220.mm, y.mm, z_k.mm)
  create_upright_c100_purlin(xago_group, "XaGo_C100_Ngang_Nam_#{i+1}", tag_xago, p_start, v_up_nam, v_norm_nam, vec_l_x, len_ngang_main)
  purlins_count += 1
end

# Mái Bắc chính (5 thanh)
y_bac = [110800.0, 110000.0, 109200.0, 108400.0, 107600.0]
y_bac.each_with_index do |y, i|
  z_k = 3715.0 + (111007.0 - y) * slope_ngang
  p_start = Geom::Point3d.new(10220.mm, y.mm, z_k.mm)
  create_upright_c100_purlin(xago_group, "XaGo_C100_Ngang_Bac_#{i+1}", tag_xago, p_start, v_up_bac, v_norm_bac, vec_l_x, len_ngang_main)
  purlins_count += 1
end

# --- 1.2 NHÁNH DỌC CHÍNH: Y in [111007, 133157] (dài 22150mm) ---
len_doc_main = 22150.0
vec_l_y = Geom::Vector3d.new(0, 1, 0)
slope_doc = (4250.0 - 3715.0) / 3000.0 # 0.17833

v_up_tay = Geom::Vector3d.new(1, 0, slope_doc).normalize
v_norm_tay = Geom::Vector3d.new(-slope_doc, 0, 1).normalize

v_up_dong = Geom::Vector3d.new(-1, 0, slope_doc).normalize
v_norm_dong = Geom::Vector3d.new(slope_doc, 0, 1).normalize

# Mái Tây chính (4 thanh)
x_tay = [4450.0, 5150.0, 5850.0, 6550.0]
x_tay.each_with_index do |x, i|
  z_k = 3715.0 + (x - 4220.0) * slope_doc
  p_start = Geom::Point3d.new(x.mm, 111007.mm, z_k.mm)
  create_upright_c100_purlin(xago_group, "XaGo_C100_Doc_Tay_#{i+1}", tag_xago, p_start, v_up_tay, v_norm_tay, vec_l_y, len_doc_main)
  purlins_count += 1
end

# Mái Đông chính (4 thanh)
x_dong = [9990.0, 9290.0, 8590.0, 7890.0]
x_dong.each_with_index do |x, i|
  z_k = 3715.0 + (10220.0 - x) * slope_doc
  p_start = Geom::Point3d.new(x.mm, 111007.mm, z_k.mm)
  create_upright_c100_purlin(xago_group, "XaGo_C100_Doc_Dong_#{i+1}", tag_xago, p_start, v_up_dong, v_norm_dong, vec_l_y, len_doc_main)
  purlins_count += 1
end

# --- 1.3 KẾT CẤU XÀ GỒ ĐOẠN BẺ GÓC GIAO MÁI CHỮ L (JACK PURLINS DỰNG ĐỨNG) ---

# Sườn Nam giao sống xiên Hip
y_nam.each_with_index do |y, i|
  x_hip = 4220.0 + 0.75 * (y - 103007.0)
  len = 10220.0 - x_hip
  z_k = 3715.0 + (y - 103007.0) * slope_ngang
  p_start = Geom::Point3d.new(x_hip.mm, y.mm, z_k.mm)
  create_upright_c100_purlin(xago_group, "XaGo_C100_Giao_Nam_Hip_#{i+1}", tag_xago, p_start, v_up_nam, v_norm_nam, vec_l_x, len)
  purlins_count += 1
end

# Sườn Tây giao sống xiên Hip
x_tay.each_with_index do |x, i|
  y_hip = 103007.0 + (x - 4220.0) / 0.75
  len = 111007.0 - y_hip
  z_k = 3715.0 + (x - 4220.0) * slope_doc
  p_start = Geom::Point3d.new(x.mm, y_hip.mm, z_k.mm)
  create_upright_c100_purlin(xago_group, "XaGo_C100_Giao_Tay_Hip_#{i+1}", tag_xago, p_start, v_up_tay, v_norm_tay, vec_l_y, len)
  purlins_count += 1
end

# Sườn Bắc giao xối âm Valley
y_bac_val = [107600.0, 108400.0, 109200.0, 110000.0]
y_bac_val.each_with_index do |y, i|
  x_val = 7220.0 + 0.75 * (y - 107007.0)
  len = 10220.0 - x_val
  z_k = 3715.0 + (111007.0 - y) * slope_ngang
  p_start = Geom::Point3d.new(x_val.mm, y.mm, z_k.mm)
  create_upright_c100_purlin(xago_group, "XaGo_C100_Giao_Bac_Valley_#{i+1}", tag_xago, p_start, v_up_bac, v_norm_bac, vec_l_x, len)
  purlins_count += 1
end

# Sườn Đông giao xối âm Valley
x_dong_val = [7890.0, 8590.0, 9290.0]
x_dong_val.each_with_index do |x, i|
  y_val = 107007.0 + (x - 7220.0) / 0.75
  len = 111007.0 - y_val
  z_k = 3715.0 + (10220.0 - x) * slope_doc
  p_start = Geom::Point3d.new(x.mm, y_val.mm, z_k.mm)
  create_upright_c100_purlin(xago_group, "XaGo_C100_Giao_Dong_Valley_#{i+1}", tag_xago, p_start, v_up_dong, v_norm_dong, vec_l_y, len)
  purlins_count += 1
end

# =========================================================================
# 2. ĐỒNG BỘ CAO ĐỘ MÁI TÔN ĐỠ TRÊN CÁNH TRÊN 50MM CỦA XÀ GỒ DỰNG ĐỨNG
# =========================================================================
# Do xà gồ cao thêm 50mm theo phương vuông góc mái (từ 50mm -> 100mm)
# Nâng tôn lên đúng dZ = +50.0mm
t_lift = Geom::Transformation.translation(Geom::Vector3d.new(0, 0, 50.mm))
ton.entities.each do |c|
  # ngoại trừ up_noc vì sẽ dựng lại theo cao độ mới
  next if c.name =~ /Up_Noc/i
  c.transform!(t_lift)
end

# =========================================================================
# 3. DỰNG LẠI TẤM ÚP NÓC BẺ GẬP THEO CAO ĐỘ MỚI
# =========================================================================
up_noc = ton.entities.find { |e| e.name =~ /He_Thong_Up_Noc/i }
up_noc.entities.clear!

# Cao độ đỉnh nóc mới: Z = 4353.0 + 50.0 = 4403.0mm
z_top = 4403.0
dz_slope = 200.0 * 0.13375 # 26.75mm

# 3.1 Up_Noc_Canh_Ngang
g_ngang = up_noc.entities.add_group
g_ngang.name = "Up_Noc_Canh_Ngang"
g_ngang.layer = tag_mai

pts_ngang = [
  Geom::Point3d.new(7220.mm, 107007.mm, z_top.mm),
  Geom::Point3d.new(7220.mm, 107207.mm, (z_top - dz_slope).mm),
  Geom::Point3d.new(7220.mm, 107207.mm, (z_top - dz_slope - 2.0).mm),
  Geom::Point3d.new(7220.mm, 107007.mm, (z_top - 2.0).mm),
  Geom::Point3d.new(7220.mm, 106807.mm, (z_top - dz_slope - 2.0).mm),
  Geom::Point3d.new(7220.mm, 106807.mm, (z_top - dz_slope).mm)
]
f_ngang = g_ngang.entities.add_face(pts_ngang)
len_ngang = (30470.0 - 7220.0).mm
if f_ngang.normal.x > 0
  f_ngang.pushpull(len_ngang)
else
  f_ngang.pushpull(-len_ngang)
end

# 3.2 Up_Noc_Canh_Doc
g_doc = up_noc.entities.add_group
g_doc.name = "Up_Noc_Canh_Doc"
g_doc.layer = tag_mai

dz_doc = 200.0 * 0.17833 # 35.67mm
pts_doc = [
  Geom::Point3d.new(7220.mm, 107007.mm, z_top.mm),
  Geom::Point3d.new(7420.mm, 107007.mm, (z_top - dz_doc).mm),
  Geom::Point3d.new(7420.mm, 107007.mm, (z_top - dz_doc - 2.0).mm),
  Geom::Point3d.new(7220.mm, 107007.mm, (z_top - 2.0).mm),
  Geom::Point3d.new(7020.mm, 107007.mm, (z_top - dz_doc - 2.0).mm),
  Geom::Point3d.new(7020.mm, 107007.mm, (z_top - dz_doc).mm)
]
f_doc = g_doc.entities.add_face(pts_doc)
len_doc = (133257.0 - 107007.0).mm
if f_doc.normal.y > 0
  f_doc.pushpull(len_doc)
else
  f_doc.pushpull(-len_doc)
end

# 3.3 Up_Noc_Song_Mai_Xien
g_hip = up_noc.entities.add_group
g_hip.name = "Up_Noc_Song_Mai_Xien"
g_hip.layer = tag_mai

# Chạy chéo dọc theo sống nghiêng từ (4070, 102857, 3755) lên (7220, 107007, 4403)
p_hip_s = Geom::Point3d.new(4070.mm, 102857.mm, 3755.mm)
p_hip_e = Geom::Point3d.new(7220.mm, 107007.mm, 4403.mm)
vec_hip = p_hip_e - p_hip_s
len_hip = vec_hip.length
u_hip = vec_hip.normalize
v_side = Geom::Vector3d.new(-u_hip.y, u_hip.x, 0).normalize
w_cap = 200.mm

c0 = p_hip_s - Geom::Vector3d.new(v_side.x * w_cap/2, v_side.y * w_cap/2, 0)
c1 = p_hip_s + Geom::Vector3d.new(v_side.x * w_cap/2, v_side.y * w_cap/2, 0)
c2 = c1 + Geom::Vector3d.new(0, 0, 5.mm)
c3 = c0 + Geom::Vector3d.new(0, 0, 5.mm)

f_hip = g_hip.entities.add_face(c0, c1, c2, c3)
if f_hip.normal.dot(u_hip) > 0
  f_hip.pushpull(len_hip)
else
  f_hip.pushpull(-len_hip)
end

# Đảm bảo ton transformation là Identity
ton.transformation = Geom::Transformation.new

model.commit_operation

{
  total_upright_purlins: purlins_count,
  roof_bounds_z: [ton.bounds.min.z.to_mm.round(1), ton.bounds.max.z.to_mm.round(1)],
  up_noc_ngang_z: [g_ngang.bounds.min.z.to_mm.round(1), g_ngang.bounds.max.z.to_mm.round(1)]
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== KẾT QUẢ DỰNG XÀ GỒ C100 ĐỨNG & ĐỒNG BỘ MÁI ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

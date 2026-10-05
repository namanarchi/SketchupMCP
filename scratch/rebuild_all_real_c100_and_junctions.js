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
model.start_operation("Rebuild Real C100 Purlins and L-Junction Framing", true)

kho = model.entities.find { |e| e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
keo_group = kho.entities.find { |e| e.name =~ /He_Keo/i }
xago_group = kho.entities.find { |e| e.name =~ /He_Xa_Go/i }

tag_xago = model.layers["BSQ-KHO-BAI-XA-GO-MAI"] || model.layers.add("BSQ-KHO-BAI-XA-GO-MAI")
tag_keo = model.layers["BSQ-KHO-BAI-KHUNG-VI-KEO"] || model.layers.add("BSQ-KHO-BAI-KHUNG-VI-KEO")

# =========================================================================
# 1. BỔ SUNG THANH KÈO SỐNG NGHIÊNG (HIP) VÀ XỐI ÂM (VALLEY) VÀO Keo_Khung_Giao_Chu_L
# =========================================================================
kg = keo_group.entities.find { |e| e.name =~ /Giao/i }
if kg
  kg.entities.clear!
  
  # Hàm tạo thanh kèo dầm hộp 60x120 giữa 2 điểm p0 và p1
  def add_beam_between(parent, name, tag, p0, p1, width_mm, height_mm)
    g = parent.entities.add_group
    g.name = name
    g.layer = tag
    
    vec = p1 - p0
    len = vec.length
    u_dir = vec.normalize
    
    # Tìm vector ngang vuông góc u_dir và song song mặt phẳng Z (hoặc gần ngang)
    v_horiz = Geom::Vector3d.new(-u_dir.y, u_dir.x, 0).normalize
    # Vector đứng vuông góc với u_dir và v_horiz
    v_vert = u_dir * v_horiz
    
    w = width_mm.mm
    h = height_mm.mm
    
    # 4 góc mặt cắt tại p0: tâm ở p0
    c0 = p0 - Geom::Vector3d.new(v_horiz.x * w/2, v_horiz.y * w/2, v_horiz.z * w/2)
    c1 = p0 + Geom::Vector3d.new(v_horiz.x * w/2, v_horiz.y * w/2, v_horiz.z * w/2)
    c2 = c1 + Geom::Vector3d.new(v_vert.x * h, v_vert.y * h, v_vert.z * h)
    c3 = c0 + Geom::Vector3d.new(v_vert.x * h, v_vert.y * h, v_vert.z * h)
    
    f = g.entities.add_face(c0, c1, c2, c3)
    if f.normal.dot(u_dir) > 0
      f.pushpull(len)
    else
      f.pushpull(-len)
    end
    g
  end
  
  # Kèo sống nghiêng Hip: từ góc ngoài (4220, 103007, 3715) lên đỉnh nóc giao (7220, 107007, 4250)
  p_hip_start = Geom::Point3d.new(4220.mm, 103007.mm, 3715.mm)
  p_hip_end = Geom::Point3d.new(7220.mm, 107007.mm, 4250.mm)
  add_beam_between(kg, "Keo_Goc_Song_Xien_Hip_60x120", tag_keo, p_hip_start, p_hip_end, 60, 120)
  
  # Kèo xối âm Valley: từ góc trong (10220, 111007, 3715) lên đỉnh nóc giao (7220, 107007, 4250)
  p_val_start = Geom::Point3d.new(10220.mm, 111007.mm, 3715.mm)
  p_val_end = Geom::Point3d.new(7220.mm, 107007.mm, 4250.mm)
  add_beam_between(kg, "Keo_Goc_Xoi_Am_Valley_60x120", tag_keo, p_val_start, p_val_end, 60, 120)
end

# =========================================================================
# 2. DỰNG LẠI TOÀN BỘ XÀ GỒ THÉP CHỮ C C100x50x15x1.2mm THẬT (SOLID MANIFOLD)
# =========================================================================
xago_group.entities.clear!

# Hàm tạo xà gồ C100x50x15x1.2mm thật (12 đỉnh tiết diện mạ kẽm thành 1.2mm)
def create_real_c100_purlin(parent, name, tag, p_start, vec_up_slope, vec_normal_roof, vec_length, length_mm)
  g = parent.entities.add_group
  g.name = name
  g.layer = tag
  
  u = vec_up_slope.normalize
  n = vec_normal_roof.normalize
  l = vec_length.normalize
  
  def pt(p0, u, n, u_val, n_val)
    p0 + Geom::Vector3d.new(u.x * u_val.mm, u.y * u_val.mm, u.z * u_val.mm) + Geom::Vector3d.new(n.x * n_val.mm, n.y * n_val.mm, n.z * n_val.mm)
  end
  
  pts_2d = [
    [0.0, 0.0],
    [100.0, 0.0],
    [100.0, 50.0],
    [85.0, 50.0],
    [85.0, 48.8],
    [98.8, 48.8],
    [98.8, 1.2],
    [1.2, 1.2],
    [1.2, 48.8],
    [15.0, 48.8],
    [15.0, 50.0],
    [0.0, 50.0]
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

purlins_summary = []

# --- 2.1 NHÁNH NGANG CHÍNH: X in [10220, 30370] (dài 20150mm) ---
len_ngang_main = 20150.0
vec_l_x = Geom::Vector3d.new(1, 0, 0)
slope_ngang = (4250.0 - 3715.0) / 4000.0 # 0.13375

v_up_nam = Geom::Vector3d.new(0, 1, slope_ngang).normalize
v_norm_nam = Geom::Vector3d.new(0, -slope_ngang, 1).normalize

v_up_bac = Geom::Vector3d.new(0, -1, slope_ngang).normalize
v_norm_bac = Geom::Vector3d.new(0, slope_ngang, 1).normalize

# Mái Nam chính
y_nam = [103200.0, 104000.0, 104800.0, 105600.0, 106400.0]
y_nam.each_with_index do |y, i|
  z_k = 3715.0 + (y - 103007.0) * slope_ngang
  p_start = Geom::Point3d.new(10220.mm, y.mm, z_k.mm)
  g = create_real_c100_purlin(xago_group, "XaGo_C100_Ngang_Nam_#{i+1}", tag_xago, p_start, v_up_nam, v_norm_nam, vec_l_x, len_ngang_main)
  purlins_summary << g.name
end

# Mái Bắc chính
y_bac = [110800.0, 110000.0, 109200.0, 108400.0, 107600.0]
y_bac.each_with_index do |y, i|
  z_k = 3715.0 + (111007.0 - y) * slope_ngang
  p_start = Geom::Point3d.new(10220.mm, y.mm, z_k.mm)
  g = create_real_c100_purlin(xago_group, "XaGo_C100_Ngang_Bac_#{i+1}", tag_xago, p_start, v_up_bac, v_norm_bac, vec_l_x, len_ngang_main)
  purlins_summary << g.name
end

# --- 2.2 NHÁNH DỌC CHÍNH: Y in [111007, 133157] (dài 22150mm) ---
len_doc_main = 22150.0
vec_l_y = Geom::Vector3d.new(0, 1, 0)
slope_doc = (4250.0 - 3715.0) / 3000.0 # 0.17833

v_up_tay = Geom::Vector3d.new(1, 0, slope_doc).normalize
v_norm_tay = Geom::Vector3d.new(-slope_doc, 0, 1).normalize

v_up_dong = Geom::Vector3d.new(-1, 0, slope_doc).normalize
v_norm_dong = Geom::Vector3d.new(slope_doc, 0, 1).normalize

# Mái Tây chính
x_tay = [4450.0, 5150.0, 5850.0, 6550.0]
x_tay.each_with_index do |x, i|
  z_k = 3715.0 + (x - 4220.0) * slope_doc
  p_start = Geom::Point3d.new(x.mm, 111007.mm, z_k.mm)
  g = create_real_c100_purlin(xago_group, "XaGo_C100_Doc_Tay_#{i+1}", tag_xago, p_start, v_up_tay, v_norm_tay, vec_l_y, len_doc_main)
  purlins_summary << g.name
end

# Mái Đông chính
x_dong = [9990.0, 9290.0, 8590.0, 7890.0]
x_dong.each_with_index do |x, i|
  z_k = 3715.0 + (10220.0 - x) * slope_doc
  p_start = Geom::Point3d.new(x.mm, 111007.mm, z_k.mm)
  g = create_real_c100_purlin(xago_group, "XaGo_C100_Doc_Dong_#{i+1}", tag_xago, p_start, v_up_dong, v_norm_dong, vec_l_y, len_doc_main)
  purlins_summary << g.name
end

# =========================================================================
# 3. KẾT CẤU XÀ GỒ ĐOẠN BẺ GÓC GIAO MÁI CHỮ L (JACK PURLINS ĐÚNG KỸ THUẬT)
# =========================================================================

# --- 3.1 XÀ GỒ MÁI NAM GIAO SỐNG NGHIÊNG HIP ---
# Chạy theo +X từ X_hip(y) đến X = 10220mm
# X_hip(y) = 4220 + 0.75 * (y - 103007)
y_nam.each_with_index do |y, i|
  x_hip = 4220.0 + 0.75 * (y - 103007.0)
  len = 10220.0 - x_hip
  z_k = 3715.0 + (y - 103007.0) * slope_ngang
  p_start = Geom::Point3d.new(x_hip.mm, y.mm, z_k.mm)
  g = create_real_c100_purlin(xago_group, "XaGo_C100_Giao_Nam_Hip_#{i+1}", tag_xago, p_start, v_up_nam, v_norm_nam, vec_l_x, len)
  purlins_summary << g.name
end

# --- 3.2 XÀ GỒ MÁI TÂY GIAO SỐNG NGHIÊNG HIP ---
# Chạy theo +Y từ Y_hip(x) đến Y = 111007mm
# Y_hip(x) = 103007 + (x - 4220) / 0.75
x_tay.each_with_index do |x, i|
  y_hip = 103007.0 + (x - 4220.0) / 0.75
  len = 111007.0 - y_hip
  z_k = 3715.0 + (x - 4220.0) * slope_doc
  p_start = Geom::Point3d.new(x.mm, y_hip.mm, z_k.mm)
  g = create_real_c100_purlin(xago_group, "XaGo_C100_Giao_Tay_Hip_#{i+1}", tag_xago, p_start, v_up_tay, v_norm_tay, vec_l_y, len)
  purlins_summary << g.name
end

# --- 3.3 XÀ GỒ MÁI BẮC GIAO XỐI ÂM VALLEY ---
# Chạy theo +X từ X_val(y) đến X = 10220mm
# X_val(y) = 7220 + 0.75 * (y - 107007)
y_bac_val = [107600.0, 108400.0, 109200.0, 110000.0]
y_bac_val.each_with_index do |y, i|
  x_val = 7220.0 + 0.75 * (y - 107007.0)
  len = 10220.0 - x_val
  z_k = 3715.0 + (111007.0 - y) * slope_ngang
  p_start = Geom::Point3d.new(x_val.mm, y.mm, z_k.mm)
  g = create_real_c100_purlin(xago_group, "XaGo_C100_Giao_Bac_Valley_#{i+1}", tag_xago, p_start, v_up_bac, v_norm_bac, vec_l_x, len)
  purlins_summary << g.name
end

# --- 3.4 XÀ GỒ MÁI ĐÔNG GIAO XỐI ÂM VALLEY ---
# Chạy theo +Y từ Y_val(x) đến Y = 111007mm
# Y_val(x) = 107007 + (x - 7220) / 0.75
x_dong_val = [7890.0, 8590.0, 9290.0]
x_dong_val.each_with_index do |x, i|
  y_val = 107007.0 + (x - 7220.0) / 0.75
  len = 111007.0 - y_val
  z_k = 3715.0 + (10220.0 - x) * slope_doc
  p_start = Geom::Point3d.new(x.mm, y_val.mm, z_k.mm)
  g = create_real_c100_purlin(xago_group, "XaGo_C100_Giao_Dong_Valley_#{i+1}", tag_xago, p_start, v_up_dong, v_norm_dong, vec_l_y, len)
  purlins_summary << g.name
end

model.commit_operation

{
  total_purlins_created: purlins_summary.size,
  kg_children: kg ? kg.entities.count : 0,
  purlins_sample: purlins_summary.first(10)
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== KẾT QUẢ DỰNG XÀ GỒ C100 THẬT & GIAO MÁI L ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

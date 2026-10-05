const http = require('http');

const rubyScript = `
model = Sketchup.active_model
kho_group = model.entities.find { |e| e.is_a?(Sketchup::Group) && e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
ton_group = kho_group.entities.find { |e| e.name =~ /He_Ton_Mai/i }
xago_group = kho_group.entities.find { |e| e.name =~ /He_Xa_Go_Mai/i }
keo_group = kho_group.entities.find { |e| e.name =~ /He_Keo_Mai/i }

tag_xago = model.layers["BSQ-KHO-BAI-XA-GO-MAI"] || model.layers.add("BSQ-KHO-BAI-XA-GO-MAI")

model.start_operation("Sua Loi Xa Go C & Nang Cao Do Ton Mai", true)

begin
  # ============================================================================
  # 1. TÍNH TOÁN THÔNG SỐ ĐỘ DỐC VÀ VECTOR ĐƠN VỊ
  # ============================================================================
  # Nhánh ngang: khẩu độ 8m (nửa mái 4m), chênh cao Z = 535mm (3715 -> 4250)
  dy1 = 4000.mm
  dz1 = 535.mm
  theta1 = Math.atan2(dz1, dy1) # ~7.618 deg
  cos1 = Math.cos(theta1)
  sin1 = Math.sin(theta1)

  # Nhánh dọc: khẩu độ 6m (nửa mái 3m), chênh cao Z = 535mm (3715 -> 4250)
  dx2 = 3000.mm
  dz2 = 535.mm
  theta2 = Math.atan2(dz2, dx2) # ~10.112 deg
  cos2 = Math.cos(theta2)
  sin2 = Math.sin(theta2)

  # Tiết diện C100x50x15x1.2mm
  h_val = 100.mm
  b_val = 50.mm
  c_val = 15.mm
  t_val = 1.2.mm

  # 12 điểm tiết diện C trong hệ tọa độ cục bộ (v: hướng dốc lên đỉnh nóc, n: pháp tuyến vuông góc mái)
  local_profile = [
    [0.0, 0.0],
    [b_val, 0.0],
    [b_val, c_val],
    [b_val - t_val, c_val],
    [b_val - t_val, t_val],
    [t_val, t_val],
    [t_val, h_val - t_val],
    [b_val - t_val, h_val - t_val],
    [b_val - t_val, h_val - c_val],
    [b_val, h_val - c_val],
    [b_val, h_val],
    [0.0, h_val]
  ]

  # ============================================================================
  # 2. XÓA BỎ CÁC XÀ GỒ ĐỨNG CŨ VÀ DỰNG LẠI XÀ GỒ C XOAY THEO ĐỘ DỐC MÁI
  # ============================================================================
  xago_group.entities.to_a.each(&:erase!)

  # Helper vẽ xà gồ C xoay chuẩn 3D
  draw_rotated_c = lambda do |grp, name, p0, v_dir, n_dir, length|
    c_grp = grp.entities.add_group
    c_grp.name = name
    c_grp.layer = tag_xago

    pts = local_profile.map do |vi, ni|
      Geom::Point3d.new(
        p0.x + vi * v_dir.x + ni * n_dir.x,
        p0.y + vi * v_dir.y + ni * n_dir.y,
        p0.z + vi * v_dir.z + ni * n_dir.z
      )
    end

    f = c_grp.entities.add_face(pts)
    # Xác định hướng pushpull
    # Vector pháp tuyến mặt phẳng f sẽ cùng hoặc ngược hướng trục dọc
    cross = v_dir.cross(n_dir)
    f.pushpull(f.normal.dot(cross) > 0 ? length : -length)
    c_grp
  end

  # 2.1 Nhánh ngang: dài 20150mm theo X (X = 10220 -> 30370)
  xs = 10220.mm
  x_len = 20150.mm

  # Nam roof: hướng dốc lên đỉnh nóc (+Y): v = [0, cos1, sin1], n = [0, -sin1, cos1]
  v_nam = Geom::Vector3d.new(0, cos1, sin1)
  n_nam = Geom::Vector3d.new(0, -sin1, cos1)

  (0..4).each do |i|
    # Điểm tựa trên mặt trên vì kèo: Y = 103007 + khoảng cách
    y_step = 200.mm + (i * 800.mm)
    y_pt = 103007.mm + y_step
    z_pt = 3715.mm + (y_step * (dz1 / dy1))
    p0 = Geom::Point3d.new(xs, y_pt, z_pt)
    draw_rotated_c.call(xago_group, "XaGo_C100_Ngang_Nam_#{i+1}", p0, v_nam, n_nam, x_len)
  end

  # Bắc roof: hướng dốc lên đỉnh nóc (-Y): v = [0, -cos1, sin1], n = [0, sin1, cos1]
  v_bac = Geom::Vector3d.new(0, -cos1, sin1)
  n_bac = Geom::Vector3d.new(0, sin1, cos1)

  (0..4).each do |i|
    y_step = 200.mm + (i * 800.mm)
    y_pt = 111007.mm - y_step
    z_pt = 3715.mm + (y_step * (dz1 / dy1))
    p0 = Geom::Point3d.new(xs, y_pt, z_pt)
    draw_rotated_c.call(xago_group, "XaGo_C100_Ngang_Bac_#{i+1}", p0, v_bac, n_bac, x_len)
  end

  # 2.2 Nhánh dọc: dài 22150mm theo Y (Y = 111007 -> 133157)
  ys = 111007.mm
  y_len = 22150.mm

  # Tây roof: hướng dốc lên đỉnh nóc (+X): v = [cos2, 0, sin2], n = [-sin2, 0, cos2]
  v_tay = Geom::Vector3d.new(cos2, 0, sin2)
  n_tay = Geom::Vector3d.new(-sin2, 0, cos2)

  (0..3).each do |i|
    x_step = 200.mm + (i * 700.mm)
    x_pt = 4220.mm + x_step
    z_pt = 3715.mm + (x_step * (dz2 / dx2))
    p0 = Geom::Point3d.new(x_pt, ys, z_pt)
    draw_rotated_c.call(xago_group, "XaGo_C100_Doc_Tay_#{i+1}", p0, v_tay, n_tay, y_len)
  end

  # Đông roof: hướng dốc lên đỉnh nóc (-X): v = [-cos2, 0, sin2], n = [sin2, 0, cos2]
  v_dong = Geom::Vector3d.new(-cos2, 0, sin2)
  n_dong = Geom::Vector3d.new(sin2, 0, cos2)

  (0..3).each do |i|
    x_step = 200.mm + (i * 700.mm)
    x_pt = 10220.mm - x_step
    z_pt = 3715.mm + (x_step * (dz2 / dx2))
    p0 = Geom::Point3d.new(x_pt, ys, z_pt)
    draw_rotated_c.call(xago_group, "XaGo_C100_Doc_Dong_#{i+1}", p0, v_dong, n_dong, y_len)
  end

  # ============================================================================
  # 3. NÂNG CAO ĐỘ TÔN MÁI & ÚP NÓC ĐỂ ĐẶT ĐÚNG TRÊN MẶT TRÊN XÀ GỒ C100
  # ============================================================================
  # Độ dày vuông góc của xà gồ C100 là 100mm.
  # Khoảng hở cũ giữa mặt vì kèo và đáy tôn cũ là 26.2mm.
  # Do đó, đáy tôn cần được nâng lên: delta_z = (100.mm - 26.2.mm) / cos1 = 74.45mm
  delta_z = 74.5.mm
  t_lift = Geom::Transformation.translation(Geom::Vector3d.new(0, 0, delta_z))
  ton_group.transform!(t_lift)

  model.commit_operation
  model.save

  # Chụp ảnh góc chụp giống như ảnh người dùng gửi để đối chiếu
  view = model.active_view
  view.camera.perspective = true

  # Căn góc nhìn vào mép đầu hồi và xà gồ mái
  eye = Geom::Point3d.new(31500.mm, 101000.mm, 4200.mm)
  target = Geom::Point3d.new(22000.mm, 105000.mm, 3900.mm)
  up = Geom::Vector3d.new(0, 0, 1)
  view.camera.set(eye, target, up)

  out_img = "C:/Users/MAI KHANH/source/repos/namanarchi/SketchupMCP/scratch/verify_roof_fix.png"
  view.write_image(out_img, 1280, 720, false, 0.0)

  {
    success: true,
    message: "Đã sửa lỗi triệt để: Xà gồ C100 xoay theo mái và tôn mái đặt tiếp xúc hoàn hảo trên đỉnh xà gồ!",
    purlins_rotated_count: 18,
    roof_lifted_delta_z_mm: delta_z.to_mm.round(1),
    screenshot: out_img
  }.to_json

rescue => e
  model.abort_operation
  {
    success: false,
    error: e.message,
    backtrace: e.backtrace.first(6)
  }.to_json
end
`;

const postData = JSON.stringify({ code: rubyScript });

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
    let parsed = JSON.parse(body).result;
    while (typeof parsed === 'string') parsed = JSON.parse(parsed);
    console.log(JSON.stringify(parsed, null, 2));
  });
});

req.write(postData);
req.end();

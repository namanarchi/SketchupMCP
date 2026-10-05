const http = require('http');
const fs = require('fs');
const path = require('path');

const rubyScript = `
model = Sketchup.active_model
model.start_operation("Cap Nhat He Mai & Giang Vach Kho Bai", true)

begin
  kho_group = model.entities.find { |e| e.is_a?(Sketchup::Group) && e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
  raise "Không tìm thấy Group KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" unless kho_group

  # ============================================================================
  # 1. KHỞI TẠO BỘ TAG PHÂN KHU CHUYÊN BIỆT CHO KHO BÃI & ĐỒNG BỘ SCENE
  # ============================================================================
  tag_names = {
    xago: "BSQ-KHO-BAI-XA-GO-MAI",
    keo: "BSQ-KHO-BAI-KHUNG-VI-KEO",
    cot_dam: "BSQ-KHO-BAI-COT-THEP",
    giang_vach: "BSQ-KHO-BAI-GIANG-VACH",
    mai_ton: "BSQ-KHO-BAI-MAI-TON",
    vach_ton: "BSQ-KHO-BAI-VACH-TON",
    san_bt: "BSQ-KHO-BAI-SAN-BE-TONG"
  }

  tags = {}
  tag_names.each do |k, name|
    l = model.layers[name] || model.layers.add(name)
    tags[k] = l
  end

  # Đồng bộ hóa hiển thị trên 31 Scenes:
  # - Các Scene KTX, Cantin, NVS: Ẩn các tag Kho Bãi
  # - Các Scene Kho Bãi: Bật các tag Kho Bãi
  # - Scene Tổng thể: Bật mai_ton, vach_ton, san_bt, cot_dam; ẩn xago, giang_vach
  model.pages.each do |page|
    pname = page.name.downcase
    is_other_zone = pname =~ /(ktx|ctin|cantin|nvs|bth)/
    is_kho_zone = pname =~ /(kho|gia cong|bai)/
    is_toan_bo = pname =~ /(toan bo|tong the|dinh vi|mbktx)/

    if is_other_zone
      tags.values.each { |l| page.set_visibility(l, false) }
    elsif is_kho_zone
      tags.values.each { |l| page.set_visibility(l, true) }
    elsif is_toan_bo
      page.set_visibility(tags[:mai_ton], true)
      page.set_visibility(tags[:vach_ton], true)
      page.set_visibility(tags[:san_bt], true)
      page.set_visibility(tags[:cot_dam], true)
      page.set_visibility(tags[:keo], false)
      page.set_visibility(tags[:xago], false)
      page.set_visibility(tags[:giang_vach], false)
    end
  end

  # ============================================================================
  # 2. XÓA BỎ QUA_GIANG_DAY VÀ CHONG_DUNG_DINH TRONG TOÀN BỘ VÌ KÈO
  # ============================================================================
  keo_group = kho_group.entities.find { |e| e.name =~ /He_Keo_Mai/i }
  removed_count = 0
  if keo_group
    keo_group.layer = tags[:keo]
    keo_group.entities.each do |sub|
      next unless sub.is_a?(Sketchup::Group) || sub.is_a?(Sketchup::ComponentInstance)
      sub.layer = tags[:keo]
      inner = sub.is_a?(Sketchup::Group) ? sub.entities : sub.definition.entities
      to_remove = inner.select do |e|
        (e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)) && (e.name =~ /(qua_giang_day|chong_dung_dinh)/i)
      end
      to_remove.each do |r|
        r.erase!
        removed_count += 1
      end
    end
  end

  # ============================================================================
  # 3. DỰNG LẠI DẦM BIÊN EAVE (50x100x1.8) VÀ DẦM ĐỈNH NÓC (60x120x2.0 ĐỨNG)
  # ============================================================================
  dam_group = kho_group.entities.find { |e| e.name =~ /He_Dam_Giang_Doc_ST1/i }
  if dam_group
    dam_group.layer = tags[:cot_dam]
    # Xóa các dầm cũ
    old_beams = dam_group.entities.to_a
    old_beams.each(&:erase!)

    # Helper vẽ hộp thép chuẩn
    draw_box = lambda do |grp, name, x1, y1, z1, x2, y2, z2, layer|
      dx = (x2 - x1).abs
      dy = (y2 - y1).abs
      dz = (z2 - z1).abs
      min_x = [x1, x2].min
      min_y = [y1, y2].min
      min_z = [z1, z2].min

      b_grp = grp.entities.add_group
      b_grp.name = name
      b_grp.layer = layer

      # Vẽ mặt đáy tại min_z
      pts = [
        Geom::Point3d.new(min_x, min_y, min_z),
        Geom::Point3d.new(min_x + dx, min_y, min_z),
        Geom::Point3d.new(min_x + dx, min_y + dy, min_z),
        Geom::Point3d.new(min_x, min_y + dy, min_z)
      ]
      f = b_grp.entities.add_face(pts)
      f.pushpull(f.normal.z > 0 ? dz : -dz)
      b_grp
    end

    # 3.1 Dầm biên Eave Nam: 50x100 (rộng 50 theo Y, cao 100 theo Z: 3575 -> 3675)
    draw_box.call(dam_group, "Dam_Doc_ST1_Eave_Nam", 10220.mm, 103077.mm, 3575.mm, 30220.mm, 103127.mm, 3675.mm, tags[:cot_dam])

    # 3.2 Dầm biên Eave Bắc: 50x100 (rộng 50 theo Y, cao 100 theo Z: 3575 -> 3675)
    draw_box.call(dam_group, "Dam_Doc_ST1_Eave_Bac", 10220.mm, 110887.mm, 3575.mm, 30220.mm, 110937.mm, 3675.mm, tags[:cot_dam])

    # 3.3 Dầm biên Eave Tây: 50x100 (rộng 50 theo X: 4260 -> 4310, cao 100 theo Z: 3575 -> 3675)
    draw_box.call(dam_group, "Dam_Doc_ST1_Eave_Tay", 4260.mm, 111007.mm, 3575.mm, 4310.mm, 133007.mm, 3675.mm, tags[:cot_dam])

    # 3.4 Dầm biên Eave Đông: 50x100 (rộng 50 theo X: 10130 -> 10180, cao 100 theo Z: 3575 -> 3675)
    draw_box.call(dam_group, "Dam_Doc_ST1_Eave_Dong", 10130.mm, 111007.mm, 3575.mm, 10180.mm, 133007.mm, 3675.mm, tags[:cot_dam])

    # 3.5 Dầm đỉnh nóc Ngang: 60x120 ĐẶT ĐỨNG CẠNH 120 (rộng 60 theo Y: 106977 -> 107037, cao 120 theo Z: 4130 -> 4250)
    draw_box.call(dam_group, "Dam_Doc_ST1_Dinh_Noc_Ngang", 10220.mm, 106977.mm, 4130.mm, 30220.mm, 107037.mm, 4250.mm, tags[:cot_dam])

    # 3.6 Dầm đỉnh nóc Dọc: 60x120 ĐẶT ĐỨNG CẠNH 120 (rộng 60 theo X: 7190 -> 7250, cao 120 theo Z: 4130 -> 4250)
    draw_box.call(dam_group, "Dam_Doc_ST1_Dinh_Noc_Doc", 7190.mm, 111007.mm, 4130.mm, 7250.mm, 133007.mm, 4250.mm, tags[:cot_dam])
  end

  # ============================================================================
  # 4. THAY THẾ XÀ GỒ MÁI MẠ KẼM CHỮ C (C100x50x15x1.2mm)
  # ============================================================================
  xago_group = kho_group.entities.find { |e| e.name =~ /He_Xa_Go_Mai/i }
  if xago_group
    xago_group.name = "He_Xa_Go_Mai_C100x50x15x1.2"
    xago_group.layer = tags[:xago]
    old_purlins = xago_group.entities.to_a
    old_purlins.each(&:erase!)

    # Helper vẽ xà gồ C dọc phương X (nhánh ngang)
    draw_c_purlin_x = lambda do |grp, name, x_start, x_end, y_pos, z_pos, is_south|
      length = (x_end - x_start).abs
      min_x = [x_start, x_end].min
      p_grp = grp.entities.add_group
      p_grp.name = name
      p_grp.layer = tags[:xago]

      # Tiết diện chữ C (H=100mm theo phương nghiêng/đứng, B=50mm, C=15mm, t=1.2mm)
      # Để đơn giản và chính xác kết cấu, vẽ profile C trên mặt phẳng YZ rồi pushpull theo X
      h = 100.mm
      b = 50.mm
      c_lip = 15.mm
      t = 1.2.mm

      # Tọa độ tương đối trên YZ
      sign_y = is_south ? 1 : -1
      pts_profile = [
        Geom::Point3d.new(min_x, y_pos, z_pos),
        Geom::Point3d.new(min_x, y_pos + sign_y * b, z_pos),
        Geom::Point3d.new(min_x, y_pos + sign_y * b, z_pos + c_lip),
        Geom::Point3d.new(min_x, y_pos + sign_y * (b - t), z_pos + c_lip),
        Geom::Point3d.new(min_x, y_pos + sign_y * (b - t), z_pos + t),
        Geom::Point3d.new(min_x, y_pos + sign_y * t, z_pos + t),
        Geom::Point3d.new(min_x, y_pos + sign_y * t, z_pos + (h - t)),
        Geom::Point3d.new(min_x, y_pos + sign_y * (b - t), z_pos + (h - t)),
        Geom::Point3d.new(min_x, y_pos + sign_y * (b - t), z_pos + (h - c_lip)),
        Geom::Point3d.new(min_x, y_pos + sign_y * b, z_pos + (h - c_lip)),
        Geom::Point3d.new(min_x, y_pos + sign_y * b, z_pos + h),
        Geom::Point3d.new(min_x, y_pos, z_pos + h)
      ]
      face = p_grp.entities.add_face(pts_profile)
      face.pushpull(face.normal.x > 0 ? length : -length)
      p_grp
    end

    # Helper vẽ xà gồ C dọc phương Y (nhánh dọc)
    draw_c_purlin_y = lambda do |grp, name, y_start, y_end, x_pos, z_pos, is_west|
      length = (y_end - y_start).abs
      min_y = [y_start, y_end].min
      p_grp = grp.entities.add_group
      p_grp.name = name
      p_grp.layer = tags[:xago]

      h = 100.mm
      b = 50.mm
      c_lip = 15.mm
      t = 1.2.mm

      sign_x = is_west ? 1 : -1
      pts_profile = [
        Geom::Point3d.new(x_pos, min_y, z_pos),
        Geom::Point3d.new(x_pos + sign_x * b, min_y, z_pos),
        Geom::Point3d.new(x_pos + sign_x * b, min_y, z_pos + c_lip),
        Geom::Point3d.new(x_pos + sign_x * (b - t), min_y, z_pos + c_lip),
        Geom::Point3d.new(x_pos + sign_x * (b - t), min_y, z_pos + t),
        Geom::Point3d.new(x_pos + sign_x * t, min_y, z_pos + t),
        Geom::Point3d.new(x_pos + sign_x * t, min_y, z_pos + (h - t)),
        Geom::Point3d.new(x_pos + sign_x * (b - t), min_y, z_pos + (h - t)),
        Geom::Point3d.new(x_pos + sign_x * (b - t), min_y, z_pos + (h - c_lip)),
        Geom::Point3d.new(x_pos + sign_x * b, min_y, z_pos + (h - c_lip)),
        Geom::Point3d.new(x_pos + sign_x * b, min_y, z_pos + h),
        Geom::Point3d.new(x_pos, min_y, z_pos + h)
      ]
      face = p_grp.entities.add_face(pts_profile)
      face.pushpull(face.normal.y > 0 ? length : -length)
      p_grp
    end

    # 10 đường xà gồ C nhánh ngang (5 Nam, 5 Bắc)
    xs = 10220.mm
    xe = 30370.mm
    # Nam roof (Y = 103207 -> 106407, Z = 3740 -> 4170)
    (0..4).each do |i|
      y_n = 103207.mm + (i * 800.mm)
      z_n = 3740.mm + (i * 107.mm)
      draw_c_purlin_x.call(xago_group, "XaGo_C100_Ngang_Nam_#{i+1}", xs, xe, y_n, z_n, true)
    end
    # Bac roof (Y = 110807 -> 107607, Z = 3740 -> 4170)
    (0..4).each do |i|
      y_b = 110807.mm - (i * 800.mm)
      z_b = 3740.mm + (i * 107.mm)
      draw_c_purlin_x.call(xago_group, "XaGo_C100_Ngang_Bac_#{i+1}", xs, xe, y_b, z_b, false)
    end

    # 8 đường xà gồ C nhánh dọc (4 Tây, 4 Đông)
    ys = 111007.mm
    ye = 133157.mm
    (0..3).each do |i|
      x_t = 4420.mm + (i * 700.mm)
      z_t = 3750.mm + (i * 125.mm)
      draw_c_purlin_y.call(xago_group, "XaGo_C100_Doc_Tay_#{i+1}", ys, ye, x_t, z_t, true)
    end
    (0..3).each do |i|
      x_d = 10020.mm - (i * 700.mm)
      z_d = 3750.mm + (i * 125.mm)
      draw_c_purlin_y.call(xago_group, "XaGo_C100_Doc_Dong_#{i+1}", ys, ye, x_d, z_d, false)
    end
  end

  # ============================================================================
  # 5. DỰNG HỆ GIẰNG NGANG XÀ GỒ VÁCH THÉP HỘP 50x50x1.4mm (3 TẦNG: Z=1000, 1900, 2800)
  # ============================================================================
  old_giang = kho_group.entities.find { |e| e.name =~ /He_Giang_Ngang_Xa_Go_Vach/i }
  old_giang.erase! if old_giang

  giang_group = kho_group.entities.add_group
  giang_group.name = "He_Giang_Ngang_Xa_Go_Vach_50x50"
  giang_group.layer = tags[:giang_vach]

  draw_box_fast = lambda do |grp, name, x1, y1, z1, x2, y2, z2|
    dx = (x2 - x1).abs
    dy = (y2 - y1).abs
    dz = (z2 - z1).abs
    min_x = [x1, x2].min
    min_y = [y1, y2].min
    min_z = [z1, z2].min

    b_grp = grp.entities.add_group
    b_grp.name = name
    pts = [
      Geom::Point3d.new(min_x, min_y, min_z),
      Geom::Point3d.new(min_x + dx, min_y, min_z),
      Geom::Point3d.new(min_x + dx, min_y + dy, min_z),
      Geom::Point3d.new(min_x, min_y + dy, min_z)
    ]
    f = b_grp.entities.add_face(pts)
    f.pushpull(f.normal.z > 0 ? dz : -dz)
    b_grp
  end

  z_levels = [1000.mm, 1900.mm, 2800.mm]

  # 5.1 Vách Tây: L = 30m dọc theo Y in [103007, 133007], X in [4210, 4260] (dày 50mm)
  z_levels.each_with_index do |z_val, idx|
    draw_box_fast.call(
      giang_group,
      "Giang_Vach_Tay_Tang_#{idx+1}_Z#{z_val.to_mm.to_i}",
      4210.mm, 103007.mm, z_val,
      4260.mm, 133007.mm, z_val + 50.mm
    )
  end

  # 5.2 Vách Nam: L = 26m dọc theo X in [4220, 30220], Y in [103027, 103077] (dày 50mm)
  z_levels.each_with_index do |z_val, idx|
    draw_box_fast.call(
      giang_group,
      "Giang_Vach_Nam_Tang_#{idx+1}_Z#{z_val.to_mm.to_i}",
      4220.mm, 103027.mm, z_val,
      30220.mm, 103077.mm, z_val + 50.mm
    )
  end

  # 5.3 Vách Bắc đầu hồi: L = 6m dọc theo X in [4220, 10220], Y in [132932, 132982] (dày 50mm)
  z_levels.each_with_index do |z_val, idx|
    draw_box_fast.call(
      giang_group,
      "Giang_Vach_Bac_Tang_#{idx+1}_Z#{z_val.to_mm.to_i}",
      4220.mm, 132932.mm, z_val,
      10220.mm, 132982.mm, z_val + 50.mm
    )
  end

  # 5.4 Cột phụ chống võng (Wind posts / Sag struts) giữa các nhịp cột 5m - 5.5m
  # Bố trí cột phụ 50x50 tại giữa các nhịp vách Tây (Y = 113657, 119157, 124657, 130157)
  # và vách Nam (X = 17720, 22720, 27670)
  west_post_y = [113657.mm, 119157.mm, 124657.mm, 130157.mm]
  west_post_y.each_with_index do |y_p, i|
    draw_box_fast.call(
      giang_group,
      "Cot_Phu_Chong_Vong_Tay_#{i+1}",
      4210.mm, y_p, 100.mm,
      4260.mm, y_p + 50.mm, 3600.mm
    )
  end

  south_post_x = [17720.mm, 22720.mm, 27670.mm]
  south_post_x.each_with_index do |x_p, i|
    draw_box_fast.call(
      giang_group,
      "Cot_Phu_Chong_Vong_Nam_#{i+1}",
      x_p, 103027.mm, 100.mm,
      x_p + 50.mm, 103077.mm, 3600.mm
    )
  end

  # ============================================================================
  # 6. ĐỒNG BỘ TAG CHO CÁC KHỐI CÒN LẠI CỦA KHO BÃI
  # ============================================================================
  vach_group = kho_group.entities.find { |e| e.name =~ /He_Vach_Ton_Bao_Che/i }
  vach_group.layer = tags[:vach_ton] if vach_group

  ton_mai_group = kho_group.entities.find { |e| e.name =~ /He_Ton_Mai/i }
  ton_mai_group.layer = tags[:mai_ton] if ton_mai_group

  cot_group = kho_group.entities.find { |e| e.name =~ /He_Cot_Thep/i }
  cot_group.layer = tags[:cot_dam] if cot_group

  san_group = kho_group.entities.find { |e| e.name =~ /He_San_Be_Tong/i }
  san_group.layer = tags[:san_bt] if san_group

  model.commit_operation

  # Lưu mô hình
  model.save

  # Chụp ảnh trực quan kiểm tra
  view = model.active_view
  view.camera.perspective = false
  view.send_action("viewIso:") rescue Sketchup.send_action("viewIso:")
  view.zoom_extents
  out_img = "C:/Users/MAI KHANH/source/repos/namanarchi/SketchupMCP/scratch/verify_roof_update.png"
  view.write_image(out_img, 1280, 720, false, 0.0)

  {
    success: true,
    message: "Hoàn tất nâng cấp hệ mái và giằng vách Kho bãi chuẩn TCVN!",
    removed_qua_giang_chong_dung: removed_count,
    c_purlins_count: 18,
    girts_3_tiers: 9,
    wind_posts_count: west_post_y.size + south_post_x.size,
    new_tags_created: tags.keys.map { |k| tags[k].name },
    scenes_synchronized: model.pages.size,
    saved_model: model.path,
    screenshot_path: out_img
  }.to_json

rescue => e
  model.abort_operation
  {
    success: false,
    error: e.message,
    backtrace: e.backtrace.first(8)
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
  timeout: 60000
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      let parsed = JSON.parse(body).result;
      while (typeof parsed === 'string') parsed = JSON.parse(parsed);
      console.log('RESULT:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.error('Error parsing response:', e.message, body);
    }
  });
});

req.write(postData);
req.end();

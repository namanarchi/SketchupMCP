# frozen_string_literal: true
# ==============================================================================
# Script tự động tạo trọn bộ 16 trang Hồ Sơ BPTC Công Trình Tạm trên LayOut A3
# Tái sử dụng template chuẩn BSQUARE_A3_Template.layout
# ==============================================================================

require 'sketchup.rb'
require 'json'

def build_bptc_layout_document
  skp_path = Sketchup.active_model.path
  raise "Mô hình SketchUp chưa được lưu" if skp_path.nil? || skp_path.empty?

  tpl_path = "C:/Users/MAI KHANH/source/repos/namanarchi/SketchupMCP/templates/BSQUARE_A3_Template.layout"
  out_layout = "C:/Users/MAI KHANH/source/repos/namanarchi/SketchupMCP/HoSo_BPTC_CongTrinhTam_A3.layout"
  out_pdf = "C:/Users/MAI KHANH/source/repos/namanarchi/SketchupMCP/HoSo_BPTC_CongTrinhTam_A3.pdf"

  puts "==> Bắt đầu mở template: #{tpl_path}"
  doc = Layout::Document.open(tpl_path)

  # Cập nhật AutoText chung cho hồ sơ
  doc.auto_text_definitions.each do |at|
    next unless at.type == Layout::AutoTextDefinition::TYPE_CUSTOM_TEXT
    case at.name
    when "MaHS"
      at.custom_text = "2026-NVLG-PCD-AQ286.PK3-BSQ-029-BPTC-001"
    when "BSQTrienkhai"
      at.custom_text = "Antigravity AI Architect"
    when "BSQKiemtra"
      at.custom_text = "DƯƠNG QUANG MINH"
    end
  end

  # Lấy hoặc tạo layer Viewport
  layer_vp = doc.layers.find { |l| l.name == "MBDV AQUA" } || doc.layers.first
  layer_text = doc.layers.find { |l| l.name == "TEXT" } || layer_vp

  # Định nghĩa 16 bản vẽ chuẩn
  drawings = [
    {
      no: "BPTC-01",
      title: "PHỐI CẢNH 3D TỔNG THỂ KHU CÔNG TRÌNH TẠM",
      scene: "BPTC_01_3D_TONG_THE",
      scale: "1:500",
      is_3d: true,
      has_schedule: true
    },
    {
      no: "BPTC-02",
      title: "MẶT BẰNG TỔNG THỂ ĐỊNH VỊ CÔNG TRÌNH TẠM",
      scene: "BPTC_02_MB_DINH_VI",
      scale: "1:500",
      is_3d: false
    },
    {
      no: "BPTC-03",
      title: "MẶT BẰNG CỔNG, HÀNG RÀO & GIAO THÔNG NỘI BỘ",
      scene: "BPTC_03_MB_GIAO_THONG",
      scale: "1:500",
      is_3d: false
    },
    {
      no: "BPTC-04",
      title: "CHI TIẾT CỔNG CHÍNH 6M & BỐT BẢO VỆ GÁC CỔNG",
      scene: "BPTC_04_CONG_CHI_TIET",
      scale: "1:50",
      is_3d: true
    },
    {
      no: "BPTC-05",
      title: "MẶT BẰNG KÝ TÚC XÁ CÔNG NHÂN (MODULE CONTAINER)",
      scene: "BPTC_05_KTX_MB",
      scale: "1:150",
      is_3d: false
    },
    {
      no: "BPTC-06",
      title: "CÁC MẶT ĐỨNG VÀ MẶT CẮT KÝ TÚC XÁ CÔNG NHÂN",
      scene: "BPTC_06_KTX_MDUNG",
      scale: "1:150",
      is_3d: false
    },
    {
      no: "BPTC-07",
      title: "MẶT BẰNG & MẶT ĐỨNG NHÀ ĂN - CANTIN CÔNG NHÂN",
      scene: "BPTC_07_CANTIN_MB",
      scale: "1:150",
      is_3d: false
    },
    {
      no: "BPTC-08",
      title: "MẶT BẰNG KHO VẬT TƯ & BÃI GIA CÔNG CỐT THÉP",
      scene: "BPTC_08_KHO_BAI_MB",
      scale: "1:200",
      is_3d: false
    },
    {
      no: "BPTC-09",
      title: "MẶT BẰNG & MẶT CẮT KHU NHÀ VỆ SINH & BỂ TỰ HOẠI",
      scene: "BPTC_09_NVS_MB",
      scale: "1:100",
      is_3d: false
    },
    {
      no: "BPTC-10",
      title: "BIỆN PHÁP THI CÔNG NỀN HẠ & THOÁT NƯỚC MẶT",
      scene: "BPTC_10_NEN_HA_TANG",
      scale: "1:500",
      is_3d: false
    },
    {
      no: "BPTC-11",
      title: "BIỆN PHÁP CẨU LẮP DỰNG MODULE CONTAINER KTX",
      scene: "BPTC_11_CAU_LAP_KTX",
      scale: "1:200",
      is_3d: true
    },
    {
      no: "BPTC-12",
      title: "BIỆN PHÁP LẮP DỰNG KẾT CẤU THÉP BÃI GIA CÔNG",
      scene: "BPTC_12_LAP_DUNG_THEP",
      scale: "1:200",
      is_3d: true
    },
    {
      no: "BPTC-13",
      title: "SƠ ĐỒ BIỆN PHÁP CẤP ĐIỆN TẠM & CẤP THOÁT NƯỚC",
      scene: "BPTC_13_DIEN_NUOC_TAM",
      scale: "1:500",
      is_3d: false
    },
    {
      no: "BPTC-14",
      title: "TỔNG MẶT BẰNG BỐ TRÍ AN TOÀN PCCC & THOÁT HIỂM",
      scene: "BPTC_14_AN_TOAN_PCCC",
      scale: "1:500",
      is_3d: false
    },
    {
      no: "BPTC-15",
      title: "TỔ CHỨC GIAO THÔNG AN TOÀN & TRẠM RỬA XE CÔNG TRƯỜNG",
      scene: "BPTC_15_GIAO_THONG_AN_TOAN",
      scale: "1:500",
      is_3d: false
    },
    {
      no: "BPTC-16",
      title: "BIỆN PHÁP VỆ SINH MÔI TRƯỜNG & PHÂN LOẠI PHẾ LIỆU",
      scene: "BPTC_16_VE_SINH_MOI_TRUONG",
      scale: "1:200",
      is_3d: true
    }
  ]

  # Dọn sạch các entity không dùng chung trên trang đầu tiên
  first_p = doc.pages.first
  first_p.nonshared_entities.to_a.each { |e| doc.remove_entity(e) rescue nil }

  drawings.each_with_index do |d, idx|
    page = (idx == 0) ? first_p : doc.pages.add("#{d[:no]} - #{d[:title]}")
    page.name = "#{d[:no]} - #{d[:title]}"
    puts "--> Đang tạo trang #{idx + 1}/16: #{page.name}"

    # Vùng vẽ khả dụng A3 an toàn: X in [20, 355], Y in [15, 260] (Tránh khung tên X >= 364.5mm)
    vp_x = 20.0
    vp_y = 15.0
    vp_w = d[:has_schedule] ? 210.0 : 335.0
    vp_h = 245.0

    bounds = Geom::Bounds2d.new(vp_x.mm, vp_y.mm, vp_w.mm, vp_h.mm)
    viewport = Layout::SketchUpModel.new(skp_path, bounds)

    # Gán Scene
    target_scene = d[:scene]
    if viewport.scenes.include?(target_scene)
      viewport.current_scene = viewport.scenes.index(target_scene)
    else
      viewport.current_scene = 1
    end

    viewport.perspective = d[:is_3d]
    viewport.line_weight = 0.01
    viewport.render_mode = Layout::SketchUpModel::HYBRID_RENDER

    # Tỷ lệ kỹ thuật
    if !d[:is_3d] && d[:scale]
      parts = d[:scale].split(":")
      if parts.size == 2
        ratio = parts[0].to_f / parts[1].to_f
        viewport.scale = ratio
      end
    end
    viewport.preserve_scale_on_resize = true

    doc.add_entity(viewport, layer_vp, page)

    # Tiêu đề bản vẽ bên dưới khung nhìn
    t_bounds = Geom::Bounds2d.new(vp_x.mm, (vp_y + vp_h + 3.0).mm, vp_w.mm, 8.mm)
    scale_label = d[:is_3d] ? "PHỐI CẢNH 3D" : "TỶ LỆ #{d[:scale]}"
    t_box = Layout::FormattedText.new(
      "#{d[:no]}: #{d[:title].upcase} (#{scale_label})",
      t_bounds
    )
    t_box.style.font_family = "Verdana"
    t_box.style.font_size = 8.5
    t_box.style.text_bold = true
    doc.add_entity(t_box, layer_text, page)

    # Nếu có Bảng Thống Kê (Trang 1)
    if d[:has_schedule]
      tbl_x = 235.0
      tbl_y = 18.0
      tbl_w = 120.0
      tbl_h = 100.0

      items = [
        ["1", "Ký túc xá công nhân", "26 container", "380.0", "Module lắp ghép 2 tầng"],
        ["2", "Nhà ăn & Cantin tạm", "01 cụm", "180.0", "Khung thép + mái tôn"],
        ["3", "Kho vật tư tổng hợp", "01 dãy chữ L", "220.0", "Kho kín & kho hở"],
        ["4", "Bãi gia công cốt thép", "01 bãi", "350.0", "Nhà thép tiền chế"],
        ["5", "Nhà vệ sinh & Bể tự hoại", "01 cụm", "65.0", "Bể 3 ngăn tự thấm"],
        ["6", "Bốt bảo vệ gác cổng", "03 bốt", "12.0", "Panel 2x2m trắng"],
        ["7", "Cổng chính 6m ray trượt", "03 cổng", "36.0", "Tôn xanh navy hoàng gia"],
        ["8", "Hàng rào tôn sóng bao che", "L = 480m", "1150.0", "Tôn cao 2.4m móng BT"],
        ["9", "Trạm rửa xe công trường", "01 trạm", "28.8", "Bê tông rãnh lắng bùn"],
        ["10", "Điểm tập kết PCCC & Cứu hộ", "05 cụm", "-", "Bình bột ABC & CO2"]
      ]

      t_bounds = Geom::Bounds2d.new(tbl_x.mm, tbl_y.mm, tbl_w.mm, tbl_h.mm)
      table = Layout::Table.new(t_bounds, items.size + 1, 5)

      col_w = [8.mm, 42.mm, 20.mm, 18.mm, 32.mm]
      col_w.each_with_index { |w, c| table.get_column(c).width = w rescue nil }

      headers = ["STT", "HẠNG MỤC", "SỐ LƯỢNG", "DT (m²)", "GHI CHÚ"]
      table.get_row(0).height = 6.5.mm rescue nil
      headers.each_with_index do |h, c|
        cell = table[0, c]
        tb = Geom::Bounds2d.new(0, 0, col_w[c], 6.5.mm)
        txt = Layout::FormattedText.new(h, tb)
        txt.style.font_family = "Arial"
        txt.style.font_size = 7.0
        txt.style.text_bold = true
        cell.data = txt
      end

      items.each_with_index do |row, r_idx|
        r = r_idx + 1
        table.get_row(r).height = 5.5.mm rescue nil
        row.each_with_index do |val, c|
          cell = table[r, c]
          tb = Geom::Bounds2d.new(0, 0, col_w[c], 5.5.mm)
          txt = Layout::FormattedText.new(val, tb)
          txt.style.font_family = "Arial"
          txt.style.font_size = 6.5
          cell.data = txt
        end
      end

      # Tiêu đề bảng
      tbl_title = Layout::FormattedText.new(
        "BẢNG THỐNG KÊ HẠNG MỤC CÔNG TRÌNH TẠM",
        Geom::Bounds2d.new(tbl_x.mm, (tbl_y - 6.0).mm, tbl_w.mm, 5.mm)
      )
      tbl_title.style.font_family = "Arial"
      tbl_title.style.font_size = 7.5
      tbl_title.style.text_bold = true
      doc.add_entity(tbl_title, layer_text, page)
      doc.add_entity(table, layer_text, page)
    end
  end

  puts "==> Đang lưu tập tin LayOut tại: #{out_layout}"
  doc.save(out_layout)

  puts "==> Đang xuất bản file PDF tại: #{out_pdf}"
  doc.export(out_pdf) rescue puts("Xuất PDF cần thêm thời gian hoặc gọi doc.export")

  {
    success: true,
    total_pages: doc.pages.count,
    layout_path: out_layout,
    pdf_path: out_pdf,
    pdf_size_bytes: File.exist?(out_pdf) ? File.size(out_pdf) : 0
  }.to_json
end

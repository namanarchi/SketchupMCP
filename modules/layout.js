/**
 * Module SketchUp LayOut MCP (modules/layout.js)
 * Tự động hóa bản vẽ kỹ thuật kiến trúc & xây dựng (.layout) từ mô hình SketchUp 2025
 * Tuân thủ tuyệt đối quy chuẩn hồ sơ bản vẽ BSQUARE & TCVN
 */

const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const DEFAULT_TEMPLATE_PATH = path.resolve(__dirname, '../templates/BSQUARE_A3_Template.layout').replace(/\\/g, '/');

const LAYOUT_TOOLS = [
  {
    name: 'layout_get_status',
    description: 'Kiểm tra trạng thái sẵn sàng của SketchUp LayOut API, danh sách Scenes trong model 3D hiện tại, đường dẫn template mẫu chuẩn và các khổ giấy hỗ trợ.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'layout_create_drawing',
    description: 'Khởi tạo tài liệu bản vẽ LayOut (.layout) mới. ƯU TIÊN TÁI SỬ DỤNG khung tên bản vẽ chuẩn BSQUARE có sẵn (không vẽ lại từ đầu), tự động cập nhật tên bản vẽ, số hiệu, mã hồ sơ, ngày tháng và người triển khai.',
    inputSchema: {
      type: 'object',
      properties: {
        template_path: {
          type: 'string',
          description: 'Đường dẫn file .layout khung bản vẽ chuẩn mẫu (Mặc định tự nhận templates/BSQUARE_A3_Template.layout)'
        },
        file_path: {
          type: 'string',
          description: 'Đường dẫn lưu file .layout xuất xưởng'
        },
        drawing_title: {
          type: 'string',
          description: 'Tên bản vẽ kỹ thuật tiếng Việt có dấu (VD: MẶT BẰNG KÝ TÚC XÁ CÔNG NHÂN GĐ 1)'
        },
        drawing_number: {
          type: 'string',
          description: 'Số hiệu bản vẽ (VD: KT-06)'
        },
        file_code: {
          type: 'string',
          description: 'Mã hồ sơ dự án (VD: 2026-NVLG-PCD-AQ286.PK3-BSQ-029-MSS-001)'
        },
        project_name: {
          type: 'string',
          description: 'Tên dự án công trình'
        },
        scale_text: {
          type: 'string',
          description: 'Tỷ lệ ghi chú trong khung tên (VD: 1/150, 1/100, 1/50)'
        },
        designer: {
          type: 'string',
          description: 'Người triển khai thiết kế'
        },
        checker: {
          type: 'string',
          description: 'Người kiểm tra thiết kế'
        },
        paper_size: {
          type: 'string',
          enum: ['A3', 'A4', 'A2', 'A1'],
          default: 'A3',
          description: 'Khổ giấy (Mặc định A3 420x297mm)'
        }
      }
    }
  },
  {
    name: 'layout_insert_viewport',
    description: 'Chèn khung nhìn Viewport 3D từ SketchUp vào tài liệu LayOut. Hỗ trợ tự động tính tỷ lệ kiến trúc (scale: auto), tự động căn đều khoảng cách (preset), khóa nét thấy siêu mảnh chuẩn xác 0.01 và chế độ Hybrid Render.',
    inputSchema: {
      type: 'object',
      properties: {
        layout_path: {
          type: 'string',
          description: 'Đường dẫn file .layout cần chèn Viewport'
        },
        model_path: {
          type: 'string',
          description: 'Đường dẫn file .skp (mặc định lấy model đang mở trong SketchUp)'
        },
        scene_name: {
          type: 'string',
          description: 'Tên Scene cô lập cần hiển thị (ví dụ: KTX-MBT1, KTX-MBT2, KTX-MATDUNG, MBKTX-KVT-BGC...)'
        },
        scale: {
          type: 'string',
          enum: ['auto', '1:500', '1:250', '1:200', '1:150', '1:100', '1:75', '1:50', '1:25', '1:20', '1:10'],
          default: '1:150',
          description: 'Tỷ lệ kiến trúc: auto (tự động so khớp không tràn viền), hoặc tỷ lệ chuẩn cố định (1:150 khuyên dùng cho A3 KTX)'
        },
        render_mode: {
          type: 'string',
          enum: ['hybrid', 'vector', 'raster'],
          default: 'hybrid',
          description: 'Chế độ dựng hình: hybrid (khuyên dùng - nét vector sắc bén kèm texture vật liệu)'
        },
        line_weight: {
          type: 'number',
          default: 0.01,
          description: 'Độ dày nét thấy của mô hình (Mặc định 0.01 theo yêu cầu chuẩn hóa nét kiến trúc)'
        },
        layout_preset: {
          type: 'string',
          enum: ['full', 'top_half', 'bottom_half', 'left_half', 'right_half', 'quad_1', 'quad_2', 'quad_3', 'quad_4', 'custom'],
          default: 'full',
          description: 'Bố cục khung nhìn trên A3: full (toàn trang an toàn), top_half (nửa trên), bottom_half (nửa dưới - cách nhau đúng 15mm), custom (tự nhập tọa độ)'
        },
        paper_x: { type: 'number', description: 'Tọa độ X khi dùng layout_preset: custom (mm)' },
        paper_y: { type: 'number', description: 'Tọa độ Y khi dùng layout_preset: custom (mm)' },
        paper_width: { type: 'number', description: 'Chiều rộng khung khi dùng custom (mm)' },
        paper_height: { type: 'number', description: 'Chiều cao khung khi dùng custom (mm)' },
        title_text: {
          type: 'string',
          description: 'Tiêu đề bản vẽ bên dưới khung nhìn (VD: MẶT BẰNG KÝ TÚC XÁ TẦNG 1)'
        }
      },
      required: ['layout_path']
    }
  },
  {
    name: 'layout_add_schedule_table',
    description: 'Tự động tạo Bảng Thống Kê Hạng Mục (STT, Hạng Mục, Số Lượng, Diện Tích m², Ghi Chú) bằng Layout::Table chuẩn TCVN, đặt tại góc thoáng bản vẽ và không đè lên hình vẽ.',
    inputSchema: {
      type: 'object',
      properties: {
        layout_path: {
          type: 'string',
          description: 'Đường dẫn file .layout'
        },
        table_title: {
          type: 'string',
          default: 'BẢNG THỐNG KÊ HẠNG MỤC CÔNG TRÌNH TẠM',
          description: 'Tiêu đề bảng thống kê'
        },
        items: {
          type: 'array',
          description: 'Danh sách các hạng mục cần thống kê',
          items: {
            type: 'object',
            properties: {
              stt: { type: 'string', description: 'Số thứ tự (1, 2, 3...)' },
              name: { type: 'string', description: 'Tên hạng mục (Ký túc xá, Nhà ăn, Nhà vệ sinh, Kho vật tư...)' },
              quantity: { type: 'string', description: 'Số lượng (ví dụ: 26 module, 01 cụm...)' },
              area: { type: 'string', description: 'Diện tích m² (ví dụ: 460.2, 180.0...)' },
              note: { type: 'string', description: 'Ghi chú (Container 20ft/40ft, Nhà tiền chế...)' }
            },
            required: ['stt', 'name', 'quantity', 'area']
          }
        },
        position: {
          type: 'string',
          enum: ['top_right', 'top_left', 'bottom_left', 'custom'],
          default: 'top_right',
          description: 'Vị trí đặt bảng trên trang A3 (Mặc định top_right thoáng bên phải X: 215mm, Y: 18mm)'
        },
        paper_x: { type: 'number', description: 'Tọa độ X khi dùng position: custom (mm)' },
        paper_y: { type: 'number', description: 'Tọa độ Y khi dùng position: custom (mm)' }
      },
      required: ['layout_path', 'items']
    }
  },
  {
    name: 'layout_add_dimension',
    description: 'Gióng đường đo kích thước tuyến tính (Linear Dimension) kỹ thuật trên trang bản vẽ với độ dóng offset tiêu chuẩn, phông chữ nét mảnh chuyên nghiệp.',
    inputSchema: {
      type: 'object',
      properties: {
        layout_path: { type: 'string', description: 'Đường dẫn file .layout' },
        start_x: { type: 'number', description: 'Tọa độ X điểm đầu (mm)' },
        start_y: { type: 'number', description: 'Tọa độ Y điểm đầu (mm)' },
        end_x: { type: 'number', description: 'Tọa độ X điểm cuối (mm)' },
        end_y: { type: 'number', description: 'Tọa độ Y điểm cuối (mm)' },
        offset: { type: 'number', description: 'Khoảng dóng đường kích thước (mm, mặc định 10)' },
        custom_text: { type: 'string', description: 'Chữ số kích thước ghi đè (tùy chọn)' }
      },
      required: ['layout_path', 'start_x', 'start_y', 'end_x', 'end_y']
    }
  },
  {
    name: 'layout_add_callout',
    description: 'Gắn nhãn chỉ dẫn cấu kiện/vật liệu (Leader Label) kèm mũi tên chỉ điểm và hộp nội dung mô tả tiếng Việt.',
    inputSchema: {
      type: 'object',
      properties: {
        layout_path: { type: 'string', description: 'Đường dẫn file .layout' },
        target_x: { type: 'number', description: 'Tọa độ X điểm mũi tên chỉ vào (mm)' },
        target_y: { type: 'number', description: 'Tọa độ Y điểm mũi tên chỉ vào (mm)' },
        text: { type: 'string', description: 'Nội dung chú thích' },
        box_x: { type: 'number', description: 'Tọa độ X hộp chữ (mm)' },
        box_y: { type: 'number', description: 'Tọa độ Y hộp chữ (mm)' },
        box_width: { type: 'number', description: 'Chiều rộng hộp chữ (mm, mặc định 45)' },
        box_height: { type: 'number', description: 'Chiều cao hộp chữ (mm, mặc định 12)' }
      },
      required: ['layout_path', 'target_x', 'target_y', 'text', 'box_x', 'box_y']
    }
  },
  {
    name: 'layout_export_pdf',
    description: 'Xuất bản toàn bộ hồ sơ LayOut ra tập tin PDF độ phân giải cao sẵn sàng in ấn hoặc gửi nghiệm thu.',
    inputSchema: {
      type: 'object',
      properties: {
        layout_path: { type: 'string', description: 'Đường dẫn file .layout nguồn' },
        output_pdf_path: { type: 'string', description: 'Đường dẫn lưu file .pdf xuất xưởng' }
      },
      required: ['layout_path']
    }
  },
  {
    name: 'layout_open_in_gui',
    description: 'Mở trực tiếp tập tin .layout bằng ứng dụng LayOut (LayOut.exe) để kiến trúc sư xem xét và điều chỉnh đồ họa trực quan.',
    inputSchema: {
      type: 'object',
      properties: {
        layout_path: { type: 'string', description: 'Đường dẫn file .layout cần mở' }
      },
      required: ['layout_path']
    }
  },
  {
    name: 'layout_execute_ruby',
    description: 'Thực thi mã Ruby tùy biến trên SketchUp Main UI Thread can thiệp trực tiếp vào tài liệu Layout::Document.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Đoạn mã Ruby SketchUp/LayOut API cần chạy' }
      },
      required: ['code']
    }
  }
];

function parseRubyResponse(res) {
  if (!res || !res.success) {
    return res;
  }
  if (typeof res.result === 'string') {
    try {
      return JSON.parse(res.result);
    } catch (e) {
      return { raw_result: res.result };
    }
  }
  return res.result || res;
}

async function handleLayoutTool(name, args, callSketchUpBridge) {
  switch (name) {
    case 'layout_get_status': {
      const code = `
        begin
          model = Sketchup.active_model
          scenes = model ? model.pages.map(&:name) : []
          layout_defined = defined?(Layout::Document) ? true : false
          template_avail = File.exist?("${DEFAULT_TEMPLATE_PATH}")
          {
            sketchup_version: Sketchup.version,
            model_loaded: !model.nil?,
            model_name: model ? model.title : "None",
            model_path: model ? model.path : "",
            scenes: scenes,
            layout_api_available: layout_defined,
            standard_template_available: template_avail,
            standard_template_path: "${DEFAULT_TEMPLATE_PATH}",
            supported_paper_sizes: ["A4", "A3", "A2", "A1"],
            safe_bounds_a3_mm: { min_x: 15.0, max_x: 360.0, min_y: 15.0, max_y: 282.0 }
          }.to_json
        rescue => e
          { error: e.message }.to_json
        end
      `;
      const res = await callSketchUpBridge('/execute', 'POST', { code });
      return parseRubyResponse(res);
    }

    case 'layout_create_drawing': {
      let tplPath = (args.template_path || DEFAULT_TEMPLATE_PATH).replace(/\\/g, '/');
      const drawingTitle = (args.drawing_title || 'BẢN VẼ THIẾT KẾ KỸ THUẬT').replace(/"/g, '\\"');
      const drawingNumber = (args.drawing_number || 'KT-01').replace(/"/g, '\\"');
      const fileCode = (args.file_code || '2026-NVLG-PCD-AQ286.PK3-BSQ-029-MSS-001').replace(/"/g, '\\"');
      const designer = (args.designer || 'NGUYỄN VĂN HÓA').replace(/"/g, '\\"');
      const checker = (args.checker || 'DƯƠNG QUANG MINH').replace(/"/g, '\\"');
      const scaleText = (args.scale_text || '1/150').replace(/"/g, '\\"');

      const defaultSaveDir = process.cwd();
      const safeLayoutPath = (args.file_path || path.join(defaultSaveDir, `BanVe_${Date.now()}.layout`)).replace(/\\/g, '/');

      const code = `
        begin
          tpl_file = "${tplPath}"
          use_template = File.exist?(tpl_file)

          if use_template
            doc = Layout::Document.open(tpl_file)
            page = doc.pages.first
            page.name = "${drawingTitle}"

            # Cập nhật các trường AutoText tuỳ chỉnh trong khung tên chuẩn
            doc.auto_text_definitions.each do |at|
              next unless at.type == Layout::AutoTextDefinition::TYPE_CUSTOM_TEXT
              case at.name
              when "MaHS"
                at.custom_text = "${fileCode}"
              when "BSQTrienkhai"
                at.custom_text = "${designer}"
              when "BSQKiemtra"
                at.custom_text = "${checker}"
              end
            end

            # Xóa các entity không dùng chung cũ để tạo trang bản vẽ trắng sạch
            to_del = page.nonshared_entities.to_a
            to_del.each { |e| doc.remove_entity(e) rescue nil }

            doc.save("${safeLayoutPath}")
            {
              success: true,
              layout_path: "${safeLayoutPath}",
              template_used: true,
              template_path: tpl_file,
              page_name: page.name,
              title_block: "BSQUARE Standard Title Block preserved"
            }.to_json
          else
            # Khởi tạo bản vẽ mới với khung viền & khung tên TCVN
            doc = Layout::Document.new
            doc.page_info.width = 420.mm
            doc.page_info.height = 297.mm
            page = doc.pages.first
            layer = doc.layers.first

            # Khung ngoài bản vẽ (Trái 20mm, ba mép còn lại 10mm)
            border_bounds = Geom::Bounds2d.new(20.mm, 10.mm, 390.mm, 277.mm)
            border = Layout::Rectangle.new(border_bounds)
            border.style.stroke_width = 1.0
            border.style.stroke_color = Sketchup::Color.new(0, 0, 0)
            border.style.solid_filled = false
            doc.add_entity(border, layer, page)

            # Khung tên TCVN (140x32mm)
            tb_bounds = Geom::Bounds2d.new(270.mm, 255.mm, 140.mm, 32.mm)
            tb_rect = Layout::Rectangle.new(tb_bounds)
            tb_rect.style.stroke_width = 0.8
            tb_rect.style.stroke_color = Sketchup::Color.new(0, 0, 0)
            tb_rect.style.fill_color = Sketchup::Color.new(250, 250, 250)
            tb_rect.style.solid_filled = true
            doc.add_entity(tb_rect, layer, page)

            title_box = Layout::FormattedText.new(
              "TÊN BẢN VẼ: ${drawingTitle}\\nSỐ HIỆU: ${drawingNumber} | TỶ LỆ: ${scaleText}",
              Geom::Bounds2d.new(273.mm, 258.mm, 134.mm, 25.mm)
            )
            title_box.style.font_family = "Arial"
            title_box.style.font_size = 8.0
            title_box.style.text_bold = true
            doc.add_entity(title_box, layer, page)

            doc.save("${safeLayoutPath}")
            {
              success: true,
              layout_path: "${safeLayoutPath}",
              template_used: false,
              paper_size: "A3"
            }.to_json
          end
        rescue => e
          { success: false, error: e.message, backtrace: e.backtrace.first(5) }.to_json
        end
      `;

      const res = await callSketchUpBridge('/execute', 'POST', { code });
      return parseRubyResponse(res);
    }

    case 'layout_insert_viewport': {
      const layoutPath = args.layout_path.replace(/\\/g, '/');
      const sceneName = args.scene_name ? `"${args.scene_name.replace(/"/g, '\\"')}"` : 'nil';
      const scaleStr = args.scale || '1:150';
      const renderModeStr = args.render_mode || 'hybrid';
      const lineWeightVal = args.line_weight !== undefined ? args.line_weight : 0.01;
      const modelPathArg = args.model_path ? `"${args.model_path.replace(/\\/g, '/')}"` : 'nil';
      const preset = args.layout_preset || 'full';
      const titleTextArg = args.title_text ? `"${args.title_text.replace(/"/g, '\\"')}"` : 'nil';

      // Tính toán tọa độ và kích thước Viewport an toàn trên trang A3 (Vùng vẽ: X in [15, 360], Y in [15, 282])
      // Spacing giữa các khung nhìn luôn giữ chuẩn 15mm
      let x = 20.0, y = 15.0, w = 335.0, h = 255.0;

      switch (preset) {
        case 'top_half':
          x = 20.0; y = 15.0; w = 335.0; h = 115.0;
          break;
        case 'bottom_half':
          x = 20.0; y = 145.0; w = 335.0; h = 115.0; // Spacing 145 - (15 + 115) = 15mm!
          break;
        case 'left_half':
          x = 20.0; y = 15.0; w = 160.0; h = 255.0;
          break;
        case 'right_half':
          x = 195.0; y = 15.0; w = 160.0; h = 255.0; // Spacing 195 - (20 + 160) = 15mm!
          break;
        case 'quad_1': // Top-left
          x = 20.0; y = 15.0; w = 160.0; h = 115.0;
          break;
        case 'quad_2': // Top-right
          x = 195.0; y = 15.0; w = 160.0; h = 115.0;
          break;
        case 'quad_3': // Bottom-left
          x = 20.0; y = 145.0; w = 160.0; h = 115.0;
          break;
        case 'quad_4': // Bottom-right
          x = 195.0; y = 145.0; w = 160.0; h = 115.0;
          break;
        case 'custom':
          x = args.paper_x !== undefined ? args.paper_x : 20.0;
          y = args.paper_y !== undefined ? args.paper_y : 15.0;
          w = args.paper_width !== undefined ? args.paper_width : 335.0;
          h = args.paper_height !== undefined ? args.paper_height : 255.0;
          // Bảo vệ chống tràn viền
          if (x + w > 360.0) w = 360.0 - x;
          if (y + h > 282.0) h = 282.0 - y;
          break;
      }

      const code = `
        begin
          layout_file = "${layoutPath}"
          raise "Tập tin layout không tồn tại: #{layout_file}" unless File.exist?(layout_file)

          skp_path = ${modelPathArg} || Sketchup.active_model.path
          raise "Không tìm thấy đường dẫn mô hình SketchUp .skp" if skp_path.nil? || skp_path.empty?

          doc = Layout::Document.open(layout_file)
          page = doc.pages.first
          layer = doc.layers.first

          # 1. Khởi tạo Viewport với kích thước an toàn
          bounds = Geom::Bounds2d.new(${x}.mm, ${y}.mm, ${w}.mm, ${h}.mm)
          viewport = Layout::SketchUpModel.new(skp_path, bounds)

          # 2. Gán Scene
          target_scene = ${sceneName}
          if target_scene && viewport.scenes.include?(target_scene)
            viewport.current_scene = viewport.scenes.index(target_scene)
          elsif viewport.scenes.size > 1
            viewport.current_scene = 1
          end

          # 3. Thiết lập chế độ chiếu trực giao phẳng (Không bật perspective)
          viewport.perspective = false

          # 4. Tự động tính toán hoặc áp dụng tỷ lệ kỹ thuật tiêu chuẩn
          actual_scale_str = "${scaleStr}"
          if "${scaleStr}" == "auto"
            # Lấy kích thước mô hình từ bounding box
            model_b = Sketchup.active_model.bounds
            len_mm = [model_b.width.to_mm, model_b.depth.to_mm].max
            avail_w_mm = ${w} * 0.85 # Trừ lề gióng dim

            std_scales = [
              [500, 1.0/500], [250, 1.0/250], [200, 1.0/200],
              [150, 1.0/150], [100, 1.0/100], [75, 1.0/75],
              [50, 1.0/50], [25, 1.0/25], [20, 1.0/20], [10, 1.0/10]
            ]
            chosen = std_scales.find { |den, ratio| (len_mm * ratio) <= avail_w_mm } || [150, 1.0/150]
            viewport.scale = chosen[1]
            actual_scale_str = "1:#{chosen[0]}"
          else
            parts = "${scaleStr}".split(":")
            if parts.size == 2
              num = parts[0].to_f
              den = parts[1].to_f
              viewport.scale = (num / den)
            end
          end
          viewport.preserve_scale_on_resize = true

          # 5. Khóa nét thấy 0.01 theo yêu cầu chuẩn hóa
          viewport.line_weight = ${lineWeightVal}

          # 6. Chế độ Render (Mặc định Hybrid cho nét vector sắc sảo và texture trung thực)
          case "${renderModeStr}".downcase
          when "vector"
            viewport.render_mode = Layout::SketchUpModel::VECTOR_RENDER
          when "raster"
            viewport.render_mode = Layout::SketchUpModel::RASTER_RENDER
          else
            viewport.render_mode = Layout::SketchUpModel::HYBRID_RENDER
          end

          doc.add_entity(viewport, layer, page)

          # 7. Thêm tiêu đề bản vẽ bên dưới nếu được cung cấp
          t_str = ${titleTextArg}
          if t_str && !t_str.empty?
            t_x = ${x}.mm
            t_y = (${y} + ${h} + 3.0).mm
            t_box = Layout::FormattedText.new(
              "#{t_str.upcase} (TỶ LỆ #{actual_scale_str})",
              Geom::Bounds2d.new(t_x, t_y, ${w}.mm, 8.mm)
            )
            t_box.style.font_family = "Verdana"
            t_box.style.font_size = 9.0
            t_box.style.text_bold = true
            t_box.style.text_underline = Layout::Style::UNDERLINE_SINGLE rescue 1
            doc.add_entity(t_box, layer, page)
          end

          doc.save(layout_file)

          {
            success: true,
            layout_path: layout_file,
            scene: target_scene || viewport.scenes[viewport.current_scene],
            scale: actual_scale_str,
            line_weight: viewport.line_weight,
            render_mode: "${renderModeStr}",
            bounds_mm: { x: ${x}, y: ${y}, width: ${w}, height: ${h} }
          }.to_json
        rescue => e
          { success: false, error: e.message, backtrace: e.backtrace.first(5) }.to_json
        end
      `;

      const res = await callSketchUpBridge('/execute', 'POST', { code });
      return parseRubyResponse(res);
    }

    case 'layout_add_schedule_table': {
      const layoutPath = args.layout_path.replace(/\\/g, '/');
      const tableTitle = (args.table_title || 'BẢNG THỐNG KÊ HẠNG MỤC CÔNG TRÌNH TẠM').replace(/"/g, '\\"');
      const items = args.items || [];
      const position = args.position || 'top_right';

      // Chiều rộng các cột chuẩn: STT (10mm), Hạng Mục (48mm), Số Lượng (22mm), Diện Tích (25mm), Ghi Chú (35mm) = 140mm
      const colWidthsMm = [10.0, 48.0, 22.0, 25.0, 35.0];
      const totalW = colWidthsMm.reduce((a, b) => a + b, 0); // 140mm
      const headerH = 7.0;
      const rowH = 6.0;
      const totalH = headerH + (items.length * rowH);

      let tableX = 215.0; // Top-right thoáng (trước khung tên X: 364.5mm)
      let tableY = 18.0;

      if (position === 'top_left') {
        tableX = 20.0; tableY = 18.0;
      } else if (position === 'bottom_left') {
        tableX = 20.0; tableY = 282.0 - totalH;
      } else if (position === 'custom') {
        tableX = args.paper_x !== undefined ? args.paper_x : 215.0;
        tableY = args.paper_y !== undefined ? args.paper_y : 18.0;
      }

      // Encode items to JSON for safe injection into Ruby
      const itemsJson = JSON.stringify(items);

      const code = `
        begin
          layout_file = "${layoutPath}"
          raise "Tập tin layout không tồn tại: #{layout_file}" unless File.exist?(layout_file)

          doc = Layout::Document.open(layout_file)
          page = doc.pages.first
          layer = doc.layers.first

          raw_items = JSON.parse('${itemsJson.replace(/'/g, "\\'")}')
          num_rows = raw_items.size + 1 # +1 header

          bounds = Geom::Bounds2d.new(${tableX}.mm, ${tableY}.mm, ${totalW}.mm, ${totalH}.mm)
          table = Layout::Table.new(bounds, num_rows, 5)

          col_widths = [10.mm, 48.mm, 22.mm, 25.mm, 35.mm]
          col_widths.each_with_index do |w, c|
            table.get_column(c).width = w rescue nil
          end

          # Kẻ Header
          headers = ["STT", "HẠNG MỤC", "SỐ LƯỢNG", "DIỆN TÍCH (m²)", "GHI CHÚ"]
          table.get_row(0).height = ${headerH}.mm rescue nil
          headers.each_with_index do |h_text, c|
            cell = table[0, c]
            tb = Geom::Bounds2d.new(0, 0, col_widths[c], ${headerH}.mm)
            t = Layout::FormattedText.new(h_text, tb)
            t.style.font_family = "Arial"
            t.style.font_size = 7.5
            t.style.text_bold = true
            cell.data = t
          end

          # Kẻ dữ liệu các hàng
          raw_items.each_with_index do |item, idx|
            r = idx + 1
            table.get_row(r).height = ${rowH}.mm rescue nil
            row_data = [
              item["stt"].to_s,
              item["name"].to_s,
              item["quantity"].to_s,
              item["area"].to_s,
              item["note"] ? item["note"].to_s : "-"
            ]
            row_data.each_with_index do |val, c|
              cell = table[r, c]
              tb = Geom::Bounds2d.new(0, 0, col_widths[c], ${rowH}.mm)
              t = Layout::FormattedText.new(val, tb)
              t.style.font_family = "Arial"
              t.style.font_size = 7.0
              t.style.text_bold = false
              cell.data = t
            end
          end

          # Tiêu đề bảng bên trên
          title_b = Geom::Bounds2d.new(${tableX}.mm, (${tableY} - 6.0).mm, ${totalW}.mm, 5.mm)
          title_text = Layout::FormattedText.new("${tableTitle}", title_b)
          title_text.style.font_family = "Arial"
          title_text.style.font_size = 8.0
          title_text.style.text_bold = true
          doc.add_entity(title_text, layer, page)

          doc.add_entity(table, layer, page)
          doc.save(layout_file)

          {
            success: true,
            layout_path: layout_file,
            table_title: "${tableTitle}",
            rows_count: num_rows,
            bounds_mm: { x: ${tableX}, y: ${tableY}, width: ${totalW}, height: ${totalH} }
          }.to_json
        rescue => e
          { success: false, error: e.message, backtrace: e.backtrace.first(5) }.to_json
        end
      `;

      const res = await callSketchUpBridge('/execute', 'POST', { code });
      return parseRubyResponse(res);
    }

    case 'layout_add_dimension': {
      const layoutPath = args.layout_path.replace(/\\/g, '/');
      const startX = args.start_x;
      const startY = args.start_y;
      const endX = args.end_x;
      const endY = args.end_y;
      const offset = args.offset !== undefined ? args.offset : 10.0;
      const customTextArg = args.custom_text ? `"${args.custom_text.replace(/"/g, '\\"')}"` : 'nil';

      const code = `
        begin
          layout_file = "${layoutPath}"
          doc = Layout::Document.open(layout_file)
          page = doc.pages.first
          layer = doc.layers.first

          p1 = Geom::Point2d.new(${startX}.mm, ${startY}.mm)
          p2 = Geom::Point2d.new(${endX}.mm, ${endY}.mm)
          dim = Layout::LinearDimension.new(p1, p2, ${offset}.mm)

          custom_t = ${customTextArg}
          if custom_t
            dim.custom_text = custom_t
          end

          dim.style.font_family = "Arial"
          dim.style.font_size = 7.5
          dim.style.stroke_width = 0.4
          dim.style.stroke_color = Sketchup::Color.new(0, 0, 0)

          doc.add_entity(dim, layer, page)
          doc.save(layout_file)

          { success: true, layout_path: layout_file, dimension_added: true }.to_json
        rescue => e
          { success: false, error: e.message }.to_json
        end
      `;

      const res = await callSketchUpBridge('/execute', 'POST', { code });
      return parseRubyResponse(res);
    }

    case 'layout_add_callout': {
      const layoutPath = args.layout_path.replace(/\\/g, '/');
      const targetX = args.target_x;
      const targetY = args.target_y;
      const text = args.text.replace(/"/g, '\\"');
      const boxX = args.box_x;
      const boxY = args.box_y;
      const boxW = args.box_width || 45.0;
      const boxH = args.box_height || 12.0;

      const code = `
        begin
          layout_file = "${layoutPath}"
          doc = Layout::Document.open(layout_file)
          page = doc.pages.first
          layer = doc.layers.first

          leader_type = Layout::Label::LEADER_LINE_TYPE_SINGLE_SEGMENT rescue Layout::Label::LEADER_LINE_TYPE_BEZIER
          target_pt = Geom::Point2d.new(${targetX}.mm, ${targetY}.mm)
          bounds = Geom::Bounds2d.new(${boxX}.mm, ${boxY}.mm, ${boxW}.mm, ${boxH}.mm)

          label = Layout::Label.new("${text}", leader_type, target_pt, bounds)
          label.style.font_family = "Arial"
          label.style.font_size = 7.5
          label.style.stroke_width = 0.4
          label.style.stroke_color = Sketchup::Color.new(0, 0, 0)

          doc.add_entity(label, layer, page)
          doc.save(layout_file)

          { success: true, layout_path: layout_file, callout_added: true }.to_json
        rescue => e
          { success: false, error: e.message }.to_json
        end
      `;

      const res = await callSketchUpBridge('/execute', 'POST', { code });
      return parseRubyResponse(res);
    }

    case 'layout_export_pdf': {
      const layoutPath = args.layout_path.replace(/\\/g, '/');
      const outputPdf = (args.output_pdf_path || layoutPath.replace(/\.layout$/i, '.pdf')).replace(/\\/g, '/');

      const code = `
        begin
          layout_file = "${layoutPath}"
          pdf_out = "${outputPdf}"
          raise "Tập tin layout không tồn tại: #{layout_file}" unless File.exist?(layout_file)

          doc = Layout::Document.open(layout_file)
          doc.export(pdf_out)

          {
            success: true,
            pdf_path: pdf_out,
            pdf_size_bytes: File.size(pdf_out)
          }.to_json
        rescue => e
          { success: false, error: e.message, backtrace: e.backtrace.first(5) }.to_json
        end
      `;

      const res = await callSketchUpBridge('/execute', 'POST', { code });
      return parseRubyResponse(res);
    }

    case 'layout_open_in_gui': {
      const layoutPath = path.resolve(args.layout_path);
      const layoutExe = 'C:\\Program Files\\SketchUp\\SketchUp 2025\\LayOut\\LayOut.exe';

      return new Promise((resolve) => {
        if (!fs.existsSync(layoutPath)) {
          return resolve({ success: false, error: `File không tồn tại: ${layoutPath}` });
        }

        const cmd = fs.existsSync(layoutExe)
          ? `start "" "${layoutExe}" "${layoutPath}"`
          : `start "" "${layoutPath}"`;

        exec(cmd, (err) => {
          if (err) {
            resolve({ success: false, error: err.message });
          } else {
            resolve({ success: true, message: `Đã mở file trên LayOut: ${layoutPath}` });
          }
        });
      });
    }

    case 'layout_execute_ruby': {
      const res = await callSketchUpBridge('/execute', 'POST', { code: args.code });
      return parseRubyResponse(res);
    }

    default:
      throw new Error(`LayOut Tool không xác định: ${name}`);
  }
}

module.exports = {
  LAYOUT_TOOLS,
  handleLayoutTool
};

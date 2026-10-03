#!/usr/bin/env node

/**
 * Antigravity SketchUp 2025 Model Context Protocol (MCP) Server
 * Kết nối thời gian thực giữa Antigravity IDE và SketchUp 2025
 * Giao thức: JSON-RPC 2.0 qua Standard I/O (stdio)
 */

const readline = require('readline');
const http = require('http');
const { LAYOUT_TOOLS, handleLayoutTool } = require('./modules/layout');
const { REVIT_TOOLS, handleRevitTool } = require('./modules/revit');

const SKETCHUP_BRIDGE_URL = process.env.SKETCHUP_BRIDGE_URL || 'http://127.0.0.1:9876';
const SERVER_NAME = 'antigravity-sketchup-bridge';
const SERVER_VERSION = '1.0.0';
const PROTOCOL_VERSION = '2024-11-05';

// Danh sách công cụ SketchUp 3D cung cấp cho AI
const SKETCHUP_TOOLS = [
  {
    name: 'sketchup_get_status',
    description: 'Kiểm tra trạng thái kết nối realtime tới SketchUp 2025, phiên bản, tên model đang mở, số lượng đối tượng và layer.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'sketchup_execute_ruby',
    description: 'Thực thi trực tiếp bất kỳ đoạn mã Ruby nào trên SketchUp 2025 (Main UI thread). Kết quả và stdout sẽ được trả về trực tiếp cho AI. Hỗ trợ Ctrl+Z trong SketchUp.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Đoạn mã Ruby SketchUp API cần chạy (ví dụ: Sketchup.active_model.entities.add_cpoint([100.mm, 200.mm, 0]))'
        }
      },
      required: ['code']
    }
  },
  {
    name: 'sketchup_draw_geometry',
    description: 'Dựng hình học 3D tham số hóa trực tiếp vào SketchUp 2025 (Box, Cylinder, Column, Wall, Floor) với đơn vị milimet (mm).',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['box', 'cylinder', 'column', 'wall', 'floor'],
          description: 'Loại hình học: box (hộp chữ nhật), cylinder (trụ tròn), column (cột kiến trúc), wall (tường thẳng), floor (sàn đa giác)'
        },
        name: { type: 'string', description: 'Tên Group/Component trong SketchUp' },
        width: { type: 'number', description: 'Chiều rộng (mm)' },
        depth: { type: 'number', description: 'Chiều dài/chiều sâu (mm)' },
        height: { type: 'number', description: 'Chiều cao (mm)' },
        radius: { type: 'number', description: 'Bán kính (mm) cho cylinder' },
        segments: { type: 'number', description: 'Số phân đoạn đường tròn cho cylinder (mặc định 24)' },
        x: { type: 'number', description: 'Tọa độ gốc X (mm)' },
        y: { type: 'number', description: 'Tọa độ gốc Y (mm)' },
        z: { type: 'number', description: 'Tọa độ gốc Z (mm)' },
        start: {
          type: 'array',
          items: { type: 'number' },
          description: 'Điểm bắt đầu [x, y] (mm) cho tường (wall)'
        },
        end: {
          type: 'array',
          items: { type: 'number' },
          description: 'Điểm kết thúc [x, y] (mm) cho tường (wall)'
        },
        thickness: { type: 'number', description: 'Độ dày tường hoặc sàn (mm)' },
        points: {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'number' }
          },
          description: 'Mảng các điểm 2D [[x1, y1], [x2, y2], ...] cho sàn (floor)'
        },
        material: { type: 'string', description: 'Tên vật liệu áp dụng cho hình học' }
      },
      required: ['type']
    }
  },
  {
    name: 'sketchup_get_selection',
    description: 'Lấy thông tin chi tiết các đối tượng đang được người dùng chọn trong viewport SketchUp 2025 (ID, loại đối tượng, kích thước mm, tọa độ tâm, layer).',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'sketchup_get_scene_summary',
    description: 'Lấy tổng quan cấu trúc mô hình SketchUp 2025 đang mở: số lượng thực thể, danh sách Layers/Tags, danh sách Vật liệu (Materials), danh sách Scenes (Views).',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'sketchup_camera_control',
    description: 'Điều khiển góc nhìn camera viewport trong SketchUp 2025: zoom_extents (bao quát toàn bộ), top (nhìn từ trên), front (mặt đứng), iso (phối cảnh trục đo).',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['zoom_extents', 'top', 'front', 'iso'],
          description: 'Góc nhìn cần đặt'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'sketchup_apply_material',
    description: 'Áp dụng màu sắc hoặc tên vật liệu cho các đối tượng đang chọn hoặc toàn bộ mô hình trong SketchUp 2025.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Tên vật liệu (ví dụ: Concrete, Wood, Glass, Red)' },
        color: { type: 'string', description: 'Mã màu Hex hoặc tên màu (ví dụ: #FF5500, #336699)' }
      },
      required: ['name']
    }
  },
  {
    name: 'sketchup_clear_model',
    description: 'Xóa toàn bộ mô hình hoặc chỉ xóa các đối tượng đang được chọn trong SketchUp 2025.',
    inputSchema: {
      type: 'object',
      properties: {
        selection_only: {
          type: 'boolean',
          description: 'True nếu chỉ xóa các đối tượng đang chọn. False nếu xóa toàn bộ mô hình.'
        }
      }
    }
  },
  {
    name: 'sketchup_setup_isolated_scene',
    description: 'Thiết lập Scene cô lập trên SketchUp: Chỉ hiển thị các cấu kiện/tags thuộc hạng mục được chỉ định (VD: Ký túc xá), ẩn toàn bộ các hạng mục khác; đặt camera trực giao (Parallel Projection) góc nhìn mặt bằng/mặt đứng/mặt cắt và lưu thành Scene chuẩn phục vụ LayOut.',
    inputSchema: {
      type: 'object',
      properties: {
        scene_name: {
          type: 'string',
          description: 'Tên Scene cần tạo hoặc cập nhật (VD: KTX_CHI_TIET_MATBANG)'
        },
        include_keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Mảng các từ khóa Tag/Layer hoặc tên cấu kiện cần hiển thị (VD: ["KTX", "Ký túc xá", "Container"])'
        },
        view_type: {
          type: 'string',
          enum: ['top', 'front', 'right', 'iso', 'current'],
          default: 'top',
          description: 'Góc nhìn camera: top (mặt bằng), front (mặt đứng), right (mặt bên), iso (trục đo), current (giữ nguyên)'
        },
        camera_projection: {
          type: 'string',
          enum: ['parallel', 'perspective'],
          default: 'parallel',
          description: 'Phép chiếu camera: parallel (chiếu song song trực giao cho bản vẽ 2D), perspective (phối cảnh)'
        }
      },
      required: ['scene_name']
    }
  }
];

// Danh sách hợp nhất toàn bộ công cụ 3D SketchUp, 2D LayOut và BIM Revit 2020
const TOOLS = [
  ...SKETCHUP_TOOLS,
  ...LAYOUT_TOOLS,
  ...REVIT_TOOLS
];

// Hàm gửi HTTP Request tới SketchUp Ruby Bridge Plugin
function callSketchUpBridge(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, SKETCHUP_BRIDGE_URL);
    const postData = data ? JSON.stringify(data) : '';

    const options = {
      hostname: url.hostname,
      port: url.port || 9876,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Connection': 'close'
      },
      timeout: 60000 // 60 giây timeout
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout khi kết nối tới SketchUp 2025 (port 9876).'));
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        reject(new Error(
          'Không thể kết nối tới SketchUp 2025 tại http://127.0.0.1:9876.\n' +
          'Vui lòng đảm bảo:\n' +
          '1. SketchUp 2025 đang mở.\n' +
          '2. Plugin `sketchup_mcp_bridge.rb` đã được cài đặt và đang chạy (Vào Extensions > Antigravity MCP > Start MCP Server, hoặc gõ load "C:/Users/MAI KHANH/AppData/Roaming/SketchUp/SketchUp 2025/SketchUp/Plugins/sketchup_mcp_bridge.rb" trong Ruby Console).'
        ));
      } else {
        reject(err);
      }
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Xử lý thực thi tool
async function handleToolCall(toolName, args) {
  try {
    // Điều hướng các công cụ SketchUp LayOut
    if (toolName.startsWith('layout_')) {
      const res = await handleLayoutTool(toolName, args, callSketchUpBridge);
      return {
        content: [{
          type: 'text',
          text: typeof res === 'string' ? res : JSON.stringify(res, null, 2)
        }]
      };
    }

    // Điều hướng các công cụ Autodesk Revit 2020
    if (toolName.startsWith('revit_')) {
      const res = await handleRevitTool(toolName, args);
      return {
        content: [{
          type: 'text',
          text: typeof res === 'string' ? res : JSON.stringify(res, null, 2)
        }]
      };
    }

    switch (toolName) {
      case 'sketchup_get_status': {
        const res = await callSketchUpBridge('/health', 'GET');
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(res, null, 2)
          }]
        };
      }

      case 'sketchup_execute_ruby': {
        const res = await callSketchUpBridge('/execute', 'POST', { code: args.code });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(res, null, 2)
          }]
        };
      }

      case 'sketchup_draw_geometry': {
        const res = await callSketchUpBridge('/api/geometry', 'POST', args);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(res, null, 2)
          }]
        };
      }

      case 'sketchup_get_selection': {
        const res = await callSketchUpBridge('/api/selection', 'GET');
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(res, null, 2)
          }]
        };
      }

      case 'sketchup_get_scene_summary': {
        const res = await callSketchUpBridge('/api/scene', 'GET');
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(res, null, 2)
          }]
        };
      }

      case 'sketchup_camera_control': {
        const res = await callSketchUpBridge('/api/camera', 'POST', args);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(res, null, 2)
          }]
        };
      }

      case 'sketchup_apply_material': {
        const res = await callSketchUpBridge('/api/material', 'POST', args);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(res, null, 2)
          }]
        };
      }

      case 'sketchup_clear_model': {
        const res = await callSketchUpBridge('/api/clear', 'POST', args || {});
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(res, null, 2)
          }]
        };
      }

      case 'sketchup_setup_isolated_scene': {
        const sceneName = (args.scene_name || 'SCENE_ISOLATED').replace(/"/g, '\\"');
        const keywords = JSON.stringify(args.include_keywords || []);
        const viewType = args.view_type || 'top';
        const isParallel = (args.camera_projection || 'parallel') === 'parallel';

        const code = `
          begin
            model = Sketchup.active_model
            model.start_operation("Cô Lập Scene", true)

            kws = ${keywords}.map { |k| k.to_s.downcase.strip }
            hidden_layers = []
            visible_layers = []

            # 1. Quản lý Tag / Layer
            model.layers.each do |l|
              if l.name == "Layer0" || kws.empty?
                l.visible = true
                visible_layers << l.name
              else
                matched = kws.any? { |kw| l.name.downcase.include?(kw) }
                l.visible = matched
                if matched
                  visible_layers << l.name
                else
                  hidden_layers << l.name
                end
              end
            end

            # 2. Quản lý Camera
            view = model.active_view
            camera = view.camera
            camera.perspective = false if ${isParallel}

            case "${viewType}".downcase
            when "top"
              view.send_action("viewTop:") rescue Sketchup.send_action("viewTop:")
            when "front"
              view.send_action("viewFront:") rescue Sketchup.send_action("viewFront:")
            when "right"
              view.send_action("viewRight:") rescue Sketchup.send_action("viewRight:")
            when "iso"
              view.send_action("viewIso:") rescue Sketchup.send_action("viewIso:")
            end

            view.zoom_extents

            # 3. Tạo hoặc cập nhật Scene
            target_scene = model.pages["${sceneName}"]
            if target_scene
              target_scene.update(63)
            else
              target_scene = model.pages.add("${sceneName}")
            end

            model.commit_operation

            {
              success: true,
              scene_name: "${sceneName}",
              projection: ${isParallel} ? "parallel" : "perspective",
              view_type: "${viewType}",
              visible_layers: visible_layers,
              hidden_layers_count: hidden_layers.size
            }.to_json
          rescue => e
            { success: false, error: e.message, backtrace: e.backtrace.first(5) }.to_json
          end
        `;
        const res = await callSketchUpBridge('/execute', 'POST', { code });
        return {
          content: [{
            type: 'text',
            text: typeof res.result === 'string' ? res.result : JSON.stringify(res, null, 2)
          }]
        };
      }

      default:
        throw new Error(`Công cụ không xác định: ${toolName}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Lỗi thực thi công cụ [${toolName}]: ${error.message}`
      }],
      isError: true
    };
  }
}

// Xử lý thông điệp JSON-RPC qua stdio
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  if (!line || !line.trim()) return;

  let request;
  try {
    request = JSON.parse(line.trim());
  } catch (err) {
    console.error('[SketchupMCP] JSON Parse Error:', err);
    return;
  }

  const { id, method, params } = request;

  // Xử lý thông báo (Notifications - không cần phản hồi id)
  if (method === 'notifications/initialized') {
    return;
  }

  // Xử lý Initialize handshake
  if (method === 'initialize') {
    const response = {
      jsonrpc: '2.0',
      id: id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {
          tools: {
            listChanged: false
          }
        },
        serverInfo: {
          name: SERVER_NAME,
          version: SERVER_VERSION
        }
      }
    };
    process.stdout.write(JSON.stringify(response) + '\n');
    return;
  }

  // Xử lý tools/list
  if (method === 'tools/list') {
    const response = {
      jsonrpc: '2.0',
      id: id,
      result: {
        tools: TOOLS
      }
    };
    process.stdout.write(JSON.stringify(response) + '\n');
    return;
  }

  // Xử lý tools/call
  if (method === 'tools/call') {
    const { name, arguments: toolArgs } = params;
    const result = await handleToolCall(name, toolArgs || {});
    const response = {
      jsonrpc: '2.0',
      id: id,
      result: result
    };
    process.stdout.write(JSON.stringify(response) + '\n');
    return;
  }

  // Phương thức chưa hỗ trợ
  if (id !== undefined) {
    const response = {
      jsonrpc: '2.0',
      id: id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`
      }
    };
    process.stdout.write(JSON.stringify(response) + '\n');
  }
});

/**
 * Module Autodesk Revit MCP Bridge (modules/revit.js)
 * Cầu nối hai chiều thời gian thực giữa Antigravity IDE và Autodesk Revit 2020
 * Hỗ trợ đồng thời:
 * 1. pyRevit Python Engine (Port 9878) - Thực thi Python động (revit_execute_python)
 * 2. C# Native Add-in (Port 9877) - Quản lý giao diện và Native API
 */

const http = require('http');

const CS_BRIDGE_URL = process.env.REVIT_BRIDGE_URL || 'http://127.0.0.1:9877';
const PYREVIT_BRIDGE_URL = process.env.PYREVIT_BRIDGE_URL || 'http://127.0.0.1:9878';

const REVIT_TOOLS = [
  {
    name: 'revit_get_status',
    description: 'Kiểm tra trạng thái kết nối realtime tới Autodesk Revit (cả pyRevit Port 9878 và C# Port 9877), tên dự án RVT đang mở, View hiện tại, danh sách Levels, Grids và Vật liệu.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'revit_execute_python',
    description: 'Thực thi mã Python Revit API trực tiếp qua pyRevit (Port 9878). Cho phép tạo, sửa đổi và truy vấn 100% đối tượng BIM: Materials, Levels, Grids, Floors, Structural Framing, DirectShape, Parameters... Có sẵn doc, uidoc, uiapp, DB, UI, bim, XYZ, mm_to_feet, xyz_mm.',
    inputSchema: {
      type: 'object',
      properties: {
        script: {
          type: 'string',
          description: 'Khối mã nguồn Python thực thi trên Revit (có sẵn doc, uidoc, uiapp, DB, UI, bim, XYZ, mm_to_feet, xyz_mm)'
        },
        transaction_name: {
          type: 'string',
          default: 'Antigravity MCP Python Action',
          description: 'Tên Transaction hiển thị trong lịch sử Undo của Revit'
        },
        auto_transaction: {
          type: 'boolean',
          default: true,
          description: 'Tự động mở và commit Transaction (mặc định: true)'
        },
        timeout: {
          type: 'number',
          default: 60,
          description: 'Thời gian chờ tối đa (giây)'
        }
      },
      required: ['script']
    }
  },
  {
    name: 'revit_create_materials',
    description: 'Tạo hàng loạt Vật Liệu trong Revit với tên, mã màu RGB, độ bóng và độ trong suốt.',
    inputSchema: {
      type: 'object',
      properties: {
        materials: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Tên vật liệu (VD: [0102_RoyalBlue], AI_Panel_White)' },
              rgb: { type: 'array', items: { type: 'number' }, description: 'Mã màu RGB [R, G, B] (0-255)' },
              transparency: { type: 'number', default: 0, description: 'Độ trong suốt 0-100' },
              shininess: { type: 'number', default: 50, description: 'Độ bóng 0-100' }
            },
            required: ['name', 'rgb']
          },
          description: 'Danh sách các vật liệu cần tạo'
        }
      },
      required: ['materials']
    }
  },
  {
    name: 'revit_build_levels_grids',
    description: 'Tạo hàng loạt Mốc Cao Độ (Levels) và Đường Lưới Trục (Grids) chuẩn xác trong Revit theo tọa độ milimét.',
    inputSchema: {
      type: 'object',
      properties: {
        levels: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Tên mốc cao độ (VD: NEN VP, DINH KEO)' },
              elevation_mm: { type: 'number', description: 'Cao độ tính bằng milimét (mm)' }
            },
            required: ['name', 'elevation_mm']
          }
        },
        grids: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Tên trục (VD: Trục 1, Trục 2)' },
              start: { type: 'array', items: { type: 'number' }, description: 'Tọa độ điểm đầu [x, y] (mm)' },
              end: { type: 'array', items: { type: 'number' }, description: 'Tọa độ điểm cuối [x, y] (mm)' }
            },
            required: ['name', 'start', 'end']
          }
        }
      }
    }
  },
  {
    name: 'revit_create_floor',
    description: 'Tự động vẽ Sàn Bê Tông (Native Revit Floor) từ danh sách các điểm tọa độ đường bao khép kín 2D [[x1, y1], [x2, y2], ...] (mm).',
    inputSchema: {
      type: 'object',
      properties: {
        points: {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'number' }
          },
          description: 'Mảng các điểm tọa độ 2D của chu vi sàn (mm) [[x1, y1], [x2, y2], ...]'
        },
        level: {
          type: 'string',
          default: 'Level 1',
          description: 'Tên cao độ đặt sàn (VD: Level 1, NEN VP...)'
        },
        floor_type: {
          type: 'string',
          description: 'Tên kiểu sàn (Floor Type). Để trống sẽ lấy kiểu sàn mặc định của dự án.'
        },
        structural: {
          type: 'boolean',
          default: true,
          description: 'Sàn kết cấu chịu lực (true) hay sàn kiến trúc (false)'
        }
      },
      required: ['points']
    }
  },
  {
    name: 'revit_create_wall',
    description: 'Tự động vẽ Tường (Native Revit Basic Wall) giữa hai điểm tọa độ start [x1, y1] và end [x2, y2] (mm), chiều cao (mm) và loại tường.',
    inputSchema: {
      type: 'object',
      properties: {
        start: {
          type: 'array',
          items: { type: 'number' },
          description: 'Tọa độ điểm đầu [x, y] (mm)'
        },
        end: {
          type: 'array',
          items: { type: 'number' },
          description: 'Tọa độ điểm cuối [x, y] (mm)'
        },
        height: {
          type: 'number',
          default: 2800,
          description: 'Chiều cao tường (mm)'
        },
        level: {
          type: 'string',
          default: 'Level 1',
          description: 'Tên Level gán chân tường'
        },
        wall_type: {
          type: 'string',
          description: 'Tên kiểu tường (Wall Type)'
        }
      },
      required: ['start', 'end']
    }
  },
  {
    name: 'revit_create_level',
    description: 'Tạo một mốc cao độ mới (Level) trong dự án Revit.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Tên cao độ (VD: NEN VP (+0.100), DINH KEO (+4.560)...)'
        },
        elevation: {
          type: 'number',
          description: 'Cao độ tính bằng milimét (mm) so với mốc 0'
        }
      },
      required: ['name', 'elevation']
    }
  },
  {
    name: 'revit_create_grid',
    description: 'Tạo một đường lưới trục (Grid Line) trong dự án Revit.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Tên trục (VD: Trục 1, Trục 2, Trục A...)'
        },
        start: {
          type: 'array',
          items: { type: 'number' },
          description: 'Điểm đầu [x, y] (mm)'
        },
        end: {
          type: 'array',
          items: { type: 'number' },
          description: 'Điểm cuối [x, y] (mm)'
        }
      },
      required: ['start', 'end']
    }
  },
  {
    name: 'revit_view_control',
    description: 'Điều khiển góc nhìn camera và thu phóng trong khung nhìn Revit (Zoom to Fit / Zoom Extents).',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['zoom_extents'],
          default: 'zoom_extents',
          description: 'Hành động điều khiển khung nhìn'
        }
      }
    }
  }
];

function callBridgeUrl(baseUrl, endpoint, method = 'GET', data = null, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const postData = data ? JSON.stringify(data) : '';

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Connection': 'close'
      },
      timeout: timeoutMs
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve({ raw: body });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout (${timeoutMs}ms) khi kết nối tới Revit Bridge tại ${baseUrl}.`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) req.write(postData);
    req.end();
  });
}

async function handleRevitTool(name, args) {
  switch (name) {
    case 'revit_get_status': {
      // Ưu tiên kiểm tra pyRevit (9878), nếu chưa bật thì kiểm tra C# Bridge (9877)
      try {
        const pyStatus = await callBridgeUrl(PYREVIT_BRIDGE_URL, '/health', 'GET', null, 3000);
        return {
          bridge_type: 'pyRevit (Port 9878)',
          ...pyStatus
        };
      } catch {
        try {
          const csStatus = await callBridgeUrl(CS_BRIDGE_URL, '/health', 'GET', null, 3000);
          return {
            bridge_type: 'Revit C# Bridge (Port 9877)',
            ...csStatus
          };
        } catch {
          throw new Error(
            'Chưa phát hiện Revit Bridge đang hoạt động trên cả Port 9878 (pyRevit) và Port 9877 (C#).\n' +
            'Vui lòng mở Autodesk Revit 2020 và đảm bảo một trong hai Bridge đã được bật.'
          );
        }
      }
    }

    case 'revit_execute_python': {
      const timeoutMs = (args.timeout || 60) * 1000;
      return await callBridgeUrl(PYREVIT_BRIDGE_URL, '/api/execute_python', 'POST', args, timeoutMs);
    }

    case 'revit_create_materials': {
      return await callBridgeUrl(PYREVIT_BRIDGE_URL, '/api/materials', 'POST', args, 30000);
    }

    case 'revit_build_levels_grids': {
      return await callBridgeUrl(PYREVIT_BRIDGE_URL, '/api/levels_grids', 'POST', args, 30000);
    }

    case 'revit_create_floor': {
      // Hỗ trợ cả C# bridge và pyRevit bridge
      try {
        return await callBridgeUrl(CS_BRIDGE_URL, '/api/floor', 'POST', args, 30000);
      } catch {
        // Fallback qua Python script trên pyRevit
        const script = `
pts = ${JSON.stringify(args.points)}
lvl_name = ${JSON.stringify(args.level || 'Level 1')}
ft_name = ${JSON.stringify(args.floor_type || null)}
flr = bim.create_floor_from_points(doc, lvl_name, pts, ft_name, ${args.structural !== false ? 'True' : 'False'})
__result__ = {"floor_id": flr.Id.IntegerValue if flr else None, "status": "created"}
`;
        return await callBridgeUrl(PYREVIT_BRIDGE_URL, '/api/execute_python', 'POST', {
          script,
          transaction_name: 'Tạo Sàn Bê Tông Nền'
        }, 30000);
      }
    }

    case 'revit_create_wall':
      return await callBridgeUrl(CS_BRIDGE_URL, '/api/wall', 'POST', args, 30000);

    case 'revit_create_level': {
      try {
        return await callBridgeUrl(CS_BRIDGE_URL, '/api/level', 'POST', args, 15000);
      } catch {
        const script = `
lvl = bim.get_or_create_level(doc, ${JSON.stringify(args.name)}, ${args.elevation})
__result__ = {"level_id": lvl.Id.IntegerValue, "name": lvl.Name}
`;
        return await callBridgeUrl(PYREVIT_BRIDGE_URL, '/api/execute_python', 'POST', { script, transaction_name: 'Tạo Level' }, 15000);
      }
    }

    case 'revit_create_grid': {
      try {
        return await callBridgeUrl(CS_BRIDGE_URL, '/api/grid', 'POST', args, 15000);
      } catch {
        const script = `
grd = bim.create_grid(doc, ${JSON.stringify(args.name)}, ${JSON.stringify(args.start)}, ${JSON.stringify(args.end)})
__result__ = {"grid_id": grd.Id.IntegerValue, "name": grd.Name}
`;
        return await callBridgeUrl(PYREVIT_BRIDGE_URL, '/api/execute_python', 'POST', { script, transaction_name: 'Tạo Grid' }, 15000);
      }
    }

    case 'revit_view_control':
      return await callBridgeUrl(CS_BRIDGE_URL, '/api/view', 'POST', args || {}, 15000);

    default:
      throw new Error(`Công cụ Revit không xác định: ${name}`);
  }
}

module.exports = {
  REVIT_TOOLS,
  handleRevitTool,
  callBridgeUrl,
  CS_BRIDGE_URL,
  PYREVIT_BRIDGE_URL
};

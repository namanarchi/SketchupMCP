/**
 * Module Autodesk Revit 2020 MCP (modules/revit.js)
 * Cầu nối thời gian thực giữa Antigravity IDE và Autodesk Revit 2020
 * Kết nối qua HTTP Server Port 9877 do RevitMCPBridge.dll quản lý
 */

const http = require('http');

const REVIT_BRIDGE_URL = process.env.REVIT_BRIDGE_URL || 'http://127.0.0.1:9877';

const REVIT_TOOLS = [
  {
    name: 'revit_get_status',
    description: 'Kiểm tra trạng thái kết nối realtime tới Autodesk Revit 2020, tên dự án RVT đang mở, View hiện tại, danh sách Levels và Floor/Wall types.',
    inputSchema: {
      type: 'object',
      properties: {}
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
          description: 'Tên cao độ đặt sàn (VD: Level 1, NỀN ĐẤT TỰ NHIÊN...)'
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
    description: 'Tạo một mốc cao độ mới (Level) trong dự án Revit 2020.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Tên cao độ (VD: Level 2 - KTX Tang 2, Dinh Mai...)'
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
    description: 'Tạo một đường lưới trục (Grid Line) trong dự án Revit 2020.',
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
    description: 'Điều khiển góc nhìn camera và thu phóng trong khung nhìn Revit 2020 (Zoom to Fit / Zoom Extents).',
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

function callRevitBridge(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, REVIT_BRIDGE_URL);
    const postData = data ? JSON.stringify(data) : '';

    const options = {
      hostname: url.hostname,
      port: url.port || 9877,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Connection': 'close'
      },
      timeout: 30000
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
      reject(new Error('Timeout khi kết nối tới Revit 2020 MCP Bridge (Port 9877).'));
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        reject(new Error(
          'Không thể kết nối tới Revit 2020 tại http://127.0.0.1:9877.\n' +
          'Vui lòng đảm bảo:\n' +
          '1. Autodesk Revit 2020 đã được khởi động lại sau khi nạp Add-in RevitMCPBridge.\n' +
          '2. Add-in đã tự động khởi động máy chủ trên Port 9877 (Kiểm tra tab Antigravity MCP trên Ribbon của Revit).'
        ));
      } else {
        reject(err);
      }
    });

    if (postData) req.write(postData);
    req.end();
  });
}

async function handleRevitTool(name, args) {
  switch (name) {
    case 'revit_get_status':
      return await callRevitBridge('/health', 'GET');

    case 'revit_create_floor':
      return await callRevitBridge('/api/floor', 'POST', args);

    case 'revit_create_wall':
      return await callRevitBridge('/api/wall', 'POST', args);

    case 'revit_create_level':
      return await callRevitBridge('/api/level', 'POST', args);

    case 'revit_create_grid':
      return await callRevitBridge('/api/grid', 'POST', args);

    case 'revit_view_control':
      return await callRevitBridge('/api/view', 'POST', args || {});

    default:
      throw new Error(`Công cụ Revit không xác định: ${name}`);
  }
}

module.exports = {
  REVIT_TOOLS,
  handleRevitTool,
  callRevitBridge
};

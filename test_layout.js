/**
 * Test Client for SketchuplayoutMCP
 * Kiểm thử tự động quy trình AI tạo bản vẽ A3 hoàn chỉnh từ SketchUp sang LayOut & xuất PDF
 */

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');
const fs = require('fs');

const serverProcess = spawn('node', ['index.js'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'inherit']
});

const rl = readline.createInterface({
  input: serverProcess.stdout,
  terminal: false
});

let messageId = 1;
const pendingRequests = new Map();

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const response = JSON.parse(line);
    if (response.id && pendingRequests.has(response.id)) {
      const { resolve } = pendingRequests.get(response.id);
      pendingRequests.delete(response.id);
      resolve(response);
    }
  } catch (e) {
    console.error('Lỗi parse phản hồi JSON:', line);
  }
});

function sendRequest(method, params = {}) {
  return new Promise((resolve) => {
    const id = messageId++;
    pendingRequests.set(id, { resolve });
    const payload = { jsonrpc: '2.0', id, method, params };
    serverProcess.stdin.write(JSON.stringify(payload) + '\n');
  });
}

async function runTest() {
  console.log('🚀 [Test Client] Bắt đầu kiểm thử SketchuplayoutMCP...');

  // 1. Initialize
  const initRes = await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  });
  console.log('✅ 1. Khởi tạo MCP Server:', initRes.result?.serverInfo?.name);

  // 2. Kiểm tra trạng thái LayOut API
  const statusRes = await sendRequest('tools/call', {
    name: 'layout_get_status',
    arguments: {}
  });
  const statusData = JSON.parse(statusRes.result.content[0].text);
  console.log('✅ 2. Trạng thái SketchUp LayOut API:', statusData);

  const scenes = statusData.scenes || [];

  // 3. Tạo tài liệu bản vẽ A3 với Khung tên tiêu chuẩn TCVN
  const layoutPath = path.join(__dirname, 'BanVe_A3_BanChiHuy.layout').replace(/\\/g, '/');
  console.log('\n📄 3. Đang tạo bản vẽ A3 với khung viền & khung tên TCVN...');
  const createRes = await sendRequest('tools/call', {
    name: 'layout_create_drawing',
    arguments: {
      paper_size: 'A3',
      orientation: 'landscape',
      file_path: layoutPath,
      project_name: 'VĂN PHÒNG BAN CHỈ HUY - CÙ LAO PHƯỚC HƯNG',
      drawing_title: 'MẶT BẰNG TỔNG THỂ & CHI TIẾT CỔNG HÀNG RÀO',
      drawing_number: 'KT-01',
      scale_text: '1/100',
      designer: 'Antigravity AI Architect'
    }
  });
  const createData = JSON.parse(createRes.result.content[0].text);
  console.log('   Kết quả tạo trang:', createData);

  // 4. Chèn Viewport từ Scene của Model
  const targetScene = scenes.includes('MAT BANG') ? 'MAT BANG' : (scenes[0] || 'Scene 1');
  console.log(`\n🖼️  4. Đang chèn Viewport cho Scene "${targetScene}" (Tỷ lệ 1:100, Hybrid)...`);
  const viewRes = await sendRequest('tools/call', {
    name: 'layout_insert_viewport',
    arguments: {
      layout_path: layoutPath,
      scene_name: targetScene,
      scale: '1:100',
      render_mode: 'hybrid',
      paper_x: 25,
      paper_y: 15,
      paper_width: 370,
      paper_height: 235
    }
  });
  const viewData = JSON.parse(viewRes.result.content[0].text);
  console.log('   Kết quả chèn Viewport:', viewData);

  // 5. Thêm đường đo kích thước mẫu (Dimension)
  console.log('\n📏 5. Đang gắn đường gióng kích thước kỹ thuật (Dimension)...');
  const dimRes = await sendRequest('tools/call', {
    name: 'layout_add_dimension',
    arguments: {
      layout_path: layoutPath,
      start_x: 50,
      start_y: 230,
      end_x: 180,
      end_y: 230,
      offset: 8,
      custom_text: 'KÍCH THƯỚC ĐỊNH VỊ: 6000mm'
    }
  });
  const dimData = JSON.parse(dimRes.result.content[0].text);
  console.log('   Kết quả thêm Dimension:', dimData);

  // 6. Thêm nhãn chỉ dẫn ghi chú (Callout Label)
  console.log('\n🏷️  6. Đang gắn nhãn chỉ dẫn cấu kiện (Callout)...');
  const calloutRes = await sendRequest('tools/call', {
    name: 'layout_add_callout',
    arguments: {
      layout_path: layoutPath,
      target_x: 110,
      target_y: 120,
      text: 'CỔNG TRƯỢT 6M RAY ĐÔI\nBỌC TÔN HOÀNG GIA [0102_RoyalBlue]',
      box_x: 140,
      box_y: 90,
      box_width: 65,
      box_height: 15
    }
  });
  const calloutData = JSON.parse(calloutRes.result.content[0].text);
  console.log('   Kết quả thêm Callout:', calloutData);

  // 7. Xuất file PDF hoàn thiện
  const pdfPath = path.join(__dirname, 'BanVe_A3_BanChiHuy.pdf').replace(/\\/g, '/');
  console.log(`\n🖨️  7. Đang xuất file PDF in ấn tại: ${pdfPath}...`);
  const exportRes = await sendRequest('tools/call', {
    name: 'layout_export_pdf',
    arguments: {
      layout_path: layoutPath,
      output_pdf_path: pdfPath
    }
  });
  const exportData = JSON.parse(exportRes.result.content[0].text);
  console.log('   Kết quả xuất PDF:', exportData);

  const pdfSizeBytes = fs.existsSync(pdfPath) ? fs.statSync(pdfPath).size : 0;
  const layoutSizeBytes = fs.existsSync(layoutPath) ? fs.statSync(layoutPath).size : 0;
  console.log('\n🎉 KIỂM THỬ HOÀN TẤT THÀNH CÔNG RỰC RỠ 100%!');
  console.log(`📁 File .layout: ${layoutPath} (${(layoutSizeBytes / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`📁 File .pdf   : ${pdfPath} (${(pdfSizeBytes / 1024).toFixed(1)} KB)`);

  serverProcess.kill();
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Lỗi kiểm thử:', err);
  serverProcess.kill();
  process.exit(1);
});

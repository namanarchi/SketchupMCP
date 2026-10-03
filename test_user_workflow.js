/**
 * Kiểm thử quy trình chuẩn hóa từ SketchUp đến SketchUp LayOut
 * Theo đúng tất cả các yêu cầu của Kiến trúc sư
 */

const { handleLayoutTool } = require('./modules/layout');
const http = require('http');
const path = require('path');

function callSketchUpBridge(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const req = http.request({
      hostname: '127.0.0.1',
      port: 9876,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 120000
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
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('=== BẮT ĐẦU KIỂM THỬ WORKFLOW CHUẨN HOÁ LAYOUT ===');

  const outLayout = path.resolve(__dirname, 'output_BanVe_KTX_Chuan.layout');
  const outPdf = path.resolve(__dirname, 'output_BanVe_KTX_Chuan.pdf');

  // Bước 1: Khởi tạo bản vẽ bằng template chuẩn BSQUARE
  console.log('\n[1] Khởi tạo bản vẽ từ template chuẩn BSQUARE (Không vẽ lại khung tên)...');
  const createRes = await handleLayoutTool('layout_create_drawing', {
    drawing_title: 'MẶT BẰNG KÝ TÚC XÁ CÔNG NHÂN GĐ 1',
    drawing_number: 'KT-06',
    scale_text: '1/150',
    designer: 'NGUYỄN VĂN HÓA',
    checker: 'DƯƠNG QUANG MINH',
    file_path: outLayout
  }, callSketchUpBridge);
  console.log('Kết quả tạo bản vẽ:', createRes);

  // Bước 2: Chèn Viewport Tầng 1 (Bottom Half) với nét thấy 0.01 và tỷ lệ 1:150
  console.log('\n[2] Chèn Viewport Mặt bằng Tầng 1 KTX (Nét 0.01, Hybrid Render, Scale 1:150)...');
  const vp1Res = await handleLayoutTool('layout_insert_viewport', {
    layout_path: outLayout,
    scene_name: 'KTX-MBT1',
    scale: '1:150',
    line_weight: 0.01,
    render_mode: 'hybrid',
    layout_preset: 'bottom_half',
    title_text: 'MẶT BẰNG TẦNG 1 KÝ TÚC XÁ'
  }, callSketchUpBridge);
  console.log('Kết quả chèn Viewport Tầng 1:', vp1Res);

  // Bước 3: Lập Bảng Thống Kê Hạng Mục (STT, Hạng Mục, Số Lượng, Diện Tích m2, Ghi Chú)
  console.log('\n[3] Lập Bảng Thống Kê Hạng Mục Công Trình Tạm...');
  const tableRes = await handleLayoutTool('layout_add_schedule_table', {
    layout_path: outLayout,
    table_title: 'BẢNG THỐNG KÊ HẠNG MỤC CÔNG TRÌNH TẠM',
    position: 'top_right',
    items: [
      { stt: '1', name: 'Ký túc xá công nhân GĐ1', quantity: '26 module', area: '460.2', note: 'Container 20ft & 40ft' },
      { stt: '2', name: 'Nhà ăn CB-CNV', quantity: '01 cụm', area: '180.0', note: 'Khung thép tiền chế' },
      { stt: '3', name: 'Nhà vệ sinh công trường', quantity: '01 cụm', area: '45.0', note: 'Hố ga tự hoại' },
      { stt: '4', name: 'Kho vật tư & thiết bị', quantity: '01 cụm', area: '320.0', note: 'Mái tôn cách nhiệt' },
      { stt: '5', name: 'Bãi gia công cốt thép', quantity: '01 khu', area: '250.0', note: 'Nền bê tông 100mm' }
    ]
  }, callSketchUpBridge);
  console.log('Kết quả tạo bảng thống kê:', tableRes);

  // Bước 4: Xuất PDF hồ sơ kỹ thuật cao cấp
  console.log('\n[4] Xuất bản file PDF hồ sơ kỹ thuật...');
  const pdfRes = await handleLayoutTool('layout_export_pdf', {
    layout_path: outLayout,
    output_pdf_path: outPdf
  }, callSketchUpBridge);
  console.log('Kết quả xuất PDF:', pdfRes);

  console.log('\n=== HOÀN THÀNH QUY TRÌNH KIỂM THỬ XUẤT SẮC ===');
}

run().catch(console.error);

const { OFFICE_TOOLS, handleOfficeTool } = require('../modules/office');
const path = require('path');

async function run() {
  console.log('Testing OFFICE_TOOLS count:', OFFICE_TOOLS.length);

  // 1. Test status
  const status = await handleOfficeTool('office_get_status', {});
  console.log('Status result:', JSON.stringify(status, null, 2));

  // 2. Test excel_create_workbook
  const excelRes = await handleOfficeTool('excel_create_workbook', {
    file_path: './scratch/test_boq.xlsx',
    title: 'BẢNG TIÊN LƯỢNG DỰ TOÁN MẪU',
    project_name: 'DỰ ÁN CÙ LAO PHƯỚC HƯNG',
    sheets: [
      {
        name: 'TONG_HOP',
        sheet_title: 'BẢNG TỔNG HỢP KHỐI LƯỢNG VÀ KINH PHÍ',
        columns: [
          { header: 'STT', key: 'stt', width: 8, align: 'center' },
          { header: 'Mã Tag', key: 'tag', width: 25 },
          { header: 'Hạng Mục', key: 'item', width: 35 },
          { header: 'ĐVT', key: 'unit', width: 10, align: 'center' },
          { header: 'Số Lượng', key: 'quantity', width: 15, align: 'right', format: '#,##0.00' },
          { header: 'Đơn Giá (đ)', key: 'price', width: 18, align: 'right', format: '#,##0' },
          { header: 'Thành Tiền (đ)', key: 'total', width: 20, align: 'right', format: '#,##0' }
        ],
        rows: [
          { stt: 1, tag: 'BSQ-KTX-CONTAINER', item: 'Module Container 20ft KTX', unit: 'Bộ', quantity: 26, price: 45000000, total: 1170000000 },
          { stt: 2, tag: 'BSQ-KHO-BAI-XA-GO', item: 'Xà gồ mạ kẽm C100x50x15', unit: 'm', quantity: 1850, price: 95000, total: 175750000 }
        ],
        summary_row: true
      }
    ]
  });
  console.log('Excel create result:', excelRes);

  // 3. Test word_create_document
  const wordRes = await handleOfficeTool('word_create_document', {
    file_path: './scratch/test_report.docx',
    document_title: 'THUYẾT MINH BÓC TÁCH KHỐI LƯỢNG',
    project_name: 'VĂN PHÒNG BAN CHỈ HUY & KTX',
    sections: [
      {
        heading: '1. Căn Cứ Lập Thuyết Minh',
        paragraphs: ['Thuyết minh được lập dựa trên mô hình hình học 3D thực tế trên SketchUp 2025.'],
        bullet_points: ['Mô hình: KTX, KHO VT, BAI GIA CONG.skp', 'Đơn vị đo lường: mm, kg, m2, m3']
      }
    ]
  });
  console.log('Word create result:', wordRes);
}

run().catch(console.error);

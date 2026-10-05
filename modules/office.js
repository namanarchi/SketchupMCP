/**
 * Module Microsoft Office MCP (modules/office.js)
 * Tự động hóa tạo lập, chỉnh sửa, đọc và xuất bản hồ sơ dự toán, báo cáo kỹ thuật ra Excel (.xlsx) và Word (.docx)
 * Hỗ trợ đồng thời:
 * 1. Native High-Performance JS Engine (ExcelJS & Docx) - Tạo file siêu tốc, chuẩn định dạng bảng biểu, màu sắc BSQUARE
 * 2. Windows COM Automation (Excel.Application & Word.Application) - Mở trực tiếp trong GUI và xuất PDF chất lượng in ấn
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ExcelJS = require('exceljs');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  HeadingLevel,
  Header,
  Footer,
  PageNumber
} = require('docx');

// Bộ màu chuẩn nhận diện BSQUARE
const COLOR_BSQUARE_NAVY = '1F4E79';     // Xanh Navy chính
const COLOR_BSQUARE_BLUE = '2E75B6';     // Xanh công nghệ
const COLOR_HEADER_FILL = '1F4E79';      // Nền tiêu đề bảng
const COLOR_ZEBRA_ROW = 'F9FAFB';        // Sọc so le
const COLOR_SUMMARY_FILL = 'D9E1F2';     // Nền hàng tổng cộng
const COLOR_BORDER = 'D9D9D9';           // Đường viền ô bảng

// Hàm thực thi PowerShell an toàn phục vụ COM Automation
function runPowerShellScript(psScript) {
  return new Promise((resolve, reject) => {
    const tempScriptPath = path.resolve(__dirname, `../scratch/temp_com_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.ps1`);
    fs.writeFileSync(tempScriptPath, psScript, 'utf8');

    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${tempScriptPath}"`;
    exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
      try {
        if (fs.existsSync(tempScriptPath)) fs.unlinkSync(tempScriptPath);
      } catch (e) {}

      if (error) {
        reject(new Error(`PowerShell COM Error: ${stderr || error.message}`));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

const OFFICE_TOOLS = [
  {
    name: 'office_get_status',
    description: 'Kiểm tra trạng thái cài đặt và phiên bản của Microsoft Office (Excel, Word) trên hệ thống Windows, các engine xử lý ExcelJS, Docx và các tính năng hỗ trợ.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'excel_create_workbook',
    description: 'Tạo tài liệu bảng tính Excel (.xlsx) mới chuyên nghiệp với nhiều Sheets, bảng khối lượng BOQ/dự toán chuẩn kỹ thuật xây dựng BSQUARE (màu sắc, viền ô, căn lề, định dạng số, công thức tự động tính tổng SUM).',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Đường dẫn tuyệt đối hoặc tương đối để lưu file .xlsx'
        },
        title: {
          type: 'string',
          description: 'Tiêu đề chung của tập tài liệu bảng tính'
        },
        project_name: {
          type: 'string',
          description: 'Tên dự án công trình (VD: KTX, KHO VT, BAI GIA CONG)'
        },
        author: {
          type: 'string',
          default: 'Antigravity Architect AI & BSQUARE',
          description: 'Tên người lập hoặc đơn vị thiết kế'
        },
        sheets: {
          type: 'array',
          description: 'Danh sách các sheet cần tạo trong file Excel',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Tên tab sheet (VD: TONG_HOP, KTX_2_TANG)' },
              sheet_title: { type: 'string', description: 'Tiêu đề in lớn đầu trang sheet' },
              subtitle: { type: 'string', description: 'Dòng phụ đề/ghi chú dưới tiêu đề' },
              columns: {
                type: 'array',
                description: 'Danh sách các cột của bảng tính',
                items: {
                  type: 'object',
                  properties: {
                    header: { type: 'string', description: 'Tên tiêu đề cột' },
                    key: { type: 'string', description: 'Mã định danh dữ liệu (VD: stt, name, unit, qty, price, total)' },
                    width: { type: 'number', description: 'Độ rộng cột' },
                    align: { type: 'string', enum: ['left', 'center', 'right'], default: 'left' },
                    format: { type: 'string', description: 'Định dạng số (VD: #,##0.00 hoặc #,##0 hoặc 0.0%)' }
                  },
                  required: ['header', 'key']
                }
              },
              rows: {
                type: 'array',
                description: 'Danh sách các hàng dữ liệu (mỗi phần tử là object chứa các key tương ứng với columns)',
                items: { type: 'object' }
              },
              summary_row: {
                type: 'boolean',
                default: true,
                description: 'Tự động thêm hàng Tổng Cộng với hàm SUM ở cuối bảng'
              },
              summary_label_col: {
                type: 'string',
                description: 'Cột hiển thị chữ TỔNG CỘNG (mặc định cột thứ 3 hoặc 2)'
              },
              summary_sum_cols: {
                type: 'array',
                items: { type: 'string' },
                description: 'Danh sách key các cột cần tự động tính tổng SUM (VD: ["quantity", "total"])'
              }
            },
            required: ['name', 'columns', 'rows']
          }
        },
        open_after_create: {
          type: 'boolean',
          default: false,
          description: 'Tự động mở file trong Microsoft Excel sau khi tạo xong'
        }
      },
      required: ['file_path', 'sheets']
    }
  },
  {
    name: 'excel_add_sheet',
    description: 'Thêm một Sheet mới hoặc ghi đè dữ liệu vào Sheet trong file Excel (.xlsx) hiện hữu.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Đường dẫn file .xlsx cần sửa đổi' },
        sheet_name: { type: 'string', description: 'Tên Sheet cần thêm/sửa' },
        sheet_title: { type: 'string', description: 'Tiêu đề in trên đầu Sheet' },
        columns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              header: { type: 'string' },
              key: { type: 'string' },
              width: { type: 'number' },
              align: { type: 'string', enum: ['left', 'center', 'right'] },
              format: { type: 'string' }
            },
            required: ['header', 'key']
          }
        },
        rows: {
          type: 'array',
          items: { type: 'object' }
        },
        summary_row: { type: 'boolean', default: true }
      },
      required: ['file_path', 'sheet_name', 'columns', 'rows']
    }
  },
  {
    name: 'excel_read_data',
    description: 'Đọc cấu trúc, danh sách các Sheets và dữ liệu hàng/cột từ file Excel (.xlsx) hiện hữu.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Đường dẫn file .xlsx cần đọc' },
        sheet_name: { type: 'string', description: 'Tên Sheet cụ thể cần đọc (bỏ trống nếu muốn lấy danh sách toàn bộ Sheets)' },
        max_rows: { type: 'number', default: 100, description: 'Số hàng tối đa cần đọc' }
      },
      required: ['file_path']
    }
  },
  {
    name: 'excel_export_pdf',
    description: 'Xuất file Excel (.xlsx) sang định dạng PDF chuẩn in ấn thông qua engine Microsoft Excel COM.',
    inputSchema: {
      type: 'object',
      properties: {
        excel_path: { type: 'string', description: 'Đường dẫn file .xlsx gốc' },
        pdf_path: { type: 'string', description: 'Đường dẫn lưu file .pdf xuất xưởng' },
        orientation: { type: 'string', enum: ['landscape', 'portrait'], default: 'landscape', description: 'Hướng trang in: landscape (ngang), portrait (dọc)' }
      },
      required: ['excel_path']
    }
  },
  {
    name: 'excel_open_in_gui',
    description: 'Mở trực tiếp file Excel (.xlsx) bằng ứng dụng Microsoft Excel giao diện đồ họa.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Đường dẫn file .xlsx cần mở' }
      },
      required: ['file_path']
    }
  },
  {
    name: 'word_create_document',
    description: 'Khởi tạo tài liệu thuyết minh dự toán, báo cáo kỹ thuật Word (.docx) chuyên nghiệp chuẩn TCVN có Header/Footer, số trang, tiêu đề, các mục phân cấp và các bảng biểu dữ liệu.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Đường dẫn lưu file .docx' },
        document_title: { type: 'string', description: 'Tiêu đề chính của tài liệu (VD: THUYẾT MINH BÓC TÁCH KHỐI LƯỢNG VÀ BIỆN PHÁP THI CÔNG)' },
        project_name: { type: 'string', description: 'Tên dự án công trình' },
        subtitle: { type: 'string', description: 'Phụ đề hoặc thông tin gói thầu' },
        author: { type: 'string', default: 'BAN CHỈ HUY CÔNG TRƯỜNG & BSQUARE', description: 'Đơn vị lập' },
        sections: {
          type: 'array',
          description: 'Danh sách các đề mục nội dung trong tài liệu',
          items: {
            type: 'object',
            properties: {
              heading: { type: 'string', description: 'Tiêu đề mục (VD: 1. Tổng Quan Dự Án)' },
              heading_level: { type: 'number', enum: [1, 2, 3], default: 1 },
              paragraphs: {
                type: 'array',
                items: { type: 'string' },
                description: 'Các đoạn văn bản thuyết minh'
              },
              bullet_points: {
                type: 'array',
                items: { type: 'string' },
                description: 'Danh sách các gạch đầu dòng'
              },
              table: {
                type: 'object',
                description: 'Bảng số liệu kèm theo mục này',
                properties: {
                  headers: { type: 'array', items: { type: 'string' } },
                  rows: {
                    type: 'array',
                    items: { type: 'array', items: { type: 'string' } }
                  },
                  widths: { type: 'array', items: { type: 'number' }, description: 'Tỷ lệ % độ rộng các cột (VD: [10, 30, 20, 20, 20])' }
                },
                required: ['headers', 'rows']
              }
            },
            required: ['heading']
          }
        },
        open_after_create: { type: 'boolean', default: false, description: 'Mở file trong Word sau khi tạo' }
      },
      required: ['file_path', 'document_title', 'sections']
    }
  },
  {
    name: 'word_export_pdf',
    description: 'Chuyển đổi tài liệu Word (.docx) sang tập tin PDF thông qua engine Microsoft Word COM.',
    inputSchema: {
      type: 'object',
      properties: {
        word_path: { type: 'string', description: 'Đường dẫn file .docx gốc' },
        pdf_path: { type: 'string', description: 'Đường dẫn lưu file .pdf xuất xưởng' }
      },
      required: ['word_path']
    }
  },
  {
    name: 'word_open_in_gui',
    description: 'Mở trực tiếp tài liệu Word (.docx) bằng ứng dụng Microsoft Word trên máy tính.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Đường dẫn file .docx cần mở' }
      },
      required: ['file_path']
    }
  }
];

// Định dạng một Sheet Excel theo phong cách BSQUARE chuyên nghiệp
function styleWorksheet(worksheet, sheetData, projectName) {
  const { sheet_title, subtitle, columns, rows, summary_row, summary_label_col, summary_sum_cols } = sheetData;
  const colCount = columns.length;

  let currentRowIdx = 1;

  // 1. Tiêu đề lớn đầu trang
  if (sheet_title) {
    const titleRow = worksheet.getRow(currentRowIdx);
    titleRow.values = [sheet_title];
    worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, colCount);
    titleRow.getCell(1).font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR_BSQUARE_NAVY}` } };
    titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.height = 32;
    currentRowIdx++;

    // Dòng phụ đề (Dự án / Ngày lập)
    const subText = subtitle || (projectName ? `DỰ ÁN: ${projectName.toUpperCase()} | NGÀY LẬP: ${new Date().toLocaleDateString('vi-VN')}` : '');
    if (subText) {
      const subRow = worksheet.getRow(currentRowIdx);
      subRow.values = [subText];
      worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, colCount);
      subRow.getCell(1).font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF333333' } };
      subRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      subRow.height = 20;
      currentRowIdx++;
    }
    // Dòng trống cách biệt
    currentRowIdx++;
  }

  const tableHeaderRowIdx = currentRowIdx;

  // 2. Thiết lập Cột
  worksheet.columns = columns.map(c => ({
    header: c.header,
    key: c.key,
    width: c.width || Math.max(c.header.length + 4, 12)
  }));

  // Ghi lại vị trí Header Row
  const headerRow = worksheet.getRow(tableHeaderRowIdx);
  headerRow.values = columns.map(c => c.header);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR_BSQUARE_BLUE}` } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      bottom: { style: 'medium', color: { argb: `FF${COLOR_BSQUARE_NAVY}` } },
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
    };
  });

  currentRowIdx = tableHeaderRowIdx + 1;
  const dataStartRowIdx = currentRowIdx;

  // 3. Thêm các hàng dữ liệu
  rows.forEach((rowData, rIdx) => {
    const row = worksheet.getRow(currentRowIdx);
    const rowValues = {};

    columns.forEach(col => {
      rowValues[col.key] = rowData[col.key] !== undefined ? rowData[col.key] : '';
    });
    row.values = rowValues;
    row.height = 22;

    const isZebra = rIdx % 2 === 1;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colDef = columns[colNumber - 1];
      cell.font = { name: 'Arial', size: 10 };
      if (isZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR_ZEBRA_ROW}` } };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: `FF${COLOR_BORDER}` } },
        left: { style: 'thin', color: { argb: `FF${COLOR_BORDER}` } },
        bottom: { style: 'thin', color: { argb: `FF${COLOR_BORDER}` } },
        right: { style: 'thin', color: { argb: `FF${COLOR_BORDER}` } }
      };

      if (colDef) {
        cell.alignment = {
          vertical: 'middle',
          horizontal: colDef.align || (typeof cell.value === 'number' ? 'right' : 'left')
        };
        if (colDef.format) {
          cell.numFmt = colDef.format;
        }
      }
    });

    currentRowIdx++;
  });

  const dataEndRowIdx = currentRowIdx - 1;

  // 4. Thêm Hàng Tổng Cộng (Summary Row)
  if (summary_row && rows.length > 0) {
    const summaryRow = worksheet.getRow(currentRowIdx);
    const sumCols = summary_sum_cols || columns.filter(c => c.key === 'quantity' || c.key === 'total' || c.key === 'amount' || c.key === 'weight_kg').map(c => c.key);
    const labelKey = summary_label_col || (columns[1] ? columns[1].key : columns[0].key);

    const sumValues = {};
    columns.forEach((col, cIdx) => {
      if (col.key === labelKey) {
        sumValues[col.key] = 'TỔNG CỘNG';
      } else if (sumCols.includes(col.key)) {
        const colLetter = worksheet.getColumn(cIdx + 1).letter;
        sumValues[col.key] = { formula: `SUM(${colLetter}${dataStartRowIdx}:${colLetter}${dataEndRowIdx})` };
      } else {
        sumValues[col.key] = '';
      }
    });

    summaryRow.values = sumValues;
    summaryRow.height = 26;
    summaryRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colDef = columns[colNumber - 1];
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: `FF${COLOR_BSQUARE_NAVY}` } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR_SUMMARY_FILL}` } };
      cell.border = {
        top: { style: 'thin', color: { argb: `FF${COLOR_BSQUARE_NAVY}` } },
        left: { style: 'thin', color: { argb: `FF${COLOR_BORDER}` } },
        bottom: { style: 'double', color: { argb: `FF${COLOR_BSQUARE_NAVY}` } },
        right: { style: 'thin', color: { argb: `FF${COLOR_BORDER}` } }
      };

      if (colDef) {
        cell.alignment = {
          vertical: 'middle',
          horizontal: colDef.align || (colDef.key === labelKey ? 'center' : 'right')
        };
        if (colDef.format) {
          cell.numFmt = colDef.format;
        }
      }
    });
  }

  // Tinh chỉnh Page Setup in ấn
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: colCount > 6 ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 }
  };
}

// Bộ xử lý thực thi các công cụ Office MCP
async function handleOfficeTool(toolName, args) {
  switch (toolName) {
    case 'office_get_status': {
      let excelComOk = false;
      let wordComOk = false;
      let excelVersion = 'Chưa xác định';
      let wordVersion = 'Chưa xác định';

      try {
        const psCheck = `
          $out = @{}
          try {
            $e = New-Object -ComObject Excel.Application
            $out['excel'] = $e.Version
            $e.Quit()
            [System.Runtime.Interopservices.Marshal]::ReleaseComObject($e) | Out-Null
          } catch { $out['excel'] = 'None' }

          try {
            $w = New-Object -ComObject Word.Application
            $out['word'] = $w.Version
            $w.Quit()
            [System.Runtime.Interopservices.Marshal]::ReleaseComObject($w) | Out-Null
          } catch { $out['word'] = 'None' }
          $out | ConvertTo-Json
        `;
        const psRes = await runPowerShellScript(psCheck);
        const parsed = JSON.parse(psRes);
        if (parsed.excel && parsed.excel !== 'None') {
          excelComOk = true;
          excelVersion = parsed.excel;
        }
        if (parsed.word && parsed.word !== 'None') {
          wordComOk = true;
          wordVersion = parsed.word;
        }
      } catch (e) {}

      return {
        success: true,
        status: 'ready',
        excel_com_engine: {
          installed: excelComOk,
          version: excelVersion,
          status: excelComOk ? 'Ready (COM 16.0)' : 'Not Available'
        },
        word_com_engine: {
          installed: wordComOk,
          version: wordVersion,
          status: wordComOk ? 'Ready (COM 16.0)' : 'Not Available'
        },
        native_js_engines: {
          exceljs: 'Loaded (Full XLSX generation with formatting, formulas & styles)',
          docx: 'Loaded (Full DOCX generation with headers, footers & tables)'
        },
        features: [
          'Tạo file Excel (.xlsx) đa Sheet dự toán BOQ chuẩn màu sắc BSQUARE',
          'Tự động lập hàm tính tổng SUM, format số phân cách hàng nghìn',
          'Đọc và phân tích file Excel hiện hữu',
          'Tạo tài liệu thuyết minh dự án Word (.docx) chuẩn TCVN',
          'Xuất bản Excel & Word sang PDF chất lượng in ấn cao',
          'Mở trực tiếp file bằng Microsoft Excel/Word GUI'
        ]
      };
    }

    case 'excel_create_workbook': {
      const { file_path, title, project_name, author, sheets, open_after_create } = args;
      const targetPath = path.resolve(process.cwd(), file_path);
      const parentDir = path.dirname(targetPath);
      if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });

      const workbook = new ExcelJS.Workbook();
      workbook.creator = author || 'Antigravity Architect AI';
      workbook.lastModifiedBy = author || 'Antigravity Architect AI';
      workbook.created = new Date();
      workbook.modified = new Date();

      sheets.forEach(sheetDef => {
        const ws = workbook.addWorksheet(sheetDef.name, {
          views: [{ showGridLines: true }]
        });
        styleWorksheet(ws, sheetDef, project_name || title);
      });

      await workbook.xlsx.writeFile(targetPath);

      if (open_after_create) {
        exec(`start "" "${targetPath}"`);
      }

      return {
        success: true,
        message: `Đã tạo thành công file Excel bảng tính [${path.basename(targetPath)}]`,
        file_path: targetPath,
        sheet_count: sheets.length,
        sheet_names: sheets.map(s => s.name),
        total_rows_written: sheets.reduce((acc, s) => acc + (s.rows ? s.rows.length : 0), 0)
      };
    }

    case 'excel_add_sheet': {
      const { file_path, sheet_name, sheet_title, columns, rows, summary_row } = args;
      const targetPath = path.resolve(process.cwd(), file_path);
      if (!fs.existsSync(targetPath)) {
        throw new Error(`File Excel không tồn tại: ${targetPath}`);
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(targetPath);

      const existingWs = workbook.getWorksheet(sheet_name);
      if (existingWs) {
        workbook.removeWorksheet(existingWs.id);
      }

      const ws = workbook.addWorksheet(sheet_name, { views: [{ showGridLines: true }] });
      styleWorksheet(ws, { sheet_title, columns, rows, summary_row }, '');

      await workbook.xlsx.writeFile(targetPath);
      return {
        success: true,
        message: `Đã cập nhật Sheet [${sheet_name}] vào file ${path.basename(targetPath)}`,
        file_path: targetPath,
        rows_added: rows.length
      };
    }

    case 'excel_read_data': {
      const { file_path, sheet_name, max_rows = 100 } = args;
      const targetPath = path.resolve(process.cwd(), file_path);
      if (!fs.existsSync(targetPath)) {
        throw new Error(`File không tồn tại: ${targetPath}`);
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(targetPath);

      const sheetNames = workbook.worksheets.map(ws => ws.name);
      if (!sheet_name) {
        return {
          success: true,
          file_path: targetPath,
          sheet_count: sheetNames.length,
          sheets: sheetNames
        };
      }

      const ws = workbook.getWorksheet(sheet_name);
      if (!ws) {
        throw new Error(`Không tìm thấy Sheet [${sheet_name}]. Các Sheet có sẵn: ${sheetNames.join(', ')}`);
      }

      const rowsData = [];
      let count = 0;
      ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (count >= max_rows) return;
        rowsData.push({
          row_number: rowNumber,
          values: row.values
        });
        count++;
      });

      return {
        success: true,
        file_path: targetPath,
        sheet_name: sheet_name,
        total_rows_read: rowsData.length,
        rows: rowsData
      };
    }

    case 'excel_export_pdf': {
      const { excel_path, pdf_path, orientation = 'landscape' } = args;
      const targetExcel = path.resolve(process.cwd(), excel_path);
      if (!fs.existsSync(targetExcel)) {
        throw new Error(`File Excel không tồn tại: ${targetExcel}`);
      }

      const targetPdf = pdf_path ? path.resolve(process.cwd(), pdf_path) : targetExcel.replace(/\.xlsx$/i, '.pdf');
      const isLandscape = orientation === 'landscape';

      const psScript = `
        $excel = New-Object -ComObject Excel.Application
        $excel.Visible = $false
        $excel.DisplayAlerts = $false
        try {
          $wb = $excel.Workbooks.Open('${targetExcel.replace(/'/g, "''")}')
          foreach ($ws in $wb.Worksheets) {
            $ws.PageSetup.Orientation = ${isLandscape ? 2 : 1}
            $ws.PageSetup.FitToPagesWide = 1
            $ws.PageSetup.FitToPagesTall = 0
            $ws.PageSetup.Zoom = $false
          }
          # 0 = xlTypePDF
          $wb.ExportAsFixedFormat(0, '${targetPdf.replace(/'/g, "''")}')
          $wb.Close($false)
          Write-Output 'OK'
        } finally {
          $excel.Quit()
          [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
        }
      `;

      await runPowerShellScript(psScript);
      return {
        success: true,
        message: `Đã xuất PDF từ Excel thành công`,
        pdf_path: targetPdf
      };
    }

    case 'excel_open_in_gui': {
      const { file_path } = args;
      const targetPath = path.resolve(process.cwd(), file_path);
      if (!fs.existsSync(targetPath)) {
        throw new Error(`File không tồn tại: ${targetPath}`);
      }
      exec(`start "" "${targetPath}"`);
      return {
        success: true,
        message: `Đã mở file Excel trên giao diện Microsoft Excel: ${path.basename(targetPath)}`
      };
    }

    case 'word_create_document': {
      const { file_path, document_title, project_name, subtitle, author, sections, open_after_create } = args;
      const targetPath = path.resolve(process.cwd(), file_path);
      const parentDir = path.dirname(targetPath);
      if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });

      const children = [];

      // 1. Tiêu đề lớn
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: document_title.toUpperCase(),
              bold: true,
              size: 32, // 16pt
              color: COLOR_BSQUARE_NAVY,
              font: 'Arial'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 100 }
        })
      );

      // Phụ đề dự án
      if (project_name || subtitle) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `DỰ ÁN: ${(project_name || '').toUpperCase()}`,
                bold: true,
                size: 24, // 12pt
                color: COLOR_BSQUARE_BLUE,
                font: 'Arial'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 }
          })
        );
      }

      if (subtitle) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: subtitle,
                italics: true,
                size: 20,
                color: '666666',
                font: 'Arial'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 }
          })
        );
      }

      // 2. Từng Section
      sections.forEach((sec, sIdx) => {
        // Tiêu đề mục
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: sec.heading,
                bold: true,
                size: sec.heading_level === 1 ? 26 : (sec.heading_level === 2 ? 22 : 20),
                color: COLOR_BSQUARE_NAVY,
                font: 'Arial'
              })
            ],
            heading: sec.heading_level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 }
          })
        );

        // Các đoạn văn bản
        if (sec.paragraphs) {
          sec.paragraphs.forEach(pText => {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: pText, size: 22, font: 'Arial' }) // 11pt
                ],
                spacing: { after: 120 },
                alignment: AlignmentType.JUSTIFIED
              })
            );
          });
        }

        // Các gạch đầu dòng
        if (sec.bullet_points) {
          sec.bullet_points.forEach(bp => {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `• ${bp}`, size: 22, font: 'Arial' })
                ],
                spacing: { after: 80 },
                indent: { left: 400 }
              })
            );
          });
        }

        // Bảng dữ liệu trong Word
        if (sec.table && sec.table.headers && sec.table.rows) {
          const colWidths = sec.table.widths || sec.table.headers.map(() => Math.floor(100 / sec.table.headers.length));
          const tableRows = [];

          // Header row
          tableRows.push(
            new TableRow({
              children: sec.table.headers.map((hText, hIdx) => {
                return new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: hText, bold: true, color: 'FFFFFF', size: 20, font: 'Arial' })
                      ],
                      alignment: AlignmentType.CENTER
                    })
                  ],
                  shading: { fill: COLOR_BSQUARE_NAVY },
                  width: { size: colWidths[hIdx] * 50, type: WidthType.DXA }
                });
              })
            })
          );

          // Data rows
          sec.table.rows.forEach((rowVals, rIdx) => {
            const isZebra = rIdx % 2 === 1;
            tableRows.push(
              new TableRow({
                children: rowVals.map((val, vIdx) => {
                  return new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: String(val), size: 19, font: 'Arial' })
                        ],
                        alignment: vIdx === 0 ? AlignmentType.CENTER : AlignmentType.LEFT
                      })
                    ],
                    shading: isZebra ? { fill: COLOR_ZEBRA_ROW } : undefined,
                    width: { size: colWidths[vIdx] * 50, type: WidthType.DXA }
                  });
                })
              })
            );
          });

          children.push(
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
                left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
                right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
                insideVertical: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER }
              }
            })
          );

          // Khoảng trống sau bảng
          children.push(new Paragraph({ spacing: { after: 200 } }));
        }
      });

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1134,    // 20mm
                bottom: 1134, // 20mm
                left: 1417,   // 25mm
                right: 850    // 15mm
              }
            }
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: author || 'CÔNG TY CP ĐẦU TƯ XÂY DỰNG BSQUARE', size: 16, bold: true, color: COLOR_BSQUARE_BLUE, font: 'Arial' })
                  ],
                  alignment: AlignmentType.RIGHT
                })
              ]
            })
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Trang ', size: 18, font: 'Arial' }),
                    new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Arial' }),
                    new TextRun({ text: ' / ', size: 18, font: 'Arial' }),
                    new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, font: 'Arial' })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ]
            })
          },
          children: children
        }]
      });

      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(targetPath, buffer);

      if (open_after_create) {
        exec(`start "" "${targetPath}"`);
      }

      return {
        success: true,
        message: `Đã tạo tài liệu Word [${path.basename(targetPath)}] thành công`,
        file_path: targetPath,
        section_count: sections.length
      };
    }

    case 'word_export_pdf': {
      const { word_path, pdf_path } = args;
      const targetWord = path.resolve(process.cwd(), word_path);
      if (!fs.existsSync(targetWord)) {
        throw new Error(`File Word không tồn tại: ${targetWord}`);
      }

      const targetPdf = pdf_path ? path.resolve(process.cwd(), pdf_path) : targetWord.replace(/\.docx$/i, '.pdf');

      const psScript = `
        $word = New-Object -ComObject Word.Application
        $word.Visible = $false
        $word.DisplayAlerts = 0
        try {
          $doc = $word.Documents.Open('${targetWord.replace(/'/g, "''")}')
          # 17 = wdExportFormatPDF
          $doc.ExportAsFixedFormat('${targetPdf.replace(/'/g, "''")}', 17)
          $doc.Close($false)
          Write-Output 'OK'
        } finally {
          $word.Quit()
          [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
        }
      `;

      await runPowerShellScript(psScript);
      return {
        success: true,
        message: `Đã xuất PDF từ Word thành công`,
        pdf_path: targetPdf
      };
    }

    case 'word_open_in_gui': {
      const { file_path } = args;
      const targetPath = path.resolve(process.cwd(), file_path);
      if (!fs.existsSync(targetPath)) {
        throw new Error(`File không tồn tại: ${targetPath}`);
      }
      exec(`start "" "${targetPath}"`);
      return {
        success: true,
        message: `Đã mở tài liệu trên Microsoft Word: ${path.basename(targetPath)}`
      };
    }

    default:
      throw new Error(`Không tìm thấy công cụ Office: ${toolName}`);
  }
}

module.exports = {
  OFFICE_TOOLS,
  handleOfficeTool
};

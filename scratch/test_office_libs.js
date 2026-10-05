const ExcelJS = require('exceljs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');
const fs = require('fs');
const path = require('path');

async function testExcel() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Antigravity MCP';
  const ws = wb.addWorksheet('TEST_SHEET');
  ws.columns = [
    { header: 'STT', key: 'stt', width: 10 },
    { header: 'Tên Hạng Mục', key: 'name', width: 30 },
    { header: 'Số Lượng', key: 'qty', width: 15 }
  ];
  ws.addRow({ stt: 1, name: 'Cột thép C100', qty: 45 });
  const outPath = path.resolve(__dirname, 'test.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log('Excel test passed:', outPath);
}

async function testWord() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: "DỰ ÁN: KHO BÃI & KTX", bold: true, size: 28 })
          ]
        })
      ]
    }]
  });
  const buf = await Packer.toBuffer(doc);
  const outPath = path.resolve(__dirname, 'test.docx');
  fs.writeFileSync(outPath, buf);
  console.log('Word test passed:', outPath);
}

Promise.all([testExcel(), testWord()])
  .then(() => console.log('ALL TESTS PASSED'))
  .catch(err => console.error('Error:', err));

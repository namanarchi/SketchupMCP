const fs = require('fs');
const path = require('path');
const { OFFICE_TOOLS } = require('../modules/office');

const targetDirs = [
  path.resolve(__dirname, '../schemas'),
  'C:/Users/MAI KHANH/.gemini/antigravity-ide/mcp/sketchup'
];

targetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

OFFICE_TOOLS.forEach(tool => {
  const schemaObj = {
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema
  };
  const jsonContent = JSON.stringify(schemaObj, null, 2);

  targetDirs.forEach(dir => {
    const filePath = path.join(dir, `${tool.name}.json`);
    fs.writeFileSync(filePath, jsonContent, 'utf8');
    console.log(`Generated: ${filePath}`);
  });
});

console.log(`Successfully exported ${OFFICE_TOOLS.length} office tool schemas.`);

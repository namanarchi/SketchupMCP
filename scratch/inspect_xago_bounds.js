const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scratch/deep_audit_kho.json', 'utf8'));

console.log('--- ALL XAGO ITEMS ---');
data.xago_items.forEach((x, idx) => {
  console.log(`[${idx}] ${x.name} | Dim: ${JSON.stringify(x.dim)} | Min: [${x.min}] -> Max: [${x.max}]`);
});

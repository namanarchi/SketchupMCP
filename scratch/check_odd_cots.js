const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scratch/deep_audit_kho.json', 'utf8'));

console.log('--- ODD COTS ---');
console.log('Total cots:', data.cot_count);
console.log('Odd cots count:', data.odd_cots.length);
data.odd_cots.forEach(c => {
  console.log(`  ${c.name} | Min: [${c.min}] -> Max: [${c.max}]`);
});

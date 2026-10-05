const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scratch/deep_audit_kho.json', 'utf8'));

console.log('--- KHO CHILDREN ---');
data.kho_children.forEach(c => {
  console.log(`[${c.name}] Layer: ${c.layer} | Dim: ${JSON.stringify(c.dim)} | Min: [${c.min}] -> Max: [${c.max}]`);
});

console.log('\n--- DAM ITEMS ---');
data.dam_items.forEach(d => {
  console.log(`  ${d.name} | Dim: ${JSON.stringify(d.dim)} | Min: [${d.min}] -> Max: [${d.max}]`);
});

console.log('\n--- KEO ITEMS ---');
data.keo_items.forEach(k => {
  console.log(`  ${k.name} | Dim: ${JSON.stringify(k.dim)} | Min: [${k.min}] -> Max: [${k.max}]`);
});

console.log('\n--- VACH ITEMS ---');
data.vach_items.forEach(v => {
  console.log(`  ${v.name} | Dim: ${JSON.stringify(v.dim)} | Min: [${v.min}] -> Max: [${v.max}]`);
});

console.log('\n--- GIANG ITEMS (first 10) ---');
data.giang_items.slice(0, 10).forEach(g => {
  console.log(`  ${g.name} | Dim: ${JSON.stringify(g.dim)} | Min: [${g.min}] -> Max: [${g.max}]`);
});

console.log('\n--- SUB ZONES ---');
data.sub_zones.forEach(s => {
  console.log(`  ${s.name} | Layer: ${s.layer} | Dim: ${JSON.stringify(s.dim)} | Min: [${s.min}] -> Max: [${s.max}]`);
});

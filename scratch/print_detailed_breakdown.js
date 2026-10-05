const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'full_kho_audit.json'), 'utf8'));

console.log("=== PHÂN TÍCH CHI TIẾT DỰNG HÌNH KHO VẬT TƯ & BÃI GIA CÔNG ===\n");

data.subgroups.forEach(sg => {
  console.log(`\n======================================================`);
  console.log(`SUBGROUP: ${sg.name} | Tag: ${sg.tag} | Children: ${sg.children.length}`);
  console.log(`Bounds: X[${sg.bounds.min[0]}, ${sg.bounds.max[0]}] Y[${sg.bounds.min[1]}, ${sg.bounds.max[1]}] Z[${sg.bounds.min[2]}, ${sg.bounds.max[2]}]`);
  console.log(`------------------------------------------------------`);
  
  sg.children.forEach((c, idx) => {
    console.log(`  [${idx + 1}] ${c.name} | Dim: [${c.bounds.dim.join(' x ')}] | Z: [${c.bounds.min[2]} -> ${c.bounds.max[2]}] | Pos: X[${c.bounds.min[0]}, ${c.bounds.max[0]}], Y[${c.bounds.min[1]}, ${c.bounds.max[1]}]`);
  });
});

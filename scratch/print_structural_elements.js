const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'full_kho_audit.json'), 'utf8'));

function printSub(name) {
  const sg = data.subgroups.find(s => s.name.includes(name));
  if (!sg) { console.log("Not found:", name); return; }
  console.log(`\n======================================================`);
  console.log(`SUBGROUP: ${sg.name} | Tag: ${sg.tag} | Children: ${sg.children.length}`);
  console.log(`Bounds: X[${sg.bounds.min[0]}, ${sg.bounds.max[0]}] Y[${sg.bounds.min[1]}, ${sg.bounds.max[1]}] Z[${sg.bounds.min[2]}, ${sg.bounds.max[2]}]`);
  console.log(`------------------------------------------------------`);
  sg.children.forEach((c, idx) => {
    console.log(`  [${idx + 1}] ${c.name} | Dim: [${c.bounds.dim.join(' x ')}] | Z: [${c.bounds.min[2]} -> ${c.bounds.max[2]}] | Pos: X[${c.bounds.min[0]}, ${c.bounds.max[0]}], Y[${c.bounds.min[1]}, ${c.bounds.max[1]}]`);
  });
}

console.log("=== HỆ CỘT THÉP HỘP ===");
printSub("He_Cot_Thep_Hop");

console.log("\n=== HỆ VÌ KÈO MÁI ===");
printSub("He_Keo_Mai");

console.log("\n=== HỆ XÀ GỒ MÁI C100 ===");
printSub("He_Xa_Go_Mai");

console.log("\n=== HỆ VÁCH TÔN BAO CHE ===");
printSub("He_Vach_Ton");

console.log("\n=== HỆ MÁI TÔN ===");
printSub("He_Ton_Mai");

const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scratch/kho_structure.json', 'utf8'));

const targets = ['He_Keo_Mai_Khung_Hop_60x120', 'He_Xa_Go_Mai_Thep_Hop_30x70', 'He_Dam_Giang_Doc_ST1'];

data.children.forEach(child => {
  if (targets.includes(child.name)) {
    console.log(`\n=================== ${child.name} [Layer: ${child.layer}] ===================`);
    console.log(`Bounds: ${JSON.stringify(child.dim)} | Pos: [${child.pos_min}] -> [${child.pos_max}]`);
    if (child.children) {
      child.children.forEach((sub, idx) => {
        console.log(`  [${idx}] ${sub.name || sub.def_name} [Layer: ${sub.layer}] Dim: ${JSON.stringify(sub.dim)} Pos: [${sub.pos_min}] -> [${sub.pos_max}]`);
        if (sub.children) {
          sub.children.forEach((s2, i2) => {
            console.log(`      (${i2}) ${s2.name || s2.def_name} [Layer: ${s2.layer}] Dim: ${JSON.stringify(s2.dim)} Pos: [${s2.pos_min}] -> [${s2.pos_max}]`);
          });
        }
      });
    }
  }
});

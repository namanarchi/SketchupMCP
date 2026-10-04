const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'survey_result.json'), 'utf8'));
const items = data.matching_items;

console.log('Total items in survey:', items.length);

const targets = [
  'dam_doc', 'st1', 'dinh_noc', 'qua_giang', 'chong_dung', 'xa_go', '30x70', 'kho', 'gia_cong', 'bai'
];

const foundSpecific = items.filter(it => {
  const str = (it.name + ' ' + it.def_name + ' ' + it.parent + ' ' + it.layer).toLowerCase();
  return targets.some(t => str.includes(t));
});

console.log('Filtered matching items:', foundSpecific.length);

// Group by name/def_name
const summary = {};
foundSpecific.forEach(it => {
  const key = `${it.parent} -> ${it.name || it.def_name} [Layer: ${it.layer}]`;
  if (!summary[key]) summary[key] = { count: 0, sample: it };
  summary[key].count++;
});

console.log('\n--- CÁC CẤU KIỆN PHÁT HIỆN ĐƯỢC ---');
Object.entries(summary).slice(0, 40).forEach(([k, v]) => {
  console.log(`${k} (Count: ${v.count}) | Dim: ${JSON.stringify(v.sample.dim_w_d_h)} | Bounds: ${JSON.stringify(v.sample.bounds_min)} -> ${JSON.stringify(v.sample.bounds_max)}`);
});

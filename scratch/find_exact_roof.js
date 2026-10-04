const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'survey_result.json'), 'utf8'));
const items = data.matching_items;

const searchExact = ['dam_doc_st1', 'dinh_noc', 'qua_giang_day', 'chong_dung_dinh', '30x70', 'kho', 'gia_cong', 'bai_gia_cong', 'nha_kho', 'kho_vat_tu'];

items.forEach(it => {
  const allText = (it.name + ' ' + it.def_name + ' ' + it.parent + ' ' + it.layer).toLowerCase();
  for (const s of searchExact) {
    if (allText.includes(s)) {
      console.log(`FOUND [${s}]: ${it.parent} -> ${it.name} (${it.def_name}) | Layer: ${it.layer} | Dim: ${JSON.stringify(it.dim_w_d_h)} | Bounds: [${it.bounds_min}] -> [${it.bounds_max}]`);
      break;
    }
  }
});

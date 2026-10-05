const fs = require('fs');

const rubyScript = `
model = Sketchup.active_model
kho_group = model.entities.find { |e| e.is_a?(Sketchup::Group) && e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }

keo = kho_group.entities.find { |e| e.name =~ /He_Keo/i }
cot = kho_group.entities.find { |e| e.name =~ /He_Cot/i }
dam = kho_group.entities.find { |e| e.name =~ /He_Dam/i }

dam_cot_issues = []
if dam && cot
  dam.entities.each do |d|
    cot.entities.each do |c|
      ib = d.bounds.intersect(c.bounds)
      if ib.valid? && (ib.width.to_mm > 1 && ib.height.to_mm > 1 && ib.depth.to_mm > 1)
        dam_cot_issues << {
          dam: d.name,
          cot: c.name,
          overlap: [ib.width.to_mm.round(1), ib.height.to_mm.round(1), ib.depth.to_mm.round(1)]
        }
      end
    end
  end
end

keo_dam_issues = []
if keo && dam
  keo.entities.each do |k|
    dam.entities.each do |d|
      ib = k.bounds.intersect(d.bounds)
      if ib.valid? && (ib.width.to_mm > 1 && ib.height.to_mm > 1 && ib.depth.to_mm > 1)
        keo_dam_issues << {
          keo: k.name,
          dam: d.name,
          overlap: [ib.width.to_mm.round(1), ib.height.to_mm.round(1), ib.depth.to_mm.round(1)]
        }
      end
    end
  end
end

{
  dam_cot_issues_count: dam_cot_issues.size,
  dam_cot_issues: dam_cot_issues,
  keo_dam_issues_count: keo_dam_issues.size,
  keo_dam_issues: keo_dam_issues
}.to_json
`;

const postData = JSON.stringify({ code: rubyScript });
const http = require('http');
const req = http.request({
  hostname: '127.0.0.1', port: 9876, path: '/execute', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
  timeout: 10000
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    let parsed = JSON.parse(body).result;
    while (typeof parsed === 'string') parsed = JSON.parse(parsed);
    console.log(JSON.stringify(parsed, null, 2));
  });
});
req.write(postData);
req.end();

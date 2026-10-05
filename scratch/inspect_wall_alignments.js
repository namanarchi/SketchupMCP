const http = require('http');

function callRuby(code) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ code });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 9876,
      path: '/execute',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  const ruby = `
model = Sketchup.active_model
kho = model.entities.find { |e| e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
cot_group = kho.entities.find { |e| e.name =~ /He_Cot/i }
giang_group = kho.entities.find { |e| e.name =~ /He_Giang/i }
vach_group = kho.entities.find { |e| e.name =~ /He_Vach/i }

def bounds_info(e)
  b = e.bounds
  {
    name: e.name,
    min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
    max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)]
  }
end

# Tìm các cột biên Tây (Cot_Doc_1, 3, 5, 7, 9, 11, 13)
cots_tay = cot_group.entities.select { |e| e.name =~ /Cot_Doc_(1|3|5|7|9|11|13)$/ }.map { |e| bounds_info(e) }
# Tìm các cột biên Nam (Cot_Ngang_1, 4, 7, 10)
cots_nam = cot_group.entities.select { |e| e.name =~ /Cot_Ngang_(1|4|7|10)$/ }.map { |e| bounds_info(e) }
# Tìm các cột biên Bắc nhánh dọc (Cot_Doc_13, 14)
cots_bac = cot_group.entities.select { |e| e.name =~ /Cot_Doc_(13|14)$/ }.map { |e| bounds_info(e) }

# Giằng & Vách
giang_tay = giang_group.entities.select { |e| e.name =~ /Tay/ }.map { |e| bounds_info(e) }
giang_nam = giang_group.entities.select { |e| e.name =~ /Nam/ }.map { |e| bounds_info(e) }
giang_bac = giang_group.entities.select { |e| e.name =~ /Bac/ }.map { |e| bounds_info(e) }

vach_tay = vach_group.entities.select { |e| e.name =~ /Tay/ }.map { |e| bounds_info(e) }
vach_nam = vach_group.entities.select { |e| e.name =~ /Nam/ }.map { |e| bounds_info(e) }
vach_bac = vach_group.entities.select { |e| e.name =~ /Bac/ }.map { |e| bounds_info(e) }

{
  cots_tay: cots_tay.first(2),
  cots_nam: cots_nam.first(2),
  cots_bac: cots_bac,
  giang_tay: giang_tay.first(2),
  giang_nam: giang_nam.first(2),
  giang_bac: giang_bac.first(2),
  vach_tay: vach_tay,
  vach_nam: vach_nam,
  vach_bac: vach_bac
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

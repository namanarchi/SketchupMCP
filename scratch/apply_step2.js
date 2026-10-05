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
model.start_operation("Fix Step 2: Wall Girts and Cladding Alignment", true)

kho = model.entities.find { |e| e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
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

# 1. Dời Tôn Tây dX = -35mm (từ [4220, 4245] về [4185, 4210])
vach_tay = vach_group.entities.find { |e| e.name =~ /Vach_Tay_30m/ }
if vach_tay
  t = Geom::Transformation.translation(Geom::Vector3d.new(-35.mm, 0, 0))
  vach_tay.transform!(t)
end

# 2. Dời Giằng Nam & Cột phụ Nam dY = -30mm (từ [103027, 103077] về [102997, 103047])
giang_group.entities.each do |g|
  if g.name =~ /Nam/
    t = Geom::Transformation.translation(Geom::Vector3d.new(0, -30.mm, 0))
    g.transform!(t)
  end
end

# 3. Dời Tôn Nam dY = -35mm (từ [103007, 103032] về [102972, 102997])
vach_nam = vach_group.entities.find { |e| e.name =~ /Vach_Nam_26m/ }
if vach_nam
  t = Geom::Transformation.translation(Geom::Vector3d.new(0, -35.mm, 0))
  vach_nam.transform!(t)
end

# 4. Dời Giằng Bắc dY = +5mm (từ [132932, 132982] về [132937, 132987])
giang_group.entities.each do |g|
  if g.name =~ /Bac/
    t = Geom::Transformation.translation(Geom::Vector3d.new(0, 5.mm, 0))
    g.transform!(t)
  end
end

# 5. Dời Tôn Bắc thân dY = +5mm (từ [132982, 133007] về [132987, 133012])
vach_bac = vach_group.entities.find { |e| e.name =~ /Vach_Bac_Dau_Hoi/ }
if vach_bac
  t = Geom::Transformation.translation(Geom::Vector3d.new(0, 5.mm, 0))
  vach_bac.transform!(t)
end

# 6. Dời Tam giác đầu hồi Bắc dY = +30mm (từ [132957, 132982] về [132987, 133012])
tam_giac_bac = vach_group.entities.find { |e| e.name =~ /Tam_Giac_Dau_Hoi_Bac/ }
if tam_giac_bac
  t = Geom::Transformation.translation(Geom::Vector3d.new(0, 30.mm, 0))
  tam_giac_bac.transform!(t)
end

model.commit_operation

{
  vach_tay: bounds_info(vach_tay),
  giang_nam_sample: bounds_info(giang_group.entities.find { |e| e.name =~ /Giang_Vach_Nam_Tang_1/ }),
  vach_nam: bounds_info(vach_nam),
  giang_bac_sample: bounds_info(giang_group.entities.find { |e| e.name =~ /Giang_Vach_Bac_Tang_1/ }),
  vach_bac: bounds_info(vach_bac),
  tam_giac_bac: bounds_info(tam_giac_bac)
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== KẾT QUẢ BƯỚC 2 ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

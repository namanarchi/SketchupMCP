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
model.start_operation("Fix Ridge Caps with Exact Roof Slope Bending", true)

kho = model.entities.find { |e| e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
ton = kho.entities.find { |e| e.name =~ /He_Ton_Mai/i }
up_noc = ton.entities.find { |e| e.name =~ /He_Thong_Up_Noc/i }
tag_mai = model.layers["BSQ-KHO-BAI-MAI-TON"] || model.layers.add("BSQ-KHO-BAI-MAI-TON")

# 1. Xóa Up_Noc_Canh_Ngang và Up_Noc_Canh_Doc cũ (hộp phẳng nằm ngang)
old_ngang = up_noc.entities.find { |e| e.name =~ /Up_Noc_Canh_Ngang/i }
old_doc = up_noc.entities.find { |e| e.name =~ /Up_Noc_Canh_Doc/i }
old_ngang.erase! if old_ngang && old_ngang.valid?
old_doc.erase! if old_doc && old_doc.valid?

# Độ dày tôn úp nóc: t = 2.0mm
thk = 2.0.mm

# --- A. DỰNG LẠI Up_Noc_Canh_Ngang BẺ GÓC MÁI NAM - BẮC ---
# Chiều dài chạy theo X từ X=7220 đến X=30470 (dài 23250mm)
# Đỉnh nóc tại Y=107007. Cao độ đỉnh nóc mặt trên tôn: Z = 4351.0mm
# Cánh Nam: Y từ 107007 về 106807 (rộng 200mm), dZ = -200 * 0.13375 = -26.75mm
# Cánh Bắc: Y từ 107007 đến 107207 (rộng 200mm), dZ = -200 * 0.13375 = -26.75mm
g_ngang = up_noc.entities.add_group
g_ngang.name = "Up_Noc_Canh_Ngang"
g_ngang.layer = tag_mai

# Mặt cắt tiết diện chữ V tại X = 7220mm (phương Y-Z):
# Đỉnh trên: (107007, 4353.0)
# Đỉnh Nam ngoài: (106807, 4353.0 - 26.75)
# Đỉnh Bắc ngoài: (107207, 4353.0 - 26.75)
# Với độ dày thk=2mm phía dưới:
z_top = 4353.0
dz_slope = 200.0 * 0.13375 # 26.75mm

# 6 đỉnh tạo mặt cắt kín chữ V
pts_ngang = [
  Geom::Point3d.new(7220.mm, 107007.mm, z_top.mm),
  Geom::Point3d.new(7220.mm, 107207.mm, (z_top - dz_slope).mm),
  Geom::Point3d.new(7220.mm, 107207.mm, (z_top - dz_slope - 2.0).mm),
  Geom::Point3d.new(7220.mm, 107007.mm, (z_top - 2.0).mm),
  Geom::Point3d.new(7220.mm, 106807.mm, (z_top - dz_slope - 2.0).mm),
  Geom::Point3d.new(7220.mm, 106807.mm, (z_top - dz_slope).mm)
]

f_ngang = g_ngang.entities.add_face(pts_ngang)
len_ngang = (30470.0 - 7220.0).mm
# Đùn theo hướng +X
if f_ngang.normal.x > 0
  f_ngang.pushpull(len_ngang)
else
  f_ngang.pushpull(-len_ngang)
end

# --- B. DỰNG LẠI Up_Noc_Canh_Doc BẺ GÓC MÁI TÂY - ĐÔNG ---
# Chiều dài chạy theo Y từ Y=107007 đến Y=133257 (dài 26250mm)
# Đỉnh nóc tại X=7220. Cao độ đỉnh nóc mặt trên tôn: Z = 4353.0mm
# Cánh Tây: X từ 7220 về 7020 (rộng 200mm), dZ = -200 * 0.17833 = -35.67mm
# Cánh Đông: X từ 7220 đến 7420 (rộng 200mm), dZ = -200 * 0.17833 = -35.67mm
g_doc = up_noc.entities.add_group
g_doc.name = "Up_Noc_Canh_Doc"
g_doc.layer = tag_mai

dz_doc = 200.0 * 0.17833 # 35.67mm
pts_doc = [
  Geom::Point3d.new(7220.mm, 107007.mm, z_top.mm),
  Geom::Point3d.new(7420.mm, 107007.mm, (z_top - dz_doc).mm),
  Geom::Point3d.new(7420.mm, 107007.mm, (z_top - dz_doc - 2.0).mm),
  Geom::Point3d.new(7220.mm, 107007.mm, (z_top - 2.0).mm),
  Geom::Point3d.new(7020.mm, 107007.mm, (z_top - dz_doc - 2.0).mm),
  Geom::Point3d.new(7020.mm, 107007.mm, (z_top - dz_doc).mm)
]

f_doc = g_doc.entities.add_face(pts_doc)
len_doc = (133257.0 - 107007.0).mm
# Đùn theo hướng +Y
if f_doc.normal.y > 0
  f_doc.pushpull(len_doc)
else
  f_doc.pushpull(-len_doc)
end

model.commit_operation

{
  up_noc_ngang: {
    min: [g_ngang.bounds.min.x.to_mm.round(1), g_ngang.bounds.min.y.to_mm.round(1), g_ngang.bounds.min.z.to_mm.round(1)],
    max: [g_ngang.bounds.max.x.to_mm.round(1), g_ngang.bounds.max.y.to_mm.round(1), g_ngang.bounds.max.z.to_mm.round(1)],
    dim: [(g_ngang.bounds.max.x - g_ngang.bounds.min.x).to_mm.round(1), (g_ngang.bounds.max.y - g_ngang.bounds.min.y).to_mm.round(1), (g_ngang.bounds.max.z - g_ngang.bounds.min.z).to_mm.round(1)]
  },
  up_noc_doc: {
    min: [g_doc.bounds.min.x.to_mm.round(1), g_doc.bounds.min.y.to_mm.round(1), g_doc.bounds.min.z.to_mm.round(1)],
    max: [g_doc.bounds.max.x.to_mm.round(1), g_doc.bounds.max.y.to_mm.round(1), g_doc.bounds.max.z.to_mm.round(1)],
    dim: [(g_doc.bounds.max.x - g_doc.bounds.min.x).to_mm.round(1), (g_doc.bounds.max.y - g_doc.bounds.min.y).to_mm.round(1), (g_doc.bounds.max.z - g_doc.bounds.min.z).to_mm.round(1)]
  }
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== KẾT QUẢ DỰNG ÚP NÓC BẺ ĐÚNG GÓC MÁI ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

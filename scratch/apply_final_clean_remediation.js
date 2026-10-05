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
      timeout: 60000
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
model.start_operation("Fix Final Step: Segment Beams, Trim Girts, Normalize Tags", true)

kho = model.entities.find { |e| e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
giang_group = kho.entities.find { |e| e.name =~ /He_Giang/i }
dam_group = kho.entities.find { |e| e.name =~ /He_Dam/i }
mong_group = kho.entities.find { |e| e.name =~ /He_Mong/i }

# --- 1. CẮT NGẮN ĐẦU MÚT GIẰNG TÂY TẠI Y=132987 (bớt 20mm ở mút Bắc) ---
giang_group.entities.each do |g|
  next unless g.name =~ /Giang_Vach_Tay/
  # Tìm mặt phẳng đầu mút phía Bắc (normal.y > 0.99)
  north_face = nil
  max_y = -1e9
  g.entities.grep(Sketchup::Face).each do |f|
    if f.normal.y > 0.99
      y_val = f.vertices.first.position.y.to_mm
      if y_val > max_y
        max_y = y_val
        north_face = f
      end
    end
  end
  if north_face && max_y > 132990
    # Pushpull lùi lại -20mm (hoặc lùi về 132987)
    pull_dist = (132987.0 - max_y).mm
    north_face.pushpull(pull_dist)
  end
end

# --- 2. CHIA ĐOẠN DẦM DỌC ST1 GIỮA CÁC VÌ KÈO K-01 ---
tag_cot_dam = model.layers["BSQ-KHO-BAI-COT-THEP"] || model.layers.add("BSQ-KHO-BAI-COT-THEP")
dam_group.entities.clear!

# Hàm tạo 1 thanh dầm hộp chữ nhật
def add_beam_segment(parent, name, tag, p0, p1)
  # p0: góc min [x, y, z], p1: góc max [x, y, z]
  g = parent.entities.add_group
  g.name = name
  g.layer = tag
  
  pts = [
    Geom::Point3d.new(p0[0].mm, p0[1].mm, p0[2].mm),
    Geom::Point3d.new(p1[0].mm, p0[1].mm, p0[2].mm),
    Geom::Point3d.new(p1[0].mm, p1[1].mm, p0[2].mm),
    Geom::Point3d.new(p0[0].mm, p1[1].mm, p0[2].mm)
  ]
  face = g.entities.add_face(pts)
  height = (p1[2] - p0[2]).mm
  if face.normal.z > 0
    face.pushpull(height)
  else
    face.pushpull(-height)
  end
  g
end

# Các khoảng nhịp nhánh ngang (X):
# Kèo X15220: X in [15190, 15250]
# Kèo X20220: X in [20190, 20250]
# Kèo X25220: X in [25190, 25250]
# Kèo X30220: X in [30190, 30250]
spans_x = [
  [10220.0, 15190.0, "Nhip_1_X10220_X15190"],
  [15250.0, 20190.0, "Nhip_2_X15250_X20190"],
  [20250.0, 25190.0, "Nhip_3_X20250_X25190"],
  [25250.0, 30190.0, "Nhip_4_X25250_X30190"]
]

spans_x.each do |x0, x1, span_name|
  # Dầm Eave Nam (50x100, Y in [103077, 103127], Z in [3600, 3700])
  add_beam_segment(dam_group, "Dam_Doc_ST1_Eave_Nam_#{span_name}", tag_cot_dam, [x0, 103077.0, 3600.0], [x1, 103127.0, 3700.0])
  # Dầm Eave Bắc (50x100, Y in [110887, 110937], Z in [3600, 3700])
  add_beam_segment(dam_group, "Dam_Doc_ST1_Eave_Bac_#{span_name}", tag_cot_dam, [x0, 110887.0, 3600.0], [x1, 110937.0, 3700.0])
  # Dầm Nóc Ngang (60x120, Y in [106977, 107037], Z in [4130, 4250])
  add_beam_segment(dam_group, "Dam_Doc_ST1_Dinh_Noc_Ngang_#{span_name}", tag_cot_dam, [x0, 106977.0, 4130.0], [x1, 107037.0, 4250.0])
end

# Các khoảng nhịp nhánh dọc (Y):
# Kèo Y116407: Y in [116377, 116437]
# Kèo Y121907: Y in [121877, 121937]
# Kèo Y127407: Y in [127377, 127437]
# Kèo Y133007: Y in [132977, 133037]
spans_y = [
  [111007.0, 116377.0, "Nhip_1_Y111007_Y116377"],
  [116437.0, 121877.0, "Nhip_2_Y116437_Y121877"],
  [121937.0, 127377.0, "Nhip_3_Y121937_Y127377"],
  [127437.0, 132977.0, "Nhip_4_Y127437_Y132977"]
]

spans_y.each do |y0, y1, span_name|
  # Dầm Eave Tây (50x100, X in [4260, 4310], Z in [3600, 3700])
  add_beam_segment(dam_group, "Dam_Doc_ST1_Eave_Tay_#{span_name}", tag_cot_dam, [4260.0, y0, 3600.0], [4310.0, y1, 3700.0])
  # Dầm Eave Đông (50x100, X in [10130, 10180], Z in [3600, 3700])
  add_beam_segment(dam_group, "Dam_Doc_ST1_Eave_Dong_#{span_name}", tag_cot_dam, [10130.0, y0, 3600.0], [10180.0, y1, 3700.0])
  # Dầm Nóc Dọc (60x120, X in [7190, 7250], Z in [4130, 4250])
  add_beam_segment(dam_group, "Dam_Doc_ST1_Dinh_Noc_Doc_#{span_name}", tag_cot_dam, [7190.0, y0, 4130.0], [7250.0, y1, 4250.0])
end

# --- 3. ĐỔI TAG MÓNG CỌC SANG BSQ-KHO-BAI-MONG-COC ---
tag_mong = model.layers["BSQ-KHO-BAI-MONG-COC"] || model.layers.add("BSQ-KHO-BAI-MONG-COC")
if mong_group
  mong_group.layer = tag_mong
end

# --- 4. GÁN TAG THIẾT BỊ NỘI BỘ KHO ---
tag_tb = model.layers["BSQ-KHO-BAI-THIET-BI-MAY-MOC"] || model.layers.add("BSQ-KHO-BAI-THIET-BI-MAY-MOC")
["Bai_Ngoai_Troi_Tap_Ket_Vat_Tu_40m", "Khu_Vat_Tu_Trong_Nha_Co_Mai_20m", "Khu_Nha_Kho_Dung_Cu_May_Moc_6x30m"].each do |tname|
  tb = kho.entities.find { |e| e.name == tname }
  tb.layer = tag_tb if tb
end

model.commit_operation

{
  beams_count: dam_group.entities.count,
  mong_tag: mong_group.layer.name,
  girts_tay_max_y: giang_group.entities.find { |e| e.name =~ /Giang_Vach_Tay_Tang_1/ }.bounds.max.y.to_mm.round(1)
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== KẾT QUẢ BƯỚC CUỐI CÙNG ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

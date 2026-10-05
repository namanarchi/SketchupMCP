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
model.start_operation("Fix Step 1: Columns and Eave Beams", true)

kho = model.entities.find { |e| e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
cot_group = kho.entities.find { |e| e.name =~ /He_Cot/i }
dam_group = kho.entities.find { |e| e.name =~ /He_Dam/i }

# 1. Kéo dài 4 cột giữa nóc từ Z=4050 lên Z=4130 (+80mm)
noc_cots = ["Cot_Ngang_2", "Cot_Ngang_5", "Cot_Ngang_8", "Cot_Ngang_11"]
modified_cots = []

cot_group.entities.each do |c|
  next unless noc_cots.include?(c.name)
  # Tìm mặt đỉnh của cột (mặt phẳng nằm ngang có normal z > 0.99 ở cao độ cao nhất)
  top_face = nil
  max_z = -1e9
  c.entities.grep(Sketchup::Face).each do |f|
    if f.normal.z > 0.99
      face_z = f.vertices.first.position.z.to_mm
      if face_z > max_z
        max_z = face_z
        top_face = f
      end
    end
  end
  
  if top_face
    # Pushpull thêm 80mm lên trên
    top_face.pushpull(80.mm)
    b = c.bounds
    modified_cots << {
      name: c.name,
      new_max_z: b.max.z.to_mm.round(1),
      dim: [(b.max.x - b.min.x).to_mm.round(1), (b.max.y - b.min.y).to_mm.round(1), (b.max.z - b.min.z).to_mm.round(1)]
    }
  end
end

# 2. Đưa 4 dầm Eave từ Z=[3575, 3675] lên Z=[3600, 3700] (+25mm theo Z)
eave_dams = ["Dam_Doc_ST1_Eave_Nam", "Dam_Doc_ST1_Eave_Bac", "Dam_Doc_ST1_Eave_Tay", "Dam_Doc_ST1_Eave_Dong"]
modified_dams = []

dam_group.entities.each do |d|
  next unless eave_dams.include?(d.name)
  # Tịnh tiến +25mm theo Z
  t = Geom::Transformation.translation(Geom::Vector3d.new(0, 0, 25.mm))
  d.transform!(t)
  b = d.bounds
  modified_dams << {
    name: d.name,
    new_z: [b.min.z.to_mm.round(1), b.max.z.to_mm.round(1)]
  }
end

model.commit_operation

{
  modified_cots: modified_cots,
  modified_dams: modified_dams
}.to_json
`;

  const res = await callRuby(ruby);
  if (res.success) {
    const raw = res.result;
    const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    console.log("=== KẾT QUẢ BƯỚC 1 ===");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error("Error:", res.error);
  }
}

main();

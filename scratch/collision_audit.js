const http = require('http');

const rubyScript = `
model = Sketchup.active_model
kho_group = model.entities.find { |e| e.is_a?(Sketchup::Group) && e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }

# Lấy thông tin chi tiết từng thành phần để rà soát xung đột
keo = kho_group.entities.find { |e| e.name =~ /He_Keo/i }
cot = kho_group.entities.find { |e| e.name =~ /He_Cot/i }
dam = kho_group.entities.find { |e| e.name =~ /He_Dam/i }
vach = kho_group.entities.find { |e| e.name =~ /He_Vach/i }
giang = kho_group.entities.find { |e| e.name =~ /He_Giang/i }
ton = kho_group.entities.find { |e| e.name =~ /He_Ton_Mai/i }
xago = kho_group.entities.find { |e| e.name =~ /He_Xa_Go/i }

# Kiểm tra giao cắt / chồng lấn / sai vị trí
audit_issues = []

# 1. Kiểm tra xà gồ bay ra ngoài
xago.entities.each do |xg|
  b = xg.bounds
  if b.min.x.to_mm < 4000 || b.min.y.to_mm < 102000
    audit_issues << {
      type: "XÀ GỒ BAY RA NGOÀI MÔ HÌNH",
      name: xg.name,
      bounds_min: [b.min.x.to_mm.round(1), b.min.y.to_mm.round(1), b.min.z.to_mm.round(1)],
      bounds_max: [b.max.x.to_mm.round(1), b.max.y.to_mm.round(1), b.max.z.to_mm.round(1)]
    }
  end
end

# 2. Kiểm tra xung đột giằng vách với tôn vách
if giang && vach
  giang.entities.each do |g|
    vach.entities.each do |v|
      # Kiểm tra nếu bounding box giao cắt nhau sâu
      ib = g.bounds.intersect(v.bounds)
      if ib.valid? && (ib.width.to_mm > 1 && ib.height.to_mm > 1 && ib.depth.to_mm > 1)
        audit_issues << {
          type: "GIẰNG VÁCH ĐÂM XUYÊN TÔN VÁCH",
          giang: g.name,
          vach: v.name,
          overlap_dim: [ib.width.to_mm.round(1), ib.height.to_mm.round(1), ib.depth.to_mm.round(1)]
        }
      end
    end
  end
end

# 3. Kiểm tra dầm dọc với cột
if dam && cot
  dam.entities.each do |d|
    cot.entities.each do |c|
      ib = d.bounds.intersect(c.bounds)
      if ib.valid? && (ib.width.to_mm > 1 && ib.height.to_mm > 1 && ib.depth.to_mm > 1)
        audit_issues << {
          type: "DẦM DỌC GIAO CẮT CỘT",
          dam: d.name,
          cot: c.name,
          overlap_dim: [ib.width.to_mm.round(1), ib.height.to_mm.round(1), ib.depth.to_mm.round(1)]
        }
      end
    end
  end
end

# 4. Kiểm tra vì kèo với dầm dọc
if keo && dam
  keo.entities.each do |k|
    dam.entities.each do |d|
      ib = k.bounds.intersect(d.bounds)
      if ib.valid? && (ib.width.to_mm > 1 && ib.height.to_mm > 1 && ib.depth.to_mm > 1)
        audit_issues << {
          type: "VÌ KÈO GIAO CẮT DẦM",
          keo: k.name,
          dam: d.name,
          overlap_dim: [ib.width.to_mm.round(1), ib.height.to_mm.round(1), ib.depth.to_mm.round(1)]
        }
      end
    end
  end
end

{
  total_issues: audit_issues.size,
  sample_issues: audit_issues.first(30)
}.to_json
`;

const postData = JSON.stringify({ code: rubyScript });

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
    let parsed = JSON.parse(body).result;
    while (typeof parsed === 'string') parsed = JSON.parse(parsed);
    console.log(JSON.stringify(parsed, null, 2));
  });
});

req.write(postData);
req.end();

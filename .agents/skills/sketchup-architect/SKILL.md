---
name: sketchup-architect
description: Chuyên gia tự động hóa dựng hình 3D, điều khiển camera, gán vật liệu và kiểm tra mô hình kiến trúc trên SketchUp 2025 qua MCP Bridge.
---

# SketchUp Architect Skill

Kỹ năng chuyên biệt để Antigravity AI tương tác trực tiếp với Trimble SketchUp 2025 thông qua SketchupMCP bridge.

## 1. Khởi Đầu Mỗi Session

Khi bắt đầu session mới, luôn thực hiện các bước kiểm tra sau:

```ruby
# 1. Kiểm tra kết nối và model đang active
model = Sketchup.active_model
puts "Model path: #{model.path}"
puts "Model modified: #{model.modified?}"
puts "Entities count: #{model.entities.count}"
```

Nếu bridge bị ngắt, hướng dẫn người dùng chạy lại trong Ruby Console của SketchUp:
```ruby
load "C:/Users/MAI KHANH/AppData/Roaming/SketchUp/SketchUp 2025/SketchUp/Plugins/sketchup_mcp_bridge.rb"
```

## 2. Thư Viện Màu Sắc Chuẩn Dự Án VP BCH

Khi gán màu cho bất kỳ đối tượng nào, sử dụng palette đồng bộ:

```ruby
# Tạo hoặc tái sử dụng vật liệu màu xanh Royal Blue
blue = model.materials["[0102_RoyalBlue]"] || model.materials.add("[0102_RoyalBlue]")
blue.color = Sketchup::Color.new(71, 97, 240)

# Vật liệu trắng panel nhà bảo vệ
white = model.materials["AI_Panel_White"] || model.materials.add("AI_Panel_White")
white.color = Sketchup::Color.new(250, 250, 250)

# Vật liệu sơn cảnh báo vàng đen 45 độ
# Sử dụng texture safety_hazard_stripes.bmp
```

## 3. Quy Tắc Dựng Hình Kết Cấu Hàng Rào & Móng

- Móng hàng rào mặt tiền: Kích thước mới $1300\times 600\times 500\text{ mm}$ (`Mong_Be_Tong_1300x600x500`), cao độ $Z \in [500, 1000]\text{ mm}$.
- Móng hàng rào các cạnh bên: Kích thước mới $1300\times 600\times 400\text{ mm}$ (`Mong_Be_Tong_1300x600x400`), đặt trên nền văn phòng NEN VP, cao độ $Z \in [600, 1000]\text{ mm}$. Đỉnh móng toàn dự án đồng mức $Z = 1000\text{ mm}$.
- **Góc hàng rào mặt tiền**: Hai góc $P_{FL} (26141.8, 50485.0)$ và $P_{FR} (58475.2, 50485.0)$ luôn quay móng và thanh chống xiên thẳng góc vào trong lòng khu đất (theo phương $-Y$).
- Gờ chắn bánh xe: Mặt tiền $Y \in [50286, 50486]$, cao $400\text{ mm}$, rộng $200\text{ mm}$, vật liệu `Son_Vang_Den_Canh_Bao`.

## 4. Chụp Ảnh Viewport Kiểm Tra Trực Quan

Sau khi thực hiện thay đổi, chụp ảnh để báo cáo người dùng:

```ruby
view = Sketchup.active_model.active_view
out_path = "C:/Users/MAI KHANH/.gemini/antigravity-ide/brain/0225c4eb-2395-424b-85f4-6898a627de73/scratch/verify_view.png"
view.write_image(out_path, 1280, 720, false, 0.0)
```
Sau đó xem lại ảnh qua công cụ `view_file`.

## 5. Lưu Mô Hình
Luôn gọi lệnh sau trước khi kết thúc tác vụ:
```ruby
Sketchup.active_model.save
```

## 6. Quy Tắc Vàng Kiểm Soát Lỗi Dựng Hình (Quality Checklist)
1. **Số nguyên chẵn 100%**: Không dùng toạ độ lẻ phân số ($1.68, 51.7$). Mọi kích thước phải chẵn tròn ($50, 100, 200, 400, 600, 1100, 1400, 4100$).
2. **Reset Transformation gốc**: Nhóm sàn, kết cấu chính phải reset transformation về Identity (`Geom::Transformation.new`) để phím đo `T` bắt điểm tuyệt đối.
3. **Không đè mặt phẳng (No Coplanar/Z-Fighting)**: Không vẽ mặt phẳng đè $Z = 1\text{ mm}$ gây lỗi bắt điểm Tape Measure.
4. **Kiểm tra Normal khi PushPull**: Luôn dùng `f.pushpull(f.normal.z > 0 ? h : -h)` để tránh đảo ngược khối.
5. **Công thái học công trường tạm**: Cửa cabin buồng $600\text{ mm}$ (cánh $580\text{ mm}$), lavabo gọn $\le 420\text{ mm}$, hành lang $\ge 900\text{ mm}$, không va chạm cửa.
6. **Tính tế nhị & riêng tư**: Khu nữ luôn phân khu 2 lớp (Sảnh đón/chỉnh trang + Buồng bồn cầu khép kín có cửa và khóa an toàn).
7. **Phân định Tag theo phân khu - CẤM DÙNG CHUNG TAG**: Mỗi phân khu công trình bắt buộc có trường tên Tag riêng biệt mang tiền tố định danh (Kho Bãi: `BSQ-KHO-BAI-...`, KTX: `BSQ-KTX-...`, Cantin: `BSQ-CANTIN-...`, NVS: `BSQ-NVS-...`). Tuyệt đối không dùng chung tag `BSQ-CHUNG-...` để tránh việc bật/tắt view phân khu này làm dính cấu kiện phân khu khác.
8. **Kỷ luật gắn Tag phân cấp & Không chồng chéo**: 100% Face và Edge thô luôn ở `Layer0` (Untagged). Chỉ có Group/Component cấp ngoài cùng mới mang Tag. Cấm gán Tag con khác loại lồng trong Tag cha.
9. **Quy chuẩn kết cấu hệ mái Kho Bãi**:
   - Dầm dọc đỉnh nóc `Dam_Doc_ST1_Dinh_Noc_*`: Thép hộp $60\times 120\times 2.0\text{ mm}$, **bắt buộc đặt cạnh 120mm theo phương dọc (phương đứng chịu uốn $Z=120\text{ mm}$, $Z \in [4130, 4250]\text{ mm}$)**. Tag: `BSQ-KHO-BAI-COT-THEP`.
   - Dầm dọc biên Eave `Dam_Doc_ST1_Eave_*`: Thép hộp $\Box 50\times 100\times 1.8\text{ mm}$. Tag: `BSQ-KHO-BAI-COT-THEP`.
   - Kèo hở thông thủy: **Không sử dụng hệ `Qua_Giang_Day` và `Chong_Dung_Dinh`** (xóa bỏ triệt để để tăng tối đa chiều cao lọt lòng). Tag: `BSQ-KHO-BAI-KHUNG-VI-KEO`.
   - Xà gồ mạ kẽm: Thay `He_Xa_Go_Mai_Thep_Hop_30x70` bằng **xà gồ mạ kẽm C100x50x15x1.2mm** với Tag riêng: **`BSQ-KHO-BAI-XA-GO-MAI`**.
   - Tự động đồng bộ Scene: Khi tạo các tag `BSQ-KHO-BAI-...` mới, tự động ẩn trên các Scene KTX, Cantin, NVS và bật trên các Scene Kho Bãi để cách ly tầm nhìn 100%.
10. **Phối hợp chuỗi cao độ đa tầng & Xoay xà gồ vuông góc dốc mái**:
   - Xà gồ mái BẮT BUỘC xoay nghiêng theo đúng góc dốc mái $\theta$ (mặt bích đáy áp sát mặt dốc vì kèo, thân vuông góc mặt dốc, cánh trên song song mặt dốc).
   - Khi tăng chiều cao xà gồ ($H_{\text{cũ}} \to H_{\text{mới}}$), BẮT BUỘC nâng đồng bộ cao độ toàn bộ lớp tôn mái và úp nóc phía trên ($\Delta Z = \Delta H / \cos\theta$) để mặt đáy tôn tiếp xúc phẳng trên đỉnh xà gồ, TUYỆT ĐỐI KHÔNG để xà gồ đâm xuyên qua bề mặt tôn mái.

---

## 7. Quy Trình Chuẩn Triển Khai Bản Vẽ LayOut Chuyên Nghiệp (LayOut Master Workflow)

Khi triển khai bản vẽ LayOut từ mô hình SketchUp, Agent tuân thủ nghiêm ngặt 8 yêu cầu thiết kế của Kiến trúc sư:

1. **Tái sử dụng Khung Bản Vẽ Mẫu Chuẩn**:
   - Sử dụng file template có sẵn `C:\Users\MAI KHANH\Downloads\LAYOUT KTX-KHOVT-GIACONG.layout`.
   - Giữ nguyên Cột Khung Tên dọc bên phải ($X \in [364.5, 415.0]\text{ mm}$), Key Plan, Logo BSQUARE vàng đồng và các biến Autotext `<TenBV>`, `<SoBV>`, `<MaHS>`, `<NgayHT>`. Không tự vẽ lại khung tên từ đầu.
2. **Lập Bảng Thống Kê Công Trình (Schedule Table)**:
   - Bản vẽ mặt bằng bắt buộc có Bảng Thống Kê 4 cột: `STT | Tên Hạng Mục (KTX, Nhà ăn, NVS, Kho VT, Bãi gia công...) | Số Lượng | Diện Tích (m2)`.
   - Kẻ bảng nét mảnh $0.3\text{ mm}$, tiêu đề nền xám nhạt, font `Arial` Bold $7.5\text{ pt}$, dữ liệu $7.0\text{ pt}$.
3. **Kiểm Soát Bố Cục & Khoảng Cách Đều Nhau**:
   - Vùng an toàn khả dụng cố định: $X \in [15.0, 360.0]\text{ mm}$, $Y \in [15.0, 282.0]\text{ mm}$. Cấm tràn ra ngoài.
   - Khoảng hở giữa các khung nhìn cố định đều đặn: **$12.0 - 15.0\text{ mm}$**.
   - Khung bao Viewport viền nét đứt màu xanh nhạt (`#40AEF7`, stroke $0.4\text{ mm}$).
4. **Tự Động Tính Toán Tỷ Lệ Chuẩn (Dynamic Auto-Scale)**:
   - Tự động lấy kích thước bao 3D của công trình ($L \times W$), tính tỷ lệ vừa vặn trong phân khu khả dụng và làm tròn xuống thang tỷ lệ tiêu chuẩn: `1:500, 1:200, 1:150, 1:100, 1:50, 1:25, 1:20`.
   - Công trình dài $\approx 40\text{ m}$ (KTX, kho) trên A3: Luôn chọn **tỷ lệ vàng `1:150`**.
5. **Kỷ Luật Tiếng Việt & Typography Theo File Mẫu**:
   - 100% Tiếng Việt có dấu chuẩn Unicode (UTF-8), cấm lỗi font, cấm vỡ dấu, cấm tràn chữ ra ngoài hộp.
   - Tiêu đề: **`Verdana` Bold Underline** ($14 - 16\text{ pt}$) kèm dòng phụ `TỶ LỆ: 1/...` ($8 - 9\text{ pt}$).
   - Kích thước đo đạc: **`TCVN 7284`** (hoặc `Arial`/`Verdana`) cỡ $8\text{ pt}$.
   - Mốc cao độ tầng: Ký hiệu tam giác màu xanh Cyan (`#40AEF7`), text `Verdana` Cyan ($8\text{ pt}$).
   - Bảng ghi chú/thuyết minh: **`Arial`** rõ ràng, phân cấp gạch đầu dòng.
6. **Thiết Lập Scene Cô Lập Triệt Để (Scene Isolation)**:
   - Chi tiết hạng mục nào: **Chỉ hiển thị toàn bộ những gì thuộc về hạng mục đó**.
   - Ẩn toàn bộ các tag của hạng mục khác (Nhà ăn, Nhà kho, Bãi gia công, Nền đất...). Tạo Scene riêng sạch sẽ trên SketchUp trước khi đưa sang LayOut.
7. **Quy Chuẩn Nét Thấy Mảnh 0.01 & Chế Độ Hybrid Render**:
   - Nét thấy của đối tượng: Đặt độ dày nét **`0.01` (Line Weight 0.01px / 0.1pt)** sắc bén, tinh xảo.
   - Render Mode: Bắt buộc chọn **`Hybrid Render`**.
8. **Tác Phong Chuyên Nghiệp**: Sạch sẽ, ngăn nắp, khoa học, chỉn chu, **tuyệt đối không làm nhanh đến mức cẩu thả**.

---

### Quy Chuẩn Kỹ Thuật Bổ Sung Về Mái Thép & Xà Gồ Kho Bãi (Architectural Roofing Discipline)

9. **Tấm Úp Nóc Bắt Buộc Bẻ Góc Theo Mái Dốc**:
   - Nghiêm cấm dùng tấm phẳng nằm ngang. Tấm úp nóc (Ridge Cap) bắt buộc bẻ gập chữ V úp ngược ôm sát theo độ dốc mái của từng phân đoạn:
     - Nhánh ngang: Bẻ nghiêng dốc Nam-Bắc $\alpha = 7.62^\circ$ (mép ngoài hạ $26.75\text{ mm}$).
     - Nhánh dọc: Bẻ nghiêng dốc Tây-Đông $\beta = 10.11^\circ$ (mép ngoài hạ $35.67\text{ mm}$).
     - Độ rộng cánh mỗi bên $200\text{ mm}$, bề dày tôn dập $1.5 - 2.0\text{ mm}$.

10. **Xà Gồ Thép Chữ C Mạ Kẽm Rỗng Thật (True C-Purlin Solid)**:
    - **Tuyệt đối cấm dùng thép hộp chữ nhật đặc thay thế cho thép chữ C**.
    - Xà gồ $C100\times 50\times 15\times 1.2\text{ mm}$ phải được tạo từ tiết diện 12 đỉnh khép kín có mép nẹp gấp $15\text{ mm}$, cánh $50\text{ mm}$, bụng $100\text{ mm}$ và bề dày thành thép $1.2\text{ mm}$.
    - Đảm bảo tính chất Solid Manifold (`group.manifold? == true`), rỗng ruột đúng sản phẩm thực tế.

11. **Kết Cấu Xà Gồ & Kèo Xiên Đoạn Bẻ Góc Giao Mái Chữ L**:
    - Bắt buộc có **Thanh kèo sống nghiêng (Hip Rafter $\Box 60\times 120\text{ mm}$)** và **Thanh kèo xối âm (Valley Rafter $\Box 60\times 120\text{ mm}$)** trong cụm `Keo_Khung_Giao_Chu_L`.
    - Toàn bộ các đường xà gồ từ 2 nhánh mái phải vươn tiếp vào vùng giao chữ L, vát góc (Jack Purlins) tựa chắc chắn lên thanh kèo sống nghiêng và xối âm.
    - Đỡ trọn vẹn $100\%$ diện tích mái tôn góc giao, cấm bỏ trống.


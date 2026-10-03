# Quy Chuẩn Mô Hình Hóa 3D SketchUp (SketchUp 3D Modeling Rules)

Bộ quy tắc bắt buộc áp dụng khi dựng hình, chỉnh sửa, tự động hóa và quản lý mô hình Trimble SketchUp 2025 thông qua Antigravity MCP.

---

## 1. Đơn Vị Đo & Bắt Điểm Tọa Độ Số Nguyên (Unit & Integer Grid Snap)

1. **Đơn vị nội bộ**: SketchUp sử dụng đơn vị nội bộ là **Inches**. Khi viết mã Ruby API hoặc truyền tham số tọa độ, **bắt buộc dùng hậu tố `.mm`** (ví dụ: `100.mm`, `400.mm`, `1200.mm`).
2. **Quy tắc số nguyên chẵn (Integer Snapping)**:
   - Toàn bộ kích thước cấu kiện (dày vách, rộng cửa, tim cột, cao độ Z) phải là **SỐ NGUYÊN CHẴN** (ví dụ: `50, 100, 150, 200, 400, 500, 600, 1100, 1300, 3000, 4200 mm`).
   - **Nghiêm cấm** tạo tọa độ lẻ thập phân ngẫu nhiên (ví dụ: `1.68 mm`, `51.7 mm`, `4101.3 mm`) do import CAD lỗi hoặc sai số chuyển đổi.
3. **Chuẩn hóa cao độ thiết kế Z**:
   - Mọi cấu kiện phải có cao độ chân/đỉnh bám đúng mốc cốt chuẩn của dự án (ví dụ: cốt nền tự nhiên $Z = 500$, mặt sàn văn phòng $Z = 600$, đỉnh móng $Z = 1000$, đỉnh hàng rào $Z = 3000$).

---

## 2. Đóng Gói Hình Học & Kiểm Soát Độ Kín Khối (Solid Manifold & Encapsulation)

1. **Nghiêm cấm hình học tự do (No Loose Geometry)**:
   - Tuyệt đối không vẽ các đường Line hoặc Face trôi nổi tự do trực tiếp ngoài không gian `model.entities`.
   - Mọi chi tiết hình học mới phải được tạo bên trong một `Group` hoặc `ComponentInstance` riêng biệt.
2. **Quy chuẩn khối kín (Solid / Watertight)**:
   - Các cấu kiện kiến trúc, kết cấu bê tông, thép hộp phải đạt chuẩn Solid (`group.manifold? == true`).
   - Không để lại đường nét thừa (stray edges), mặt phẳng bị rách thủng (missing faces), hoặc có mặt phẳng nội bộ thừa bên trong (internal faces).
3. **Không trùng mặt phẳng / đè mặt (No Coplanar Faces & Z-Fighting)**:
   - Nghiêm cấm tạo 2 mặt phẳng đè khít lên nhau ở cùng một tọa độ hoặc chênh lệch siêu nhỏ ($\Delta Z \le 1\text{ mm}$).
   - Hiện tượng Z-fighting không chỉ làm nhấp nháy vân hiển thị khi render mà còn làm tê liệt công cụ đo Tape Measure (`T`) và bắt điểm Endpoint của SketchUp.

---

## 3. Quản Lý Ma Trận Biến Đổi & Bắt Điểm Tuyệt Đối (Transformation & Tape Measure)

1. **Reset Transformation gốc**:
   - Đối với khối nền sàn, móng bê tông và kết cấu chịu lực, reset Transformation về Identity (`Geom::Transformation.new`).
   - Loại bỏ hoàn toàn các sai số tịnh tiến vi mô tích lũy do copy/move nhiều lần.
2. **Đồng bộ Transform khi lồng khối**:
   - Khi truy cập entity lồng nhau bên trong Group/Component cấp sâu, luôn nhân dồn ma trận biến đổi: `curr_tf = parent_tf * child.transformation`.

---

## 4. Kỹ Thuật Đùn Khối & Kiểm Soát Vector Pháp Tuyến (PushPull & Normal Verification)

1. **Kiểm tra Normal trước khi đùn**:
   - Khi gọi `face.pushpull(distance)` trong Ruby API, vector pháp tuyến của mặt phẳng có thể hướng xuống âm (-Z) hoặc ngược hướng mong muốn.
   - **Luôn kiểm tra hướng vector pháp tuyến**:
     ```ruby
     face.pushpull(face.normal.z >= 0 ? height : -height)
     ```
2. **Hậu quả cần tránh**: Đùn ngược chiều khiến thiết bị/cấu kiện bị lọt xuống dưới sàn hoặc tụt vào trong lòng tường.

---

## 5. Quy Chuẩn Quản Lý Tag / Layer Cấp Độ Chuẩn BIM (Tag Discipline)

1. **Nguyên tắc vàng Layer0 (Untagged)**:
   - Toàn bộ Face và Edge thô bên trong Group/Component **BẮT BUỘC** nằm ở **`Layer0` (Untagged)**.
   - Chỉ có Group hoặc ComponentInstance bao bọc cấp ngoài cùng mới được gán Tag quản lý chuyên biệt.
2. **Quy chuẩn đặt tên Tag**:
   - Sử dụng tiền tố phân nhóm chuẩn kiến trúc & kết cấu:
     - `KTC_Mong`: Móng bê tông, cọc, đài móng
     - `KTC_KetCauThep`: Khung kèo, cột thép, xà gồ, giàn cổng
     - `KTT_Tuong_Vach`: Tường xây, vách panel, hàng rào tôn
     - `KTT_San_Nen`: Sàn bê tông, nền gạch, gờ chắn bánh xe
     - `KTT_Cua_Cong`: Cánh cổng chính, cửa đi, cửa sổ
     - `KTT_ThietBi`: Bàn ghế, lavabo, thiết bị vệ sinh

---

## 6. Đồng Bộ Bảng Màu & Vật Liệu (Project Palette & UV Mapping)

1. **Tái sử dụng vật liệu**: Trước khi tạo vật liệu mới, luôn kiểm tra sự tồn tại trong `model.materials` để tránh nhân bản trùng lặp:
   ```ruby
   mat = model.materials[mat_name] || model.materials.add(mat_name)
   ```
2. **Bảng màu chuẩn dự án**:
   - Royal Blue: `[0102_RoyalBlue]` (`RGB(71, 97, 240)`)
   - Panel White: `AI_Panel_White` (`RGB(250, 250, 250)`)
   - Cảnh báo an toàn: `Son_Vang_Den_Canh_Bao`
   - Bê tông nền: `Be_Tong_Nen_BT100` (texture tỉ lệ thực)
3. **UV Mapping tỷ lệ thực**: Với vật liệu có texture, luôn gán kích thước thực tế bằng `material.texture.size = [width.mm, height.mm]`.

---

## 7. Công Thái Học & Bố Trí Không Gian (Ergonomics & Clearances)

1. **Khoảng hở thông thủy**: Hành lang giao thông tối thiểu $\ge 900\text{ mm}$, cửa phòng chính $\ge 800\text{ mm}$, cửa cabin vệ sinh $600\text{ mm}$.
2. **Không va chạm cửa (Door Swing Collision)**: Bán kính mở cửa không được quét trúng thiết bị nội thất; khoảng lọt lòng mép trước cửa đến mép thiết bị $\ge 500\text{ mm}$.
3. **Phân khu tế nhị (Double-layer Privacy)**: Khu vệ sinh nữ luôn bố trí 2 lớp (Lớp sảnh gương chỉnh trang phía ngoài + Buồng vệ sinh khép kín có chốt khóa an toàn bên trong).

---

## 8. Giao Dịch An Toàn Ruby API & Kiểm Tra Trực Quan (API Safety & Verification)

1. **Transaction bọc kín**: Mọi thao tác chỉnh sửa mô hình phải bọc trong `model.start_operation("Tên Thao Tác", true)` và kết thúc bằng `model.commit_operation`.
2. **Kiểm tra trực quan (Visual Verification)**: Sau khi hoàn thành cụm thay đổi, chụp ảnh viewport bằng `view.write_image` để kiểm tra độ chính xác góc nhìn.
3. **Lưu trữ tự động**: Gọi `model.save` sau mỗi giai đoạn hoàn thiện để bảo toàn dữ liệu.

---

## 9. Kỷ Luật Thiết Lập Scene Cô Lập Hạng Mục & Bóc Tách Số Liệu (Scene Isolation & Quantity Takeoff)

1. **Nguyên tắc cô lập Scene cho từng hạng mục**:
   - Khi tạo Scene phục vụ bản vẽ chi tiết (ví dụ: Ký túc xá công nhân):
     * **Bắt buộc cô lập**: Chỉ bật các Tag liên quan trực tiếp đến hạng mục đó.
     * **Ẩn các Tag khác**: Tắt toàn bộ các Tag của hạng mục khác (Nhà ăn, Nhà kho, Cổng, Bãi gia công, Nền đất tổng thể).
     * Đảm bảo khung nhìn sang LayOut sạch sẽ 100%, không bị lẫn các khối hình học ngoài rìa.
2. **Hỗ trợ bóc tách số liệu cho Bảng Thống Kê**:
   - Mỗi hạng mục lớn (KTX, Nhà ăn, Nhà vệ sinh, Nhà kho) phải có thuộc tính xác định rõ:
     - Số lượng cấu kiện / module (ví dụ: 26 module container KTX).
     - Kích thước phủ bì ($L \times W \times H$).
     - Diện tích sàn xây dựng ($S\text{ m}^2$).
   - Sẵn sàng cung cấp dữ liệu số liệu chính xác để điền vào Bảng Thống Kê 4 cột trên LayOut: `STT | Tên Hạng Mục | Số Lượng | Diện Tích`.


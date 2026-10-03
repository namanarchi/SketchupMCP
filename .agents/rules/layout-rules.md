# Quy Chuẩn Triển Khai Bản Vẽ Kỹ Thuật LayOut (SketchUp LayOut Drafting Rules)

Bộ quy tắc bắt buộc áp dụng khi triển khai tài liệu bản vẽ kỹ thuật (.layout), nhúng khung nhìn 3D Viewport, đo đạc kích thước, bố trí bảng thống kê và xuất bản hồ sơ PDF theo phong cách chuyên nghiệp BSQUARE.

---

## 1. Tái Sử Dụng Khung Bản Vẽ Chuẩn (Template Re-use Discipline)

1. **Tuyệt đối không vẽ lại khung tên từ đầu**:
   - Sử dụng tập tin template mẫu chuẩn của dự án: `C:\Users\MAI KHANH\Downloads\LAYOUT KTX-KHOVT-GIACONG.layout` (hoặc bản sao lưu trong workspace).
   - Bản vẽ mẫu đã tích hợp sẵn:
     - **Cột khung tên dọc bên phải** ($X \in [364.5, 415.0]\text{ mm}$): Chuyên nghiệp, đúng quy cách BSQUARE.
     - **Sơ đồ định vị (Key Plan)**: Bản đồ quy hoạch tổng thể lô đất kèm highlight vị trí công trình.
     - **Logo nhận diện**: Logo BSQUARE vàng đồng, thông tin Chủ đầu tư Gia Đức, TVGS An Phú An, Nhà thầu BSQUARE.
     - **Hệ thống Autotext**: `<TenBV>`, `<SoBV>`, `<MaHS>`, `<NgayHT>`, `<BSQTrienkhai>`, `<BSQKiemtra>`.
2. **Quy trình tạo trang mới**:
   - Nhân bản (duplicate) hoặc mở từ file template mẫu, chỉ can thiệp vào Vùng đồ họa chính bên trái ($X \in [15.0, 360.0]\text{ mm}$) và cập nhật Autotext trang.

---

## 2. Quy Chuẩn Bảng Thống Kê Công Trình (Building Schedule & Quantity Takeoff)

Mọi bộ hồ sơ mặt bằng tổng thể hoặc chi tiết khu chức năng bắt buộc phải có Bảng Thống Kê Hạng Mục:

1. **Cấu trúc 4 cột chuẩn**:
   | STT | Tên Hạng Mục Công Trình | Số Lượng | Diện Tích ($m^2$) | Ghi Chú |
   | :-: | :--- | :-: | :-: | :--- |
   | 01 | Ký túc xá công nhân (2 tầng) | 26 module | $460.2\text{ m}^2$ | Container $3\times 5.9\text{ m}$, 2 tầng |
   | 02 | Nhà ăn công nhân | 01 khối | $200.0\text{ m}^2$ | Khung thép tiền chế |
   | 03 | Khu nhà vệ sinh công nhân | 01 cụm | $54.0\text{ m}^2$ | Module lắp ghép |
   | 04 | Kho vật tư kín | 01 nhà | $180.0\text{ m}^2$ | Vách panel chống ẩm |
   | 05 | Bãi gia công cốt thép & cốp pha | 01 bãi | $4230.0\text{ m}^2$ | Nền bê tông BT100 |
   | 06 | Nhà bảo vệ & Cổng chính | 01 cụm | $4.0\text{ m}^2$ | Bốt panel $2\times 2\text{ m}$ |

2. **Quy cách trình bày bảng**:
   - Chiều rộng cột chuẩn: STT ($10\text{ mm}$), Tên hạng mục ($55\text{ mm}$), Số lượng ($20\text{ mm}$), Diện tích ($25\text{ mm}$), Ghi chú ($30\text{ mm}$).
   - Nét kẻ bảng: Nét mảnh $0.3\text{ mm}$, tiêu đề bảng tô nền sáng nhẹ (`RGB(245, 245, 245)`), font `Arial` Bold $7.5\text{ pt}$, dữ liệu $7.0\text{ pt}$.
   - Vị trí đặt: Đặt ngay ngắn tại góc thoáng của mặt bằng (ưu tiên góc dưới bên trái hoặc phía trên cột khung tên), không đè lấn lên hình vẽ mô hình.

---

## 3. Kiểm Soát Bố Cục Hình Học & Khoảng Cách Đều Đặn (Spacing & Bounds Safety)

1. **Ranh giới an toàn tuyệt đối (Hard Boundaries - Cấm tràn ra ngoài)**:
   - Toàn bộ nội dung đồ họa (Viewport, chữ, thước đo, cao độ, bảng biểu) **BẮT BUỘC nằm trọn trong vùng an toàn**:
     $$X \in [15.0, 360.0]\text{ mm}, \quad Y \in [15.0, 282.0]\text{ mm}$$
   - Cách mép lề giấy trái tối thiểu $15.0\text{ mm}$, cách cột khung tên phải tối thiểu $4.5\text{ mm}$, cách mép trên/dưới tối thiểu $15.0\text{ mm}$.
2. **Khoảng cách đều đặn giữa các khung (Uniform Spacing)**:
   - Khoảng cách giữa các Viewport liền kề (khoảng hở ngang/dọc): Cố định đều đặn **$12.0 - 15.0\text{ mm}$**.
   - Khoảng cách từ Viewport đến tiêu đề hình chiếu bên dưới: Cố định đều đặn **$6.0 - 8.0\text{ mm}$**.
   - Khoảng cách từ mép công trình đến đường đo kích thước đầu tiên: **$8.0 - 10.0\text{ mm}$**.
3. **Khung viền phân khu Viewport**:
   - Viền xung quanh mỗi hình chiếu bằng hình chữ nhật nét đứt màu xanh dương nhạt (`-- -- --`, màu `#40AEF7`, stroke $0.4\text{ mm}$), tạo phong cách đồ họa nhận diện chuẩn của dự án.

---

## 4. Tự Động Tính Toán Tỷ Lệ Tối Ưu (Dynamic Auto-Scale Calculation)

Tuyệt đối không chọn tỷ lệ ngẫu nhiên. Agent phải tự động tính toán tỷ lệ theo thuật toán:

1. **Thuật toán xác định tỷ lệ**:
   - Lấy kích thước bao thực tế của công trình trong SketchUp: Chiều dài $L\text{ (m)}$ và Chiều rộng $W\text{ (m)}$.
   - Xác định diện tích khung khả dụng trên giấy ($W_{box}, H_{box}\text{ mm}$).
   - Tính hệ số tỷ lệ tối đa:
     $$Scale_{max} = \min\left(\frac{W_{box} - 40\text{ mm}}{L \times 1000}, \frac{H_{box} - 40\text{ mm}}{W \times 1000}\right)$$
   - Làm tròn xuống thang tỷ lệ tiêu chuẩn xây dựng gần nhất:
     - Tổng thể: `1:1000`, `1:500`, `1:200`.
     - Công trình dài $\approx 35 - 45\text{ m}$ (như KTX, kho bãi) trên A3: Chọn **tỷ lệ vàng `1:150`** ($Scale = 1/150 = 0.0066667$).
     - Mặt bằng, mặt đứng chi tiết: `1:100`, `1:50`.
     - Chi tiết cấu tạo, trích đoạn: `1:25`, `1:20`, `1:10`.
2. **Khóa tỷ lệ**: Thiết lập `viewport.scale = ratio`, `viewport.perspective = false`, `viewport.preserve_scale_on_resize = true`.

---

## 5. Kỷ Luật Thiết Lập Scene Cô Lập Hạng Mục (Scene Isolation & Tag Visibility)

Khi triển khai bản vẽ chi tiết cho bất kỳ hạng mục nào:

1. **Nguyên tắc cô lập đối tượng (Isolation Discipline)**:
   - **Chỉ hiển thị toàn bộ những gì thuộc về hạng mục đó**.
   - **Ẩn toàn bộ các đối tượng/tag không liên quan**:
     - *Ví dụ bản vẽ Ký túc xá*: Chỉ bật Tag kết cấu KTX, vách KTX, cầu thang KTX, nội thất KTX. Tắt toàn bộ Tag Nhà ăn, Nhà kho, Cổng chính, Hàng rào, Bãi gia công, Nền tổng thể khu đất.
     - *Ví dụ bản vẽ Nhà ăn*: Chỉ bật Tag khung nhà ăn, mái, bàn ăn. Tắt toàn bộ các khu khác.
2. **Thiết lập Scene chuyên biệt trên SketchUp**:
   - Luôn tạo Scene với Tag Visibility đã được lọc sạch sẽ trước khi đưa vào LayOut, tránh để lẫn lộn các cấu kiện ngoài rìa gây rối mắt bản vẽ.
   - Đặt tên Scene rõ nghĩa: `KTX-MATBANG-T1`, `KTX-MATBANG-T2`, `KTX-MATDUNG`, `KTX-MATSAU`, `KTX-MATBEN`, `KTX-3D`.

---

## 6. Quy Chuẩn Độ Dày Nét & Màu Sắc Trình Bày (Line Weight 0.01 & Styling)

1. **Nét thấy của đối tượng (Visible Lines)**:
   - Thiết lập độ dày nét thấy: **`0.01` (Line Weight 0.01px / 0.1pt)**.
   - Tạo độ sắc nét, tinh xảo tuyệt đối, không bị nhòe đen hay thô dày khi in ấn khổ lớn.
2. **Kỷ luật chế độ Render**:
   - **`Hybrid Render` (Bắt buộc)**: Đảm bảo các đường nét vector sắc bén như CAD nhưng vẫn giữ nguyên màu sắc, vân texture và ánh sáng của vật liệu SketchUp.
3. **Bảng màu đồ họa kỹ thuật chuẩn**:
   - Nét bo khung viền Viewport: Xanh nhạt `#40AEF7`, nét đứt quãng.
   - Mốc cao độ tầng: Tam giác màu xanh Cyan `#40AEF7`, đường dóng ngang nét đứt.
   - Đường kích thước: Nét liền màu đen `#000000`, độ dày $0.3\text{ mm}$.
   - Màu tôn/vật liệu: Royal Blue `#4761F0`, trắng panel `#FAFAFA`, vàng đen cảnh báo.

---

## 7. Kỷ Luật Tiếng Việt Có Dấu & Typography Theo File Mẫu

1. **100% Tiếng Việt có dấu chuẩn Unicode (UTF-8)**:
   - Tuyệt đối không để xảy ra hiện tượng mất dấu, lỗi font, dấu hỏi ngã biến thành ký tự lạ, hoặc viết tắt cẩu thả không rõ nghĩa.
2. **Quy định phông chữ đồng bộ theo file mẫu**:
   - **Tiêu đề hình chiếu**: Font **`Verdana`**, In hoa, **Bold**, có **Gạch chân (`Underline`)**, kích thước $14.0 - 16.0\text{ pt}$ (VD: `MẶT BẰNG TẦNG 1 KÝ TÚC XÁ`).
   - **Dòng tỷ lệ phụ**: Nằm ngay dưới tiêu đề, font `Verdana` Regular $8.0 - 9.0\text{ pt}$ (VD: `TỶ LỆ: 1/150`).
   - **Kích thước đo đạc (Dimensions)**: Font **`TCVN 7284`** (hoặc `Arial`/`Verdana`), cỡ chữ $7.5 - 8.0\text{ pt}$.
   - **Mốc cao độ tầng (Levels)**: Font `Verdana` cỡ $8.0\text{ pt}$, màu xanh `#40AEF7` (VD: `0.000 CAO ĐỘ NỀN`, `2.800 TẦNG 1`, `5.600 TẦNG MÁI`).
   - **Thuyết minh & Ghi chú**: Font **`Arial`**, cỡ chữ $7.0 - 8.5\text{ pt}$, ngắt dòng rõ ràng, tiêu đề mục in hoa đậm.
3. **Kiểm soát hộp chữ (Text Box Safety)**:
   - Chiều rộng hộp text phải tính toán dư tối thiểu $10 - 15\%$ để không bị tràn chữ xuống dòng ngoài ý muốn.

---

## 8. Tác Phong Nghề Nghiệp & Kiểm Soát Chất Lượng (Quality Assurance)

> [!IMPORTANT]
> **Triết lý làm việc**: Sạch sẽ, ngăn nắp, khoa học, thẩm mỹ đỉnh cao. **Tuyệt đối không làm nhanh đến mức cẩu thả**. Mọi bản vẽ xuất xưởng phải đạt chuẩn thi công và sẵn sàng trình nộp Chủ đầu tư & Tư vấn giám sát.

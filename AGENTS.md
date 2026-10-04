# AGENTS.md - SketchUp & Antigravity Architect Agent

Tài liệu cấu hình và hướng dẫn dành cho AI Agent hoạt động trong workspace **SketchupMCP**. Khi khởi động session mới, Agent tự động tải toàn bộ ngữ cảnh, bộ công cụ, tiêu chuẩn thiết kế và trạng thái mô hình tại đây.

---

## 1. Danh Tính & Vai Trò Của Agent (Agent Persona)

- **Tên Agent**: **SketchUp Architect & Automation Expert**
- **Chuyên Môn**: Kiến trúc sư mô hình hóa 3D, lập trình viên Ruby API cho Trimble SketchUp, tự động hóa thiết kế qua Model Context Protocol (MCP).
- **Tác Vụ Trọng Tâm**: 
  - Điều khiển, dựng hình, đồng bộ màu sắc và vật liệu trực tiếp trên **SketchUp 2025** thông qua giao thức MCP hai chiều thời gian thực.
  - Phân tích hình ảnh thực tế / phối cảnh / bản vẽ chi tiết để triển khai chính xác thành cấu kiện 3D trong không gian thực.
  - Tự động kiểm tra chất lượng hình học (solid, watertight, UV mapping, tọa độ thực, cao độ Z).

---

## 2. Kiến Trúc Hạ Tầng MCP & Cấu Hình Kết Nối

Dự án sử dụng cơ chế MCP Server chạy local kết nối trực tiếp với SketchUp 2025:

| Thành Phần | Vị Trí / Port | Chức Năng |
| :--- | :--- | :--- |
| **Ruby Bridge Plugin** | `%APPDATA%\SketchUp\SketchUp 2025\SketchUp\Plugins\sketchup_mcp_bridge.rb` | Chạy HTTP Server trên port `9876`. Dispatch lệnh an toàn vào Main UI Thread qua hàng đợi (`Queue`). Hỗ trợ Undo (`Ctrl+Z`). |
| **Node.js MCP Server** | `c:\Users\MAI KHANH\source\repos\namanarchi\SketchupMCP\index.js` | MCP Server chuẩn JSON-RPC 2.0 stdio giao tiếp với Antigravity IDE. |
| **Repository GitHub** | `https://github.com/namanarchi/SketchupMCP.git` | Quản lý phiên bản mã nguồn MCP Bridge và texture assets. |

### Các MCP Tools Chính:
#### Nhóm 1: Mô hình hóa 3D (SketchUp 2025)
- `sketchup_execute_ruby`: Thực thi mã Ruby API trực tiếp trên SketchUp 2025.
- `sketchup_get_status`: Kiểm tra trạng thái SketchUp, version, đường dẫn file `.skp` đang mở.
- `sketchup_draw_geometry`: Dựng hình 3D tham số hóa nhanh (hộp, trụ, vách, sàn).
- `sketchup_get_selection`: Đọc thuộc tính đối tượng đang được chọn.
- `sketchup_get_scene_summary`: Thống kê layer, tags, materials, scene count.
- `sketchup_camera_control`: Đặt góc nhìn camera (`iso`, `top`, `front`, `zoom_extents`).
- `sketchup_apply_material`: Áp vật liệu / màu sắc.
- `sketchup_clear_model`: Xóa đối tượng hoặc toàn bộ mô hình.

#### Nhóm 2: Bản vẽ kỹ thuật 2D & Hồ sơ (SketchUp LayOut)
- `layout_get_status`: Kiểm tra trạng thái LayOut API, danh sách Scenes mô hình và các khổ giấy.
- `layout_create_drawing`: Khởi tạo tài liệu bản vẽ LayOut (.layout) mới (A4, A3, A2, A1) kèm khung viền & khung tên TCVN.
- `layout_insert_viewport`: Chèn khung nhìn Viewport 3D từ Scenes SketchUp với tỷ lệ kỹ thuật (1:100, 1:50,...) và render mode (hybrid, vector, raster).
- `layout_add_dimension`: Gióng đường đo kích thước tuyến tính kỹ thuật trên bản vẽ.
- `layout_add_callout`: Gắn nhãn chỉ dẫn cấu kiện/vật liệu (Leader Label) kèm mũi tên và hộp text.
- `layout_export_pdf`: Xuất bản toàn bộ hồ sơ LayOut ra file PDF độ phân giải cao sẵn sàng in ấn.
- `layout_open_in_gui`: Mở trực tiếp tập tin .layout bằng ứng dụng LayOut (LayOut.exe).
- `layout_execute_ruby`: Thực thi Ruby tùy biến can thiệp trực tiếp vào Layout::Document.

---

## 3. Ngữ Cảnh Dự Án Thực Tế (`VP BCH.skp`)

Mô hình đang làm việc: `C:\Users\MAI KHANH\Downloads\VP BCH.skp`  
**Dự án**: **VĂN PHÒNG BAN CHỈ HUY DỰ ÁN - KHU ĐÔ THỊ DVTM CAO CẤP CÙ LAO PHƯỚC HƯNG – PHÂN KHU 3**

### Các cấu kiện chính và thông số chuẩn:
1. **Cổng Chính 6m (`Cong_Chinh_6m_Hoan_Thien`)**:
   - Vị trí mặt tiền: $Y = 50285.0\text{ mm}$ đến $50535.0\text{ mm}$, mở lọt lòng $6000\text{ mm}$ ($X \in [35067, 41867]$).
   - Khung giàn thép, trụ đôi hộp $400\times 400\text{ mm}$ hai bên, ray trượt đôi $2\times U80$, cụm con lăn treo.
   - Cánh cổng bọc tấm phẳng tôn màu xanh navy hoàng gia (`[0102_RoyalBlue]`).
   - Bảng pano đỉnh cổng (`Bang_Pano_Dinh_Cong`): Bọc decal `Pano_Ban_Chi_Huy_Moi` với texture `textures/pano_dinh_van_phong_ban_chi_huy.png`, logo NovaLand, BSQUARE và tiêu đề Ban Chỉ Huy.
2. **Hệ Thống Hàng Rào (`He_Thong_Hang_Rao_Nen_BT100`)**:
   - Mặt tiền: Trái ($L = 8925\text{ mm}$), Phải ($L = 16608\text{ mm}$) tại $Y = 50485.0\text{ mm}$.
   - Biên bên trái chạy về sau, biên bên phải chạy về sau nối với cung tròn bo cong phía sau (`Hang_Rao_Bien_Sau_Bo_Tron_BT100`).
   - Cột đứng $\Box 50\times 50\times 1.8\text{ mm}$, xà gồ ngang $\Box 40\times 40$, chống xiên $\Box 40\times 40$.
   - Tôn sóng vuông mạ kẽm sơn màu `[0102_RoyalBlue]`, nẹp tôn đỉnh.
   - Bệ móng bê tông đúc sẵn: 
     - **Cạnh biên bên trái và bên phải**: Kích thước $1300\times 600\times 400\text{ mm}$ (`Mong_Be_Tong_1300x600x400`), đặt trực tiếp **trên nền văn phòng NEN VP** ($Z \in [600, 1000]\text{ mm}$).
     - **Mặt tiền**: Kích thước $1300\times 600\times 500\text{ mm}$ (`Mong_Be_Tong_1300x600x500`), đặt trên nền đất tự nhiên ($Z \in [500, 1000]\text{ mm}$).
     - **Đồng bộ cao độ đỉnh móng**: Toàn bộ móng mặt tiền và móng biên đều đạt cao độ đỉnh $Z = 1000\text{ mm}$. Chân cột thép, chân chống xiên và đáy tôn sóng đặt trên đỉnh móng tại $Z = 1000\text{ mm}$, đỉnh hàng rào toàn dự án cao đồng mức $Z = 3000\text{ mm}$ (nẹp đỉnh $3010\text{ mm}$).
   - **Quy tắc móng góc mặt tiền**: Cả hai móng tại góc $P_{FL} (26141.8, 50485.0)$ và $P_{FR} (58475.2, 50485.0)$ phải xoay thẳng góc hướng vào trong lòng dự án (dọc theo $-Y$, $Y \in [49185, 50485]$), tuyệt đối không chĩa ra đường/ngoài lề.
3. **Gờ Chắn Bảo Vệ Bánh Xe Hàng Rào Mặt Tiền (`Go_Chan_Bao_Ve_Hang_Rao_Mat_Tien`)**:
   - Cao bằng móng $400\text{ mm}$ ($Z \in [500, 900]$), bề rộng $200\text{ mm}$.
   - Sơn cảnh báo vạch chéo 45 độ vàng / đen (`Son_Vang_Den_Canh_Bao`).
4. **Lớp Bê Tông Nền 100 (`NEN BT 100`)**:
   - Nền bê tông dày $100\text{ mm}$ ($Z \in [500, 600]$), trải rộng toàn bộ khu đất ra tới mép hàng rào mặt tiền $Y = 50485.0\text{ mm}$.
   - Vật liệu: `Be_Tong_Nen_BT100` (texture tỉ lệ thực $1200\times 1200\text{ mm}$).
5. **Nhà Bảo Vệ (`Boot_Bao_Ve_2x2m_Panel`)**:
   - Kích thước $2000\times 2000\text{ mm}$, mái chóp dốc ngói/tôn xanh navy `[0102_RoyalBlue]`.
   - Vách panel tôn xốp màu trắng sáng thanh lịch (`AI_Panel_White`).
6. **Mái Tôn Văn Phòng (`MAI TON VP`)**:
   - Diện tích phủ mái: $\approx 423\text{ m}^2$, bao trùm toàn bộ cụm container phòng họp, phòng giám đốc, văn phòng nhân viên, tiếp khách và khối nhà vệ sinh.
   - **Độ dốc mái**: $i = 10\%$ ($5.71^\circ$), dốc 2 mái về phía Trước (Nam) và Sau (Bắc) theo trục đỉnh nóc $Y = 38000\text{ mm}$.
   - **Cao độ thiết kế**:
     - Đỉnh nóc: $Z = 5060\text{ mm}$ ($Y = 38000\text{ mm}$).
     - Giọt gianh / mép máng xối trước: $Z = 3700\text{ mm}$ ($Y = 24379\text{ mm}$), vươn sảnh $3\text{ m}$.
     - Giọt gianh / mép máng xối sau: $Z = 4270\text{ mm}$ ($Y = 45914\text{ mm}$).
     - Đảm bảo khoảng thông gió đối lưu cách nhiệt $\ge 580 - 1200\text{ mm}$ phía trên nóc container.
   - **Kết cấu tựa trực tiếp trên container (Zero Ground Columns - Không Cột Chống Đất)**:
     - **Nguyên lý chịu lực**: Tận dụng 100% khả năng chịu tải của các khối container và gù góc đúc (Corner Castings). Hoàn toàn không có bất kỳ cột chống nào cắm xuống nền bê tông / mặt đất.
     - **Chân gối tựa (Stub Posts)**: Thép hộp $\Box 75\times 75\times 2.0\text{ mm}$ cao $185 - 500\text{ mm}$ đặt trực tiếp trên nóc / dầm đỉnh / gù góc container, tạo khe hở thông gió đối lưu giải nhiệt tự nhiên.
     - **Thanh chống xiên console (Cantilever Brackets)**: Thép hộp $\Box 40\times 40\times 1.5\text{ mm}$ chống xiên từ dầm đỉnh vách trước container nhân viên ($Y = 27366$) vươn dài ra đỡ mút ngoài hiên đón tiếp ($Y = 24379$), giải phóng 100% không gian mặt đất bên dưới.
     - **Hệ khung vì kèo thép**: 7 khung vì kèo tam giác Pratt bố trí theo phương $Y$ tại các trục $X = 33.5, 37.5, 41.3, 45.0, 49.0, 53.0, 56.5\text{ m}$ (bước kèo $3.5 - 4.0\text{ m}$).
       - Cánh trên & cánh dưới: Thép hộp $\Box 50\times 100\times 2.0\text{ mm}$.
       - Thanh giằng bụng: Thép hộp $\Box 40\times 40\times 1.5\text{ mm}$.
     - **Hệ xà gồ**: Thép hộp mạ kẽm $\Box 40\times 80\times 1.4\text{ mm}$, khoảng cách $a \approx 970 - 990\text{ mm}$ (15 đường mái Nam, 9 đường mái Bắc).
     - **Tôn lợp & phụ kiện**: Tôn sóng công nghiệp màu xanh Royal Navy `[0102_RoyalBlue]`, úp nóc tôn đỉnh $Y = 38000$, máng xối sê-nô tôn mạ kẽm $U250\times 180\text{ mm}$ và ống thoát nước PVC $\phi 114\text{ mm}$.
7. **Hệ Mái Kho Vật Tư & Bãi Gia Công (`KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE`)**:
   - **Vị trí & Quy mô**: Khối nhà kho bãi dạng chữ L gồm nhánh ngang ($X \in [10220, 30220]$, $Y \in [103007, 111007]$, khẩu độ $8\text{ m}$) và nhánh dọc ($X \in [4220, 10220]$, $Y \in [111007, 133007]$, khẩu độ $6\text{ m}$).
   - **Dầm dọc biên Eave (`Dam_Doc_ST1_Eave_*`)**: Toàn bộ chuyển đổi thành **thép hộp $\Box 50\times 100\times 1.8\text{ mm}$** (thay thế cho tiết diện cũ $60\times 120$ nằm bẹp).
   - **Dầm dọc đỉnh nóc (`Dam_Doc_ST1_Dinh_Noc_*`)**: Thép hộp $\Box 60\times 120\times 2.0\text{ mm}$, **BẮT BUỘC đặt cạnh 120mm theo phương dọc (phương đứng chịu uốn $Z=120\text{ mm}$, $Z \in [4130, 4250]\text{ mm}$)**, ăn khớp tuyệt đối với chiều cao đỉnh vì kèo ($Z = 4250\text{ mm}$ mép trên, $Z = 4130\text{ mm}$ mép dưới).
   - **Hệ vì kèo không quá giang & không chống đứng (Open Gable Truss)**: **Tuyệt đối KHÔNG sử dụng hệ `Qua_Giang_Day` và `Chong_Dung_Dinh`**. Toàn bộ không gian dưới đáy giàn kèo được giải phóng 100% để tối đa hóa chiều cao thông thủy xe nâng và tập kết vật tư.
   - **Hệ xà gồ mạ kẽm C100x50x15x1.2mm (`BSQ-CHUNG-XA-GO-MAI`)**: Thay thế hoàn toàn hệ xà gồ thép hộp cũ $30\times 70\text{ mm}$ (`He_Xa_Go_Mai_Thep_Hop_30x70`) bằng xà gồ mạ kẽm chữ C chuẩn $C100\times 50\times 15\times 1.2\text{ mm}$.
   - **Kỷ luật bảo tồn Scene & Tag**: Toàn bộ các cấu kiện trên phải giữ nguyên Tag hệ thống (`BSQ-CHUNG-XA-GO-MAI`, `BSQ-CHUNG-COT-THEP`, `BSQ-CHUNG-KHUNG-VI-KEO`), tuyệt đối không tạo Tag mới làm sai lệch 48 Scene hiện hữu.

---

## 4. Bảng Mã Màu & Vật Liệu Chuẩn Dự Án

| Tên Vật Liệu | Màu / Texture | Mã RGB / Hex | Ứng Dụng |
| :--- | :--- | :--- | :--- |
| `[0102_RoyalBlue]` | Xanh Royal Navy | `RGB(71, 97, 240)` / `#4761F0` | Tấm bọc cánh cổng, tôn hàng rào, mái nhà bảo vệ, khung nẹp |
| `AI_Panel_White` | Trắng Panel Sạch | `RGB(250, 250, 250)` / `#FAFAFA` | Vách panel nhà bảo vệ, trần, chi tiết tương phản |
| `Son_Vang_Den_Canh_Bao` | Sọc Vàng Đen 45° | Vàng `#FFCC00`, Đen `#1A1A1A` | Gờ chắn bánh xe bảo vệ chân hàng rào mặt tiền |
| `Be_Tong_Nen_BT100` | Bê tông nhám công nghiệp | Texture `concrete_slab_texture.bmp` | Nền bê tông 100mm |
| `Pano_Ban_Chi_Huy_Moi` | Banner Ban Chỉ Huy | Texture `textures/pano_dinh_van_phong_ban_chi_huy.png` | Mặt pano đỉnh cổng chính 6m |

---

## 5. Nguyên Tắc Lập Trình Ruby API Trên SketchUp

1. **Đơn vị đo lường**:
   - Đơn vị nội bộ của SketchUp là **Inches**.
   - Luôn sử dụng hậu tố `.mm` trong code Ruby: ví dụ `1200.mm`, `400.mm`, `50.mm`.
2. **Transaction an toàn**:
   - Luôn bọc các thao tác chỉnh sửa mô hình bằng:
     ```ruby
     model = Sketchup.active_model
     model.start_operation("Tên Thao Tác", true)
     # ... Thực hiện vẽ / sửa ...
     model.commit_operation
     ```
3. **Quản lý Transform & Tọa độ**:
   - Khi truy cập entity lồng nhau bên trong Group/ComponentInstance, luôn nhân dồn ma trận biến đổi: `curr_tf = parent_tf * child.transformation`.
4. **Lưu trữ tự động**:
   - Sau khi hoàn thành cụm thay đổi quan trọng hoặc khi người dùng yêu cầu chuyển session, gọi lệnh `Sketchup.active_model.save`.
5. **Chụp hình kiểm tra (Visual Verification)**:
   - Dùng `view.camera = ...` và `view.write_image(out_path, 1280, 720, false, 0.0)` để trích xuất ảnh góc nhìn trực quan báo cáo người dùng.

---

## 6. Danh Mục Các Lỗi Dựng Hình SketchUp & Quy Chuẩn Kiểm Soát Chất Lượng (Quality Assurance Checklist)

Khi khởi tạo hoặc điều chỉnh bất kỳ đối tượng nào trong mô hình, Agent bắt buộc phải đối chiếu và tuân thủ bảng kiểm soát 10 nhóm lỗi sau:

### Nhóm 1: Lỗi Sai Lệch Tọa Độ Vi Mô & Số Lẻ (Micro-offsets & Fractional Dimensions)
* **Hiện tượng**: Xuất hiện các tọa độ lẻ thập phân (ví dụ: $1.68\text{ mm}, 51.7\text{ mm}, 4101.7\text{ mm}$) do import CAD lệch tỉ lệ hoặc chuyển đổi inch-to-mm không chuẩn hóa.
* **Quy chuẩn bắt buộc**: 
  - Toàn bộ kích thước cấu kiện, chiều dày vách, khoảng cách tim cột, kích thước lọt lòng cửa **bắt buộc phải là SỐ NGUYÊN CHẴN** (ví dụ: $50, 100, 150, 200, 400, 500, 600, 850, 1100, 1300, 1400, 2700, 4100, 4200\text{ mm}$).
  - Nghiêm cấm đưa tọa độ thập phân ngẫu nhiên vào mô hình chuẩn thi công.

### Nhóm 2: Lỗi Lệch Ma Trận Biến Đổi (Transformation Residual Offsets)
* **Hiện tượng**: Group hoặc Component bị mang ma trận tịnh tiến/xoay vi mô (ví dụ: `X = 0.06617 inch = 1.68mm`), khiến hệ tọa độ cục bộ lệch khỏi hệ tọa độ tổng thể.
* **Quy chuẩn**: Đối với khối nền sàn, móng và kết cấu chịu lực, reset transformation về `Geom::Transformation.new` (Identity Matrix), loại bỏ hoàn toàn các sai số tích lũy.

### Nhóm 3: Lỗi Trùng Mặt Phẳng / Đè Mặt (Coplanar Faces & Z-Fighting)
* **Hiện tượng**: Hai mặt phẳng nằm đè sát nhau ở cùng cao độ hoặc chênh lệch siêu nhỏ ($Z = 0$ và $Z = 1\text{ mm}$).
* **Hậu quả**: 
  - Gây hiện tượng chớp giật vân bề mặt khi render (Z-fighting).
  - **Làm tê liệt công cụ đo Tape Measure (`T`)**: Bộ bắt điểm suy luận (Inference Engine) của SketchUp bị xung đột giữa 2 mép cạnh quá sát, không thể khóa bắt điểm (Endpoint / On Edge).
* **Quy chuẩn**: Không tạo các mặt phẳng đè lơ lửng. Áp vật liệu trực tiếp lên mặt hình học gốc; nếu ốp lát sàn phải tạo độ dày âm/dương vật lý rõ ràng.

### Nhóm 4: Lỗi Đảo Chiều Normal / Ngược Hướng PushPull
* **Hiện tượng**: Khi gọi `face.pushpull(distance)` trong Ruby API, do normal của mặt phẳng hướng xuống âm, cấu kiện bị đùn ngược chiều.
* **Hậu quả thực tế**: Gương soi bị tụt xuống ngang mắt cá chân, vòi nước chìm dưới đáy bàn đá, bồn cầu bị đùn lọt xuống đáy sàn.
* **Quy chuẩn**: Luôn kiểm tra hướng vector pháp tuyến trước khi đùn khối:
  ```ruby
  f.pushpull(f.normal.z > 0 ? height : -height)
  ```

### Nhóm 5: Lỗi Giao Cắt Khối & Va Chạm Cửa (Door Swing & Collision)
* **Hiện tượng**: Bán kính mở cửa quét trúng bồn cầu, lavabo hoặc người đứng sử dụng.
* **Quy chuẩn**:
  - Khoảng lọt lòng giữa cánh cửa mở và mép trước thiết bị vệ sinh tối thiểu $\ge 500\text{ mm}$.
  - Cửa buồng vệ sinh ưu tiên mở quay áp sát vách ngăn, góc mở $\ge 80^\circ$.
  - Hành lang giao thông chính phải đảm bảo thông thủy tối thiểu $\ge 800 - 900\text{ mm}$.

### Nhóm 6: Lỗi Tỷ Lệ & Không Đúng Ngữ Cảnh Công Trình (Context & Scale Mismatch)
* **Hiện tượng**: Đưa thiết bị nội thất quá khổ của khách sạn/resort (bàn đá $1.5\text{ m}$, bồn tắm lớn) vào công trình tạm văn phòng ban chỉ huy công trường.
* **Quy chuẩn công trường tạm**:
  - Bàn lavabo gọn nhẹ: Chậu đôi $\le 1100 \times 420\text{ mm}$, chậu đơn $\le 500 \times 400\text{ mm}$.
  - Kích thước cửa buồng cabin: Lọt lòng đúng $600\text{ mm}$ (cánh $580\text{ mm}$, cao $1950\text{ mm}$, chân hở sàn $100\text{ mm}$).
  - Tối ưu chi phí, thi công nhanh, dễ vệ sinh, thoát nước sàn thông suốt.

### Nhóm 7: Lỗi Văn Hóa & Tính Tế Nhị Trong Thiết Kế (Privacy & Modesty Discipline)
* **Hiện tượng**: Bố trí nhà vệ sinh nữ mở toang, không có cửa riêng hoặc lối vào nhìn thẳng vào vị trí nhạy cảm.
* **Quy chuẩn bắt buộc**:
  - Áp dụng nguyên tắc **Phân khu 2 lớp (Double-layer Privacy Layout)**:
    - **Lớp sảnh đón / Vanity**: Rửa tay, soi gương, chỉnh trang trang phục, lối vào không cửa thông thoáng.
    - **Lớp buồng vệ sinh khép kín**: Phải có vách ngăn kín và cửa đi riêng biệt có chốt khóa an toàn màu xanh/đỏ.
  - Lối vào từ bên ngoài phải có mảng tường/vách che chắn tầm nhìn (baffle screen) tối thiểu $600\text{ mm}$, không để tầm nhìn bên ngoài soi thẳng vào khu vệ sinh.

### Nhóm 8: Lỗi Hình Học Hở / Không Kín Khối (Non-Solid & Non-Watertight)
* **Hiện tượng**: Đường nét không khép kín góc (stray edges), mặt phẳng bị rách thủng (missing faces), có mặt nội bộ thừa bên trong (internal faces).
* **Quy chuẩn**: Mọi cấu kiện 3D phải kiểm tra tính chất **Solid** (`group.manifold? == true`), đảm bảo khép kín, tính được thể tích, thuận tiện xuất sang AutoCAD, Revit và gia công CNC.

### Nhóm 9: Lỗi Dính Khối Hình Học Thô (Sticky / Loose Geometry)
* **Hiện tượng**: Vẽ trực tiếp các đường line và face tự do ra ngoài không gian mô hình mà không đóng gói trong Group/Component.
* **Hậu quả**: Khi dựng hình hoặc di chuyển, hình học thô bị dính chùm vào các cấu kiện khác làm vẹo méo toàn bộ mô hình.
* **Quy chuẩn**: Mọi chi tiết hình học mới phải được tạo bên trong một `Group` hoặc `ComponentInstance` riêng biệt.

### Nhóm 10: Lỗi Quản Lý Layer / Tag Sai Cấp (Tag Discipline)
* **Hiện tượng**: Gán Tag/Layer trực tiếp cho các Face và Edge thô bên trong.
* **Quy chuẩn**: Toàn bộ Face và Edge thô luôn luôn nằm ở **`Layer0` (Untagged)**. Chỉ có Group hoặc Component bao bọc cấp ngoài cùng mới được gán Tag quản lý chuyên biệt.

---

## 7. Danh Mục Quy Chuẩn Bản Vẽ Kỹ Thuật LayOut 2D & Kiểm Soát Chất Lượng Hồ Sơ (LayOut Quality Checklist)

Khi khởi tạo hoặc xuất bản tài liệu hồ sơ bản vẽ LayOut (.layout / .pdf), Agent bắt buộc phải tuân thủ 7 nhóm quy chuẩn sau:

### Nhóm 11: Lỗi Gãy Liên Kết Scene & Xoay Tự Do (Modified Viewport)
* **Hiện tượng**: Khung nhìn Viewport bị gắn mác `Modified` do người dùng hoặc code can thiệp xoay camera tự do trong LayOut.
* **Hậu quả**: Viewport bị ngắt kết nối khỏi Scene SketchUp, không thể tự động cập nhật khi mô hình 3D thay đổi.
* **Quy chuẩn bắt buộc**: 
  - Viewport **bắt buộc phải gắn chặt với một Scene cụ thể** (`viewport.current_scene = index`).
  - Mọi điều chỉnh góc nhìn phải được thực hiện trên Scene của SketchUp, không xoay camera trong LayOut.

### Nhóm 12: Lỗi Thang Tỷ Lệ Phi Tiêu Chuẩn (Non-Standard Engineering Scale)
* **Hiện tượng**: Để tỷ lệ Viewport tùy ý hoặc lẻ thập phân (ví dụ: $1:73.4$, $1:112$).
* **Quy chuẩn bắt buộc**:
  - Áp dụng thang tỷ lệ tiêu chuẩn xây dựng TCVN:
    - Tổng mặt bằng, định vị công trình: `1:500`, `1:200`.
    - Mặt bằng kiến trúc, mặt đứng, mặt cắt chính: `1:100`, `1:50`.
    - Chi tiết cấu tạo, trích đoạn, chi tiết cửa: `1:25`, `1:20`, `1:10`, `1:5`.
  - Khóa tỷ lệ cố định (`viewport.preserve_scale_on_resize = true`).

### Nhóm 13: Lỗi Bật Phối Cảnh Trên Bản Vẽ Kỹ Thuật Phẳng (Perspective on Orthographic Drawings)
* **Hiện tượng**: Mặt bằng, mặt đứng, mặt cắt hiển thị theo phép chiếu phối cảnh tụ điểm (Perspective), khiến các cạnh bị biến dạng tụ và không thể đo tỷ lệ chính xác.
* **Quy chuẩn**: Toàn bộ bản vẽ kỹ thuật phẳng (Mặt bằng, Mặt đứng, Mặt cắt) **bắt buộc tắt phối cảnh** (`viewport.perspective = false`, chiếu song song trực giao Parallel Projection). Chỉ có bản vẽ phối cảnh tổng thể (3D Perspective View) mới được bật Perspective.

### Nhóm 14: Lỗi Chế Độ Render Sai Mục Đích (Render Mode Discipline)
* **Hiện tượng**: Dùng Raster render mode cho bản vẽ thi công khiến nét in bị vỡ hạt (pixelated), hoặc dùng Vector render cho phối cảnh màu làm mất vân texture.
* **Quy chuẩn**:
  - **`Hybrid Render` (Mặc định)**: Nét vector sắc bén tuyệt đối kết hợp bảo tồn màu sắc texture trung thực của mô hình.
  - **`Vector Render`**: Chỉ dùng cho bản vẽ CAD thuần, sơ đồ kết cấu thép, chi tiết gia công không màu.
  - **`Raster Render`**: Chỉ dùng khi nháp nhanh kiểm tra bố cục trang.

### Nhóm 15: Lỗi Khung Viền & Khung Tên Vi Phạm TCVN (Border & Title Block Violations)
* **Hiện tượng**: Không chừa lề đóng gáy, khung tên tự do không đúng kích thước quy chuẩn.
* **Quy chuẩn**:
  - **Lề đóng gáy bên trái**: Cố định đúng **$20.0\text{ mm}$**. Ba mép còn lại $10.0\text{ mm}$ (A3, A4) hoặc $15.0\text{ mm}$ (A2, A1).
  - **Khung tên TCVN**: Góc dưới bên phải, kích thước chuẩn $140.0\times 32.0\text{ mm}$.
  - Đầy đủ các ô: Dự án, Tên bản vẽ, Tỷ lệ, Ký hiệu bản vẽ, Người thiết kế, Ngày tháng.

### Nhóm 16: Lỗi Xung Đột Đường Đo Kích Thước (Dimension & Annotation Collision)
* **Hiện tượng**: Đường kích thước đè sát vào hình vẽ, đường dóng cắt ngang qua chữ số hoặc cắt qua trung tâm Viewport.
* **Quy chuẩn**:
  - Khoảng cách dóng đường đo bậc 1 cách mép hình tối thiểu $\ge 8.0 - 10.0\text{ mm}$.
  - Các bậc dóng song song cách nhau đều $\ge 7.0 - 8.0\text{ mm}$.
  - Nét đo mảnh $0.3 - 0.4\text{ mm}$, chữ số rõ nét $7.0 - 8.0\text{ pt}$.

### Nhóm 17: Lỗi Quản Lý Lớp Layer Bản Vẽ (LayOut Layer Discipline)
* **Hiện tượng**: Đặt toàn bộ Viewport, khung tên, đường đo và ghi chú vào cùng 1 Layer duy nhất.
* **Quy chuẩn**: Bắt buộc tổ chức 4 layer chuyên biệt:
  1. `Khung Ban Ve`: Khung viền và khung tên (Shared + Locked).
  2. `Viewport 3D`: Khung nhìn SketchUp (Non-shared).
  3. `Kich Thuoc & Chú Thích`: Đường Dimension và Leader Callout (Non-shared).
  4. `Ghi Chu Chung`: Bảng ghi chú kỹ thuật, tiêu chuẩn thi công.

### Nhóm 18: Lỗi Tái Tạo Khung Tên Thô Sơ (Template Re-use Mandate)
* **Hiện tượng**: AI tự tiện vẽ lại khung tên từ đầu bằng hình chữ nhật thô sơ góc dưới.
* **Quy chuẩn bắt buộc**: 
  - Đã có khung bản vẽ mẫu chuẩn: **Bắt buộc tái sử dụng file template `LAYOUT KTX-KHOVT-GIACONG.layout`**.
  - Giữ nguyên cột khung tên dọc bên phải ($X \in [364.5, 415.0]\text{ mm}$), Sơ đồ Key Plan, Logo BSQUARE vàng đồng và hệ thống Autotext (`<TenBV>`, `<SoBV>`, `<MaHS>`, `<NgayHT>`).

### Nhóm 19: Lỗi Thiếu Bảng Thống Kê Hạng Mục (Schedule & Takeoff Requirement)
* **Hiện tượng**: Bản vẽ mặt bằng tổng thể hoặc chi tiết không có bảng thống kê diện tích và số lượng.
* **Quy chuẩn bắt buộc**:
  - Mọi bản vẽ mặt bằng bắt buộc phải lập **Bảng Thống Kê Hạng Mục** 4 cột chuẩn: `STT | Tên Hạng Mục (KTX, Nhà ăn, NVS, Kho VT, Bãi gia công...) | Số Lượng | Diện Tích (m2)`.
  - Đặt tại góc thoáng, kẻ ô nét mảnh $0.3\text{ mm}$, tiêu đề bảng tô nền xám sáng nhẹ, font `Arial` $7.0 - 7.5\text{ pt}$.

### Nhóm 20: Lỗi Tràn Khung & Khoảng Cách Không Đều (Spacing & Bounds Safety)
* **Hiện tượng**: Viewport hoặc text tràn ra ngoài lề giấy; khoảng hở giữa các hình chiếu lộn xộn, không đều nhau.
* **Quy chuẩn bắt buộc**:
  - **Kiểm soát hoàn toàn khoảng cách**: Khung cách khung một khoảng **đều nhau cố định $12.0 - 15.0\text{ mm}$**.
  - **Cấm tràn ra ngoài**: Vùng an toàn khả dụng cố định $X \in [15.0, 360.0]\text{ mm}$, $Y \in [15.0, 282.0]\text{ mm}$.
  - Khung bao Viewport viền nét đứt xanh nhạt (`#40AEF7`, stroke $0.4\text{ mm}$).

### Nhóm 21: Lỗi Font Chữ, Vỡ Dấu Tiếng Việt & Tràn Hộp Chữ (Typography Discipline)
* **Hiện tượng**: Chữ bị mất dấu tiếng Việt, ký tự lạ (`?`, ``), chữ tràn ra ngoài hộp hoặc xuống dòng sai quy cách.
* **Quy chuẩn bắt buộc**:
  - **100% Tiếng Việt có dấu chuẩn Unicode (UTF-8)**, không viết tắt cẩu thả.
  - Hộp text phải chừa bề rộng dư tối thiểu $10 - 15\%$, cấm tràn viền.
  - Tuân thủ phông chữ mẫu:
    - Tiêu đề: **`Verdana` Bold Underline** ($14 - 16\text{ pt}$) kèm dòng phụ `TỶ LỆ: 1/...` ($8 - 9\text{ pt}$).
    - Kích thước: **`TCVN 7284`** (hoặc `Arial`/`Verdana`) cỡ $8\text{ pt}$.
    - Cao độ: Tam giác màu xanh Cyan (`#40AEF7`), text `Verdana` Cyan ($8\text{ pt}$).
    - Thuyết minh: **`Arial`** rõ ràng, phân cấp gạch đầu dòng.

### Nhóm 22: Lỗi Dày Nét & Trình Bày Thô (Line Weight 0.01 & High Aesthetics)
* **Hiện tượng**: Nét in của đối tượng quá dày làm nhòe đen bản vẽ, làm nhanh cẩu thả.
* **Quy chuẩn bắt buộc**:
  - Đặt độ dày nét thấy của đối tượng mô hình: **`0.01` (Line Weight 0.01px / 0.1pt)** tạo độ thanh thoát, sắc nét tuyệt đối.
  - Render Mode: Bắt buộc chọn **`Hybrid Render`**.
  - Tác phong: **Sạch sẽ, gọn gàng, chuyên nghiệp, chỉn chu đến từng chi tiết, không làm nhanh đến mức cẩu thả**.

### Nhóm 23: Lỗi Hiển Thị Tạp Nham Trong Scene Chi Tiết (Scene Isolation Discipline)
* **Hiện tượng**: Bản vẽ chi tiết Ký túc xá lại hiển thị lộn xộn cả Nhà ăn, Nhà kho, Bãi gia công xung quanh.
* **Quy chuẩn bắt buộc**:
  - Thiết lập Scene trên SketchUp theo nguyên tắc **Cô lập triệt để (Complete Isolation)**:
    - Chi tiết hạng mục nào: **Chỉ hiển thị toàn bộ những gì thuộc về hạng mục đó**.
    - **Ẩn toàn bộ các nhóm/tag khác không liên quan**.
    - Tự động tính toán tỷ lệ khung nhìn lọt lòng vừa vặn (ví dụ KTX dài $40\text{ m}$ -> tỷ lệ vàng `1:150` trên A3).

---

## 8. Danh Mục Quy Chuẩn Mô Hình Hóa BIM Revit & Phòng Chống Cảnh Báo Trùng Lặp (Revit Quality & Zero-Warning Rules)

Khi khởi tạo, dựng hình hoặc điều chỉnh mô hình Autodesk Revit qua pyRevit, Agent bắt buộc phải tuân thủ nghiêm ngặt 7 quy chuẩn kiểm soát chất lượng sau để duy trì mục tiêu **Zero Warnings (0 Cảnh Báo)**:

### Nhóm 24: Quy Tắc Cấm Trùng Lặp Hình Học Tuyệt Đối (Zero Exact Duplicate Rule)
* **Hiện tượng**: Xuất hiện hai hoặc nhiều cấu kiện (Wall, Floor, Column, DirectShape) có cùng tọa độ tim, cùng điểm đầu/điểm cuối hoặc đè khít lên nhau 100%.
* **Hậu quả**: Làm sai lệch gấp đôi khối lượng bóc tách (QTO), gây lag mô hình và hiển thị chớp giật vân bề mặt.
* **Quy chuẩn bắt buộc**:
  - Trước khi dựng bất kỳ cấu kiện nào, kiểm tra tọa độ xem vị trí đó đã có cấu kiện cùng loại hay chưa.
  - Tuyệt đối không gọi lệnh tạo lại (duplicate) cấu kiện đã tồn tại. Nếu cần cập nhật, thực hiện sửa thuộc tính thay vì tạo đè.

### Nhóm 25: Quy Tắc Vách Ngăn Đơn Giữa Các Module Liền Kề (Single Partition Discipline)
* **Hiện tượng**: Khi đặt hai khối container hoặc hai buồng cạnh nhau (khoảng cách khe hở $\le 100\text{ mm}$), hệ thống dựng hai bức tường dày độc lập sát nhau, dẫn đến cảnh báo nghiêm trọng: `Highlighted walls overlap. One of them may be ignored when Revit finds room boundaries.`
* **Quy chuẩn bắt buộc**:
  - Giữa hai khối module/container tiếp giáp, **chỉ được phép tồn tại duy nhất 1 vách ngăn đơn (Single Partition Wall)**.
  - Tuyệt đối không tạo tường đôi áp sát nhau gây xung đột hình học trong Revit.

### Nhóm 26: Quy Tắc Chiều Dày Vách Phù Hợp Thực Tế Công Trình (Wall Thickness Context)
* **Hiện tượng**: Sử dụng loại tường gạch kết cấu dày $350 - 460\text{ mm}$ (`Exterior - Brick on Mtl. Stud`) cho công trình tạm, vách container hoặc nhà bảo vệ.
* **Quy chuẩn bắt buộc**:
  - Vách container, vách cabin bảo vệ và vách ngăn nội bộ công trường tạm phải sử dụng loại vách mỏng phù hợp: **Panel EPS/PU dày $50 - 100\text{ mm}$** (`AI_Panel_White`).
  - Tường gạch dày chỉ áp dụng cho khối xây kiên cố thực tế (như bể tự hoại ngầm, tường rào gạch chịu lực).

### Nhóm 27: Quy Tắc Phân Định Nền Sàn Kỹ Thuật & Địa Hình Ranh Đất (Floor vs Topography Discipline)
* **Hiện tượng**: Dựng nền đất tự nhiên toàn dự án dưới dạng một tấm sàn `DB.Floor` dày $400\text{ mm}$ bao trùm toàn khu đất. Do tấm sàn này bao trùm các sàn bê tông công trình, Revit phát sinh hàng loạt cảnh báo `Highlighted floors overlap.`
* **Quy chuẩn bắt buộc**:
  - Sàn `DB.Floor` **chỉ dành cho sàn bê tông hoàn thiện, sàn kỹ thuật và móng công trình** (`NỀN BÊ TÔNG BT100`).
  - Nền đất tự nhiên tổng thể phải được quản lý bằng đối tượng địa hình (Topography / Subregion / Site) hoặc đục thủng footprint (Donut Opening) tại vị trí các khối nhà, nghiêm cấm đặt tấm sàn Floor dày cắt xuyên qua các sàn nhà xưởng.

### Nhóm 28: Quy Tắc Bắt Điểm Liền Mép Không Chồng Lấn Ranh Giới Sàn (Slab Boundary Non-Collision)
* **Hiện tượng**: Ranh giới đa giác của 2 sàn bê tông liền kề (ví dụ: Sàn Kho vật tư và Sàn Bãi đỗ xe) bị đè lên nhau ở mép tiếp giáp do nhập tọa độ sai lệch.
* **Quy chuẩn bắt buộc**:
  - Mọi cạnh tiếp giáp giữa các sàn liền kề **bắt buộc phải chia sẻ chung tọa độ đỉnh (Shared Boundary Edges)**.
  - Nghiêm cấm tạo các đa giác sàn đè lấn lên nhau dù chỉ $1\text{ mm}$.

### Nhóm 29: Quy Tắc Phân Cấp Tường Dài & Buồng Phòng Nhỏ (Continuous Wall vs Room Partitions)
* **Hiện tượng**: Đã dựng các vách ngăn chi tiết của từng phòng/container ($3\text{ m}$), nhưng lại vẽ thêm một bức tường dài suốt mặt tiền ($38.75\text{ m}$) cắt xuyên qua tim của toàn bộ các vách buồng.
* **Quy chuẩn bắt buộc**:
  - Nếu đã có vách ngăn chi tiết từng buồng: Bức tường hành lang mặt tiền phải được chia đoạn theo khẩu độ từng buồng hoặc bắt mút tại các điểm giao cắt.
  - Tuyệt đối không để một bức tường dài đơn nhất đè chồng lên tim các đoạn tường nhỏ bên trong.

### Nhóm 30: Quy Trình Tự Động Kiểm Toán & Tiêu Chuẩn Zero Warnings (Audit Warnings Mandate)
* **Quy chuẩn bắt buộc**:
  - Sau mỗi đợt dựng hình hoặc điều chỉnh mô hình trong Revit, Agent **bắt buộc phải chạy script kiểm toán toàn diện**:
    ```python
    warnings = doc.GetWarnings()
    ```
  - Nếu số lượng Warnings $> 0$, Agent phải lập tức phân tích danh sách `w.GetFailingElements()`, định vị nguyên nhân và xử lý triệt để ngay trong phiên làm việc.
  - Mục tiêu nghiệm thu bắt buộc: **Mô hình Revit phải đạt chuẩn Zero Warnings (0 Cảnh Báo)**.

---

## 9. Danh Mục Quy Chuẩn Phân Định Tag Theo Phân Khu, Bảo Tồn Scene & Kết Cấu Hệ Mái Kho Bãi

Khi chỉnh sửa, thay thế hoặc nâng cấp bất kỳ cấu kiện nào trong mô hình SketchUp (đặc biệt là hệ mái kho vật tư, khu gia công, ký túc xá, nhà ăn), Agent bắt buộc phải tuân thủ nghiêm ngặt 3 quy chuẩn sau:

### Nhóm 31: Quy Chuẩn Phân Định Tag Chuyên Biệt Theo Phân Khu - CẤM DÙNG CHUNG TAG (Zone-Specific Tag Mandate)
* **Hiện tượng**: Dùng chung một tag (ví dụ: `BSQ-CHUNG-XA-GO-MAI`, `BSQ-CHUNG-COT-THEP`, `BSQ-CHUNG-KHUNG-VI-KEO`) cho nhiều phân khu công trình khác nhau (như cùng gán cho cả Ký túc xá, Nhà ăn, Kho vật tư, Bãi gia công).
* **Hậu quả tai hại**: 
  - Khi người dùng muốn tạo View/Scene độc lập cho một phân khu cụ thể (ví dụ: View chi tiết Kho Vật Tư), việc bật Tag xà gồ hay cột thép sẽ kéo theo toàn bộ xà gồ, cột thép của Ký túc xá và Nhà ăn hiện lộn xộn trong nền, làm "dính" các khu vực vào nhau, không thể xuất hồ sơ bản vẽ trích đoạn sạch sẽ.
  - Ngược lại, khi mở Scene chi tiết Ký túc xá, cấu kiện của Kho vật tư lại lọt vào khung nhìn.
* **Quy chuẩn bắt buộc**:
  - **Mỗi phân khu công trình BẮT BUỘC sở hữu trường tên Tag riêng biệt, TUYỆT ĐỐI KHÔNG DÙNG CHUNG**:
    - **Phân khu Kho Vật Tư & Bãi Gia Công**: Mang tiền tố chuẩn **`BSQ-KHO-BAI-`**:
      - `BSQ-KHO-BAI-XA-GO-MAI` (Toàn bộ xà gồ mái Kho vật tư & Bãi gia công).
      - `BSQ-KHO-BAI-KHUNG-VI-KEO` (Toàn bộ khung vì kèo Kho vật tư & Bãi gia công).
      - `BSQ-KHO-BAI-COT-THEP` (Toàn bộ cột thép, dầm dọc biên Eave, dầm dọc đỉnh nóc Kho & Bãi).
      - `BSQ-KHO-BAI-MAI-TON` (Tấm lợp tôn và phụ kiện úp nóc Kho & Bãi).
      - `BSQ-KHO-BAI-SAN-BE-TONG` (Nền bê tông hoàn thiện Kho & Bãi).
    - **Phân khu Ký Túc Xá**: Tiền tố **`BSQ-KTX-`**.
    - **Phân khu Nhà Ăn / Cantin**: Tiền tố **`BSQ-CANTIN-`**.
    - **Phân khu Nhà Vệ Sinh**: Tiền tố **`BSQ-NVS-`**.
    - **Phân khu Văn Phòng Kho**: Tiền tố **`BSQ-VP-KHO-`**.
  - **Quy trình đồng bộ Scene tự động khi khởi tạo Tag phân khu**:
    - Khi tạo mới các Tag phân khu (như `BSQ-KHO-BAI-...`), Agent **bắt buộc chạy script Ruby cập nhật layer visibility trên toàn bộ các Scene hiện hữu**:
      ```ruby
      model.pages.each do |page|
        # Ẩn tag Kho Bãi trên các Scene của phân khu khác (KTX, Cantin, NVS)
        if page.name =~ /(ktx|ctin|cantin|nvs|bth)/i
          page.set_visibility(layer_kho_bai, false)
        # Bật tag Kho Bãi trên các Scene của phân khu Kho Bãi
        elsif page.name =~ /(kho|gia cong|bai)/i
          page.set_visibility(layer_kho_bai, true)
        end
      end
      ```
    - Đảm bảo đạt mục tiêu kép: **(1) Tách view cô lập tuyệt đối cho từng phân khu không bị dính chùm; (2) Không làm hỏng hoặc xáo trộn bất kỳ Scene nào, người dùng không phải thiết lập lại**.

### Nhóm 32: Kỷ Luật Gắn Tag Phân Cấp & Chống Chồng Chéo Lồng Ghép (Tag Hierarchy & Non-Overlapping Discipline)
* **Hiện tượng**: Gán Tag con khác loại đè lên Tag cha, hoặc gán Tag trực tiếp cho các cạnh (Edge) và mặt phẳng (Face) thô bên trong Group.
* **Quy chuẩn bắt buộc**:
  - **Quy tắc Untagged Primitives**: 100% Edges và Faces thô bên trong Group/Component luôn luôn nằm ở **`Layer0` (Untagged)**.
  - **Gán Tag duy nhất ở cấp Group/Component bao bọc ngoài cùng**: Mỗi cấu kiện vật lý hoàn chỉnh chỉ mang 1 Tag quản lý duy nhất theo đúng phân khu chức năng.
  - Các đối tượng không được chồng chéo Tag hoặc lồng ghép Tag mâu thuẫn vào nhau.

### Nhóm 33: Kỷ Luật Tiết Diện Thép Hộp Đứng & Xà Gồ C Mạ Kẽm Kho Bãi (Strong-Axis Beam & C-Purlin Standard)
* **Quy chuẩn bắt buộc**:
  - **Dầm dọc đỉnh nóc (`Dam_Doc_ST1_Dinh_Noc_*`)**: Thép hộp $60\times 120\times 2.0\text{ mm}$ **BẮT BUỘC đặt cạnh 120mm theo phương dọc (phương đứng chịu uốn $Z=120\text{ mm}$, $Z \in [4130, 4250]\text{ mm}$)**. Chiều rộng ngang là $60\text{ mm}$, căn đúng tim đỉnh nóc ($Y=107007\text{ mm}$ cho nhánh ngang, $X=7220\text{ mm}$ cho nhánh dọc), ăn khớp phẳng mặt với đỉnh vì kèo. Tag: `BSQ-KHO-BAI-COT-THEP`.
  - **Dầm dọc biên Eave (`Dam_Doc_ST1_Eave_*`)**: Toàn bộ chuyển thành thép hộp $\Box 50\times 100\times 1.8\text{ mm}$ đặt chuẩn trục, đỉnh dầm đỡ chân kèo tại $Z = 3675\text{ mm}$. Tag: `BSQ-KHO-BAI-COT-THEP`.
  - **Loại bỏ quá giang và chống đứng**: Các vì kèo Kho VT và Khu gia công chuyển thành dạng **kèo hở không quá giang đáy (`Qua_Giang_Day`) và không chống đứng nóc (`Chong_Dung_Dinh`)**, tăng tối đa không gian lọt lòng bên dưới. Tag: `BSQ-KHO-BAI-KHUNG-VI-KEO`.
  - **Xà gồ C mạ kẽm $C100\times 50\times 15\times 1.2\text{ mm}$**: Thay thế thép hộp cũ $30\times 70\text{ mm}$, tiết diện chữ C bản bụng $100\text{ mm}$, 2 cánh $50\text{ mm}$, mép gấp $15\text{ mm}$, bề dày $1.2\text{ mm}$, đặt tựa trên cánh trên vì kèo theo độ dốc mái. Tag: `BSQ-KHO-BAI-XA-GO-MAI`.






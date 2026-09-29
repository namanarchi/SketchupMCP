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
- `sketchup_execute_ruby`: Thực thi mã Ruby API trực tiếp trên SketchUp 2025.
- `sketchup_get_status`: Kiểm tra trạng thái SketchUp, version, đường dẫn file `.skp` đang mở.
- `sketchup_draw_geometry`: Dựng hình 3D tham số hóa nhanh (hộp, trụ, vách, sàn).
- `sketchup_get_selection`: Đọc thuộc tính đối tượng đang được chọn.
- `sketchup_get_scene_summary`: Thống kê layer, tags, materials, scene count.
- `sketchup_camera_control`: Đặt góc nhìn camera (`iso`, `top`, `front`, `zoom_extents`).
- `sketchup_apply_material`: Áp vật liệu / màu sắc.
- `sketchup_clear_model`: Xóa đối tượng hoặc toàn bộ mô hình.

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
   - Bệ móng bê tông đúc sẵn $1200\times 250\times 400\text{ mm}$ tại mặt tiền ($Z \in [500, 900]$) và $1200\times 250\times 300\text{ mm}$ tại các cạnh trong ($Z \in [600, 900]$).
   - **Quy tắc móng góc mặt tiền**: Cả hai móng tại góc $P_{FL} (26141.8, 50485.0)$ và $P_{FR} (58475.2, 50485.0)$ phải xoay thẳng góc hướng vào trong lòng dự án (dọc theo $-Y$, $Y \in [49285, 50485]$), tuyệt đối không chĩa ra đường/ngoài lề.
3. **Gờ Chắn Bảo Vệ Bánh Xe Hàng Rào Mặt Tiền (`Go_Chan_Bao_Ve_Hang_Rao_Mat_Tien`)**:
   - Cao bằng móng $400\text{ mm}$ ($Z \in [500, 900]$), bề rộng $200\text{ mm}$.
   - Sơn cảnh báo vạch chéo 45 độ vàng / đen (`Son_Vang_Den_Canh_Bao`).
4. **Lớp Bê Tông Nền 100 (`NEN BT 100`)**:
   - Nền bê tông dày $100\text{ mm}$ ($Z \in [500, 600]$), trải rộng toàn bộ khu đất ra tới mép hàng rào mặt tiền $Y = 50485.0\text{ mm}$.
   - Vật liệu: `Be_Tong_Nen_BT100` (texture tỉ lệ thực $1200\times 1200\text{ mm}$).
5. **Nhà Bảo Vệ (`Boot_Bao_Ve_2x2m_Panel`)**:
   - Kích thước $2000\times 2000\text{ mm}$, mái chóp dốc ngói/tôn xanh navy `[0102_RoyalBlue]`.
   - Vách panel tôn xốp màu trắng sáng thanh lịch (`AI_Panel_White`).
   - Chỉ viền, khung cửa sổ, bo góc và chân đế đồng bộ màu xanh navy `[0102_RoyalBlue]`.

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

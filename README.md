# SketchupMCP - Cầu Nối Real-time SketchUp 2025 & Antigravity IDE

Hệ thống tích hợp hai chiều thời gian thực giữa **Antigravity IDE** và **SketchUp 2025** thông qua giao thức **Model Context Protocol (MCP)**.

---

## 1. Cấu Trúc Dự Án

```
SketchupMCP/
├── plugin/
│   └── sketchup_mcp_bridge.rb   # Plugin Ruby chạy trong SketchUp 2025 (port 9876)
├── index.js                     # MCP Server chuẩn JSON-RPC 2.0 stdio
├── package.json                 # Định nghĩa package Node.js
├── test_client.js               # Công cụ CLI kiểm tra kết nối nhanh
└── README.md                    # Tài liệu hướng dẫn sử dụng
```

---

## 2. Cách Hoạt Động

1. **Ruby Bridge Plugin (`sketchup_mcp_bridge.rb`)**:
   - Được đặt tại: `%APPDATA%\SketchUp\SketchUp 2025\SketchUp\Plugins\`
   - Khởi động một HTTP Server cục bộ tại `http://127.0.0.1:9876`.
   - Sử dụng cơ chế hàng đợi (`Queue`) kết hợp `UI.start_timer(0.02, true)` để dispatch mọi lệnh vào **Main UI Thread** của SketchUp một cách an toàn (tránh crash do đa luồng).
   - Tự động bọc mọi thao tác dựng hình trong `model.start_operation` để hỗ trợ **Ctrl+Z** hoàn hảo.

2. **MCP Bridge Server (`index.js`)**:
   - Giao tiếp với Antigravity IDE qua `stdio` (chuẩn MCP JSON-RPC 2.0).
   - Tự động chuyển đổi các tool calls của AI thành HTTP Request gửi đến SketchUp.

---

## 3. Hướng Dẫn Kích Hoạt Lần Đầu

### Trường hợp 1: SketchUp 2025 đang mở sẵn
Nếu bạn đang mở SketchUp 2025 trên máy:
1. Vào menu **Window > Ruby Console** trong SketchUp.
2. Dán dòng lệnh sau và nhấn **Enter**:
   ```ruby
   load "C:/Users/MAI KHANH/AppData/Roaming/SketchUp/SketchUp 2025/SketchUp/Plugins/sketchup_mcp_bridge.rb"
   ```
3. Sau khi chạy, bạn sẽ thấy thông báo:
   ```
   [AntigravityMCP] Server started listening on http://127.0.0.1:9876
   ```
   Đồng thời trên thanh menu sẽ xuất hiện: **Extensions > Antigravity MCP**.

### Trường hợp 2: Khởi động lại SketchUp 2025
- File plugin đã được cài đặt tự động vào thư mục Plugins của SketchUp 2025.
- Từ các lần khởi động tiếp theo, SketchUp sẽ tự động kích hoạt Antigravity MCP Server khi mở lên.

---

## 4. Kiểm Tra Kết Nối

Chạy lệnh sau tại thư mục dự án:
```powershell
node test_client.js
```
Nếu thành công, script sẽ in thông tin model và tự động vẽ một khối hộp chữ nhật mẫu (1000x1000x500mm) vào viewport của SketchUp 2025.

---

## 5. Danh Sách Công Cụ AI Cung Cấp Cho Antigravity

| Tên Tool | Chức năng | Tham số chính |
| :--- | :--- | :--- |
| `sketchup_get_status` | Kiểm tra trạng thái SketchUp, version, model đang mở | Không có |
| `sketchup_execute_ruby` | Chạy trực tiếp mã Ruby trên Main UI Thread | `code` (string) |
| `sketchup_draw_geometry` | Dựng hình 3D tham số hóa (box, cylinder, column, wall, floor) | `type`, `width`, `height`, `x`, `y`, `z`,... |
| `sketchup_get_selection` | Lấy chi tiết các đối tượng người dùng đang chọn | Không có |
| `sketchup_get_scene_summary` | Xem tổng thể layers, materials, scenes, entity count | Không có |
| `sketchup_camera_control` | Điều khiển camera (zoom extents, top, front, iso) | `action` ('zoom_extents', 'top',...) |
| `sketchup_apply_material` | Gán màu/vật liệu cho đối tượng | `name`, `color` |
| `sketchup_clear_model` | Xóa mô hình hoặc xóa vùng chọn | `selection_only` (boolean) |

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

- Móng hàng rào mặt tiền: Kích thước $1200\times 250\times 400\text{ mm}$, cao độ $Z \in [500, 900]\text{ mm}$.
- Móng hàng rào các cạnh sau: Kích thước $1200\times 250\times 300\text{ mm}$, cao độ $Z \in [600, 900]\text{ mm}$.
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

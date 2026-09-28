import os
from PIL import Image

p_bsq = r"C:\Users\MAI KHANH\.gemini\antigravity-ide\brain\0225c4eb-2395-424b-85f4-6898a627de73\.user_uploaded\media_1790609003758.png"
p_nov = r"C:\Users\MAI KHANH\.gemini\antigravity-ide\brain\0225c4eb-2395-424b-85f4-6898a627de73\.user_uploaded\media_1790609023189.png"

out_dir = r"c:\Users\MAI KHANH\source\repos\namanarchi\SketchupMCP\textures"
os.makedirs(out_dir, exist_ok=True)

NAVY_COLOR = (18, 42, 85, 255) # Màu xanh Navy sẫm đồng bộ với cánh cổng dự án

# --- 1. XỬ LÝ BSQUARE ---
img_b = Image.open(p_bsq).convert("RGBA")
pixels_b = img_b.load()
w_b, h_b = img_b.size

img_b_trans = Image.new("RGBA", (w_b, h_b), (0, 0, 0, 0))
img_b_navy = Image.new("RGBA", (w_b, h_b), NAVY_COLOR)

pix_b_trans = img_b_trans.load()
pix_b_navy = img_b_navy.load()

for y in range(h_b):
    for x in range(w_b):
        r, g, b, a = pixels_b[x, y]
        # Kiểm tra màu nền vàng đất
        dr = abs(r - 208)
        dg = abs(g - 161)
        db = abs(b - 73)
        if dr < 30 and dg < 30 and db < 30:
            # Nền vàng -> trong suốt hoặc biến thành màu Navy của cổng
            pix_b_trans[x, y] = (0, 0, 0, 0)
            pix_b_navy[x, y] = NAVY_COLOR
        else:
            # Nếu là chữ đen SQUARE, chuyển thành màu trắng tinh để hiển thị đẹp trên nền Navy
            if r < 80 and g < 80 and b < 80:
                pix_b_trans[x, y] = (255, 255, 255, 255)
                pix_b_navy[x, y] = (255, 255, 255, 255)
            else:
                pix_b_trans[x, y] = (r, g, b, a)
                pix_b_navy[x, y] = (r, g, b, a)

img_b_trans.save(os.path.join(out_dir, "logo_bsquare_transparent.png"), "PNG")
img_b_navy.save(os.path.join(out_dir, "logo_bsquare_navy.png"), "PNG")

# --- 2. XỬ LÝ NOVALAND ---
img_n = Image.open(p_nov).convert("RGBA")
pixels_n = img_n.load()
w_n, h_n = img_n.size

img_n_trans = Image.new("RGBA", (w_n, h_n), (0, 0, 0, 0))
img_n_navy = Image.new("RGBA", (w_n, h_n), NAVY_COLOR)

pix_n_trans = img_n_trans.load()
pix_n_navy = img_n_navy.load()

for y in range(h_n):
    for x in range(w_n):
        r, g, b, a = pixels_n[x, y]
        # Kiểm tra màu nền trắng
        if r > 235 and g > 235 and b > 235:
            pix_n_trans[x, y] = (0, 0, 0, 0)
            pix_n_navy[x, y] = NAVY_COLOR
        else:
            # Chữ NOVA màu xanh sẫm -> chuyển thành trắng để nổi trên nền Navy sẫm
            if r < 70 and g < 90 and b > 90:
                pix_n_trans[x, y] = (255, 255, 255, 255)
                pix_n_navy[x, y] = (255, 255, 255, 255)
            # Slogan dưới
            elif r < 100 and g < 100 and b < 100:
                pix_n_trans[x, y] = (255, 255, 255, 255)
                pix_n_navy[x, y] = (255, 255, 255, 255)
            else:
                pix_n_trans[x, y] = (r, g, b, a)
                pix_n_navy[x, y] = (r, g, b, a)

img_n_trans.save(os.path.join(out_dir, "logo_novaland_transparent.png"), "PNG")
img_n_navy.save(os.path.join(out_dir, "logo_novaland_navy.png"), "PNG")

print("Generated both transparent and navy-matched logos successfully!")

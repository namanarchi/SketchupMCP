const fs = require('fs');
const path = 'c:/Users/MAI KHANH/source/repos/namanarchi/SketchupMCP/.agents/skills/sketchup-architect/SKILL.md';
let content = fs.readFileSync(path, 'utf8').trim();

const extra = `

---

### Quy Chuẩn Kỹ Thuật Bổ Sung Về Mái Thép & Xà Gồ Kho Bãi (Architectural Roofing Discipline)

9. **Tấm Úp Nóc Bắt Buộc Bẻ Góc Theo Mái Dốc**:
   - Nghiêm cấm dùng tấm phẳng nằm ngang. Tấm úp nóc (Ridge Cap) bắt buộc bẻ gập chữ V úp ngược ôm sát theo độ dốc mái của từng phân đoạn:
     - Nhánh ngang: Bẻ nghiêng dốc Nam-Bắc $\\alpha = 7.62^\\circ$ (mép ngoài hạ $26.75\\text{ mm}$).
     - Nhánh dọc: Bẻ nghiêng dốc Tây-Đông $\\beta = 10.11^\\circ$ (mép ngoài hạ $35.67\\text{ mm}$).
     - Độ rộng cánh mỗi bên $200\\text{ mm}$, bề dày tôn dập $1.5 - 2.0\\text{ mm}$.

10. **Xà Gồ Thép Chữ C Mạ Kẽm Rỗng Thật (True C-Purlin Solid)**:
    - **Tuyệt đối cấm dùng thép hộp chữ nhật đặc thay thế cho thép chữ C**.
    - Xà gồ $C100\\times 50\\times 15\\times 1.2\\text{ mm}$ phải được tạo từ tiết diện 12 đỉnh khép kín có mép nẹp gấp $15\\text{ mm}$, cánh $50\\text{ mm}$, bụng $100\\text{ mm}$ và bề dày thành thép $1.2\\text{ mm}$.
    - Đảm bảo tính chất Solid Manifold (\`group.manifold? == true\`), rỗng ruột đúng sản phẩm thực tế.

11. **Kết Cấu Xà Gồ & Kèo Xiên Đoạn Bẻ Góc Giao Mái Chữ L**:
    - Bắt buộc có **Thanh kèo sống nghiêng (Hip Rafter $\\Box 60\\times 120\\text{ mm}$)** và **Thanh kèo xối âm (Valley Rafter $\\Box 60\\times 120\\text{ mm}$)** trong cụm \`Keo_Khung_Giao_Chu_L\`.
    - Toàn bộ các đường xà gồ từ 2 nhánh mái phải vươn tiếp vào vùng giao chữ L, vát góc (Jack Purlins) tựa chắc chắn lên thanh kèo sống nghiêng và xối âm.
    - Đỡ trọn vẹn $100\\%$ diện tích mái tôn góc giao, cấm bỏ trống.
`;

fs.writeFileSync(path, content + extra + '\n', 'utf8');
console.log('Updated SKILL.md successfully');

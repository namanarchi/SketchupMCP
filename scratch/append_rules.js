const fs = require('fs');
const path = 'c:/Users/MAI KHANH/source/repos/namanarchi/SketchupMCP/AGENTS.md';
let content = fs.readFileSync(path, 'utf8').trim();

const extra = `

### Nhóm 35: Quy Chuẩn Tấm Úp Nóc Bẻ Góc Theo Mái Dốc (Bent Ridge Cap Discipline)
* **Hiện tượng lỗi sai cơ bản**: Dựng tấm úp nóc (\`Up_Noc_Canh_Ngang\`, \`Up_Noc_Canh_Doc\`) là một thanh hộp chữ nhật nằm ngang phẳng lì, không bẻ góc dốc theo mái, tạo khe hở tam giác lớn hai bên hoặc chém xuyên vào đỉnh tôn mái.
* **Quy chuẩn bắt buộc khắc phục**:
  - Tấm úp nóc (Ridge Cap) **BẮT BUỘC phải là dạng chữ V úp ngược bẻ gập theo đúng góc dốc thực tế** của từng mái:
    - Đường gập đỉnh nóc nằm chính xác tại tim nóc ($Y = 107007\\text{ mm}$ cho nhánh ngang, $X = 7220\\text{ mm}$ cho nhánh dọc).
    - Hai cánh bẻ nghiêng chúc xuống theo góc dốc mái ($\\alpha = 7.62^\\circ$, $\\Delta Z = -26.75\\text{ mm}$ cho mái Nam-Bắc; $\\beta = 10.11^\\circ$, $\\Delta Z = -35.67\\text{ mm}$ cho mái Tây-Đông).
    - Độ rộng mỗi cánh $200\\text{ mm}$ (tổng bề rộng dải úp nóc $400\\text{ mm}$), bề dày tôn dập $1.5 - 2.0\\text{ mm}$.
  - Tấm úp nóc ôm sát khít lấy mặt trên của tấm tôn lợp hai bên sườn mái.

### Nhóm 36: Quy Chuẩn Thép Chữ C Mạ Kẽm Rỗng Thật (True Cold-Formed C-Purlin Solid Discipline)
* **Hiện tượng lỗi sai**: Sử dụng khối hộp chữ nhật đặc (thép hộp $100\\times 50$) để làm đại diện thay thế cho thép chữ C mạ kẽm.
* **Quy chuẩn bắt buộc**:
  - **Nghiêm cấm dùng thép hộp thay thế thép chữ C**.
  - Tiết diện xà gồ mạ kẽm $C100\\times 50\\times 15\\times 1.2\\text{ mm}$ phải được dựng đúng 12 đỉnh mặt cắt thép hình dập nguội:
    - Bụng $H = 100\\text{ mm}$, cánh trên/dưới $B = 50\\text{ mm}$, mép gấp nẹp gia cường $C = 15\\text{ mm}$.
    - Bề dày thành thép mỏng $t = 1.2\\text{ mm}$ chạy đều khép kín.
    - Đảm bảo tính chất Solid Manifold (\`group.manifold? == true\`), rỗng ruột đúng $100\\%$ thực tế sản phẩm công nghiệp.
  - Lưng bụng xà gồ tựa lên cánh trên vì kèo, cánh mở hướng lên phía đỉnh nóc để tạo mặt tựa phẳng và không đọng nước.

### Nhóm 37: Quy Chuẩn Kết Cấu Xà Gồ & Kèo Góc Giao Mái Chữ L (L-Junction Jack Purlins & Hip/Valley Framing Standard)
* **Hiện tượng lỗi sai cơ bản**: Bỏ trống xà gồ ở góc giao chữ L, chỉ dựng xà gồ ở các khoang nhịp thẳng chính khiến toàn bộ phần mái giao (sống nghiêng Hip và xối âm Valley) bị treo lơ lửng không có kết cấu đỡ bên dưới.
* **Quy chuẩn bắt buộc khắc phục**:
  1. **Khung Kèo Góc Giao L (\`Keo_Khung_Giao_Chu_L\`)**:
     - Bắt buộc có **Thanh kèo sống nghiêng (Hip Rafter $\\Box 60\\times 120\\times 2.0\\text{ mm}$)** nối chéo từ góc ngoài chân mái $(4220, 103007, 3715)$ lên đỉnh nóc giao $(7220, 107007, 4250)$.
     - Bắt buộc có **Thanh kèo xối âm (Valley Rafter $\\Box 60\\times 120\\times 2.0\\text{ mm}$)** nối chéo từ góc trong chân mái $(10220, 111007, 3715)$ lên đỉnh nóc giao $(7220, 107007, 4250)$.
  2. **Hệ Xà Gồ Vát Góc (Jack Purlins)**:
     - Toàn bộ các đường xà gồ từ nhánh ngang và nhánh dọc phải chạy liên tục vào vùng góc giao chữ L, vát góc chéo (miter cut) tựa khít lên thanh kèo sống nghiêng và thanh kèo xối âm.
     - Đỡ trọn vẹn $100\\%$ diện tích tôn mái góc giao chữ L (\`Mai_Giao_Song_Xien_Nam\`, \`Mai_Giao_Song_Xien_Tay\`, \`Mai_Giao_Xoi_Am_1\`, \`Mai_Giao_Xoi_Am_2\`).
     - Tuyệt đối không để trống bất kỳ vị trí nhịp xà gồ nào tại các góc bẻ mái.
`;

fs.writeFileSync(path, content + extra + '\n', 'utf8');
console.log('Updated AGENTS.md successfully');

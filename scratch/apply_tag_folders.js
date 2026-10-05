const http = require("http");
const fs = require("fs");

function postRuby(code) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ code });
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 9876,
        path: "/execute",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ raw: body });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log("Organizing Tag Folders and Parent-Child hierarchy...");

  const ruby = `
    model = Sketchup.active_model
    layers = model.layers
    model.start_operation("Organize Tag Folders Hierarchy", true)

    # 1. Map existing folders
    existing_folders = {}
    layers.folders.each do |f|
      existing_folders[f.name] = f
    end

    # Helper to find or create root folder
    def get_or_create_folder(layers, folder_name)
      f = layers.folders.find { |k| k.name == folder_name }
      unless f
        f = layers.add_folder(folder_name)
      end
      f
    end

    # Define target folder schema
    folder_schema = {
      "01. KHU VỆ SINH & NHÀ TẮM" => [
        "BSQ-NVS-TONG-THE",
        "BSQ-NVS-THIET-BI-SU",
        "BSQ-NVS-SEN-TAM",
        "BSQ-NVS-VACH-COMPACT",
        "BSQ-NVS-THOAT-NUOC",
        "BSQ-NVS-BE-TU-HOAI"
      ],
      "02. KHU KÝ TÚC XÁ" => [
        "BSQ-KTX-TONG-THE",
        "BSQ-KTX-CONTAINER-TANG-1",
        "BSQ-KTX-CONTAINER-TANG-2",
        "BSQ-KTX-GIUONG-TANG",
        "BSQ-KTX-CAU-THANG-LAN-CAN"
      ],
      "03. KHU CĂN TIN & NHÀ BẾP" => [
        "BSQ-CANTIN-TONG-THE",
        "BSQ-CANTIN-BAN-GHE-AN",
        "BSQ-CANTIN-BEP-NAU",
        "BSQ-CANTIN-KHO-THUC-PHAM"
      ],
      "04. KHU KHO VẬT TƯ TỔNG HỢP" => [
        "BSQ-KHO-BAI-TONG-THE",
        "BSQ-KHO-BAI-MONG-COC",
        "BSQ-KHO-BAI-COT-THEP",
        "BSQ-KHO-BAI-KHUNG-VI-KEO",
        "BSQ-KHO-BAI-XA-GO-MAI",
        "BSQ-KHO-BAI-MAI-TON",
        "BSQ-KHO-BAI-VACH-TON",
        "BSQ-KHO-BAI-GIANG-VACH",
        "BSQ-KHO-BAI-SAN-BE-TONG",
        "BSQ-KHO-BAI-THIET-BI-MAY-MOC",
        "BSQ-KHO-BAI-PHE-LIEU-COPPHA"
      ],
      "05. KHU GIA CÔNG CƠ KHÍ 36X8M" => [
        "BSQ-GIA-CONG-COT-THEP",
        "BSQ-GIA-CONG-KHUNG-VI-KEO",
        "BSQ-GIA-CONG-XA-GO-MAI",
        "BSQ-GIA-CONG-MAI-TON",
        "BSQ-GIA-CONG-VACH-TON",
        "BSQ-GIA-CONG-GIANG-VACH",
        "BSQ-KHO-BAI-MAY-MOC-THEP",
        "BSQ-KHO-BAI-THEP-NGUYEN-LIEU",
        "BSQ-KHO-BAI-THEP-THANH-PHAM"
      ],
      "06. CỔNG CHÍNH & HÀNG RÀO" => [
        "BSQ-CONG-RAO-CONG-CHINH",
        "BSQ-CONG-RAO-HANG-RAO",
        "BSQ-CONG-RAO-BOT-BAO-VE"
      ],
      "07. VĂN PHÒNG KHO" => [
        "BSQ-VP-KHO-TONG-THE",
        "BSQ-VP-KHO-VO-CONTAINER",
        "BSQ-VP-KHO-CUA",
        "BSQ-VP-KHO-NOI-THAT"
      ],
      "08. HẠ TẦNG NỀN & BÃI XE" => [
        "BSQ-HT-NEN-BE-TONG",
        "BSQ-HT-NEN-DAT"
      ],
      "09. AN TOÀN & PCCC" => [
        "BSQ-AT-BARIE-CANH-BAO",
        "BSQ-AT-VACH-SON-LAN",
        "BSQ-AT-BIEN-BAO-PANO"
      ],
      "10. CẤU KIỆN CHUNG & KẾT CẤU" => [
        "BSQ-CHUNG-KHUNG-CONTAINER",
        "BSQ-CHUNG-SAN-CONTAINER",
        "BSQ-CHUNG-TRAN-CONTAINER",
        "BSQ-CHUNG-VACH-CONTAINER",
        "BSQ-CHUNG-CUA-DI-CUA-SO",
        "BSQ-CHUNG-KHUNG-VI-KEO",
        "BSQ-CHUNG-COT-THEP",
        "BSQ-CHUNG-MAI-TON",
        "BSQ-CHUNG-XA-GO-MAI"
      ],
      "11. BẢN VẼ KỸ THUẬT 2D" => [
        "BSQ-2D-CAD-DINH-VI",
        "BSQ-2D-MAT-CAT-SECTION"
      ]
    }

    # Rename old "04. KHU KHO & BÃI GIA CÔNG" if present
    old_f4 = layers.folders.find { |f| f.name =~ /04.*KHO.*GIA.*CONG/i }
    if old_f4
      old_f4.name = "04. KHU KHO VẬT TƯ TỔNG HỢP"
    end

    # Remove number prefixes from old folders 05-10 to rename cleanly
    layers.folders.each do |f|
      if f.name =~ /^05\./ && f.name =~ /CONG/i
        f.name = "06. CỔNG CHÍNH & HÀNG RÀO"
      elsif f.name =~ /^06\./ && f.name =~ /CHUNG/i
        f.name = "10. CẤU KIỆN CHUNG & KẾT CẤU"
      elsif f.name =~ /^07\./ && f.name =~ /HA.*TANG/i
        f.name = "08. HẠ TẦNG NỀN & BÃI XE"
      elsif f.name =~ /^08\./ && f.name =~ /AN.*TOAN/i
        f.name = "09. AN TOÀN & PCCC"
      elsif f.name =~ /^09\./ && f.name =~ /VAN.*PHONG/i
        f.name = "07. VĂN PHÒNG KHO"
      elsif f.name =~ /^10\./ && f.name =~ /2D/i
        f.name = "11. BẢN VẼ KỸ THUẬT 2D"
      end
    end

    # Organize all layers into target folders
    moved_layers = []
    folder_schema.each do |folder_name, layer_names|
      folder = get_or_create_folder(layers, folder_name)
      layer_names.each do |lname|
        layer = layers[lname]
        if layer
          folder.add_layer(layer)
          moved_layers << { layer: lname, folder: folder_name }
        end
      end
    end

    # Purge any empty folders if any
    layers.purge_unused_folders if layers.respond_to?(:purge_unused_folders)

    model.commit_operation
    Sketchup.active_model.save

    # Summary of folders after reorganization
    final_folders = layers.folders.map do |f|
      {
        folder: f.name,
        count: f.layers.count,
        layers: f.layers.map(&:name)
      }
    end

    unorganized_after = layers.reject { |l| l.name == "Layer0" || l.folder }.map(&:name)

    {
      success: true,
      total_folders: final_folders.size,
      folders: final_folders,
      unorganized_remaining: unorganized_after
    }.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  fs.writeFileSync("scratch/organized_tag_folders.json", JSON.stringify(data, null, 2));
  console.log("Organized successfully! Total folders:", data.total_folders);
  console.log("Unorganized tags remaining:", data.unorganized_remaining);
  data.folders.forEach(f => {
    console.log(`\n📁 ${f.folder} (${f.count} tags):`);
    f.layers.forEach(l => console.log(`   - ${l}`));
  });
}

main().catch(console.error);

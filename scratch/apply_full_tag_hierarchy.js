const http = require('http');

function executeRuby(rubyCode) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ code: rubyCode });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 9876,
      path: '/execute',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(postData, 'utf8')
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(postData, 'utf8');
    req.end();
  });
}

async function main() {
  console.log("=== BẮT ĐẦU PHÂN LOẠI TAG CHA CON & TÁCH TAG ĐỘC LẬP TỪNG KHU VỰC ===");

  const rubyScript = `
    model = Sketchup.active_model
    model.start_operation("Phan Loai Tag Cha Con & Tach Tag Doc Lap", true)
    
    report = {
      renamed_tags: [],
      created_tags: [],
      tagged_entities: [],
      folders_organized: {},
      errors: []
    }

    # 1. Hàm hỗ trợ lấy hoặc tạo layer
    get_or_create_layer = lambda do |name|
      l = model.layers[name]
      unless l
        l = model.layers.add(name)
        report[:created_tags] << name
      end
      l
    end

    # 2. Hàm đồng bộ Scene visibility từ một layer tham chiếu
    sync_scene_vis = lambda do |new_layer, ref_name|
      ref_l = model.layers[ref_name]
      return unless ref_l
      model.pages.each do |page|
        is_hidden = page.layers.include?(ref_l)
        page.set_visibility(new_layer, !is_hidden)
      end
    end

    # 3. Đổi tên các tag của Gia Công trước đây bị nhầm sang KHO-BAI
    rename_map = {
      "BSQ-KHO-BAI-THEP-NGUYEN-LIEU" => "BSQ-GIA-CONG-THEP-NGUYEN-LIEU",
      "BSQ-KHO-BAI-THEP-THANH-PHAM"  => "BSQ-GIA-CONG-THEP-THANH-PHAM",
      "BSQ-KHO-BAI-MAY-MOC-THEP"     => "BSQ-GIA-CONG-MAY-MOC-THEP"
    }

    rename_map.each do |old_name, new_name|
      l = model.layers[old_name]
      if l
        l.name = new_name
        report[:renamed_tags] << "#{old_name} -> #{new_name}"
      end
    end

    # 4. Khởi tạo các Tag Độc Lập mới & kế thừa Scene visibility
    new_tags_ref = {
      "BSQ-GIA-CONG-TONG-THE"    => "BSQ-KHO-BAI-TONG-THE",
      "BSQ-GIA-CONG-NEN-SAN"     => "BSQ-HT-NEN-BE-TONG",
      "BSQ-KTX-NEN-SAN"          => "BSQ-HT-NEN-BE-TONG",
      "BSQ-KTX-MAI-SANH"         => "BSQ-KTX-TONG-THE",
      "BSQ-NVS-NEN-SAN"          => "BSQ-HT-NEN-BE-TONG",
      "BSQ-NVS-CONTAINER-WC"     => "BSQ-NVS-TONG-THE",
      "BSQ-NVS-CONTAINER-TAM"    => "BSQ-NVS-TONG-THE",
      "BSQ-NVS-MAI-HIEN"         => "BSQ-NVS-TONG-THE",
      "BSQ-CANTIN-NEN-SAN"       => "BSQ-HT-NEN-BE-TONG",
      "BSQ-CANTIN-NHA-AN"        => "BSQ-CANTIN-TONG-THE",
      "BSQ-CANTIN-NHA-BEP"       => "BSQ-CANTIN-TONG-THE",
      "BSQ-CANTIN-KHO-THUC-PHAM" => "BSQ-CANTIN-TONG-THE",
      "BSQ-CANTIN-MAI-SANH"      => "BSQ-CANTIN-TONG-THE",
      "BSQ-CONG-RAO-TONG-THE"    => "BSQ-CONG-RAO-CONG-CHINH",
      "BSQ-HT-BAI-XE-CO-GIOI"    => "BSQ-HT-NEN-BE-TONG"
    }

    new_tags_ref.each do |tag_name, ref_name|
      layer = get_or_create_layer.call(tag_name)
      sync_scene_vis.call(layer, ref_name)
    end

    # Tinh chỉnh scene visibility đặc thù:
    # Với các scene riêng biệt từng khu vực (KTX-*, CTIN-*, etc.)
    model.pages.each do |page|
      # Nếu page ẩn KHO-BAI-TONG-THE (ví dụ KTX-MATDUNG, KTX-3D...) thì ẩn GIA-CONG-TONG-THE và các tag gia công
      if page.layers.include?(model.layers["BSQ-KHO-BAI-TONG-THE"])
        ["BSQ-GIA-CONG-TONG-THE", "BSQ-GIA-CONG-NEN-SAN", "BSQ-GIA-CONG-COT-THEP", "BSQ-GIA-CONG-KHUNG-VI-KEO", "BSQ-GIA-CONG-XA-GO-MAI", "BSQ-GIA-CONG-MAI-TON", "BSQ-GIA-CONG-VACH-TON", "BSQ-GIA-CONG-GIANG-VACH", "BSQ-GIA-CONG-THEP-NGUYEN-LIEU", "BSQ-GIA-CONG-THEP-THANH-PHAM", "BSQ-GIA-CONG-MAY-MOC-THEP"].each do |tname|
          l = model.layers[tname]
          page.set_visibility(l, false) if l
        end
      end
      # Nếu page ẩn KTX-TONG-THE thì ẩn toàn bộ tag KTX
      if page.layers.include?(model.layers["BSQ-KTX-TONG-THE"])
        ["BSQ-KTX-NEN-SAN", "BSQ-KTX-MAI-SANH"].each do |tname|
          l = model.layers[tname]
          page.set_visibility(l, false) if l
        end
      end
      # Nếu page ẩn NVS-TONG-THE thì ẩn toàn bộ tag NVS
      if page.layers.include?(model.layers["BSQ-NVS-TONG-THE"])
        ["BSQ-NVS-NEN-SAN", "BSQ-NVS-CONTAINER-WC", "BSQ-NVS-CONTAINER-TAM", "BSQ-NVS-MAI-HIEN"].each do |tname|
          l = model.layers[tname]
          page.set_visibility(l, false) if l
        end
      end
      # Nếu page ẩn CANTIN-TONG-THE thì ẩn toàn bộ tag CANTIN
      if page.layers.include?(model.layers["BSQ-CANTIN-TONG-THE"])
        ["BSQ-CANTIN-NEN-SAN", "BSQ-CANTIN-NHA-AN", "BSQ-CANTIN-NHA-BEP", "BSQ-CANTIN-KHO-THUC-PHAM", "BSQ-CANTIN-MAI-SANH"].each do |tname|
          l = model.layers[tname]
          page.set_visibility(l, false) if l
        end
      end
    end

    # 5. Hàm gán tag cho đối tượng
    set_entity_tag = lambda do |ent, tag_name|
      return unless ent
      target_layer = model.layers[tag_name]
      if target_layer && ent.layer != target_layer
        ent.layer = target_layer
        ename = ent.name.empty? ? (ent.respond_to?(:definition) ? ent.definition.name : ent.class.to_s) : ent.name
        report[:tagged_entities] << "#{ename} -> #{tag_name}"
      end
    end

    # Hàm tìm kiếm thực thể theo tên trong một danh sách entities
    find_child = lambda do |ents, name|
      ents.find { |e| (e.name == name) || (e.respond_to?(:definition) && e.definition.name == name) }
    end

    # 6. GÁN TAG ĐỘC LẬP TỪNG KHU VỰC VÀ TỪNG CẤU KIỆN

    # --- A. KHU GIA CÔNG CƠ KHÍ 36X8M ---
    giacong_inst = find_child.call(model.entities, "KHU GIA CONG")
    if giacong_inst
      set_entity_tag.call(giacong_inst, "BSQ-GIA-CONG-TONG-THE")
      gc_ents = giacong_inst.definition.entities

      # Nền sàn bê tông gia công
      san_gc = find_child.call(gc_ents, "He_San_Be_Tong_Khu_Gia_Cong_Thep_Nha_Thau_B_70x8m")
      set_entity_tag.call(san_gc, "BSQ-GIA-CONG-NEN-SAN")

      # Hệ khung mái tôn 36x8m
      mai_gc = find_child.call(gc_ents, "He_Khung_Mai_Ton_Khu_Gia_Cong_Co_Khi_36x8m")
      if mai_gc
        set_entity_tag.call(mai_gc, "BSQ-GIA-CONG-TONG-THE")
        mai_gc.entities.each do |xuong|
          next unless xuong.is_a?(Sketchup::Group)
          set_entity_tag.call(xuong, "BSQ-GIA-CONG-TONG-THE")
          xuong.entities.each do |child|
            next unless child.is_a?(Sketchup::Group)
            if child.name =~ /^Khung_Truc_/
              set_entity_tag.call(child, "BSQ-GIA-CONG-KHUNG-VI-KEO")
            end
          end
        end
      end

      # Bãi vật tư gia công
      set_entity_tag.call(find_child.call(gc_ents, "Bai_Tap_Ket_Thep_Nguyen_Lieu_11.7m"), "BSQ-GIA-CONG-THEP-NGUYEN-LIEU")
      set_entity_tag.call(find_child.call(gc_ents, "Bai_Tap_Ket_Thep_Thanh_Pham_Da_Gia_Cong"), "BSQ-GIA-CONG-THEP-THANH-PHAM")
      set_entity_tag.call(find_child.call(gc_ents, "Cum_May_Moc_Gia_Cong_Thep"), "BSQ-GIA-CONG-MAY-MOC-THEP")
    end

    # --- B. KHO VẬT TƯ TỔNG HỢP & BÃI L-SHAPE ---
    kho_group = find_child.call(model.entities, "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE")
    if kho_group
      set_entity_tag.call(kho_group, "BSQ-KHO-BAI-TONG-THE")
      # Giằng vách con bên trong
      giang_group = find_child.call(kho_group.entities, "He_Giang_Ngang_Xa_Go_Vach_50x50")
      if giang_group
        set_entity_tag.call(giang_group, "BSQ-KHO-BAI-GIANG-VACH")
        giang_group.entities.each do |gchild|
          set_entity_tag.call(gchild, "BSQ-KHO-BAI-GIANG-VACH") if gchild.is_a?(Sketchup::Group)
        end
      end
    end

    # Cụm phế liệu
    phe_lieu = find_child.call(model.entities, "Khu_Vuc_Vat_Tu_Phe_Lieu")
    if phe_lieu
      set_entity_tag.call(phe_lieu, "BSQ-KHO-BAI-TONG-THE")
    end

    # --- C. KHU KÝ TÚC XÁ ---
    ktx_inst = find_child.call(model.entities, "KHU KTX")
    if ktx_inst
      set_entity_tag.call(ktx_inst, "BSQ-KTX-TONG-THE")
      ktx_ents = ktx_inst.definition.entities

      # Nền KTX
      set_entity_tag.call(find_child.call(ktx_ents, "NEN KTX"), "BSQ-KTX-NEN-SAN")

      # Mái sảnh hành lang tầng 2
      set_entity_tag.call(find_child.call(ktx_ents, "He_Mai_Sanh_Hanh_Lang_Tang_2"), "BSQ-KTX-MAI-SANH")

      # Dãy container tầng 1
      t1 = find_child.call(ktx_ents, "Day_Container_Tang_1_13_Can")
      if t1
        set_entity_tag.call(t1, "BSQ-KTX-CONTAINER-TANG-1")
        t1.entities.each do |c|
          set_entity_tag.call(c, "BSQ-KTX-CONTAINER-TANG-1") if c.is_a?(Sketchup::ComponentInstance) || c.is_a?(Sketchup::Group)
        end
      end

      # Dãy container tầng 2
      t2 = find_child.call(ktx_ents, "Day_Container_Tang_2_13_Can")
      if t2
        set_entity_tag.call(t2, "BSQ-KTX-CONTAINER-TANG-2")
        t2.entities.each do |c|
          set_entity_tag.call(c, "BSQ-KTX-CONTAINER-TANG-2") if c.is_a?(Sketchup::ComponentInstance) || c.is_a?(Sketchup::Group)
        end
      end
    end

    # Vách tường và cửa trong definition Container KTX
    def_ktx = model.definitions["Container_KTX_Cong_Nhan_3000x5900x2800"]
    if def_ktx
      vach_cua = find_child.call(def_ktx.entities, "He_Vach_Tuong_Va_Cua")
      set_entity_tag.call(vach_cua, "BSQ-CHUNG-VACH-CONTAINER") if vach_cua
    end

    # --- D. KHU VỆ SINH & NHÀ TẮM ---
    nvs_inst = find_child.call(model.entities, "KHU NVS")
    if nvs_inst
      set_entity_tag.call(nvs_inst, "BSQ-NVS-TONG-THE")
      nvs_ents = nvs_inst.definition.entities

      # Nền sàn
      set_entity_tag.call(find_child.call(nvs_ents, "Nen_BT100_Khu_WC_Tam_Nu"), "BSQ-NVS-NEN-SAN")
      set_entity_tag.call(find_child.call(nvs_ents, "Nen_BT100_Khu_WC_Tam_Nam"), "BSQ-NVS-NEN-SAN")

      # Cụm 12 Container
      c12_nvs = find_child.call(nvs_ents, "Khu_Nha_Ve_Sinh_Va_Nha_Tam_12_Container")
      if c12_nvs
        set_entity_tag.call(c12_nvs, "BSQ-NVS-TONG-THE")
        c12_nvs.entities.each do |cabin|
          next unless cabin.is_a?(Sketchup::ComponentInstance) || cabin.is_a?(Sketchup::Group)
          cname = cabin.name.empty? ? (cabin.respond_to?(:definition) ? cabin.definition.name : "") : cabin.name
          if cname =~ /Container_WC_/
            set_entity_tag.call(cabin, "BSQ-NVS-CONTAINER-WC")
          elsif cname =~ /Container_Nha_Tam_/
            set_entity_tag.call(cabin, "BSQ-NVS-CONTAINER-TAM")
          elsif cname =~ /He_Mai_Hien_Console_/
            set_entity_tag.call(cabin, "BSQ-NVS-MAI-HIEN")
            cabin.entities.each do |sanh|
              set_entity_tag.call(sanh, "BSQ-NVS-MAI-HIEN") if sanh.is_a?(Sketchup::Group)
            end
          end

          # Bên trong mỗi cabin: gán vách tường bao
          sub_ents = cabin.is_a?(Sketchup::Group) ? cabin.entities : cabin.definition.entities
          vach_bao = find_child.call(sub_ents, "He_Vach_Tuong_Bao")
          set_entity_tag.call(vach_bao, "BSQ-CHUNG-VACH-CONTAINER") if vach_bao
        end
      end
    end

    # --- E. KHU CĂN TIN & NHÀ BẾP ---
    cantin_inst = find_child.call(model.entities, "KHU CANTIN")
    if cantin_inst
      set_entity_tag.call(cantin_inst, "BSQ-CANTIN-TONG-THE")
      ct_ents = cantin_inst.definition.entities

      # Nền Căn tin
      set_entity_tag.call(find_child.call(ct_ents, "Nen Cantin 100m"), "BSQ-CANTIN-NEN-SAN")

      # Mái sảnh console
      set_entity_tag.call(find_child.call(ct_ents, "He_Mai_Sanh_Console_Nha_An_200CN"), "BSQ-CANTIN-MAI-SANH")
      set_entity_tag.call(find_child.call(ct_ents, "He_Mai_Sanh_Console_Nha_Bep_Va_Kho"), "BSQ-CANTIN-MAI-SANH")

      # Nhà ăn 200 chỗ
      nha_an = find_child.call(ct_ents, "Khu_Nha_An_GD1_200CN_12_Container")
      if nha_an
        set_entity_tag.call(nha_an, "BSQ-CANTIN-NHA-AN")
        nha_an.entities.each do |khoang|
          next unless khoang.is_a?(Sketchup::Group)
          if khoang.name =~ /^Container_Nha_An_/
            set_entity_tag.call(khoang, "BSQ-CANTIN-NHA-AN")
          end
        end
      end

      # Nhà bếp
      nha_bep = find_child.call(ct_ents, "Khu_Nha_Bep_4_Container")
      if nha_bep
        set_entity_tag.call(nha_bep, "BSQ-CANTIN-NHA-BEP")
        nha_bep.entities.each do |khoang|
          next unless khoang.is_a?(Sketchup::Group)
          if khoang.name =~ /^Container_Nha_Bep_/
            set_entity_tag.call(khoang, "BSQ-CANTIN-NHA-BEP")
          end
        end
      end

      # Nhà kho thực phẩm
      nha_kho = find_child.call(ct_ents, "Khu_Nha_Kho_2_Container")
      if nha_kho
        set_entity_tag.call(nha_kho, "BSQ-CANTIN-KHO-THUC-PHAM")
        nha_kho.entities.each do |khoang|
          next unless khoang.is_a?(Sketchup::Group)
          if khoang.name =~ /^Container_Nha_Kho_/
            set_entity_tag.call(khoang, "BSQ-CANTIN-KHO-THUC-PHAM")
          end
        end
      end
    end

    # --- F. CỔNG CHÍNH & HÀNG RÀO ---
    cong_he_thong = find_child.call(model.entities, "He_Thong_Cong_Chinh_6m_3_Vi_Tri")
    if cong_he_thong
      set_entity_tag.call(cong_he_thong, "BSQ-CONG-RAO-CONG-CHINH")
      cong_he_thong.entities.each do |c|
        set_entity_tag.call(c, "BSQ-CONG-RAO-CONG-CHINH") if c.is_a?(Sketchup::ComponentInstance) || c.is_a?(Sketchup::Group)
      end
    end

    # --- G. VĂN PHÒNG KHO ---
    vp_kho = find_child.call(model.entities, "Container_Van_Phong_Kho_3000x5900")
    if vp_kho
      set_entity_tag.call(vp_kho, "BSQ-VP-KHO-TONG-THE")
      vp_ents = vp_kho.is_a?(Sketchup::Group) ? vp_kho.entities : vp_kho.definition.entities
      vach_vp = find_child.call(vp_ents, "He_Vach_Tuong_Va_Cua")
      set_entity_tag.call(vach_vp, "BSQ-VP-KHO-CUA") if vach_vp
    end

    # --- H. BÃI ĐỔ XE CƠ GIỚI ---
    bai_xe = find_child.call(model.entities, "BÃI ĐỔ XE CƠ GIỚI")
    if bai_xe
      set_entity_tag.call(bai_xe, "BSQ-HT-BAI-XE-CO-GIOI")
      san_bx = find_child.call(bai_xe.entities, "He_San_Be_Tong_Bai_Xe_Co_Gioi_22x8m")
      set_entity_tag.call(san_bx, "BSQ-HT-BAI-XE-CO-GIOI") if san_bx
    end

    # 7. SẮP XẾP TOÀN BỘ CÁC TAG VÀO ĐÚNG 11 THƯ MỤC CHA - CON (TAG FOLDERS)
    folder_schema = {
      "01. KHU VỆ SINH & NHÀ TẮM" => [
        "BSQ-NVS-TONG-THE",
        "BSQ-NVS-NEN-SAN",
        "BSQ-NVS-CONTAINER-WC",
        "BSQ-NVS-CONTAINER-TAM",
        "BSQ-NVS-MAI-HIEN",
        "BSQ-NVS-VACH-COMPACT",
        "BSQ-NVS-THIET-BI-SU",
        "BSQ-NVS-SEN-TAM",
        "BSQ-NVS-THOAT-NUOC",
        "BSQ-NVS-BE-TU-HOAI"
      ],
      "02. KHU KÝ TÚC XÁ" => [
        "BSQ-KTX-TONG-THE",
        "BSQ-KTX-NEN-SAN",
        "BSQ-KTX-CONTAINER-TANG-1",
        "BSQ-KTX-CONTAINER-TANG-2",
        "BSQ-KTX-CAU-THANG-LAN-CAN",
        "BSQ-KTX-MAI-SANH",
        "BSQ-KTX-GIUONG-TANG"
      ],
      "03. KHU CĂN TIN & NHÀ BẾP" => [
        "BSQ-CANTIN-TONG-THE",
        "BSQ-CANTIN-NEN-SAN",
        "BSQ-CANTIN-NHA-AN",
        "BSQ-CANTIN-NHA-BEP",
        "BSQ-CANTIN-KHO-THUC-PHAM",
        "BSQ-CANTIN-MAI-SANH",
        "BSQ-CANTIN-BAN-GHE-AN",
        "BSQ-CANTIN-BEP-NAU"
      ],
      "04. KHU KHO VẬT TƯ TỔNG HỢP" => [
        "BSQ-KHO-BAI-TONG-THE",
        "BSQ-KHO-BAI-SAN-BE-TONG",
        "BSQ-KHO-BAI-MONG-COC",
        "BSQ-KHO-BAI-COT-THEP",
        "BSQ-KHO-BAI-KHUNG-VI-KEO",
        "BSQ-KHO-BAI-XA-GO-MAI",
        "BSQ-KHO-BAI-MAI-TON",
        "BSQ-KHO-BAI-VACH-TON",
        "BSQ-KHO-BAI-GIANG-VACH",
        "BSQ-KHO-BAI-THIET-BI-MAY-MOC",
        "BSQ-KHO-BAI-PHE-LIEU-COPPHA"
      ],
      "05. KHU GIA CÔNG CƠ KHÍ 36X8M" => [
        "BSQ-GIA-CONG-TONG-THE",
        "BSQ-GIA-CONG-NEN-SAN",
        "BSQ-GIA-CONG-COT-THEP",
        "BSQ-GIA-CONG-KHUNG-VI-KEO",
        "BSQ-GIA-CONG-XA-GO-MAI",
        "BSQ-GIA-CONG-MAI-TON",
        "BSQ-GIA-CONG-VACH-TON",
        "BSQ-GIA-CONG-GIANG-VACH",
        "BSQ-GIA-CONG-THEP-NGUYEN-LIEU",
        "BSQ-GIA-CONG-THEP-THANH-PHAM",
        "BSQ-GIA-CONG-MAY-MOC-THEP"
      ],
      "06. CỔNG CHÍNH & HÀNG RÀO" => [
        "BSQ-CONG-RAO-TONG-THE",
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
        "BSQ-HT-NEN-DAT",
        "BSQ-HT-NEN-BE-TONG",
        "BSQ-HT-BAI-XE-CO-GIOI"
      ],
      "09. AN TOÀN & PCCC" => [
        "BSQ-AT-BARIE-CANH-BAO",
        "BSQ-AT-VACH-SON-LAN",
        "BSQ-AT-BIEN-BAO-PANO"
      ],
      "10. CẤU KIỆN CHUNG & CONTAINER" => [
        "BSQ-CHUNG-KHUNG-CONTAINER",
        "BSQ-CHUNG-SAN-CONTAINER",
        "BSQ-CHUNG-TRAN-CONTAINER",
        "BSQ-CHUNG-VACH-CONTAINER",
        "BSQ-CHUNG-CUA-DI-CUA-SO",
        "BSQ-CHUNG-KHUNG-VI-KEO",
        "BSQ-CHUNG-COT-THEP",
        "BSQ-CHUNG-MAI-TON"
      ],
      "11. BẢN VẼ KỸ THUẬT 2D" => [
        "BSQ-2D-CAD-DINH-VI",
        "BSQ-2D-MAT-CAT-SECTION"
      ]
    }

    # Đảm bảo các folder tồn tại
    existing_folders = {}
    model.layers.folders.each { |f| existing_folders[f.name] = f }

    folder_schema.each do |fname, tag_list|
      folder = existing_folders[fname] || model.layers.add_folder(fname)
      existing_folders[fname] = folder

      added = []
      tag_list.each do |tname|
        l = model.layers[tname]
        if l
          folder.add_layer(l)
          added << tname
        end
      end
      report[:folders_organized][fname] = { count: added.count, tags: added }
    end

    # 8. Kiểm tra lại các layer còn sót ngoài thư mục
    all_organized = []
    model.layers.folders.each { |f| all_organized.concat(f.layers) }
    unorganized = model.layers.to_a.reject { |l| all_organized.include?(l) }.map(&:name)
    report[:unorganized_tags] = unorganized

    model.commit_operation
    Sketchup.active_model.save

    report.to_json
  `;

  console.log("Đang gửi lệnh thực thi đến SketchUp MCP Bridge...");
  const res = await executeRuby(rubyScript);
  console.log("Kết quả thực thi:");
  if (res.success) {
    try {
      const parsed = JSON.parse(res.result);
      console.log("- Đã đổi tên tags:", parsed.renamed_tags);
      console.log("- Đã tạo mới tags:", parsed.created_tags);
      console.log("- Đã gán tag cho đối tượng:", parsed.tagged_entities.length, "đối tượng");
      console.log("- Thống kê Thư mục Tag:");
      for (const [fname, info] of Object.entries(parsed.folders_organized)) {
        console.log(`  📁 [${fname}]: ${info.count} tags`);
      }
      console.log("- Tag chưa vào thư mục:", parsed.unorganized_tags);
    } catch (e) {
      console.log(res.result);
    }
  } else {
    console.error("LỖI:", res.error);
    console.error(res.backtrace);
  }
}

main().catch(console.error);

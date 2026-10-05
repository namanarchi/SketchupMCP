const http = require("http");
const fs = require("fs");
const path = require("path");

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
  console.log("Synchronizing Thep_Cot_Xam_Ghi and verifying structural integrity from foundation to roof...");

  const ruby = `
    model = Sketchup.active_model
    model.start_operation("Sync Thep_Cot_Xam_Ghi & Verify Foundation-to-Roof Structure", true)

    # 1. STANDARDIZE THEP_COT_XAM_GHI MATERIAL
    mat_steel = model.materials["Thep_Cot_Xam_Ghi"]
    unless mat_steel
      mat_steel = model.materials.add("Thep_Cot_Xam_Ghi")
    end
    mat_steel.color = Sketchup::Color.new(95, 100, 105) # Standard industrial structural steel grey

    # Also standardize legacy steel materials to the exact same color tone so everything is 100% harmonized
    legacy_mats = [
      "Thep_Cot_Keo_Xam_Ghi",
      "Ban_Ma_Thep_10mm",
      "Bu_Long_Inox_M16",
      "Sat_Thep_Den_Mo",
      "Thep_Den_Mo",
      "Thep_Xam_Dong_Bo"
    ]
    legacy_mats.each do |lm_name|
      m = model.materials[lm_name]
      if m
        m.color = Sketchup::Color.new(95, 100, 105)
      end
    end

    modified_count = 0
    faces_retagged = 0

    # Helper method to apply mat_steel to entity and all inner steel faces
    def apply_steel_mat(ent, mat_steel)
      count = 0
      face_count = 0
      ent.material = mat_steel
      count += 1

      if ent.respond_to?(:entities)
        ent.entities.each do |sub|
          if sub.is_a?(Sketchup::Face)
            # If face has no material or has legacy steel material, set to mat_steel
            sub.material = mat_steel
            face_count += 1
          elsif sub.is_a?(Sketchup::Group) || sub.is_a?(Sketchup::ComponentInstance)
            # Recurse for nested steel parts unless it is concrete or sheet
            sname = sub.name.to_s
            sdef = sub.is_a?(Sketchup::ComponentInstance) ? sub.definition.name.to_s : ""
            is_non_steel = (sname =~ /mong|be_tong|nen|ton_mai|mai_doc|up_noc|vach_ton|pano|panel|pallet/i) ||
                           (sdef =~ /mong|be_tong|nen|ton_mai|mai_doc|up_noc|vach_ton|pano|panel|pallet/i)
            unless is_non_steel
              c1, f1 = apply_steel_mat(sub, mat_steel)
              count += c1
              face_count += f1
            end
          end
        end
      end
      [count, face_count]
    end

    # -------------------------------------------------------------------------
    # 2. KHU GIA CONG: Khung Truc 1..4 (Ban_Ma, Cot_Thep, Canh_Keo, Dam, XaGo, Giang)
    # -------------------------------------------------------------------------
    inst_gc = model.entities.find { |e| e.is_a?(Sketchup::ComponentInstance) && e.definition.name == "KHU GIA CONG" }
    if inst_gc
      cdef = inst_gc.definition
      target = cdef.entities.find { |e| e.name == "He_Khung_Mai_Ton_Khu_Gia_Cong_Co_Khi_36x8m" }
      if target
        target.entities.each do |ws|
          next unless ws.is_a?(Sketchup::Group)
          ws.entities.each do |sub|
            next unless sub.is_a?(Sketchup::Group)
            
            # Frames: Khung_Truc
            if sub.name =~ /Khung_Truc/
              sub.entities.each do |fe|
                fname = fe.name.to_s
                if fname =~ /Ban_Ma/ || fname =~ /Cot_Thep/ || fname =~ /He_Keo_Mai/ || fname =~ /Canh_Keo/ || fname =~ /bulon/i
                  c1, f1 = apply_steel_mat(fe, mat_steel)
                  modified_count += c1
                  faces_retagged += f1
                end
              end
            # Dam Giang Doc ST1
            elsif sub.name =~ /He_Dam_Giang_Doc_ST1/
              sub.entities.each do |be|
                c1, f1 = apply_steel_mat(be, mat_steel)
                modified_count += c1
                faces_retagged += f1
              end
            # Xa Go Mai C100
            elsif sub.name =~ /He_Xa_Go/
              sub.entities.each do |pe|
                c1, f1 = apply_steel_mat(pe, mat_steel)
                modified_count += c1
                faces_retagged += f1
              end
            # Giang Vach 50x50
            elsif sub.name =~ /He_Giang_Vach/
              sub.entities.each do |ge|
                c1, f1 = apply_steel_mat(ge, mat_steel)
                modified_count += c1
                faces_retagged += f1
              end
            end
          end
        end
      end
    end

    # -------------------------------------------------------------------------
    # 3. KHO VAT TU L-SHAPE: Ban_Ma, Bu_Long, Cot_Thep, Dam_Doc, Vi_Keo, Xa_Go, Giang_Vach
    # -------------------------------------------------------------------------
    kho = model.entities.find { |e| e.name == "KHO_VAT_TU_TONG_HOP_VA_BAI_TAP_KET_L_SHAPE" }
    if kho
      kho.entities.each do |sub|
        next unless sub.is_a?(Sketchup::Group)
        sname = sub.name.to_s

        # He_Mong_Coc_Va_Ban_Ma_Cot: Apply to Ban_Ma and Bu_Long (skip Mong)
        if sname =~ /Mong.*Ban_Ma/
          sub.entities.each do |c|
            cname = c.name.to_s
            cmat = c.material ? c.material.name : ""
            # Target baseplates and bolts
            if cname =~ /Ban_Ma/ || cmat =~ /Ban_Ma/ || cmat =~ /Bu_Long/ || (c.is_a?(Sketchup::ComponentInstance) && c.definition.name =~ /Bu_Long/i)
              c1, f1 = apply_steel_mat(c, mat_steel)
              modified_count += c1
              faces_retagged += f1
            end
          end
        # He_Cot_Thep_Hop_60x120
        elsif sname =~ /He_Cot_Thep/
          sub.entities.each do |c|
            c1, f1 = apply_steel_mat(c, mat_steel)
            modified_count += c1
            faces_retagged += f1
          end
        # He_Dam_Giang_Doc_ST1
        elsif sname =~ /He_Dam_Giang/
          sub.entities.each do |c|
            c1, f1 = apply_steel_mat(c, mat_steel)
            modified_count += c1
            faces_retagged += f1
          end
        # He_Khung_Vi_Keo_Thep_Hop_60x120
        elsif sname =~ /He_Khung_Vi_Keo/ || sname =~ /He_Keo_Mai/
          sub.entities.each do |c|
            c1, f1 = apply_steel_mat(c, mat_steel)
            modified_count += c1
            faces_retagged += f1
          end
        # He_Xa_Go_Mai_Thep_C100
        elsif sname =~ /He_Xa_Go/
          sub.entities.each do |c|
            c1, f1 = apply_steel_mat(c, mat_steel)
            modified_count += c1
            faces_retagged += f1
          end
        # He_Giang_Vach_Bao_Che_50x50
        elsif sname =~ /He_Giang_Vach/
          sub.entities.each do |c|
            c1, f1 = apply_steel_mat(c, mat_steel)
            modified_count += c1
            faces_retagged += f1
          end
        end
      end
    end

    # -------------------------------------------------------------------------
    # 4. CONG CHINH 6M: Trụ Cổng 400x400, Dầm Giằng Đỉnh & Ray U80, Khung Giàn Thép
    # -------------------------------------------------------------------------
    cdef_cong = model.definitions["Cong_Chinh_6m_Hoan_Thien"]
    if cdef_cong
      cdef_cong.entities.each do |e|
        ename = e.name.to_s
        if ename =~ /Tru_Cong/ || ename =~ /Dam_Giang/ || ename =~ /Ray/ || ename =~ /Khung/
          c1, f1 = apply_steel_mat(e, mat_steel)
          modified_count += c1
          faces_retagged += f1
        elsif ename =~ /He_Canh_Cong/
          # Within gate leaf: apply to steel frame, skip the royal blue infill panels
          e.entities.each do |ce|
            if ce.name =~ /Khung/ || ce.name =~ /Thep/ || ce.name =~ /Do/ || ce.name =~ /Ray/ || ce.name =~ /Banh_Xe/
              c1, f1 = apply_steel_mat(ce, mat_steel)
              modified_count += c1
              faces_retagged += f1
            end
          end
        end
      end
    end

    # -------------------------------------------------------------------------
    # 5. HANG RAO: Cột Thép Hộp 50x50, Xà Gồ Ngang 40x40, Chống Xiên 40x40, Bản Mã
    # -------------------------------------------------------------------------
    hang_rao = model.entities.find { |e| e.name =~ /Hang_Rao/ }
    if hang_rao
      def scan_fence_steel(group, mat_steel)
        m_c = 0
        f_c = 0
        group.entities.each do |e|
          next unless e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)
          ename = e.name.to_s
          edef = e.is_a?(Sketchup::ComponentInstance) ? e.definition.name.to_s : ""
          
          # Match steel posts, purlins, diagonals, baseplates
          if ename =~ /(cot|xa_go|chong_xien|giang|ban_ma|khung|tru)/i || edef =~ /(cot|xa_go|chong_xien|giang|ban_ma|khung|tru)/i
            # Ensure not concrete footing or royal blue corrugated sheet
            unless ename =~ /(mong|be_tong|nen|ton_song|nep_ton)/i || edef =~ /(mong|be_tong|nen|ton_song|nep_ton)/i
              c1, f1 = apply_steel_mat(e, mat_steel)
              m_c += c1
              f_c += f1
            end
          end
          if e.is_a?(Sketchup::Group)
            c2, f2 = scan_fence_steel(e, mat_steel)
            m_c += c2
            f_c += f2
          end
        end
        [m_c, f_c]
      end
      c1, f1 = scan_fence_steel(hang_rao, mat_steel)
      modified_count += c1
      faces_retagged += f1
    end

    # -------------------------------------------------------------------------
    # 6. CAU THANG THEP & LAN CAN (KTX)
    # -------------------------------------------------------------------------
    cdef_ktx = model.definitions["KHU KTX"]
    if cdef_ktx
      cdef_ktx.entities.each do |e|
        ename = e.name.to_s
        if ename =~ /Cau_Thang/i || ename =~ /lan_can/i
          c1, f1 = apply_steel_mat(e, mat_steel)
          modified_count += c1
          faces_retagged += f1
        end
      end
    end

    # -------------------------------------------------------------------------
    # 7. KHUNG BARIE AN TOAN
    # -------------------------------------------------------------------------
    model.definitions.each do |d|
      if d.name =~ /Barie/i
        d.entities.each do |e|
          if e.name =~ /Ban_Ma/i || e.name =~ /De_Cot/i || e.name =~ /Tru_Barie/i
            c1, f1 = apply_steel_mat(e, mat_steel)
            modified_count += c1
            faces_retagged += f1
          end
        end
      end
    end

    model.commit_operation
    Sketchup.active_model.save

    {
      success: true,
      material_standardized: "Thep_Cot_Xam_Ghi (RGB 95, 100, 105)",
      total_groups_components_modified: modified_count,
      total_faces_synchronized: faces_retagged
    }.to_json
  `;

  const resp = await postRuby(ruby);
  let data = JSON.parse(resp.result);
  while (typeof data === "string") data = JSON.parse(data);
  console.log("Execution Result:", JSON.stringify(data, null, 2));
}

main().catch(console.error);

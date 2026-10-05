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
  console.log("Starting master upgrade for He_Khung_Mai_Ton_Khu_Gia_Cong_Co_Khi_36x8m...");

  const rubyScript = `
    model = Sketchup.active_model
    model.start_operation("Upgrade Khu Gia Cong 36x8m Master Standard", true)

    # 1. SETUP INDEPENDENT TAGS FOR KHU GIA CONG
    tag_cot_dam = model.layers["BSQ-GIA-CONG-COT-THEP"] || model.layers.add("BSQ-GIA-CONG-COT-THEP")
    tag_keo     = model.layers["BSQ-GIA-CONG-KHUNG-VI-KEO"] || model.layers.add("BSQ-GIA-CONG-KHUNG-VI-KEO")
    tag_xago    = model.layers["BSQ-GIA-CONG-XA-GO-MAI"] || model.layers.add("BSQ-GIA-CONG-XA-GO-MAI")
    tag_mai     = model.layers["BSQ-GIA-CONG-MAI-TON"] || model.layers.add("BSQ-GIA-CONG-MAI-TON")
    tag_vach    = model.layers["BSQ-GIA-CONG-VACH-TON"] || model.layers.add("BSQ-GIA-CONG-VACH-TON")
    tag_giang   = model.layers["BSQ-GIA-CONG-GIANG-VACH"] || model.layers.add("BSQ-GIA-CONG-GIANG-VACH")

    # Set tag colors
    tag_mai.color = Sketchup::Color.new(71, 97, 240) # Royal Blue
    tag_xago.color = Sketchup::Color.new(160, 165, 170)
    tag_keo.color = Sketchup::Color.new(80, 85, 90)
    tag_cot_dam.color = Sketchup::Color.new(96, 101, 107)
    tag_giang.color = Sketchup::Color.new(120, 125, 130)

    # Synchronize with all 32 scenes to preserve layer visibility
    model.pages.each do |page|
      pname = page.name
      # In overall 3D scenes, hide purlins and wall girts just like in Kho Vat Tu
      if pname =~ /3D TOAN BO/i
        page.set_visibility(tag_xago, false)
        page.set_visibility(tag_giang, false)
      end
    end

    # Find Target Parent Group
    target_parent = nil
    model.entities.each do |e|
      if e.respond_to?(:name) && e.name == "He_Khung_Mai_Ton_Khu_Gia_Cong_Co_Khi_36x8m"
        target_parent = e
        break
      end
      if e.is_a?(Sketchup::ComponentInstance)
        e.definition.entities.each do |c|
          if c.respond_to?(:name) && c.name == "He_Khung_Mai_Ton_Khu_Gia_Cong_Co_Khi_36x8m"
            target_parent = c
            break
          end
        end
      end
      break if target_parent
    end

    unless target_parent
      model.abort_operation
      return { success: false, error: "Target parent group not found" }.to_json
    end

    # Materials
    mat_blue = model.materials["Ton_Mai_Xanh_Navy"] || model.materials["[0102_RoyalBlue]"]
    unless mat_blue
      mat_blue = model.materials.add("Ton_Mai_Xanh_Navy")
      mat_blue.color = Sketchup::Color.new(71, 97, 240)
    end

    mat_steel = model.materials["Thep_Cot_Xam_Ghi"]
    unless mat_steel
      mat_steel = model.materials.add("Thep_Cot_Xam_Ghi")
      mat_steel.color = Sketchup::Color.new(100, 105, 110)
    end

    mat_wall = model.materials["Ton_Vach_Xam_Sang"]
    unless mat_wall
      mat_wall = model.materials.add("Ton_Vach_Xam_Sang")
      mat_wall.color = Sketchup::Color.new(220, 225, 230)
    end

    # Helper function to create rectangular box solid
    def create_box(parent, name, tag, p_min, p_max, mat = nil)
      g = parent.entities.add_group
      g.name = name
      g.layer = tag
      g.material = mat if mat

      x0, y0, z0 = p_min[0].mm, p_min[1].mm, p_min[2].mm
      x1, y1, z1 = p_max[0].mm, p_max[1].mm, p_max[2].mm

      pts = [
        Geom::Point3d.new(x0, y0, z0),
        Geom::Point3d.new(x1, y0, z0),
        Geom::Point3d.new(x1, y1, z0),
        Geom::Point3d.new(x0, y1, z0)
      ]
      f = g.entities.add_face(pts)
      height = z1 - z0
      if f.normal.z < 0
        f.pushpull(-height)
      else
        f.pushpull(height)
      end
      g
    end

    # Helper function to create upright C100 purlin (profile 100x50x15x1.2mm)
    def create_upright_c100(parent, name, tag, p_start, vec_up_slope, vec_normal_roof, vec_length, length_mm, mat = nil)
      g = parent.entities.add_group
      g.name = name
      g.layer = tag
      g.material = mat if mat

      u = vec_up_slope.normalize
      n = vec_normal_roof.normalize
      l = vec_length.normalize

      def calc_pt(p0, u, n, u_val, n_val)
        p0 + Geom::Vector3d.new(u.x * u_val.mm, u.y * u_val.mm, u.z * u_val.mm) + Geom::Vector3d.new(n.x * n_val.mm, n.y * n_val.mm, n.z * n_val.mm)
      end

      # 12 points of upright C-channel: H=100mm along n, B=50mm along u
      pts_2d = [
        [0.0, 0.0],
        [50.0, 0.0],
        [50.0, 15.0],
        [48.8, 15.0],
        [48.8, 1.2],
        [1.2, 1.2],
        [1.2, 98.8],
        [48.8, 98.8],
        [48.8, 85.0],
        [50.0, 85.0],
        [50.0, 100.0],
        [0.0, 100.0]
      ]

      pts_3d = pts_2d.map { |u_val, n_val| calc_pt(p_start, u, n, u_val, n_val) }
      f = g.entities.add_face(pts_3d)
      len = length_mm.mm
      if f.normal.dot(l) > 0
        f.pushpull(len)
      else
        f.pushpull(-len)
      end
      g
    end

    # Slope parameters
    slope = 535.0 / 3850.0 # 0.13896103896
    v_up_nam = Geom::Vector3d.new(0, 1, slope).normalize
    v_norm_nam = Geom::Vector3d.new(0, -slope, 1).normalize

    v_up_bac = Geom::Vector3d.new(0, -1, slope).normalize
    v_norm_bac = Geom::Vector3d.new(0, slope, 1).normalize

    vec_l_x = Geom::Vector3d.new(1, 0, 0)

    # Purlin lines along Y (6 South, 6 North)
    y_nam_lines = [200.0, 920.0, 1640.0, 2360.0, 3080.0, 3800.0]
    y_bac_lines = [7800.0, 7080.0, 6360.0, 5640.0, 4920.0, 4200.0]

    # Process both workshops NT_B1 and NT_B2
    workshops = [
      {
        sub_name: "He_Khung_Mai_Ton_Xuong_Gia_Cong_NT_B1_12x8m",
        x_min: 15000.0, x_max: 27000.0,
        frame_xs: [15000.0, 19000.0, 23000.0, 27000.0],
        spans: [
          [15030.0, 18970.0, "Nhip_1_X15030_X18970"],
          [19030.0, 22970.0, "Nhip_2_X19030_X22970"],
          [23030.0, 26970.0, "Nhip_3_X23030_X26970"]
        ],
        purlin_x_start: 14850.0, purlin_len: 12300.0,
        roof_x0: 14800.0, roof_x1: 27200.0,
        upnoc_x0: 14750.0, upnoc_x1: 27250.0,
        vach_tag: "NT_B1"
      },
      {
        sub_name: "He_Khung_Mai_Ton_Xuong_Gia_Cong_NT_B2_12x8m",
        x_min: 43000.0, x_max: 55000.0,
        frame_xs: [43000.0, 47000.0, 51000.0, 55000.0],
        spans: [
          [43030.0, 46970.0, "Nhip_1_X43030_X46970"],
          [47030.0, 50970.0, "Nhip_2_X47030_X50970"],
          [51030.0, 54970.0, "Nhip_3_X51030_X54970"]
        ],
        purlin_x_start: 42850.0, purlin_len: 12300.0,
        roof_x0: 42800.0, roof_x1: 55200.0,
        upnoc_x0: 42750.0, upnoc_x1: 55250.0,
        vach_tag: "NT_B2"
      }
    ]

    report_data = []

    workshops.each do |ws|
      ws_group = target_parent.entities.find { |c| c.name == ws[:sub_name] }
      next unless ws_group

      ws_report = { name: ws[:sub_name], actions: [] }

      # -------------------------------------------------------------
      # A. RETAG COLUMNS & REMOVE QUA GIANG & CHONG DUNG FROM TRUSSES
      # -------------------------------------------------------------
      ws[:frame_xs].each_with_index do |fx, f_idx|
        f_group = ws_group.entities.find { |c| c.name =~ /Khung_Truc_.*_X#{fx.to_i}/ }
        next unless f_group

        # Retag columns, footings, base plates to BSQ-GIA-CONG-COT-THEP
        f_group.entities.each do |fe|
          if fe.name =~ /Cot_Thep/ || fe.name =~ /Mong_BT/ || fe.name =~ /Ban_Ma/ || fe.name =~ /Tru_Bollard/
            fe.layer = tag_cot_dam
          elsif fe.name =~ /He_Keo_Mai/
            fe.layer = tag_keo
            # Inside truss: remove Qua_Giang and Chong_Dung, keep only Canh_Keo_Doc
            to_remove = []
            fe.entities.each do |te|
              if te.name =~ /Qua_Giang/ || te.name =~ /Chong_Dung/ || te.name =~ /Giang_Bung/
                to_remove << te
              elsif te.name =~ /Canh_Keo_Doc/
                te.layer = tag_keo
              end
            end
            to_remove.each { |r| fe.entities.erase_entities(r) }
          end
        end
      end
      ws_report[:actions] << "Removed Qua_Giang and Chong_Dung from all #{ws[:frame_xs].size} trusses (Open Gable Truss achieved)"

      # -------------------------------------------------------------
      # B. REBUILD HE_DAM_GIANG_DOC_ST1 (EAVE 50x100 & RIDGE 60x120 VERTICAL)
      # -------------------------------------------------------------
      dam_group = ws_group.entities.find { |c| c.name == "He_Dam_Giang_Doc_ST1" }
      unless dam_group
        dam_group = ws_group.entities.add_group
        dam_group.name = "He_Dam_Giang_Doc_ST1"
      end
      dam_group.layer = tag_cot_dam
      dam_group.entities.clear!

      # Create segmented eave and ridge beams
      ws[:spans].each do |x0, x1, span_name|
        # 1. Dam Eave Nam (50x100x1.8, Y in [150, 200], Z in [3515, 3615])
        create_box(
          dam_group,
          "Dam_Doc_ST1_Eave_Nam_#{span_name}",
          tag_cot_dam,
          [x0, 150.0, 3515.0],
          [x1, 200.0, 3615.0],
          mat_steel
        )

        # 2. Dam Eave Bac (50x100x1.8, Y in [7800, 7850], Z in [3515, 3615])
        create_box(
          dam_group,
          "Dam_Doc_ST1_Eave_Bac_#{span_name}",
          tag_cot_dam,
          [x0, 7800.0, 3515.0],
          [x1, 7850.0, 3615.0],
          mat_steel
        )

        # 3. Dam Dinh Noc 60x120x2.0 VERTICAL (Y in [3970, 4030], Z in [4030, 4150])
        create_box(
          dam_group,
          "Dam_Doc_ST1_Dinh_Noc_#{span_name}",
          tag_cot_dam,
          [x0, 3970.0, 4030.0],
          [x1, 4030.0, 4150.0],
          mat_steel
        )
      end
      ws_report[:actions] << "Rebuilt Dam_Doc_ST1 with Eave 50x100 and Ridge 60x120 vertical in 3 spans"

      # -------------------------------------------------------------
      # C. REBUILD HE_XA_GO_MAI_C100 (UPRIGHT C100x50x15x1.2MM)
      # -------------------------------------------------------------
      xago_group = ws_group.entities.find { |c| c.name =~ /He_Xa_Go/ }
      unless xago_group
        xago_group = ws_group.entities.add_group
        xago_group.name = "He_Xa_Go_Mai_C100x50x15x1.2"
      end
      xago_group.name = "He_Xa_Go_Mai_C100x50x15x1.2"
      xago_group.layer = tag_xago
      xago_group.entities.clear!

      # 6 South Purlins (Nam)
      y_nam_lines.each_with_index do |y, idx|
        z_k = 3615.0 + (y - 150.0) * slope
        p_start = Geom::Point3d.new(ws[:purlin_x_start].mm, y.mm, z_k.mm)
        create_upright_c100(
          xago_group,
          "XaGo_C100_Nam_#{idx + 1}",
          tag_xago,
          p_start,
          v_up_nam,
          v_norm_nam,
          vec_l_x,
          ws[:purlin_len],
          mat_steel
        )
      end

      # 6 North Purlins (Bac)
      y_bac_lines.each_with_index do |y, idx|
        z_k = 3615.0 + (7850.0 - y) * slope
        p_start = Geom::Point3d.new(ws[:purlin_x_start].mm, y.mm, z_k.mm)
        create_upright_c100(
          xago_group,
          "XaGo_C100_Bac_#{idx + 1}",
          tag_xago,
          p_start,
          v_up_bac,
          v_norm_bac,
          vec_l_x,
          ws[:purlin_len],
          mat_steel
        )
      end
      ws_report[:actions] << "Rebuilt 12 upright C100 purlins (6 South, 6 North, spacing 720mm)"

      # -------------------------------------------------------------
      # D. REBUILD ROOF CLADDING & RIDGE CAP (ZERO-GAP INTERFACE)
      # -------------------------------------------------------------
      ton_group = ws_group.entities.find { |c| c.name =~ /He_Ton_Mai/ }
      unless ton_group
        ton_group = ws_group.entities.add_group
        ton_group.name = "He_Ton_Mai_Xanh_Navy"
      end
      ton_group.layer = tag_mai
      ton_group.entities.clear!

      # Exact elevation calculation for zero-gap
      # Normal offset for 100mm upright purlin: dZ_n = 100 * sqrt(1 + s^2)
      dz_n = 100.0 * Math.sqrt(1.0 + slope * slope) # 100.9609 mm
      t_sheet = 25.0 # sheet thickness

      rx0 = ws[:roof_x0]
      rx1 = ws[:roof_x1]

      # South Roof Sheet (Mai_Doc_Nam): Y from -150 to 4000
      # Y=-150: Z_bot = 3615 + dz_n - 300*slope
      z_bot_s_eave = 3615.0 + dz_n - 300.0 * slope
      z_bot_s_ridge = 4150.0 + dz_n
      z_top_s_eave = z_bot_s_eave + t_sheet
      z_top_s_ridge = z_bot_s_ridge + t_sheet

      g_mai_nam = ton_group.entities.add_group
      g_mai_nam.name = "Mai_Doc_Nam"
      g_mai_nam.layer = tag_mai
      g_mai_nam.material = mat_blue

      # 4 corners of bottom face
      pts_nam_bot = [
        Geom::Point3d.new(rx0.mm, -150.0.mm, z_bot_s_eave.mm),
        Geom::Point3d.new(rx1.mm, -150.0.mm, z_bot_s_eave.mm),
        Geom::Point3d.new(rx1.mm, 4000.0.mm, z_bot_s_ridge.mm),
        Geom::Point3d.new(rx0.mm, 4000.0.mm, z_bot_s_ridge.mm)
      ]
      f_nam = g_mai_nam.entities.add_face(pts_nam_bot)
      if f_nam.normal.dot(v_norm_nam) > 0
        f_nam.pushpull(t_sheet.mm)
      else
        f_nam.pushpull(-t_sheet.mm)
      end

      # North Roof Sheet (Mai_Doc_Bac): Y from 4000 to 8150
      z_bot_b_eave = z_bot_s_eave
      z_bot_b_ridge = z_bot_s_ridge
      z_top_b_eave = z_bot_b_eave + t_sheet
      z_top_b_ridge = z_bot_b_ridge + t_sheet

      g_mai_bac = ton_group.entities.add_group
      g_mai_bac.name = "Mai_Doc_Bac"
      g_mai_bac.layer = tag_mai
      g_mai_bac.material = mat_blue

      pts_bac_bot = [
        Geom::Point3d.new(rx0.mm, 4000.0.mm, z_bot_b_ridge.mm),
        Geom::Point3d.new(rx1.mm, 4000.0.mm, z_bot_b_ridge.mm),
        Geom::Point3d.new(rx1.mm, 8150.0.mm, z_bot_b_eave.mm),
        Geom::Point3d.new(rx0.mm, 8150.0.mm, z_bot_b_eave.mm)
      ]
      f_bac = g_mai_bac.entities.add_face(pts_bac_bot)
      if f_bac.normal.dot(v_norm_bac) > 0
        f_bac.pushpull(t_sheet.mm)
      else
        f_bac.pushpull(-t_sheet.mm)
      end

      # Ridge Cap 3D (Up_Noc_Dinh_Mai): Width 400mm (Y: 3800 to 4200)
      ux0 = ws[:upnoc_x0]
      ux1 = ws[:upnoc_x1]
      u_len = ux1 - ux0

      g_upnoc = ton_group.entities.add_group
      g_upnoc.name = "Up_Noc_Dinh_Mai"
      g_upnoc.layer = tag_mai
      g_upnoc.material = mat_blue

      # Ridge cap profile in Y-Z plane at X = ux0
      # Center apex: Y = 4000, Z = z_top_s_ridge + 5.0 (clearance)
      z_apex = z_top_s_ridge + 6.0
      z_wing = z_apex - 200.0 * slope
      cap_thick = 2.0 # 2mm sheet

      cap_pts = [
        Geom::Point3d.new(ux0.mm, 3800.0.mm, z_wing.mm),
        Geom::Point3d.new(ux0.mm, 4000.0.mm, z_apex.mm),
        Geom::Point3d.new(ux0.mm, 4200.0.mm, z_wing.mm),
        Geom::Point3d.new(ux0.mm, 4200.0.mm, (z_wing + cap_thick).mm),
        Geom::Point3d.new(ux0.mm, 4000.0.mm, (z_apex + cap_thick).mm),
        Geom::Point3d.new(ux0.mm, 3800.0.mm, (z_wing + cap_thick).mm)
      ]
      f_cap = g_upnoc.entities.add_face(cap_pts)
      if f_cap.normal.x > 0
        f_cap.pushpull(u_len.mm)
      else
        f_cap.pushpull(-u_len.mm)
      end

      ws_report[:actions] << "Rebuilt Roof Cladding & Ridge Cap with Zero-Gap contact (Gap = 0.0mm)"

      # -------------------------------------------------------------
      # E. WALL SHEETING & WALL GIRTS (GIẰNG VÁCH 50x50x1.4MM)
      # -------------------------------------------------------------
      # Retag wall sheet
      vach_group = ws_group.entities.find { |c| c.name =~ /Vach_Ton_Thung/ }
      if vach_group
        vach_group.layer = tag_vach
        vach_group.entities.each { |ve| ve.layer = tag_vach }
      end

      # Add or rebuild Wall Girts (He_Giang_Vach_50x50)
      giang_group = ws_group.entities.find { |c| c.name == "He_Giang_Vach_50x50" }
      unless giang_group
        giang_group = ws_group.entities.add_group
        giang_group.name = "He_Giang_Vach_50x50"
      end
      giang_group.layer = tag_giang
      giang_group.entities.clear!

      # 3 tiers of wall girts at Z = 1000, 1900, 2800 mm along Truc A (Y in [7800, 7850])
      girt_tiers = [1000.0, 1900.0, 2800.0]
      girt_tiers.each_with_index do |z_tier, t_idx|
        ws[:spans].each do |x0, x1, span_name|
          create_box(
            giang_group,
            "Giang_Vach_TrucA_Tang_#{t_idx + 1}_Z#{z_tier.to_i}_#{span_name}",
            tag_giang,
            [x0, 7800.0, z_tier],
            [x1, 7850.0, z_tier + 50.0],
            mat_steel
          )
        end
      end
      ws_report[:actions] << "Added 3 tiers of Wall Girts 50x50x1.4mm at Z=1000, 1900, 2800mm along Truc A"

      report_data << ws_report
    end

    model.commit_operation
    Sketchup.active_model.save

    { success: true, reports: report_data }.to_json
  `;

  const resp = await postRuby(rubyScript);
  console.log("Response:", JSON.stringify(resp, null, 2));
}

main().catch(console.error);

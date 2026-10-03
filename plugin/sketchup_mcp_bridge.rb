# frozen_string_literal: true
# ==============================================================================
# Antigravity SketchUp 2025 Realtime MCP Bridge Plugin
# Hỗ trợ giao tiếp Real-time 2 chiều giữa SketchUp 2025 và Antigravity IDE qua HTTP/JSON-RPC
# ==============================================================================

require 'sketchup.rb'
require 'socket'
require 'json'
require 'stringio'

module AntigravitySketchUpBridge
  SERVER_PORT = 9876
  PLUGIN_VERSION = '1.0.0'

  @server = nil
  @server_thread = nil
  @timer_id = nil
  @request_queue = Queue.new
  @is_running = false

  class << self
    attr_reader :is_running

    def start_server
      return if @is_running

      begin
        @server = TCPServer.new('127.0.0.1', SERVER_PORT)
        @server.setsockopt(Socket::SOL_SOCKET, Socket::SO_REUSEADDR, true)
        @is_running = true
        puts "[AntigravityMCP] Server started listening on http://127.0.0.1:#{SERVER_PORT}"

        # 1. Background thread để nhận HTTP request và đưa vào hàng đợi
        @server_thread = Thread.new do
          while @is_running
            begin
              client = @server.accept
              handle_client_connection(client)
            rescue IOError, Errno::EBADF
              break
            rescue => e
              puts "[AntigravityMCP] Socket accept error: #{e.message}"
            end
          end
        end

        # 2. Main UI Thread Polling Timer (đảm bảo thực thi an toàn trên Main Thread của SketchUp)
        # Tần số 20ms (~50 FPS) cho phản hồi tức thì mà không tiêu tốn CPU
        @timer_id = UI.start_timer(0.02, true) do
          process_main_thread_queue
        end

        UI.set_toolbar_visible('Antigravity MCP', true) if defined?(UI.set_toolbar_visible)
      rescue => e
        @is_running = false
        puts "[AntigravityMCP] Failed to start server: #{e.message}"
        UI.messagebox("Lỗi khởi động Antigravity MCP Server: #{e.message}")
      end
    end

    def stop_server
      @is_running = false

      if @timer_id
        UI.stop_timer(@timer_id)
        @timer_id = nil
      end

      if @server
        @server.close rescue nil
        @server = nil
      end

      if @server_thread
        @server_thread.kill rescue nil
        @server_thread = nil
      end

      puts "[AntigravityMCP] Server stopped."
    end

    def restart_server
      stop_server
      sleep 0.1
      start_server
    end

    private

    # Đọc HTTP request từ client trong background thread và đưa vào queue
    def handle_client_connection(client)
      request_line = client.gets
      return client.close unless request_line

      method, path, _version = request_line.split(' ')
      headers = {}
      content_length = 0

      while (line = client.gets)
        break if line.strip.empty?
        key, value = line.split(':', 2)
        if key && value
          header_key = key.strip.downcase
          headers[header_key] = value.strip
          content_length = value.strip.to_i if header_key == 'content-length'
        end
      end

      body = ''
      if content_length > 0
        body = client.read(content_length)
      end

      # Đưa request và socket client vào queue để main thread xử lý
      @request_queue.push({
        client: client,
        method: method,
        path: path,
        headers: headers,
        body: body
      })
    end

    # Thực thi các request trong hàng đợi trên MAIN UI THREAD của SketchUp
    def process_main_thread_queue
      while !@request_queue.empty?
        req = @request_queue.pop(true) rescue nil
        next unless req

        client = req[:client]
        begin
          response_data = dispatch_request(req[:method], req[:path], req[:body])
          send_http_response(client, 200, response_data)
        rescue => e
          error_response = {
            success: false,
            error: e.message,
            backtrace: e.backtrace ? e.backtrace.first(5) : []
          }
          send_http_response(client, 500, error_response)
        ensure
          client.close rescue nil
        end
      end
    end

    # Phân phối và xử lý API endpoint
    def dispatch_request(method, path, body_str)
      payload = {}
      if body_str && !body_str.strip.empty?
        payload = JSON.parse(body_str) rescue {}
      end

      case path
      when '/', '/health', '/status'
        get_status_info

      when '/execute', '/api/execute'
        execute_ruby_code(payload['code'] || payload['ruby'])

      when '/api/geometry'
        create_geometry(payload)

      when '/api/selection'
        if method == 'GET'
          get_selection_info
        else
          set_selection(payload)
        end

      when '/api/scene'
        get_scene_summary

      when '/api/camera'
        control_camera(payload)

      when '/api/material'
        apply_material(payload)

      when '/api/clear'
        clear_model(payload)

      else
        { success: false, error: "Endpoint not found: #{path}" }
      end
    end

    # Endpoint: Lấy thông tin trạng thái SketchUp
    def get_status_info
      model = Sketchup.active_model
      return { success: true, status: 'idle', message: 'No active model' } unless model

      {
        success: true,
        status: 'ready',
        version: Sketchup.version,
        plugin_version: PLUGIN_VERSION,
        model_title: model.title.empty? ? 'Untitled' : model.title,
        model_path: model.path,
        entities_count: model.entities.count,
        definitions_count: model.definitions.count,
        layers_count: model.layers.count,
        materials_count: model.materials.count,
        selection_count: model.selection.count
      }
    end

    # Endpoint: Thực thi mã Ruby an toàn trong UI thread
    def execute_ruby_code(code)
      return { success: false, error: 'Empty code' } if code.nil? || code.strip.empty?

      model = Sketchup.active_model
      model.start_operation('Antigravity AI Ruby Execution', true) if model

      old_stdout = $stdout
      captured_stdout = StringIO.new
      $stdout = captured_stdout

      result = nil
      begin
        result = eval(code, TOPLEVEL_BINDING)
        model.commit_operation if model
        output = captured_stdout.string

        {
          success: true,
          result: result.inspect,
          output: output
        }
      rescue => e
        model.abort_operation if model
        {
          success: false,
          error: e.message,
          backtrace: e.backtrace ? e.backtrace.first(5) : [],
          output: captured_stdout.string
        }
      ensure
        $stdout = old_stdout
      end
    end

    # Endpoint: Dựng hình học tham số hóa (Box, Cylinder, Sphere, Wall, Column, Floor, Face)
    def create_geometry(params)
      model = Sketchup.active_model
      return { success: false, error: 'No active model' } unless model

      geom_type = (params['type'] || 'box').downcase
      name = params['name'] || "AI_#{geom_type.capitalize}"

      model.start_operation("AI Create #{geom_type.capitalize}", true)

      entities = model.active_entities
      group = entities.add_group
      group.name = name

      begin
        case geom_type
        when 'box'
          # Kích thước nhận mm, quy đổi sang chuẩn SketchUp (internal inches) bằng .mm
          w = (params['width'] || 1000).to_f.mm
          d = (params['depth'] || params['length'] || 1000).to_f.mm
          h = (params['height'] || 1000).to_f.mm
          x = (params['x'] || 0).to_f.mm
          y = (params['y'] || 0).to_f.mm
          z = (params['z'] || 0).to_f.mm

          pts = [
            Geom::Point3d.new(x, y, z),
            Geom::Point3d.new(x + w, y, z),
            Geom::Point3d.new(x + w, y + d, z),
            Geom::Point3d.new(x, y + d, z)
          ]
          face = group.entities.add_face(pts)
          face.pushpull(-h)

        when 'cylinder'
          r = (params['radius'] || 500).to_f.mm
          h = (params['height'] || 1000).to_f.mm
          x = (params['x'] || 0).to_f.mm
          y = (params['y'] || 0).to_f.mm
          z = (params['z'] || 0).to_f.mm
          num_segments = (params['segments'] || 24).to_i

          center = Geom::Point3d.new(x, y, z)
          normal = Geom::Vector3d.new(0, 0, 1)
          circle = group.entities.add_circle(center, normal, r, num_segments)
          face = group.entities.add_face(circle)
          face.pushpull(-h)

        when 'column'
          # Cột kiến trúc
          w = (params['width'] || 300).to_f.mm
          d = (params['depth'] || 300).to_f.mm
          h = (params['height'] || 3000).to_f.mm
          cx = (params['x'] || 0).to_f.mm
          cy = (params['y'] || 0).to_f.mm
          cz = (params['z'] || 0).to_f.mm

          pts = [
            Geom::Point3d.new(cx - w / 2, cy - d / 2, cz),
            Geom::Point3d.new(cx + w / 2, cy - d / 2, cz),
            Geom::Point3d.new(cx + w / 2, cy + d / 2, cz),
            Geom::Point3d.new(cx - w / 2, cy + d / 2, cz)
          ]
          face = group.entities.add_face(pts)
          face.pushpull(-h)

        when 'wall'
          # Tường thẳng theo 2 điểm [x1, y1] -> [x2, y2]
          start_pt = params['start'] || [0, 0]
          end_pt = params['end'] || [3000, 0]
          thickness = (params['thickness'] || 200).to_f.mm
          height = (params['height'] || 2800).to_f.mm
          z = (params['z'] || 0).to_f.mm

          p1 = Geom::Point3d.new(start_pt[0].to_f.mm, start_pt[1].to_f.mm, z)
          p2 = Geom::Point3d.new(end_pt[0].to_f.mm, end_pt[1].to_f.mm, z)

          vec = p2 - p1
          length = vec.length
          if length > 0
            perp = Geom::Vector3d.new(-vec.y, vec.x, 0).normalize
            perp.length = thickness / 2.0

            pts = [
              p1 - perp,
              p2 - perp,
              p2 + perp,
              p1 + perp
            ]
            face = group.entities.add_face(pts)
            face.pushpull(-height)
          end

        when 'floor'
          # Sàn theo danh sách tọa độ 2D
          points_data = params['points'] || [[0,0], [5000,0], [5000,5000], [0,5000]]
          thickness = (params['thickness'] || 150).to_f.mm
          z = (params['z'] || 0).to_f.mm

          pts = points_data.map { |pt| Geom::Point3d.new(pt[0].to_f.mm, pt[1].to_f.mm, z) }
          face = group.entities.add_face(pts)
          face.pushpull(-thickness) if thickness > 0

        else
          group.erase! rescue nil
          model.abort_operation
          return { success: false, error: "Unsupported geometry type: #{geom_type}" }
        end

        # Gán vật liệu nếu có
        if params['material']
          apply_material_to_entity(group, params['material'])
        end

        model.commit_operation
        {
          success: true,
          type: geom_type,
          group_name: group.name,
          entity_id: group.entityID
        }
      rescue => e
        group.erase! rescue nil
        model.abort_operation
        { success: false, error: e.message }
      end
    end

    # Endpoint: Lấy thông tin đối tượng đang được chọn
    def get_selection_info
      model = Sketchup.active_model
      return { success: false, error: 'No active model' } unless model

      selected_items = model.selection.map do |ent|
        bounds = ent.bounds
        {
          id: ent.entityID,
          type: ent.class.name.split('::').last,
          name: ent.respond_to?(:name) ? ent.name : '',
          layer: ent.layer ? ent.layer.name : 'Layer0',
          bounds: {
            width_mm: (bounds.width / 1.mm).round(1),
            depth_mm: (bounds.depth / 1.mm).round(1),
            height_mm: (bounds.height / 1.mm).round(1),
            center_mm: [
              (bounds.center.x / 1.mm).round(1),
              (bounds.center.y / 1.mm).round(1),
              (bounds.center.z / 1.mm).round(1)
            ]
          }
        }
      end

      {
        success: true,
        count: selected_items.size,
        selection: selected_items
      }
    end

    # Endpoint: Tổng quan scene (entities, layers, materials, scenes)
    def get_scene_summary
      model = Sketchup.active_model
      return { success: false, error: 'No active model' } unless model

      layers = model.layers.map { |l| { name: l.name, visible: l.visible? } }
      materials = model.materials.map { |m| { name: m.name, color: m.color.to_a.first(3) } }
      pages = model.pages.map { |p| { name: p.name } }

      {
        success: true,
        model_title: model.title.empty? ? 'Untitled' : model.title,
        entities_count: model.entities.count,
        definitions_count: model.definitions.count,
        layers: layers,
        materials: materials,
        scenes: pages
      }
    end

    # Endpoint: Điều khiển Camera
    def control_camera(params)
      model = Sketchup.active_model
      return { success: false, error: 'No active model' } unless model

      view = model.active_view
      camera = view.camera
      action = (params['action'] || 'zoom_extents').downcase

      case action
      when 'zoom_extents'
        view.zoom_extents
      when 'top'
        camera.set([0, 0, 1000.m], [0, 0, 0], [0, 1, 0])
        view.zoom_extents
      when 'front'
        camera.set([0, -1000.m, 0], [0, 0, 0], [0, 0, 1])
        view.zoom_extents
      when 'iso'
        camera.set([1000.m, -1000.m, 1000.m], [0, 0, 0], [0, 0, 1])
        view.zoom_extents
      end

      { success: true, action: action }
    end

    # Gán vật liệu
    def apply_material(params)
      model = Sketchup.active_model
      return { success: false, error: 'No active model' } unless model

      mat_name = params['name'] || 'AI_Material'
      color_hex = params['color'] # e.g. "#FF5500" or [R, G, B]

      model.start_operation('AI Apply Material', true)
      target_entities = model.selection.empty? ? model.entities : model.selection
      target_entities.each do |ent|
        apply_material_to_entity(ent, mat_name, color_hex)
      end
      model.commit_operation

      { success: true, applied_to_count: target_entities.count }
    end

    def apply_material_to_entity(entity, mat_name, color_val = nil)
      model = Sketchup.active_model
      mat = model.materials[mat_name] || model.materials.add(mat_name)
      if color_val
        mat.color = color_val
      end
      entity.material = mat if entity.respond_to?(:material=)
    end

    # Xóa mô hình
    def clear_model(params)
      model = Sketchup.active_model
      return { success: false, error: 'No active model' } unless model

      model.start_operation('AI Clear Model', true)
      if params['selection_only']
        model.selection.to_a.each { |e| e.erase! rescue nil }
      else
        model.entities.clear! rescue nil
      end
      model.commit_operation

      { success: true, cleared: true }
    end

    # Gửi HTTP Response chuẩn
    def send_http_response(client, status_code, data)
      body = data.to_json
      status_text = status_code == 200 ? 'OK' : 'Internal Server Error'

      response = "HTTP/1.1 #{status_code} #{status_text}\r\n" \
                 "Content-Type: application/json; charset=utf-8\r\n" \
                 "Content-Length: #{body.bytesize}\r\n" \
                 "Access-Control-Allow-Origin: *\r\n" \
                 "Connection: close\r\n\r\n" \
                 "#{body}"

      client.write(response) rescue nil
    end
  end
end

# Khởi tạo Menu trong SketchUp
unless file_loaded?(__FILE__)
  menu = UI.menu('Extensions').add_submenu('Antigravity MCP')
  menu.add_item('Start MCP Server') { AntigravitySketchUpBridge.start_server }
  menu.add_item('Stop MCP Server') { AntigravitySketchUpBridge.stop_server }
  menu.add_item('Restart MCP Server') { AntigravitySketchUpBridge.restart_server }
  menu.add_item('Server Status') do
    status = AntigravitySketchUpBridge.is_running ? 'Đang chạy (Port 9876)' : 'Đã dừng'
    UI.messagebox("Antigravity MCP Server: #{status}")
  end

  # Tự động bật server khi nạp plugin
  AntigravitySketchUpBridge.start_server

  file_loaded(__FILE__)
end

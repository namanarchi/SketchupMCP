# -*- coding: utf-8 -*-
"""
Bộ công cụ hình học và tạo cấu kiện BIM Revit chuẩn xác (BIM Builder)
Chuyển đổi kích thước milimét sang feet, tạo Level, Grid, Floor, Material, DirectShape
"""

import math
import clr
clr.AddReference('RevitAPI')
clr.AddReference('RevitAPIUI')
import Autodesk.Revit.DB as DB

FEET_PER_MM = 1.0 / 304.8


def mm_to_feet(mm):
    """Chuyển đổi milimét sang decimal feet của Revit API"""
    return float(mm) * FEET_PER_MM


def feet_to_mm(ft):
    """Chuyển đổi decimal feet sang milimét"""
    return float(ft) * 304.8


def xyz_mm(x, y, z=0.0):
    """Tạo đối tượng DB.XYZ từ tọa độ milimét"""
    return DB.XYZ(mm_to_feet(x), mm_to_feet(y), mm_to_feet(z))


def get_or_create_material(doc, name, rgb=(71, 97, 240), transparency=0, shininess=50):
    """
    Tìm hoặc tạo mới một Vật liệu (Material) trong Revit Document với mã màu RGB chuẩn
    """
    col = DB.FilteredElementCollector(doc).OfClass(DB.Material)
    for mat in col:
        if mat.Name == name:
            return mat

    # Tạo mới nếu chưa có
    mat_id = DB.Material.Create(doc, name)
    mat = doc.GetElement(mat_id)
    if mat:
        mat.Color = DB.Color(int(rgb[0]), int(rgb[1]), int(rgb[2]))
        mat.Transparency = int(transparency)
        mat.Shininess = int(shininess)
    return mat


def get_or_create_level(doc, name, elevation_mm):
    """
    Tìm hoặc tạo mới mốc cao độ (Level) với cao độ tính bằng milimét
    """
    col = DB.FilteredElementCollector(doc).OfClass(DB.Level)
    for lvl in col:
        if lvl.Name == name:
            return lvl

    elev_ft = mm_to_feet(elevation_mm)
    new_lvl = DB.Level.Create(doc, elev_ft)
    try:
        new_lvl.Name = name
    except Exception:
        pass
    return new_lvl


def create_grid(doc, name, start_xyz_mm, end_xyz_mm):
    """
    Tạo đường trục Grid trong Revit từ hai điểm [x1, y1] và [x2, y2] (mm)
    """
    p1 = xyz_mm(start_xyz_mm[0], start_xyz_mm[1], 0.0)
    p2 = xyz_mm(end_xyz_mm[0], end_xyz_mm[1], 0.0)
    line = DB.Line.CreateBound(p1, p2)
    grid = DB.Grid.Create(doc, line)
    if name:
        try:
            grid.Name = name
        except Exception:
            pass
    return grid


def create_floor_from_points(doc, level_name, points_mm, floor_type_name=None, structural=True):
    """
    Tạo sàn Native Floor từ đa giác chu vi khép kín [[x1, y1], [x2, y2], ...] (mm)
    """
    if len(points_mm) < 3:
        raise Exception("Đường bao sàn phải có ít nhất 3 điểm.")

    # Tìm Level
    level = None
    for lvl in DB.FilteredElementCollector(doc).OfClass(DB.Level):
        if lvl.Name == level_name:
            level = lvl
            break
    if not level:
        level = DB.FilteredElementCollector(doc).OfClass(DB.Level).FirstElement()

    # Tìm FloorType
    floor_type = None
    if floor_type_name:
        for ft in DB.FilteredElementCollector(doc).OfClass(DB.FloorType):
            if ft.Name == floor_type_name:
                floor_type = ft
                break
    if not floor_type:
        floor_type = doc.GetElement(doc.GetDefaultElementTypeId(DB.ElementTypeGroup.FloorType))

    # Tạo CurveLoop từ các điểm
    curve_loop = DB.CurveLoop()
    n = len(points_mm)
    for i in range(n):
        p1 = xyz_mm(points_mm[i][0], points_mm[i][1], 0.0)
        p2 = xyz_mm(points_mm[(i + 1) % n][0], points_mm[(i + 1) % n][1], 0.0)
        line = DB.Line.CreateBound(p1, p2)
        curve_loop.Append(line)

    curve_loops = [curve_loop]

    # Kiểm tra phương thức tạo sàn theo phiên bản Revit (Revit 2020: Floor.Create hoặc doc.Create.NewFloor)
    try:
        # Revit 2022+ Floor.Create
        floor = DB.Floor.Create(doc, curve_loops, floor_type.Id, level.Id)
    except Exception:
        # Revit 2020 / 2021 NewFloor
        curve_array = DB.CurveArray()
        for c in curve_loop:
            curve_array.Append(c)
        floor = doc.Create.NewFloor(curve_array, floor_type, level, structural)

    return floor


def create_direct_shape_box(doc, name, min_xyz_mm, max_xyz_mm, category=DB.BuiltInCategory.OST_GenericModel, material_id=None):
    """
    Tạo khối hình học DirectShape (Solid Hộp) chính xác từ Bounding Box (mm)
    """
    p_min = xyz_mm(min_xyz_mm[0], min_xyz_mm[1], min_xyz_mm[2])
    p_max = xyz_mm(max_xyz_mm[0], max_xyz_mm[1], max_xyz_mm[2])

    dx = p_max.X - p_min.X
    dy = p_max.Y - p_min.Y
    dz = p_max.Z - p_min.Z

    if dx <= 0 or dy <= 0 or dz <= 0:
        raise Exception("Kích thước hình hộp không hợp lệ.")

    # Tạo profile đáy hình chữ nhật
    loop = DB.CurveLoop()
    p0 = p_min
    p1 = DB.XYZ(p_min.X + dx, p_min.Y, p_min.Z)
    p2 = DB.XYZ(p_min.X + dx, p_min.Y + dy, p_min.Z)
    p3 = DB.XYZ(p_min.X, p_min.Y + dy, p_min.Z)

    loop.Append(DB.Line.CreateBound(p0, p1))
    loop.Append(DB.Line.CreateBound(p1, p2))
    loop.Append(DB.Line.CreateBound(p2, p3))
    loop.Append(DB.Line.CreateBound(p3, p0))

    loops = [loop]
    solid = DB.GeometryCreationUtilities.CreateExtrusionGeometry(loops, DB.XYZ.BasisZ, dz)

    ds = DB.DirectShape.CreateElement(doc, DB.ElementId(category))
    ds.ApplicationId = "AntigravityMCP"
    ds.ApplicationDataId = name
    ds.SetShape([solid])
    if name:
        try:
            ds.Name = name
        except Exception:
            pass

    return ds


def get_document_summary(doc, uiapp):
    """
    Lấy thông tin tổng quan của Revit Document
    """
    if not doc:
        return {
            "status": "ready",
            "document_open": False,
            "message": "Chưa có dự án Revit nào đang mở."
        }

    levels = []
    for lvl in DB.FilteredElementCollector(doc).OfClass(DB.Level):
        levels.append({
            "id": lvl.Id.IntegerValue,
            "name": lvl.Name,
            "elevation_mm": round(feet_to_mm(lvl.Elevation), 1)
        })
    levels.sort(key=lambda x: x["elevation_mm"])

    materials = []
    for mat in DB.FilteredElementCollector(doc).OfClass(DB.Material):
        materials.append(mat.Name)

    return {
        "status": "ready",
        "document_open": True,
        "title": doc.Title,
        "path": doc.PathName,
        "active_view": doc.ActiveView.Name if doc.ActiveView else None,
        "view_type": str(doc.ActiveView.ViewType) if doc.ActiveView else None,
        "revit_version": uiapp.Application.VersionNumber,
        "levels": levels,
        "material_count": len(materials),
        "sample_materials": materials[:15]
    }

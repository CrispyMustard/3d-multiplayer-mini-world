import bpy
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public" / "models"
OUTPUT.mkdir(parents=True, exist_ok=True)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.materials, bpy.data.curves):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)


def material(name, color, roughness=0.85, metallic=0.0, emission=None):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = 2.5
    return mat


def box(name, location, scale, mat, bevel=0.06, rotation=(0, 0, 0), parent=None):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (scale[0] / 2, scale[1] / 2, scale[2] / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("Soft edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj


def cylinder(name, location, radius, depth, mat, vertices=12, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    obj.parent = parent
    bevel = obj.modifiers.new("Soft edges", "BEVEL")
    bevel.width = 0.04
    bevel.segments = 2
    return obj


def export_root(root, filename):
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for child in root.children_recursive:
        child.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT / filename),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
    )


def build_inn():
    clear_scene()
    plaster = material("Warm Plaster", (0.66, 0.55, 0.39), 0.95)
    timber = material("Dark Oak", (0.20, 0.095, 0.035), 0.9)
    roof_mat = material("Clay Shingles", (0.30, 0.075, 0.045), 0.95)
    stone = material("Foundation Stone", (0.29, 0.29, 0.25), 1)
    iron = material("Wrought Iron", (0.04, 0.045, 0.04), 0.55, 0.35)
    glow = material("Window Glow", (0.92, 0.48, 0.12), 0.6, emission=(1.0, 0.32, 0.05))
    root = bpy.data.objects.new("MedievalInn", None)
    bpy.context.collection.objects.link(root)
    root.rotation_euler.x = math.radians(90)

    box("StoneFoundation", (0, 0.35, 0), (8.2, 0.7, 6.2), stone, 0.12, parent=root)
    box("PlasterWalls", (0, 2.15, 0), (7.7, 3.6, 5.7), plaster, 0.1, parent=root)
    for x in (-3.65, 0, 3.65):
        box("OakPost", (x, 2.2, 2.91), (0.3, 3.8, 0.28), timber, 0.03, parent=root)
        box("OakPost", (x, 2.2, -2.91), (0.3, 3.8, 0.28), timber, 0.03, parent=root)
    for z in (-2.88, 2.88):
        box("OakBeam", (0, 1.0, z), (7.7, 0.28, 0.3), timber, 0.03, parent=root)
        box("OakBeam", (0, 3.55, z), (7.7, 0.32, 0.3), timber, 0.03, parent=root)
    for x in (-2.4, 2.4):
        box("CrossBrace", (x, 2.25, 2.94), (0.22, 2.5, 0.22), timber, 0.02, rotation=(0, 0, math.radians(38)), parent=root)

    slope = math.radians(37)
    box("RoofLeft", (0, 4.65, 1.72), (8.8, 0.32, 4.4), roof_mat, 0.08, rotation=(slope, 0, 0), parent=root)
    box("RoofRight", (0, 4.65, -1.72), (8.8, 0.32, 4.4), roof_mat, 0.08, rotation=(-slope, 0, 0), parent=root)
    box("Door", (0, 1.35, 2.94), (1.45, 2.7, 0.22), timber, 0.08, parent=root)
    cylinder("DoorRing", (0.43, 1.35, 3.09), 0.12, 0.08, iron, 12, parent=root).rotation_euler.x = math.pi / 2
    for x in (-2.35, 2.35):
        box("GlowingWindow", (x, 2.15, 2.99), (1.3, 1.45, 0.16), glow, 0.05, parent=root)
        box("WindowBar", (x, 2.15, 3.09), (0.1, 1.45, 0.08), timber, 0.01, parent=root)
        box("WindowBar", (x, 2.15, 3.09), (1.3, 0.1, 0.08), timber, 0.01, parent=root)
    box("Chimney", (2.5, 5.55, -0.8), (0.8, 2.4, 0.8), stone, 0.08, parent=root)
    box("SignPost", (-4.25, 2.45, 2.7), (0.18, 2.8, 0.18), timber, 0.03, parent=root)
    box("InnSign", (-4.25, 3.15, 2.72), (1.8, 0.9, 0.16), timber, 0.08, parent=root)
    export_root(root, "medieval-inn.glb")


def build_traveler():
    clear_scene()
    tunic = material("Tunic", (0.19, 0.35, 0.23), 0.9)
    skin = material("Skin", (0.70, 0.43, 0.24), 0.9)
    leather = material("Leather", (0.20, 0.09, 0.035), 1)
    cape_mat = material("Cape", (0.36, 0.055, 0.055), 0.95)
    metal = material("Buckle", (0.38, 0.29, 0.12), 0.45, 0.45)
    root = bpy.data.objects.new("MedievalTraveler", None)
    bpy.context.collection.objects.link(root)
    root.rotation_euler.x = math.radians(90)
    box("Tunic", (0, 1.25, 0), (0.9, 1.2, 0.55), tunic, 0.12, parent=root)
    box("Head", (0, 2.08, 0), (0.62, 0.65, 0.6), skin, 0.13, parent=root)
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.47, radius2=0.14, depth=0.58, location=(0, 2.68, 0))
    cap = bpy.context.object
    cap.name = "WoolCap"
    cap.data.materials.append(cape_mat)
    cap.parent = root
    box("Belt", (0, 1.05, 0), (0.98, 0.16, 0.62), leather, 0.03, parent=root)
    box("Buckle", (0, 1.05, -0.33), (0.2, 0.2, 0.05), metal, 0.02, parent=root)
    for x in (-0.28, 0.28):
        box("Boot", (x, 0.42, -0.03), (0.36, 0.85, 0.45), leather, 0.09, parent=root)
        box("Arm", (x * 2.05, 1.32, 0), (0.26, 1.05, 0.32), tunic, 0.1, rotation=(0, 0, -x * 0.35), parent=root)
    box("Cape", (0, 1.35, 0.36), (0.78, 1.3, 0.12), cape_mat, 0.07, parent=root)
    export_root(root, "medieval-traveler.glb")


build_inn()
build_traveler()
print(f"Exported medieval assets to {OUTPUT}")

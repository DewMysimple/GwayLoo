from __future__ import annotations

import hashlib
import json
import os
import sys
import traceback
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


WORKBENCH = Path(__file__).resolve().parents[1]
OUTPUT = WORKBENCH / "generated/renders"
REPORT = WORKBENCH / "reports/render-validation.json"


def set_world_color(world: bpy.types.World, color: tuple[float, float, float]) -> None:
    world.color = color
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background") if world.node_tree else None
    if background is not None:
        background.inputs["Color"].default_value = (*color, 1.0)
        background.inputs["Strength"].default_value = 0.8


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def render(scene: bpy.types.Scene, frame: int, width: int, height: int, filename: str) -> dict[str, object]:
    bpy.context.window.scene = scene
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    if scene.frame_current == frame:
        scene.frame_set(frame + 1 if frame < scene.frame_end else frame - 1)
    scene.frame_set(frame)
    path = OUTPUT / filename
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    return {
        "scene": scene.name,
        "frame": frame,
        "path": str(path.relative_to(WORKBENCH)).replace("\\", "/"),
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
    }


def build_material_preview_scene() -> bpy.types.Scene:
    scene = bpy.data.scenes.new("VALIDATION_MATERIAL_PREVIEW")
    available_engines = {item.identifier for item in scene.render.bl_rna.properties["engine"].enum_items}
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in available_engines else "BLENDER_EEVEE"
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new("VALIDATION_MATERIAL_PREVIEW_World")
    set_world_color(scene.world, (0.18, 0.18, 0.18))

    camera_data = bpy.data.cameras.new("VALIDATION_MATERIAL_PREVIEW_CameraData")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 2.2
    camera = bpy.data.objects.new("VALIDATION_MATERIAL_PREVIEW_Camera", camera_data)
    camera.location = (0.0, 0.0, 2.0)
    scene.collection.objects.link(camera)
    scene.camera = camera

    mesh = bpy.data.meshes.new("VALIDATION_MATERIAL_PREVIEW_Mesh")
    mesh.from_pydata(
        [(-1.0, -1.0, 0.0), (1.0, -1.0, 0.0), (1.0, 1.0, 0.0), (-1.0, 1.0, 0.0)],
        [],
        [(0, 1, 2), (0, 2, 3)],
    )
    mesh.uv_layers.new(name="UVMap")
    for loop, coordinate in zip(
        mesh.uv_layers.active.data,
        ((0, 0), (1, 0), (1, 1), (0, 0), (1, 1), (0, 1)),
        strict=True,
    ):
        loop.uv = coordinate
    plane = bpy.data.objects.new("VALIDATION_MATERIAL_PREVIEW_Plane", mesh)
    plane.color = (1.0, 1.0, 1.0, 1.0)
    plane.data.materials.append(bpy.data.materials["WC_tree_1"])
    scene.collection.objects.link(plane)
    return scene


def build_grass_preview_scene() -> bpy.types.Scene:
    scene = bpy.data.scenes.new("VALIDATION_GRASS_PREVIEW")
    available_engines = {item.identifier for item in scene.render.bl_rna.properties["engine"].enum_items}
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in available_engines else "BLENDER_EEVEE"
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new("VALIDATION_GRASS_PREVIEW_World")
    set_world_color(scene.world, (0.72, 0.72, 0.72))
    source_tree = bpy.data.objects["EDIT_tree_1"]
    source_grass = bpy.data.objects["GRASS_tree_1"]
    # Use render-only object copies so animation slots from the two production
    # scenes cannot resolve against the validation scene's view layer.
    tree = source_tree.copy()
    tree.name = "VALIDATION_TREE"
    tree.animation_data_clear()
    tree.color = (1.0, 1.0, 1.0, 1.0)
    grass = source_grass.copy()
    grass.name = "VALIDATION_GRASS"
    grass.animation_data_clear()
    grass.color = (1.0, 1.0, 1.0, 1.0)
    scene.collection.objects.link(tree)
    scene.collection.objects.link(grass)

    corners = [tree.matrix_world @ Vector(corner) for corner in tree.bound_box]
    center = sum(corners, Vector()) / len(corners)
    # Follow the imported paper's authored face normal. The glTF plane faces
    # local -X, while the generated grass ribbons are intentionally two-sided.
    normal = (tree.matrix_world.to_3x3() @ tree.data.polygons[0].normal).normalized()
    camera_data = bpy.data.cameras.new("VALIDATION_GRASS_PREVIEW_CameraData")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 16.0
    camera = bpy.data.objects.new("VALIDATION_GRASS_PREVIEW_Camera", camera_data)
    camera_location = center + normal * 30.0 + Vector((0.0, 0.0, -1.5))
    camera_rotation = (center - camera_location).to_track_quat("-Z", "Y")
    # A camera created in a non-active background scene does not reliably
    # update matrix_world from rotation_euler before the first render. Assign
    # the complete transform so the validation image views the paper face-on.
    camera.matrix_world = Matrix.Translation(camera_location) @ camera_rotation.to_matrix().to_4x4()
    scene.collection.objects.link(camera)
    scene.camera = camera
    return scene


def build_shadow_preview_scene() -> bpy.types.Scene:
    scene = bpy.data.scenes.new("VALIDATION_SHADOW_PREVIEW")
    available_engines = {item.identifier for item in scene.render.bl_rna.properties["engine"].enum_items}
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in available_engines else "BLENDER_EEVEE"
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new("VALIDATION_SHADOW_PREVIEW_World")
    set_world_color(scene.world, (0.78, 0.78, 0.74))
    tree_source = bpy.data.objects["EDIT_tree_1"]
    shadow_source = bpy.data.objects["SHADOW_tree_1"]
    tree = tree_source.copy()
    tree.name = "VALIDATION_SHADOW_TREE"
    tree.animation_data_clear()
    tree.color = (1.0, 1.0, 1.0, 1.0)
    shadow = shadow_source.copy()
    shadow.name = "VALIDATION_SHADOW_CARD"
    shadow.animation_data_clear()
    shadow.color = (1.0, 1.0, 1.0, 1.0)
    scene.collection.objects.link(tree)
    scene.collection.objects.link(shadow)
    tree_source["web_shadow_alpha"] = 1.0

    corners = [tree.matrix_world @ Vector(corner) for corner in tree.bound_box]
    center = sum(corners, Vector()) / len(corners)
    normal = (tree.matrix_world.to_3x3() @ tree.data.polygons[0].normal).normalized()
    camera_data = bpy.data.cameras.new("VALIDATION_SHADOW_PREVIEW_CameraData")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 10.0
    camera = bpy.data.objects.new("VALIDATION_SHADOW_PREVIEW_Camera", camera_data)
    camera_location = center + normal * 30.0 + Vector((0.0, 0.0, -1.0))
    camera_rotation = (center - camera_location).to_track_quat("-Z", "Y")
    camera.matrix_world = Matrix.Translation(camera_location) @ camera_rotation.to_matrix().to_4x4()
    scene.collection.objects.link(camera)
    scene.camera = camera
    return scene


def build_background_preview_scene() -> bpy.types.Scene:
    scene = bpy.data.scenes.new("VALIDATION_BACKGROUND_PREVIEW")
    available_engines = {item.identifier for item in scene.render.bl_rna.properties["engine"].enum_items}
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in available_engines else "BLENDER_EEVEE"
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new("VALIDATION_BACKGROUND_PREVIEW_World")
    set_world_color(scene.world, (0.78, 0.78, 0.74))
    source = bpy.data.objects["EDIT_background_2"]
    background = source.copy()
    background.name = "VALIDATION_BACKGROUND_CARD"
    background.animation_data_clear()
    background.color = (1.0, 1.0, 1.0, 1.0)
    scene.collection.objects.link(background)
    corners = [background.matrix_world @ Vector(corner) for corner in background.bound_box]
    center = sum(corners, Vector()) / len(corners)
    normal = (background.matrix_world.to_3x3() @ background.data.polygons[0].normal).normalized()
    camera_data = bpy.data.cameras.new("VALIDATION_BACKGROUND_PREVIEW_CameraData")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 260.0
    camera = bpy.data.objects.new("VALIDATION_BACKGROUND_PREVIEW_Camera", camera_data)
    camera_location = center + normal * 30.0
    camera_rotation = (center - camera_location).to_track_quat("-Z", "Y")
    camera.matrix_world = Matrix.Translation(camera_location) @ camera_rotation.to_matrix().to_4x4()
    scene.collection.objects.link(camera)
    scene.camera = camera
    return scene


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    rendered: list[dict[str, object]] = []
    # Build isolated previews before timeline validation changes the evaluated
    # state of data blocks shared by ARTIST_EDIT and WEB_ANIMATION.
    material_preview = build_material_preview_scene()
    grass_preview = build_grass_preview_scene()
    shadow_preview = build_shadow_preview_scene()
    background_preview = build_background_preview_scene()
    web = bpy.data.scenes["WEB_ANIMATION"]
    # Include the first paper's exact runtime phases: immediate alpha, paper
    # rotation/curve motion and the 15-second ink reveal, plus broad timeline
    # samples.
    for frame in (0, 60, 210, 420, 900, 1793, 3586):
        rendered.append(render(web, frame, 960, 540, f"web-animation-{frame:04d}.png"))

    artist = bpy.data.scenes["ARTIST_EDIT"]
    rendered.append(render(artist, 3586, 960, 540, "artist-edit-materials.png"))
    rendered.append(render(material_preview, 0, 512, 512, "material-preview-tree.png"))
    rendered.append(render(grass_preview, 3586, 720, 720, "grass-preview-tree.png"))
    rendered.append(render(shadow_preview, 3586, 720, 720, "shadow-preview-tree.png"))
    rendered.append(render(background_preview, 3586, 960, 540, "background-preview-card.png"))

    source = bpy.data.scenes["SOURCE_REFERENCE"]
    for frame in (0, 900, 1793, 3586):
        rendered.append(render(source, frame, 960, 540, f"source-camera-{frame:04d}.png"))

    for scene_id in range(1, 7):
        scene = bpy.data.scenes[f"LANDSCAPE_{scene_id:02d}_DESKTOP"]
        rendered.append(render(scene, 0, 480, 270, f"landscape-{scene_id:02d}-desktop-base.png"))
    REPORT.write_text(
        json.dumps({"blender_version": bpy.app.version_string, "renders": rendered}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"render_count": len(rendered), "report": str(REPORT)}))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.stderr.flush()
        sys.stdout.flush()
        os._exit(1)

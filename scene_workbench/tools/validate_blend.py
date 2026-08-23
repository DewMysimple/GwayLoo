from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import bpy


WORKBENCH = Path(__file__).resolve().parents[1]
REPORT = WORKBENCH / "reports/blender-validation.json"
MANIFEST = WORKBENCH / "manifests/scene_manifest.json"
REQUIRED_SHARED_COLLECTIONS = {
    "EDITABLE_WATERCOLOR",
    "PROCEDURAL_GRASS",
    "HOTSPOTS_AND_TITLES",
    "CAMERA_RIG",
    "REFERENCE_ONLY",
}


def action_fcurves(action: bpy.types.Action | None) -> list[bpy.types.FCurve]:
    if action is None:
        return []
    if hasattr(action, "fcurves"):
        return list(action.fcurves)
    return [
        fcurve
        for layer in action.layers
        for strip in layer.strips
        if hasattr(strip, "channelbags")
        for channelbag in strip.channelbags
        for fcurve in channelbag.fcurves
    ]


def fail(message: str, failures: list[str]) -> None:
    failures.append(message)
    print(f"[blend-validation] FAIL: {message}")


def authored_world_matrix(obj: bpy.types.Object):
    local = obj.matrix_parent_inverse @ obj.matrix_basis
    if obj.parent is None:
        return local.copy()
    return authored_world_matrix(obj.parent) @ local


def main() -> None:
    failures: list[str] = []
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    expected_texture_remaps = manifest["watercolor"]["texture_atlas_remaps"]
    expected_grass_layers = {
        layer_name
        for layer_name, layer_runtime in manifest["watercolor"]["legacy_layer_runtime"].items()
        if layer_runtime["has_ground"]
    }
    saved_default_scene = bpy.context.window.scene.name if bpy.context.window else None
    animation_scene = bpy.data.scenes.get("WEB_ANIMATION")
    artist_scene = bpy.data.scenes.get("ARTIST_EDIT")
    source_scene = bpy.data.scenes.get("SOURCE_REFERENCE")
    for scene_name, scene in (
        ("WEB_ANIMATION", animation_scene),
        ("ARTIST_EDIT", artist_scene),
        ("SOURCE_REFERENCE", source_scene),
    ):
        if scene is None:
            fail(f"{scene_name} scene is missing", failures)
    if saved_default_scene != "ARTIST_EDIT":
        fail(f"Saved default scene must be ARTIST_EDIT, got {saved_default_scene}", failures)
    if artist_scene and artist_scene.frame_current != 3586:
        fail(f"ARTIST_EDIT must open at frame 3586, got {artist_scene.frame_current}", failures)
    if animation_scene and animation_scene.frame_current != 0:
        fail(f"WEB_ANIMATION must retain frame 0, got {animation_scene.frame_current}", failures)
    for scene in (animation_scene, artist_scene):
        if scene is None:
            continue
        names = {collection.name for collection in scene.collection.children}
        for missing in sorted(REQUIRED_SHARED_COLLECTIONS - names):
            fail(f"{scene.name} collection is missing: {missing}", failures)
        if "SOURCE_GLTF_MIRROR" in names:
            fail(f"{scene.name} must not link the locked source mirror", failures)
        if scene.render.fps != 60 or scene.frame_end != 3586:
            fail(f"{scene.name} timeline mismatch: fps={scene.render.fps}, end={scene.frame_end}", failures)
        if scene.get("source_mesh_count") != 27:
            fail(f"Expected 27 source meshes, got {scene.get('source_mesh_count')}", failures)
        if scene.get("camera_animation_samples") != 3587:
            fail("Camera animation sample metadata mismatch", failures)
        if scene.camera is None or scene.camera.name != "WEB_CAMERA_EDITABLE":
            fail("Editable web camera is missing", failures)
        elif scene.camera.parent is not None:
            fail("Editable web camera must remain unparented so Blender preserves the GLB view matrix", failures)

    camera_rig = bpy.data.objects.get("WEB_CAMERA_PATH_RIG")
    source_camera = bpy.data.objects.get("Camera_Animation_Baked")
    camera_control = bpy.data.objects.get("WEB_CAMERA_INTERACTION_CONTROL")
    if camera_rig is None:
        fail("WEB_CAMERA_PATH_RIG is missing", failures)
    else:
        action = camera_rig.animation_data.action if camera_rig.animation_data else None
        if action is None or action.name != "WEB_CAMERA_PATH_BAKED":
            fail("Baked camera path action is missing", failures)
        elif tuple(round(value) for value in action.frame_range) != (0, 3586):
            fail(f"Baked camera action frame range mismatch: {tuple(action.frame_range)}", failures)
        camera_points = sum(len(fcurve.keyframe_points) for fcurve in action_fcurves(action))
        if camera_points != 3587 * 10:
            fail(f"Expected 35870 baked camera keys, got {camera_points}", failures)
    if camera_control is None:
        fail("Camera runtime control is missing", failures)
    elif (
        abs(float(camera_control.get("loader_z", -1))) > 1e-6
        or abs(float(camera_control.get("loader_final_z", -1)) - 0.4) > 1e-6
    ):
        fail("Camera loader control must keep main offset 0 and source final Z=0.4", failures)
    active_camera = bpy.data.objects.get("WEB_CAMERA_EDITABLE")
    if active_camera:
        active_action = active_camera.animation_data.action if active_camera.animation_data else None
        if active_action is None or active_action.name != "WEB_CAMERA_ACTIVE_BAKED":
            fail("Direct active camera action is missing", failures)
        else:
            active_points = sum(len(fcurve.keyframe_points) for fcurve in action_fcurves(active_action))
            if active_points != 3587 * 10:
                fail(f"Expected 35870 active camera keys, got {active_points}", failures)
    if camera_rig and source_camera and animation_scene and source_scene:
        bpy.context.window.scene = source_scene
        source_scene.frame_set(1)
        source_scene.frame_set(0)
        bpy.context.view_layer.update()
        for frame in (0, 897, 1793, 2690, 3586):
            bpy.context.window.scene = source_scene
            source_scene.frame_set(frame)
            bpy.context.view_layer.update()
            source_matrix = source_camera.evaluated_get(
                bpy.context.evaluated_depsgraph_get()
            ).matrix_world.copy()
            source_location, source_rotation, _ = source_matrix.decompose()
            bpy.context.window.scene = animation_scene
            animation_scene.frame_set(frame)
            bpy.context.view_layer.update()
            depsgraph = bpy.context.evaluated_depsgraph_get()
            rig_matrix = camera_rig.evaluated_get(depsgraph).matrix_world.copy()
            active_camera_matrix = (
                active_camera.evaluated_get(depsgraph).matrix_world.copy()
                if active_camera
                else None
            )
            rig_location, rig_rotation, rig_scale = rig_matrix.decompose()
            if (source_location - rig_location).length > 1e-4:
                fail(f"Camera path location differs from imported source at frame {frame}", failures)
            if source_rotation.rotation_difference(rig_rotation).angle > 1e-4:
                fail(f"Camera path rotation differs from imported source at frame {frame}", failures)
            if (source_matrix.to_scale() - rig_scale).length > 1e-4:
                fail(f"Camera path scale differs from imported source at frame {frame}", failures)
            if active_camera_matrix is not None:
                matrix_difference = max(
                    abs(source_value - active_value)
                    for source_row, active_row in zip(source_matrix, active_camera_matrix)
                    for source_value, active_value in zip(source_row, active_row)
                )
                if matrix_difference > 1e-4:
                    fail(f"Active camera matrix differs from imported source at frame {frame}", failures)

    source_collection = bpy.data.collections.get("SOURCE_GLTF_MIRROR")
    source_meshes = [obj for obj in source_collection.objects if obj.type == "MESH"] if source_collection else []
    if len(source_meshes) != 27:
        fail(f"Expected 27 imported source mesh objects, got {len(source_meshes)}", failures)
    if source_scene and source_collection:
        source_names = {collection.name for collection in source_scene.collection.children}
        if source_names != {"SOURCE_GLTF_MIRROR"}:
            fail(f"SOURCE_REFERENCE must contain only SOURCE_GLTF_MIRROR, got {sorted(source_names)}", failures)
        if source_scene.camera is None or source_scene.camera.name != "Camera_Animation_Baked":
            fail("SOURCE_REFERENCE must use the imported source camera", failures)
    if source_collection and any(not obj.hide_select for obj in source_collection.objects):
        fail("Every object in SOURCE_GLTF_MIRROR must remain selection-locked", failures)

    editable = bpy.data.collections.get("EDITABLE_WATERCOLOR")
    editable_meshes = [obj for obj in editable.objects if obj.type == "MESH"] if editable else []
    if len(editable_meshes) != 26:
        fail(f"Expected 26 editable watercolor layers, got {len(editable_meshes)}", failures)
    if animation_scene and artist_scene and editable:
        animation_editables = {
            obj.as_pointer() for obj in editable_meshes if obj.name in animation_scene.objects
        }
        artist_editables = {
            obj.as_pointer() for obj in editable_meshes if obj.name in artist_scene.objects
        }
        collection_editables = {obj.as_pointer() for obj in editable_meshes}
        if animation_editables != collection_editables or artist_editables != collection_editables:
            fail("ARTIST_EDIT and WEB_ANIMATION must share the same editable object datablocks", failures)
        source_pointers = {obj.as_pointer() for obj in source_collection.objects} if source_collection else set()
        if source_pointers & {obj.as_pointer() for obj in animation_scene.objects}:
            fail("WEB_ANIMATION contains source-mirror objects", failures)
        if source_pointers & {obj.as_pointer() for obj in artist_scene.objects}:
            fail("ARTIST_EDIT contains source-mirror objects", failures)

    animated_layers = 0
    curve_layers = 0
    aligned_layers = 0
    selectable_layers = 0
    triangle_faces = 0
    zero_area_faces = 0
    material_layers = 0
    if source_scene:
        bpy.context.window.scene = source_scene
        source_scene.frame_set(3586)
        bpy.context.view_layer.update()
    source_matrices = {
        obj.name: authored_world_matrix(obj) for obj in source_meshes
    }
    if animation_scene:
        bpy.context.window.scene = animation_scene
        animation_scene.frame_set(3586)
        bpy.context.view_layer.update()
    for obj in editable_meshes:
        if not obj.hide_select:
            selectable_layers += 1
        if not obj.data.uv_layers.active:
            fail(f"{obj.name} has no active UV map", failures)
        for polygon in obj.data.polygons:
            if len(polygon.vertices) != 3:
                fail(f"{obj.name} contains a non-triangle face with {len(polygon.vertices)} vertices", failures)
            else:
                triangle_faces += 1
            if polygon.area <= 1e-12:
                zero_area_faces += 1
                fail(f"{obj.name} contains a zero-area triangle", failures)
        action = obj.animation_data.action if obj.animation_data else None
        if action and action.name.startswith("WEB_REVEAL_"):
            animated_layers += 1
            animation_paths = {fcurve.data_path for fcurve in action_fcurves(action)}
            expected_animation_paths = {
                '["web_alpha"]',
                '["web_curve_coef"]',
                '["web_curve_wave"]',
                '["web_rotation_z"]',
                '["web_reveal_progress"]',
                '["web_cutout_alpha"]',
                '["web_ground_alpha"]',
                '["web_shadow_alpha"]',
                "delta_rotation_euler",
                "hide_viewport",
                "hide_render",
                "color",
            }
            missing_animation_paths = sorted(expected_animation_paths - animation_paths)
            if missing_animation_paths:
                fail(f"{obj.name} action is missing channels: {missing_animation_paths}", failures)
        required_properties = {
            "web_alpha",
            "web_curve_coef",
            "web_curve_wave",
            "web_rotation_z",
            "web_reveal_progress",
            "web_cutout_alpha",
            "web_ground_alpha",
            "web_shadow_alpha",
        }
        missing = sorted(name for name in required_properties if name not in obj)
        if missing:
            fail(f"{obj.name} is missing runtime properties: {missing}", failures)
        if obj.data.shape_keys and obj.data.shape_keys.key_blocks.get("WEB_SOURCE_CURVE"):
            curve_layers += 1
        source_name = obj.get("source_object")
        source_matrix = source_matrices.get(source_name) if source_name else None
        if source_matrix is not None:
            matrix_difference = max(
                abs(source_value - editable_value)
                for source_row, editable_row in zip(source_matrix, obj.matrix_world)
                for source_value, editable_value in zip(source_row, editable_row)
            )
            if matrix_difference <= 1e-4:
                aligned_layers += 1
            else:
                fail(f"{obj.name} world transform differs from {source_name}", failures)
        else:
            fail(f"{obj.name} has no resolvable source_object", failures)

        if len(obj.data.materials) != 1 or obj.data.materials[0] is None:
            fail(f"{obj.name} must have exactly one watercolor material", failures)
            continue
        material = obj.data.materials[0]
        if not material.use_nodes or material.node_tree is None:
            fail(f"{material.name} does not use nodes", failures)
            continue
        output = next((node for node in material.node_tree.nodes if node.type == "OUTPUT_MATERIAL"), None)
        if output is None or not output.inputs["Surface"].is_linked:
            fail(f"{material.name} has no connected Material Output", failures)
        object_alpha = material.node_tree.nodes.get("OBJECT_ALPHA")
        mask_reveal = material.node_tree.nodes.get("MASK_X_REVEAL")
        if object_alpha is None or mask_reveal is None:
            fail(f"{material.name} is missing the object-alpha preview nodes", failures)
        elif not any(
            link.from_node == object_alpha
            and link.from_socket.name == "Alpha"
            and link.to_node == mask_reveal
            and link.to_socket == mask_reveal.inputs[1]
            for link in material.node_tree.links
        ):
            fail(f"{material.name} does not drive reveal opacity from Object Info Alpha", failures)
        image_nodes = [node for node in material.node_tree.nodes if node.type == "TEX_IMAGE"]
        missing_image_data = False
        for image_node in image_nodes:
            image = image_node.image
            if image is None:
                missing_image_data = True
                continue
            if image.source == "FILE" and (
                image.size[0] == 0
                or image.size[1] == 0
                or not Path(bpy.path.abspath(image.filepath)).exists()
            ):
                missing_image_data = True
        if len(image_nodes) < 2 or missing_image_data:
            fail(f"{material.name} has missing or unloaded texture nodes", failures)
        surface = material.node_tree.nodes.get("WATERCOLOR_SURFACE")
        if surface is None or surface.type != "BSDF_PRINCIPLED":
            fail(f"{material.name} must use the Blender 5.0 Principled watercolor surface", failures)
        if any(node.type == "EMISSION" for node in material.node_tree.nodes):
            fail(f"{material.name} must not use the legacy standalone Emission node", failures)
        if hasattr(material, "preview_render_type") and material.preview_render_type != "FLAT":
            fail(f"{material.name} preview type must be FLAT", failures)
        source_layer = obj.name[5:]
        actual_remap = json.loads(material.get("atlas_remap", "{}"))
        if actual_remap != expected_texture_remaps.get(source_layer):
            fail(f"{material.name} does not use the legacy texture-atlas remap", failures)
        material_layers += 1
    if animated_layers != 26:
        fail(f"Expected 26 watercolor actions, got {animated_layers}", failures)
    if curve_layers != 26:
        fail(f"Expected 26 source curve shape keys, got {curve_layers}", failures)
    if aligned_layers != 26:
        fail(f"Expected 26 source-aligned editable layers, got {aligned_layers}", failures)
    if selectable_layers != 26:
        fail(f"Expected 26 selectable editable layers, got {selectable_layers}", failures)
    if zero_area_faces:
        fail(f"Expected zero degenerate triangles, got {zero_area_faces}", failures)
    if material_layers != 26:
        fail(f"Expected 26 validated watercolor materials, got {material_layers}", failures)

    grass_collection = bpy.data.collections.get("PROCEDURAL_GRASS")
    grass_objects = [obj for obj in grass_collection.objects if obj.type == "MESH"] if grass_collection else []
    grass_blades = 0
    grass_triangles = 0
    grass_wind_actions = 0
    grass_reveal_actions = 0
    actual_grass_layers = {obj.name.removeprefix("GRASS_") for obj in grass_objects}
    if actual_grass_layers != expected_grass_layers:
        fail(
            "Procedural grass layer set does not match the legacy runtime: "
            f"missing={sorted(expected_grass_layers - actual_grass_layers)}, "
            f"unexpected={sorted(actual_grass_layers - expected_grass_layers)}",
            failures,
        )
    for obj in grass_objects:
        if obj.hide_select:
            fail(f"{obj.name} must remain artist-selectable", failures)
        if obj.get("source_generation") != "deterministic mirror of legacy procedural Grass component":
            fail(f"{obj.name} is missing source-generation metadata", failures)
        if not obj.data.uv_layers.get("GrassAtlasUV"):
            fail(f"{obj.name} has no GrassAtlasUV", failures)
        if not obj.data.attributes.get("gradient_u"):
            fail(f"{obj.name} has no gradient_u attribute", failures)
        for polygon in obj.data.polygons:
            if len(polygon.vertices) != 3:
                fail(f"{obj.name} contains a non-triangle grass face", failures)
            grass_triangles += 1
        grass_blades += len(obj.data.vertices) // 18
        wind = obj.data.shape_keys.key_blocks.get("SOURCE_WIND") if obj.data.shape_keys else None
        if wind is None:
            fail(f"{obj.name} has no SOURCE_WIND shape key", failures)
        wind_action = (
            obj.data.shape_keys.animation_data.action
            if obj.data.shape_keys and obj.data.shape_keys.animation_data
            else None
        )
        wind_paths = {curve.data_path for curve in action_fcurves(wind_action)}
        if wind_action and 'key_blocks["SOURCE_WIND"].value' in wind_paths:
            grass_wind_actions += 1
        else:
            fail(f"{obj.name} has no source wind animation channel", failures)
        reveal_action = obj.animation_data.action if obj.animation_data else None
        reveal_paths = {curve.data_path for curve in action_fcurves(reveal_action)}
        if reveal_action and "color" in reveal_paths:
            grass_reveal_actions += 1
        else:
            fail(f"{obj.name} has no grass reveal animation channel", failures)
        if wind_action is not reveal_action or not reveal_action.name.startswith("WEB_GRASS_ANIMATION_"):
            fail(f"{obj.name} does not use the Blender 5 combined grass action", failures)
        if len(obj.data.materials) != 1 or obj.data.materials[0].name != "WC_PROCEDURAL_GRASS":
            fail(f"{obj.name} does not use WC_PROCEDURAL_GRASS", failures)
    expected_grass_count = len(expected_grass_layers)
    if len(grass_objects) != expected_grass_count:
        fail(
            f"Expected {expected_grass_count} source-configured procedural grass objects, "
            f"got {len(grass_objects)}",
            failures,
        )
    if grass_blades <= 0:
        fail("Procedural grass contains no blades", failures)
    if grass_wind_actions != expected_grass_count or grass_reveal_actions != expected_grass_count:
        fail(
            f"Expected {expected_grass_count} grass wind/reveal actions, "
            f"got {grass_wind_actions}/{grass_reveal_actions}",
            failures,
        )
    grass_material = bpy.data.materials.get("WC_PROCEDURAL_GRASS")
    if grass_material is None:
        fail("WC_PROCEDURAL_GRASS material is missing", failures)
    else:
        grass_surface = grass_material.node_tree.nodes.get("GRASS_SURFACE")
        if grass_surface is None or grass_surface.type != "BSDF_PRINCIPLED":
            fail("WC_PROCEDURAL_GRASS must use a Blender 5.0 Principled surface", failures)
        if any(node.type == "EMISSION" for node in grass_material.node_tree.nodes):
            fail("WC_PROCEDURAL_GRASS must not use the legacy standalone Emission node", failures)

    ground_collection = bpy.data.collections.get("GROUND_AND_PAPER")
    shadow_collection = bpy.data.collections.get("SHADOW_APPROXIMATION")
    artist_collection_names = {collection.name for collection in artist_scene.collection.children} if artist_scene else set()
    animation_collection_names = {
        collection.name for collection in animation_scene.collection.children
    } if animation_scene else set()
    if "GROUND_AND_PAPER" not in artist_collection_names:
        fail("ARTIST_EDIT must link GROUND_AND_PAPER", failures)
    if "GROUND_AND_PAPER" in animation_collection_names:
        fail("WEB_ANIMATION must not link the artist-only GROUND_AND_PAPER collection", failures)
    if "SHADOW_APPROXIMATION" not in artist_collection_names:
        fail("ARTIST_EDIT must link SHADOW_APPROXIMATION", failures)
    if "SHADOW_APPROXIMATION" in animation_collection_names:
        fail("WEB_ANIMATION must not link the artist-only SHADOW_APPROXIMATION collection", failures)

    ground_objects = [obj for obj in ground_collection.objects if obj.type == "MESH"] if ground_collection else []
    if len(ground_objects) != 1 or ground_objects[0].name != "EDIT_Ground":
        fail(f"Expected one editable artist Ground mesh, got {[obj.name for obj in ground_objects]}", failures)
    ground_material = bpy.data.materials.get("WC_Ground_Atlas")
    if ground_material is None:
        fail("WC_Ground_Atlas material is missing", failures)
    else:
        ground_surface = ground_material.node_tree.nodes.get("IMAGE_SURFACE")
        if ground_surface is None or ground_surface.type != "BSDF_PRINCIPLED":
            fail("WC_Ground_Atlas must use a Blender 5.0 Principled surface", failures)
        if any(node.type == "EMISSION" for node in ground_material.node_tree.nodes):
            fail("WC_Ground_Atlas must not use the legacy standalone Emission node", failures)

    shadow_objects = [obj for obj in shadow_collection.objects if obj.type == "MESH"] if shadow_collection else []
    expected_shadow_names = {f"SHADOW_{layer_name}" for layer_name in expected_texture_remaps}
    actual_shadow_names = {obj.name for obj in shadow_objects}
    if actual_shadow_names != expected_shadow_names:
        fail(
            "Shadow layer set does not match watercolor layers: "
            f"missing={sorted(expected_shadow_names - actual_shadow_names)}, "
            f"unexpected={sorted(actual_shadow_names - expected_shadow_names)}",
            failures,
        )
    for obj in shadow_objects:
        if obj.hide_select:
            fail(f"{obj.name} must remain artist-selectable", failures)
        if obj.get("source_generation") != "editable approximation of legacy WebGL paper shadow":
            fail(f"{obj.name} is missing shadow-generation metadata", failures)
        if len(obj.data.materials) != 1:
            fail(f"{obj.name} must use exactly one shadow material", failures)
        else:
            material = obj.data.materials[0]
            surface = material.node_tree.nodes.get("SHADOW_SURFACE")
            if surface is None or surface.type != "BSDF_PRINCIPLED":
                fail(f"{material.name} must use a Principled shadow surface", failures)
            if any(node.type == "EMISSION" for node in material.node_tree.nodes):
                fail(f"{material.name} must not use a standalone Emission node", failures)
            if material.node_tree.nodes.get("WEB_SHADOW_ALPHA") is None:
                fail(f"{material.name} is missing the web_shadow_alpha driver", failures)

    edit_mode_roundtrip = False
    if artist_scene and editable_meshes:
        bpy.context.window.scene = artist_scene
        artist_scene.frame_set(3586)
        bpy.context.view_layer.update()
        bpy.ops.object.select_all(action="DESELECT")
        edit_target = bpy.data.objects.get("EDIT_tree_1") or editable_meshes[0]
        edit_target.hide_set(False)
        edit_target.select_set(True)
        bpy.context.view_layer.objects.active = edit_target
        if not bpy.ops.object.mode_set.poll():
            fail(f"Cannot enter Edit Mode for {edit_target.name}", failures)
        else:
            bpy.ops.object.mode_set(mode="EDIT")
            edit_mode_roundtrip = edit_target.mode == "EDIT"
            if not edit_mode_roundtrip:
                fail(f"{edit_target.name} did not enter Edit Mode", failures)
            bpy.ops.object.mode_set(mode="OBJECT")
    hotspots = bpy.data.collections.get("HOTSPOTS_AND_TITLES")
    hotspot_count = len([obj for obj in hotspots.objects if obj.name.startswith("HOTSPOT_")]) if hotspots else 0
    if hotspot_count != 6:
        fail(f"Expected 6 hotspots, got {hotspot_count}", failures)

    expected_video_scenes = {
        f"LANDSCAPE_{scene_id:02d}_{device}"
        for device in ("DESKTOP", "MOBILE")
        for scene_id in range(1, 7)
    }
    missing_video_scenes = sorted(expected_video_scenes - set(bpy.data.scenes.keys()))
    for name in missing_video_scenes:
        fail(f"Video scene is missing: {name}", failures)

    missing_paths: list[str] = []
    non_relative: list[str] = []
    for image in bpy.data.images:
        if not image.filepath:
            continue
        if not image.filepath.startswith("//"):
            non_relative.append(image.filepath)
        absolute = Path(bpy.path.abspath(image.filepath))
        if not absolute.exists():
            missing_paths.append(str(absolute))
    for font in bpy.data.fonts:
        if not font.filepath or font.filepath == "<builtin>":
            continue
        if not font.filepath.startswith("//"):
            non_relative.append(font.filepath)
        absolute = Path(bpy.path.abspath(font.filepath))
        if not absolute.exists():
            missing_paths.append(str(absolute))
    if missing_paths:
        fail(f"Missing external image/movie paths: {missing_paths}", failures)
    if non_relative:
        fail(f"Non-relative image/movie paths: {non_relative}", failures)

    result = {
        "blender_version": bpy.app.version_string,
        "blend_file": bpy.data.filepath,
        "passed": not failures,
        "failures": failures,
        "source_meshes": len(source_meshes),
        "editable_watercolor_layers": len(editable_meshes),
        "animated_watercolor_layers": animated_layers,
        "source_curve_shape_keys": curve_layers,
        "source_aligned_editable_layers": aligned_layers,
        "selectable_editable_layers": selectable_layers,
        "triangle_faces": triangle_faces,
        "zero_area_faces": zero_area_faces,
        "validated_materials": material_layers,
        "procedural_grass_objects": len(grass_objects),
        "procedural_grass_blades": grass_blades,
        "procedural_grass_triangles": grass_triangles,
        "procedural_grass_wind_actions": grass_wind_actions,
        "procedural_grass_reveal_actions": grass_reveal_actions,
        "shadow_objects": len(shadow_objects),
        "artist_only_ground": "GROUND_AND_PAPER" in artist_collection_names and "GROUND_AND_PAPER" not in animation_collection_names,
        "artist_only_shadows": "SHADOW_APPROXIMATION" in artist_collection_names and "SHADOW_APPROXIMATION" not in animation_collection_names,
        "edit_mode_roundtrip": edit_mode_roundtrip,
        "default_scene": saved_default_scene,
        "camera_rig": camera_rig.name if camera_rig else None,
        "camera_runtime_control": camera_control.name if camera_control else None,
        "hotspots": hotspot_count,
        "video_scenes": len(expected_video_scenes) - len(missing_video_scenes),
        "external_images_and_movies": len([image for image in bpy.data.images if image.filepath]),
        "external_fonts": len([font for font in bpy.data.fonts if font.filepath and font.filepath != "<builtin>"]),
    }
    REPORT.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False))
    if failures:
        sys.stderr.flush()
        sys.stdout.flush()
        os._exit(1)


if __name__ == "__main__":
    main()

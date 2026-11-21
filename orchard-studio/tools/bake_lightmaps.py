"""Optional lightmap bake for Orchard Studio. Runs inside Blender, not with plain Python.

    blender --background --python tools/bake_lightmaps.py -- <input.glb> <output_dir> [options]

Options (after the "--"):
    --size N            lightmap resolution in pixels, square (default 2048)
    --samples N         Cycles samples per bake (default 128)
    --margin N          padding around UV islands in pixels (default 8)
    --ao-distance M     ambient-occlusion ray length in metres (default 1.5)
    --world-strength S  strength of the white world light used when the GLB has no lights (default 1.0)
    --direct            also bake direct light into the lightmap (default: indirect only)
    --no-embed-ao       do not wire the AO map into the exported materials

What it does:
    1. Imports the GLB that was exported from the app's scene.
    2. Gives every mesh a second UV channel called "UVMap_lightmap" (Smart UV Project, then packed).
       Meshes are grouped by their first material; each group shares one lightmap image.
    3. Bakes with Cycles (GPU when one is available, otherwise CPU):
         - DIFFUSE with only the indirect pass (no albedo, no direct light unless --direct)
         - AO as a separate pass
       and multiplies the two into one combined lightmap per group.
    4. Writes into <output_dir>:
         <group>_lightmap.exr   linear float, the accurate one
         <group>_lightmap.png   8-bit sRGB, the small one for the web
         <group>_ao.png         AO only
         lightmaps.json         mesh name -> image files and UV channel
         scene_lightmapped.glb  the scene with the second UV channel (TEXCOORD_1) preserved

In three.js, load <group>_lightmap.png, set texture.colorSpace = SRGBColorSpace, texture.flipY = false
and texture.channel = 1, then assign it to material.lightMap for the meshes listed in lightmaps.json.

Written for Blender 3.6 LTS and 4.x. The app does not need this script: it is an optional quality step.
"""

import json
import os
import re
import sys

USAGE = (
    "usage: blender --background --python tools/bake_lightmaps.py -- "
    "<input.glb> <output_dir> [--size 2048] [--samples 128]\n"
    "       (extra options: --margin 8 --ao-distance 1.5 --world-strength 1.0 --direct --no-embed-ao)"
)

try:
    import bpy
except ImportError:
    print("bake_lightmaps.py must be run by Blender, not by plain Python.")
    print(USAGE)
    print("Blender is optional for this project: https://www.blender.org/download/")
    sys.exit(1)

import argparse

import numpy as np  # bundled with Blender

LIGHTMAP_UV = "UVMap_lightmap"
BAKE_NODE = "__orchard_bake_target"


# ------------------------------------------------------------------------------------------------
# Arguments
# ------------------------------------------------------------------------------------------------


def parse_args():
    """Reads the arguments that follow the "--" on Blender's command line."""
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(prog="bake_lightmaps.py", usage=USAGE)
    parser.add_argument("input", help="GLB or glTF exported from the app")
    parser.add_argument("output_dir", help="folder for the lightmaps, the manifest and the new GLB")
    parser.add_argument("--size", type=int, default=2048)
    parser.add_argument("--samples", type=int, default=128)
    parser.add_argument("--margin", type=int, default=8)
    parser.add_argument("--ao-distance", type=float, default=1.5)
    parser.add_argument("--world-strength", type=float, default=1.0)
    parser.add_argument("--direct", action="store_true")
    parser.add_argument("--no-embed-ao", action="store_true")
    try:
        args = parser.parse_args(argv)
    except SystemExit:
        # argparse exits with 2 on bad input; make sure Blender quits with a failure too.
        sys.exit(1)
    if not os.path.isfile(args.input):
        print(f"input file not found: {args.input}\n{USAGE}")
        sys.exit(1)
    if args.size < 64 or args.size > 16384:
        print("--size must be between 64 and 16384")
        sys.exit(1)
    return args


# ------------------------------------------------------------------------------------------------
# Scene setup
# ------------------------------------------------------------------------------------------------


def reset_scene():
    """Starts from an empty file so nothing from the user's startup scene leaks into the bake."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_scene(path):
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(path))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH" and len(o.data.polygons) > 0]
    if not meshes:
        print("the file contains no meshes with faces: nothing to bake")
        sys.exit(1)
    return meshes


def setup_cycles(samples):
    """Selects Cycles and the best available device. Returns a short description for the log."""
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = samples
    scene.cycles.device = "CPU"
    device = "CPU"

    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        # Metal first on macOS; the others cover Windows and Linux.
        backends = ["METAL"] if sys.platform == "darwin" else ["OPTIX", "CUDA", "HIP", "ONEAPI", "METAL"]
        for backend in backends:
            try:
                prefs.compute_device_type = backend
            except TypeError:
                continue  # this build of Blender does not have that backend
            if hasattr(prefs, "refresh_devices"):
                prefs.refresh_devices()
            else:
                prefs.get_devices()
            gpus = [d for d in prefs.devices if d.type != "CPU"]
            if gpus:
                for d in prefs.devices:
                    d.use = d.type != "CPU"
                scene.cycles.device = "GPU"
                device = f"GPU ({backend}: {gpus[0].name})"
                break
        else:
            prefs.compute_device_type = "NONE"
    except Exception as err:  # never let device probing stop the bake
        print(f"GPU detection failed ({err}); using the CPU")
        scene.cycles.device = "CPU"
        device = "CPU"
    return device


def setup_world(strength, ao_distance):
    """Adds a plain white world light when the file has no lights of its own, and sets the AO distance."""
    scene = bpy.context.scene
    world = scene.world
    has_lights = any(o.type == "LIGHT" for o in scene.objects)
    if world is None:
        world = bpy.data.worlds.new("LightmapWorld")
        scene.world = world
    if not has_lights:
        world.use_nodes = True
        background = next((n for n in world.node_tree.nodes if n.type == "BACKGROUND"), None)
        if background is not None:
            background.inputs["Color"].default_value = (1.0, 1.0, 1.0, 1.0)
            background.inputs["Strength"].default_value = strength
    try:
        world.light_settings.distance = ao_distance
    except AttributeError:
        pass
    return has_lights


# ------------------------------------------------------------------------------------------------
# UV2
# ------------------------------------------------------------------------------------------------


def select_only(objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]


def group_meshes(meshes):
    """Groups meshes by their first material. Returns {group name: [objects]} in a stable order."""
    groups = {}
    for obj in sorted(meshes, key=lambda o: o.name):
        material = next((slot.material for slot in obj.material_slots if slot.material), None)
        groups.setdefault(material.name if material else "no_material", []).append(obj)
    return groups


def prepare_mesh(obj):
    """Makes the mesh data unique and adds the lightmap UV layer as the active (but not render) layer."""
    if obj.data.users > 1:
        # Instances share mesh data, but every instance needs its own place in the lightmap.
        obj.data = obj.data.copy()
    mesh = obj.data
    if len(mesh.uv_layers) == 0:
        mesh.uv_layers.new(name="UVMap")  # keeps TEXCOORD_0 in place so the lightmap lands on TEXCOORD_1
    layer = mesh.uv_layers.get(LIGHTMAP_UV) or mesh.uv_layers.new(name=LIGHTMAP_UV)
    if layer is None:
        raise RuntimeError(f"{obj.name}: could not add a UV layer (the mesh already has 8)")
    mesh.uv_layers.active = layer  # unwrap and bake use the active layer; rendering keeps the original


def unwrap_group(objects, size, margin_px):
    """Smart UV Project for the whole group at once, then one shared pack so islands never overlap."""
    for obj in objects:
        prepare_mesh(obj)
    select_only(objects)
    margin = margin_px / float(size)
    bpy.ops.object.mode_set(mode="EDIT")
    try:
        bpy.ops.mesh.select_all(action="SELECT")
        # Angle is in radians since Blender 2.91 (66 degrees is Blender's default).
        bpy.ops.uv.smart_project(angle_limit=1.15192, island_margin=margin, area_weight=0.0, scale_to_bounds=False)
        bpy.ops.uv.select_all(action="SELECT")
        bpy.ops.uv.pack_islands(margin=margin)
    finally:
        bpy.ops.object.mode_set(mode="OBJECT")


# ------------------------------------------------------------------------------------------------
# Baking
# ------------------------------------------------------------------------------------------------


def materials_of(objects):
    """All materials used by the objects. Meshes without one get a plain white material so they can bake."""
    found = []
    for obj in objects:
        if not any(slot.material for slot in obj.material_slots):
            fallback = bpy.data.materials.get("LightmapDefault") or bpy.data.materials.new("LightmapDefault")
            fallback.use_nodes = True
            if obj.material_slots:
                obj.material_slots[0].material = fallback
            else:
                obj.data.materials.append(fallback)
        for slot in obj.material_slots:
            if slot.material and slot.material not in found:
                found.append(slot.material)
    return found


def set_bake_target(materials, image):
    """Cycles bakes into the active image texture node of each material, so add one and make it active."""
    for material in materials:
        material.use_nodes = True
        nodes = material.node_tree.nodes
        node = nodes.get(BAKE_NODE) or nodes.new("ShaderNodeTexImage")
        node.name = BAKE_NODE
        node.image = image
        for other in nodes:
            other.select = False
        node.select = True
        nodes.active = node


def remove_bake_targets():
    for material in bpy.data.materials:
        if material.node_tree is None:
            continue
        node = material.node_tree.nodes.get(BAKE_NODE)
        if node is not None:
            material.node_tree.nodes.remove(node)


def silence_metals(materials):
    """A fully metallic surface has no diffuse response and would bake black. Returns a restore list."""
    saved = []
    for material in materials:
        if material.node_tree is None:
            continue
        for node in material.node_tree.nodes:
            if node.type != "BSDF_PRINCIPLED":
                continue
            socket = node.inputs.get("Metallic")
            if socket is not None and not socket.is_linked and socket.default_value > 0.0:
                saved.append((socket, socket.default_value))
                socket.default_value = 0.0
    return saved


def new_image(name, size):
    image = bpy.data.images.new(name, width=size, height=size, alpha=False, float_buffer=True)
    image.colorspace_settings.name = "Linear Rec.709" if "Linear Rec.709" in color_spaces() else "Linear"
    return image


def color_spaces():
    prop = bpy.types.ColorManagedInputColorspaceSettings.bl_rna.properties["name"]
    return {item.identifier for item in prop.enum_items}


def read_pixels(image):
    """Image pixels as a float32 array of shape (height * width, 4), linear values."""
    pixels = np.empty(image.size[0] * image.size[1] * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    return pixels.reshape(-1, 4)


def bake_group(objects, materials, size, margin, include_direct, label):
    """Bakes indirect diffuse and AO for one group. Returns (combined, ao) as linear float arrays."""
    scene = bpy.context.scene
    bake = scene.render.bake
    bake.margin = margin
    bake.use_clear = True
    bake.use_selected_to_active = False
    if hasattr(bake, "target"):
        bake.target = "IMAGE_TEXTURES"

    select_only(objects)

    # Pass 1: diffuse lighting without albedo. Indirect only by default.
    light_image = new_image(f"{label}_light", size)
    set_bake_target(materials, light_image)
    bake.use_pass_color = False
    bake.use_pass_indirect = True
    bake.use_pass_direct = include_direct
    passes = {"INDIRECT", "DIRECT"} if include_direct else {"INDIRECT"}
    bpy.ops.object.bake(type="DIFFUSE", pass_filter=passes, uv_layer=LIGHTMAP_UV, margin=margin, use_clear=True)
    light = read_pixels(light_image)

    # Pass 2: ambient occlusion.
    ao_image = new_image(f"{label}_ao", size)
    set_bake_target(materials, ao_image)
    bpy.ops.object.bake(type="AO", uv_layer=LIGHTMAP_UV, margin=margin, use_clear=True)
    ao = read_pixels(ao_image)

    combined = light.copy()
    combined[:, :3] *= ao[:, :3]
    combined[:, 3] = 1.0
    ao[:, 3] = 1.0

    bpy.data.images.remove(light_image)
    bpy.data.images.remove(ao_image)
    return combined, ao


# ------------------------------------------------------------------------------------------------
# Output
# ------------------------------------------------------------------------------------------------


def linear_to_srgb(values):
    values = np.clip(values, 0.0, 1.0)
    return np.where(values <= 0.0031308, values * 12.92, 1.055 * np.power(values, 1.0 / 2.4) - 0.055)


def save_exr(pixels, size, path):
    image = bpy.data.images.new(os.path.basename(path), width=size, height=size, alpha=False, float_buffer=True)
    image.pixels.foreach_set(pixels.ravel())
    image.filepath_raw = path
    image.file_format = "OPEN_EXR"
    image.save()
    bpy.data.images.remove(image)


def save_png(pixels, size, path, keep=False):
    """Writes linear pixels as an 8-bit sRGB PNG. The encoding is done here so no view transform sneaks in."""
    encoded = pixels.copy()
    encoded[:, :3] = linear_to_srgb(encoded[:, :3])
    image = bpy.data.images.new(os.path.basename(path), width=size, height=size, alpha=False, float_buffer=False)
    image.colorspace_settings.name = "sRGB"
    image.pixels.foreach_set(encoded.astype(np.float32).ravel())
    image.filepath_raw = path
    image.file_format = "PNG"
    image.save()
    if keep:
        return image
    bpy.data.images.remove(image)
    return None


def ensure_gltf_settings_group():
    """The node group the glTF exporter looks for to find an occlusion texture."""
    name = "glTF Material Output"  # Blender 3.4+; older versions call it "glTF Settings"
    group = bpy.data.node_groups.get(name)
    if group is None:
        group = bpy.data.node_groups.new(name, "ShaderNodeTree")
        if hasattr(group, "interface"):  # Blender 4.0+
            group.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
        else:
            group.inputs.new("NodeSocketFloat", "Occlusion")
        group.nodes.new("NodeGroupInput")
    return group


def embed_ao(materials, ao_image):
    """Wires the AO map into each material as glTF occlusion on the lightmap UVs.

    This makes the exported GLB carry occlusionTexture with texCoord 1, which three.js loads as aoMap
    on the second UV channel, and it guarantees the exporter keeps the lightmap UV layer.
    """
    group = ensure_gltf_settings_group()
    ao_image.colorspace_settings.name = "Non-Color"
    for material in materials:
        tree = material.node_tree
        if tree is None:
            continue
        for node in [n for n in tree.nodes if n.type == "GROUP" and n.node_tree == group]:
            tree.nodes.remove(node)  # replace any occlusion the file already had
        settings = tree.nodes.new("ShaderNodeGroup")
        settings.node_tree = group
        settings.location = (400, -400)
        texture = tree.nodes.new("ShaderNodeTexImage")
        texture.image = ao_image
        texture.location = (0, -400)
        uv = tree.nodes.new("ShaderNodeUVMap")
        uv.uv_map = LIGHTMAP_UV
        uv.location = (-300, -400)
        tree.links.new(uv.outputs["UV"], texture.inputs["Vector"])
        tree.links.new(texture.outputs["Color"], settings.inputs["Occlusion"])


def export_glb(path):
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", export_texcoords=True, export_normals=True)


def safe_file_name(name):
    return re.sub(r"[^A-Za-z0-9_-]+", "_", name).strip("_") or "group"


# ------------------------------------------------------------------------------------------------


def main():
    args = parse_args()
    out_dir = os.path.abspath(args.output_dir)
    os.makedirs(out_dir, exist_ok=True)

    reset_scene()
    meshes = import_scene(args.input)
    device = setup_cycles(args.samples)
    has_lights = setup_world(args.world_strength, args.ao_distance)
    groups = group_meshes(meshes)

    print(f"\nLightmap bake: {len(meshes)} meshes in {len(groups)} material group(s)")
    print(f"  device {device}, {args.samples} samples, {args.size}px, lights in file: {'yes' if has_lights else 'no'}")

    # Unwrap everything before baking anything: making mesh data unique must happen up front.
    for objects in groups.values():
        unwrap_group(objects, args.size, args.margin)

    manifest = {
        "source": os.path.basename(args.input),
        "scene": "scene_lightmapped.glb",
        "uvLayer": LIGHTMAP_UV,
        "uvChannel": 1,
        "size": args.size,
        "samples": args.samples,
        "passes": ["diffuse-indirect"] + (["diffuse-direct"] if args.direct else []) + ["ao"],
        "encoding": {"exr": "linear", "png": "srgb"},
        "groups": {},
        "meshes": {},
    }

    used_names = set()
    for index, (group_name, objects) in enumerate(groups.items(), start=1):
        base = safe_file_name(group_name)
        while base in used_names:
            base += "_"
        used_names.add(base)
        print(f"  [{index}/{len(groups)}] {group_name}: {len(objects)} mesh(es)")

        materials = materials_of(objects)
        restore = silence_metals(materials)
        try:
            combined, ao = bake_group(objects, materials, args.size, args.margin, args.direct, base)
        finally:
            for socket, value in restore:
                socket.default_value = value

        files = {"exr": f"{base}_lightmap.exr", "png": f"{base}_lightmap.png", "ao": f"{base}_ao.png"}
        save_exr(combined, args.size, os.path.join(out_dir, files["exr"]))
        save_png(combined, args.size, os.path.join(out_dir, files["png"]))
        ao_image = save_png(ao, args.size, os.path.join(out_dir, files["ao"]), keep=True)

        remove_bake_targets()
        if args.no_embed_ao:
            bpy.data.images.remove(ao_image)
        else:
            try:
                embed_ao(materials, ao_image)
            except Exception as err:  # the lightmaps are already on disk; the embed is a convenience
                print(f"      could not wire the AO map into the materials ({err}); continuing")

        manifest["groups"][group_name] = {"files": files, "meshes": [o.name for o in objects]}
        for obj in objects:
            manifest["meshes"][obj.name] = {
                "group": group_name,
                "image": files["png"],
                "imageExr": files["exr"],
                "ao": files["ao"],
                "uvLayer": LIGHTMAP_UV,
                "uvChannel": obj.data.uv_layers.find(LIGHTMAP_UV),
            }

    remove_bake_targets()
    glb_path = os.path.join(out_dir, "scene_lightmapped.glb")
    export_glb(glb_path)

    with open(os.path.join(out_dir, "lightmaps.json"), "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")

    print(f"\nDone. {len(groups)} lightmap(s), lightmaps.json and scene_lightmapped.glb written to {out_dir}")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        # In --background mode Blender exits 0 after a Python error unless told otherwise.
        import traceback

        traceback.print_exc()
        sys.exit(1)

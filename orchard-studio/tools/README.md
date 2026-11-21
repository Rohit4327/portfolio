# Asset tools

The app runs fully without any of this. Every texture, the studio light and the sky have built-in
procedural versions. These scripts only swap in higher-quality CC0 assets when you want them.

```sh
npm run assets:fetch       # download the CC0 source files into assets-raw/
npm run assets:optimize    # convert them into public/
```

## 1. `fetch-assets.mjs`

Downloads a fixed list of Poly Haven assets through the public API (`https://api.polyhaven.com/files/<id>`).
The list is the `ASSETS` const at the top of the script.

| Asset id                               | Type    | Replaces                          |
| -------------------------------------- | ------- | --------------------------------- |
| `studio_small_08`                      | HDRI    | presentation room light           |
| `kloofendal_48d_partly_cloudy_puresky` | HDRI    | walkthrough sky                   |
| `oak_veneer_01`                        | texture | white-oak furniture and table     |
| `laminate_floor_02`                    | texture | timber floor                      |
| `terrazzo_tiles`                       | texture | terrazzo surfaces                 |
| `grey_plaster_02`                      | texture | painted plaster walls and ceiling |
| `fabric_pattern_07`                    | texture | upholstery fabric                 |

```sh
npm run assets:fetch                                   # 2k; skips files already on disk
npm run assets:fetch -- --dry-run                      # print the URLs, write nothing
npm run assets:fetch -- --force                        # download again
npm run assets:fetch -- --res=4k --only=oak_veneer_01  # 4k table top for Ultra
npm run assets:fetch -- --maps=color,normal,roughness,ao
```

Written to `assets-raw/` (git-ignored):

```
assets-raw/<id>/<id>_2k.hdr                    HDRIs
assets-raw/<id>/<id>_diff_2k.jpg               colour
assets-raw/<id>/<id>_nor_gl_2k.jpg             normal (OpenGL)
assets-raw/<id>/<id>_rough_2k.jpg              roughness
assets-raw/<id>/LICENSE.txt
assets-raw/fetched.json                        what is available locally
```

Downloads are checked against the size and MD5 the API reports. If an id is missing or the network
is down, the script says so in the table and still exits 0. Nothing in the app depends on it.

## 2. `optimize-assets.mjs`

Converts everything in `assets-raw/` into `public/`.

| Input                               | Output                            | How                                       |
| ----------------------------------- | --------------------------------- | ----------------------------------------- |
| `assets-raw/<id>/*.hdr`             | `public/hdri/<id>_2k.hdr`         | copied unchanged (RGBELoader reads it)    |
| `assets-raw/<id>/*.jpg` or `*.png`  | `public/textures/<id>_<map>.ktx2` | `toktx`, when it is on your PATH          |
|                                     | `public/textures/<id>_<map>.webp` | `sharp`, when it is not                   |
| `assets-raw/models/*.glb`, `*.gltf` | `public/models/<name>.glb`        | `gltf-transform optimize` (Meshopt, WebP) |

`<map>` is one of `color`, `normal`, `roughness`, `ao`. It also writes `public/textures/index.json`
(every file produced, with its source, format and size) and prints a table with the total. It warns
when the total is over the 60 MB first-load budget.

```sh
npm run assets:optimize
npm run assets:optimize -- --max=4096    # keep 4k sources at 4k (default cap 2048, never enlarges)
npm run assets:optimize -- --webp        # write WebP even if toktx is installed
```

Settings:

- WebP: quality 82 for colour, 90 for normal, roughness and AO.
- KTX2: ETC1S/BasisLZ for colour (sRGB) and roughness/AO (linear), UASTC for normals (linear), all with mipmaps.
- If a folder has the same map at two resolutions, the larger one is used.
- Displacement, DirectX normal and `arm` maps are ignored.

`--normal-mode` adds toktx's `--normal_mode` for normal maps. It is off by default on purpose: that
flag stores X and Y in two channels and drops Z, which the stock three.js materials do not rebuild,
so normals would render wrong. Turn it on only with a shader that reconstructs Z.

The script does not edit `public/available.json`.

## 3. `bake_lightmaps.py` (optional)

Bakes indirect light and ambient occlusion into a second UV channel with Blender and Cycles.

```sh
blender --background --python tools/bake_lightmaps.py -- scene.glb lightmaps/ --size 2048 --samples 128
```

Input is a GLB exported from the app's scene. In the output folder you get:

```
<material>_lightmap.exr     linear float
<material>_lightmap.png     8-bit sRGB, for the web
<material>_ao.png           AO only
lightmaps.json              mesh name -> image and UV channel
scene_lightmapped.glb       the scene with UV2 ("UVMap_lightmap", TEXCOORD_1)
```

Meshes are grouped by their first material, one lightmap per group. Extra options: `--margin 8`,
`--ao-distance 1.5`, `--world-strength 1.0`, `--direct` (bake direct light too), `--no-embed-ao`.
If the GLB has no lights, a plain white world lights the bake. This script has not been run in the
build environment (no Blender there), so check the first bake by eye.

## Adding an ambientCG texture by hand

ambientCG is not downloaded automatically. To add one:

1. Download the 2K-JPG zip from `https://ambientcg.com/a/<AssetId>` and unzip it.
2. Make `assets-raw/<name>/` (lower-case, underscores; this becomes the output name).
3. Copy the colour, NormalGL and roughness files in. Either keep ambientCG's names
   (`Wood049_2K-JPG_Color.jpg`, `..._NormalGL.jpg`, `..._Roughness.jpg`, `..._AmbientOcclusion.jpg`)
   or rename them to the Poly Haven pattern (`<name>_diff_2k.jpg`, `<name>_nor_gl_2k.jpg`,
   `<name>_rough_2k.jpg`, `<name>_ao_2k.jpg`). Both are recognised. Leave out NormalDX.
4. Add `assets-raw/<name>/LICENSE.txt` with `CC0 1.0, ambientCG, https://ambientcg.com/a/<AssetId>`.
5. Run `npm run assets:optimize`.

## Licences

- Poly Haven: CC0 1.0, no attribution required. A `LICENSE.txt` is written next to each asset.
- ambientCG: CC0 1.0, added by hand as above.

## Optional tools

| Tool      | Needed for                        | Install (macOS)                                                                  |
| --------- | --------------------------------- | -------------------------------------------------------------------------------- |
| `toktx`   | KTX2 textures instead of WebP     | KTX-Software: `brew install ktx` or the installer from KhronosGroup/KTX-Software |
| `blender` | `bake_lightmaps.py` only          | blender.org, then put `blender` on your PATH                                     |
| `ffmpeg`  | nothing; only reported if present | not required                                                                     |

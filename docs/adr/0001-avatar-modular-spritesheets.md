# ADR-0001: Modular Spritesheets and XML Atlases for Avatar System

## Status
Accepted

## Context
Avatars previously relied on procedural 2D canvas drawing routines (programmatic lines, curves, and rectangles) for modular parts like hair, clothes, eyes, and accessories. While lightweight, procedural rendering made it difficult to edit presets pixel-by-pixel, prevented standard game art tooling workflows, and limited modular artistic expansion.

## Decision
Transition the avatar rendering and preset architecture to industry-standard modular Sprite Sheets (PNG) paired with Sprite Atlas XML files in Sparrow/TexturePacker format containing frame coordinates and subtexture bounding boxes. Presets will be loaded, layered, and rendered as composite static/animated sprites rather than procedural code paths.

### Detailed Specifications
1. **Atlas Format**: Sparrow / Starling XML (`<TextureAtlas><SubTexture name="..." x="..." y="..." width="..." height="..."/></TextureAtlas>`).
2. **Directory Structure**: Category-based atlas files stored under `public/assets/avatar/` (e.g. `hair.png` + `hair.xml`, `tops.png` + `tops.xml`).
3. **Subtexture Naming**: `<category>_<presetId>_<direction>_<frame>` (e.g. `hair_anime_down_0`). `left` is rendered via programmatic horizontal flip of `right`.
4. **Preset Authoring & Bake on Demand**: Editing an existing preset uses an offscreen 32x32 canvas rasterization buffer loaded into the Pixel Art Studio. New/edited presets are saved as copies into `nativeAssets.json`.
5. **Hybrid Fallback**: `AvatarRenderer` resolves from `AvatarAtlasManager` first, then custom native assets, falling back to legacy procedural renderers for unmigrated parts.


## Consequences
- Presets can be cleanly edited, extracted, and authored in the Pixel Art Studio.
- New presets can be appended to the XML atlas and sprite sheets without writing TypeScript drawing code.
- A parser for XML atlas metadata and caching loader for spritesheets is introduced into the engine pipeline.
- Existing procedural renderers will serve as a backward-compatible fallback during the progressive migration of all assets.

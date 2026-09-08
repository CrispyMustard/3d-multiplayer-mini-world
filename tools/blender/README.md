# Blender asset pipeline

Run the headless generator whenever the source models change:

```bash
blender --background --python tools/blender/build_assets.py
```

The script exports optimized web-ready GLB files into `public/models/`. Keep
model origins at ground level, use meters, and preserve the `Tunic` material
name so the game can apply each player's selected color.

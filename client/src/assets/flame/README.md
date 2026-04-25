# Custom Flame Animation Asset

Drop your flame animation file here as **`flame.webm`** (preferred) or **`flame.mp4`**.

The `AnimatedFlame` component (in `src/components/AnimatedFlame.jsx`) auto-detects the file at build time and uses it instead of the default Lucide + framer-motion fallback.

## Recommended: WebM with alpha (transparency)

WebM with VP9 + alpha works in all modern browsers (Chrome, Firefox, Edge, Safari 14.1+) and properly composites onto any background — light, dark, gradient.

## Convert your MP4 → WebM with alpha (ffmpeg)

### Case A: Source MP4 already has alpha channel (rare)
```bash
ffmpeg -i flame.mp4 -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 1M -auto-alt-ref 0 -an flame.webm
```

### Case B: Source MP4 has SOLID BLACK background
Use `colorkey` filter to chroma-key out black:
```bash
ffmpeg -i flame.mp4 -filter_complex "[0:v]colorkey=0x000000:0.30:0.10[ck]" -map "[ck]" -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 1M -auto-alt-ref 0 -an flame.webm
```

Tweak the `0.30` (similarity) and `0.10` (blend) thresholds if edges look harsh:
- `0x000000:0.30:0.10` — black, moderate tolerance
- `0x000000:0.40:0.20` — more aggressive (use if dark edges remain)

### Case C: Source MP4 has SOLID WHITE background
Use `colorkey` filter — start with **low tolerance** because flames often have white-hot highlights:
```bash
ffmpeg -i flame.mp4 -filter_complex "[0:v]colorkey=0xFFFFFF:0.20:0.05[ck]" -map "[ck]" -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 1M -auto-alt-ref 0 -an flame.webm
```

Tweaks:
- `0xFFFFFF:0.20:0.05` — safe default for flame with bright core
- `0xFFFFFF:0.30:0.10` — more aggressive (raise if white halo remains around edges)
- `0xFFFFFF:0.12:0.03` — minimal (lower if hot core becomes transparent)

For softer edges, prefer `chromakey` (YUV-based, anti-aliased):
```bash
ffmpeg -i flame.mp4 -filter_complex "[0:v]chromakey=0xFFFFFF:0.15:0.10[ck]" -map "[ck]" -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 1M -auto-alt-ref 0 -an flame.webm
```

### Case D: Green-screen MP4
```bash
ffmpeg -i flame.mp4 -filter_complex "[0:v]chromakey=0x00FF00:0.10:0.05[ck]" -map "[ck]" -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 1M -auto-alt-ref 0 -an flame.webm
```

## Tips
- Keep file under **200 KB** (it's loaded everywhere streak is shown).
- Trim to one clean loop cycle (1–2 seconds is ideal).
- Square aspect ratio works best for icon use (e.g. 64×64 or 128×128).
- Test the result in a browser before deploying — open the `.webm` directly to verify alpha.

## Trim & resize before encoding
```bash
ffmpeg -i raw.mp4 -t 2 -vf "scale=128:128" -c:v libx264 -preset slow trimmed.mp4
```

## File presence behavior
- **No file present** → component falls back to Lucide Flame + framer-motion flicker (current default).
- **`flame.webm` present** → renders as `<video autoplay loop muted>` with playback rate scaling by streak.
- **`flame.mp4` present (no webm)** → same as above. No transparency on most browsers; flame's background will be visible.

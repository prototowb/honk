---
name: Manage content queue & schedule
description: Manage the content dashboard, review queued content, generate platform-specific visuals, schedule posts, and publish to Instagram, Facebook, X, and TikTok. ALWAYS use this skill when the user wants to publish, post, schedule, queue, or review social media content — even if they don't say "output manager" or "queue." Also triggers when the user says "post this," "publish concept X," "schedule for Tuesday," or "what's in my queue."
---

# Output Manager Skill

This skill manages the full end-to-end publishing workflow: queue dashboard, image generation, scheduling, and platform publishing.

## What to do

### Dashboard & Queue Management
- Display all pipeline outputs in a structured queue/dashboard format
- Show status for each piece of content:
  - **Draft**: Ready for review
  - **Approved**: Ready to schedule
  - **Scheduled**: Queued for posting
  - **Published**: Live on platforms
- Allow the user to review, approve, or request changes on any content

### Scheduling
- Accept scheduling preferences:
  - Post immediately
  - Schedule for a specific date/time
  - Save as draft for later
- Support variable frequencies (1-2x weekly to multiple daily)
- Track posting schedule across all platforms

---

## Visual Content Generation (Mandatory Pre-Publish Step)

**Always generate platform-specific images before publishing to any visual platform (Instagram, Facebook, TikTok) — unless the user explicitly provides an image URL or says to skip.**

This step runs at publish time, after the user has selected which concept(s) to post.

---

### Step 1: Write copy for the visual

Before touching Canva, extract and rewrite the content for visual use. Think like a conversion copywriter and creative director — visuals have zero tolerance for filler.

**Rules (non-negotiable):**

1. **No clichés.** Never write "Unlock," "Revolutionize," "Tapestry," "Elevate," "Delve," "Discover," "Transform," or anything that sounds like a template. They signal low effort and kill engagement.
2. **Short and punchy.** Headlines ≤ 6 w
---

## Logo Overlay (Optional — runs after image generation)

If `include_logo` is true (default) and the brand logo is not already in the image, composite the protocode logo onto the bottom-right corner of the generated image using the following Python/Pillow function.

### Logo generation function

```python
import math
from PIL import ImageDraw

def draw_protocode_logo(draw, ox, oy, scale=1.0):
    """
    Draws the protocode_ pentagon-network logo.
    ox, oy = center point of the logo.
    scale  = size multiplier (default 1.0 ≈ 110px wide).

    Design: regular pentagon (point up), dark fill, thin connector lines
    from center to each vertex and between vertices. Six equally-sized
    hexagonal nodes — one per vertex + center — shaded white→gray by position.
    Small detached hexagon upper-right outside the pentagon.
    """
    s = scale
    R = 50 * s  # pentagon circumradius

    def solid_hex(draw, cx, cy, r, fill):
        pts = [
            (cx + r * math.cos(math.radians(60 * i - 30)),
             cy + r * math.sin(math.radians(60 * i - 30)))
            for i in range(6)
        ]
        draw.polygon(pts, fill=fill)

    # Pentagon vertices — point at top
    verts = [
        (ox + R * math.cos(math.radians(72 * i - 90)),
         oy + R * math.sin(math.radians(72 * i - 90)))
        for i in range(5)
    ]

    # Pentagon body
    draw.polygon(verts, fill="#1A1D24")

    # Connector lines
    line_col = "#555E6B"
    for vx, vy in verts:
        draw.line([(ox, oy), (vx, vy)], fill=line_col, width=max(1, int(1.5 * s)))
    for i in range(5):
        draw.line([verts[i], verts[(i + 1) % 5]], fill=line_col, width=max(1, int(s)))

    # Vertex nodes — same size, shaded white → dark going clockwise from top
    NR = 9 * s
    shades = ["#DDDFE3", "#9EA4AE", "#B5BAC1", "#4E555F", "#6B7280"]
    for i, (vx, vy) in enumerate(verts):
        solid_hex(draw, vx, vy, NR, shades[i])

    # Center node
    solid_hex(draw, ox, oy, NR, "#8A9099")

    # Small detached node — upper-right of pentagon
    solid_hex(draw, ox + R * 0.85, oy - R * 1.08, 5 * s, "#3D444E")


# Usage — call after image is created, before saving:
# draw = ImageDraw.Draw(img)
# draw_protocode_logo(draw, ox=img.width - 108, oy=img.height - 86, scale=1.15)
```

### Logo placement defaults

| Platform  | `ox` (from right) | `oy` (from bottom) | scale |
|-----------|-------------------|--------------------|-------|
| Instagram | W − 108           | H − 86             | 1.15  |
| Facebook  | W − 90            | H − 72             | 0.95  |
| TikTok    | W − 108           | H − 100            | 1.15  |

### Override

If the user provides a `PROTOCODE_LOGO_URL`, download the image and composite it instead:
```python
from PIL import Image
import urllib.request

logo = Image.open(urllib.request.urlopen(PROTOCODE_LOGO_URL)).convert("RGBA")
logo = logo.resize((110, 110))
img.paste(logo, (img.width - 130, img.height - 130), logo)
```

# Design Guide

Brand visual reference for content produced through this pipeline. Living document — extend it as new concepts establish new conventions.

## Color palette

Sourced from [rawrco.de](https://rawrco.de), **"proto" theme**.

| Role | Hex | Notes |
|---|---|---|
| Accent 1 | `#8ac0dd` | Used for body/font text |
| Accent 2 | `#1df7ed` | Used for anchor tags / hover states |
| Background (dark) | `#05091e` | Primary/darkest background |
| Background (light) | `#121b33` | Secondary/lighter background, for layering and contrast against the dark background |

> When picking text-on-background combinations, lean on the two backgrounds for depth (dark base, lighter panels/cards) and reserve the accents for emphasis — links, highlights, callouts, stat call-outs — rather than large fill areas.

## Image assembly workflow (the Canva "workaround")

For Concept 1's Instagram graphic, Canva's own generation didn't produce usable results for our visual style — so the image itself was **assembled outside Canva**. Canva's role was narrowed to one job: producing a **public, signed export URL** for the finished image, since both the Instagram and (planned) X/TikTok posting flows require a publicly accessible URL rather than a local file.

Rough flow:
1. Assemble/compose the actual graphic outside Canva (the tool that actually matched our design intent).
2. Bring the finished image into Canva solely to use its export pipeline.
3. Export to get a signed public URL.
4. Use that URL immediately in the post call — **signed URLs expire in roughly an hour**, so re-export fresh right before each posting attempt rather than reusing an older link (see the README's Instagram gotchas for the debugging detour this caused).

## Design philosophy

- **Always use the image as the backdrop.** Text and graphic elements sit on top of a full-bleed image/background rather than the image being a secondary or inset element — this is the core compositional rule for this brand's content.

## Open items

- [ ] Document the actual external tool/method used to assemble the image (the "outside of Canva" step) once recalled/decided for future concepts
- [ ] Typography choices (typeface, weights, sizing conventions)
- [ ] Layout conventions per platform (IG square/portrait, X card, TikTok 9:16)
- [ ] Logo/watermark placement rules, if any
- [ ] Any reusable templates or brand-kit assets in Canva worth standardizing on

*(towb: add to this as it solidifies — this file is meant to absorb the lessons from each concept, the same way the README absorbs platform setup gotchas.)*

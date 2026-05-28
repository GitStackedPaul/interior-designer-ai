# Item Placement Feature — Design Spec

**Date:** 2026-05-28
**Status:** Approved

## Context

Interior Designer AI is used by Rina (interior designer) with clients mid-project to validate design direction before committing to purchases. This feature lets her upload photos of specific furniture items, drag and resize them onto the room photo to indicate placement, then generate an AI redesign that incorporates those items at their indicated positions.

## Layout

The page is restructured into three zones:

1. **Top bar** — design controls (theme, room, generate button) + item upload slots, side by side in a compact horizontal row
2. **Main area (left, ~⅔ width)** — large placement canvas where the room photo fills the working area and items are dragged/resized
3. **Right panel (~⅓ width)** — room photo upload (top) + AI output with download button (bottom)

## Components

### `ItemUploadSlots` (new)

- 3 square thumbnail slots in the top bar
- Click to upload a photo (JPEG/PNG, max 5MB — same validation as room photo)
- Filled slot shows thumbnail with red × badge to remove
- Empty slot shows + icon

### `PlacementCanvas` (new)

- Renders the uploaded room photo as a full-size background
- Each uploaded item appears as a draggable, resizable overlay
  - Blue border + label showing item name
  - Resize handle in the bottom-right corner
  - Drag anywhere on the canvas to reposition
- Exposes a `getComposite(): string` method that uses the HTML Canvas API to flatten the room photo + all placed items at their current positions/sizes into a single base64 PNG

### `app/(main)/page.tsx` (modified)

- New state: `itemImages: string[]` (up to 3 base64 strings)
- New state: `placements: { id: string; x: number; y: number; width: number; height: number }[]`
- Page layout updated to match the three-zone design above

### `app/api/generate/route.ts` (renamed from `/api/replicate`)

- Accepts `{ image: string, composite: string, theme: string, room: string }`
- Converts both base64 strings to `File` objects
- Passes `[roomPhotoFile, compositeFile]` to `openai.images.edit`
- Prompt: `"Redesign this ${room} in ${theme} style. The second image shows furniture items placed at their intended positions in the room — incorporate those furniture pieces into the redesign at the indicated positions. High quality, photorealistic, editorial style, 4k."`
- Returns `{ output: ["data:image/png;base64,..."] }`

## Data Flow

1. Rina uploads room photo → renders as canvas background
2. She uploads up to 3 item photos → appear in top bar slots
3. She drags each item onto the canvas and resizes to match room scale
4. Hits **Generate**:
   - Canvas flattens to composite base64 (HTML Canvas API)
   - POST to `/api/generate` with `{ image: roomPhoto, composite, theme, room }`
   - API calls `gpt-image-1` `images.edit` with both images
   - Output rendered in right panel
5. **Download** button saves output image via `file-saver`

## Out of Scope

- Session saving / client management
- Emailing results (Rina downloads and sends manually)
- More than 3 item photos

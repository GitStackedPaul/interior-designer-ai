# Item Placement Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Rina upload up to 3 furniture photos, drag and resize them onto the room photo to indicate placement, then generate an AI redesign that incorporates those items at their indicated positions.

**Architecture:** A new `PlacementCanvas` component renders the room photo as a full-size background with draggable/resizable item overlays. On generate, the canvas is flattened to a composite PNG using the HTML Canvas API. Both the original room photo and composite are sent to a renamed `/api/generate` route that passes them to OpenAI `gpt-image-1` `images.edit`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, OpenAI SDK (`openai@6`)

---

### Task 1: Rename API route from `/api/replicate` to `/api/generate`

**Files:**

- Create: `app/api/generate/route.ts`
- Modify: `app/(main)/page.tsx` (fetch URL only)
- Delete: `app/api/replicate/route.ts`

- [ ] **Step 1: Create the new route file**

Create `app/api/generate/route.ts` with the exact same content as the existing `app/api/replicate/route.ts`:

```typescript
import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  const req = await request.json();
  const { image, theme, room } = req;

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64Data, "base64");
  const imageFile = new File([imageBuffer], "room.png", { type: "image/png" });

  const prompt = `Transform this ${room} into a ${theme} style interior design. High quality, photorealistic, editorial style photo, symmetry, natural light, 4k, award-winning interior photography`;

  try {
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const b64Image = response.data[0]?.b64_json;

    if (!b64Image) {
      return NextResponse.json(
        { error: "No image generated" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { output: [`data:image/png;base64,${b64Image}`] },
      { status: 201 }
    );
  } catch (err) {
    console.error("OpenAI error:", err);
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update fetch URL in page.tsx**

In `app/(main)/page.tsx`, change line 48:

```typescript
// Before
const response = await fetch("/api/replicate", {
// After
const response = await fetch("/api/generate", {
```

- [ ] **Step 3: Delete the old route**

Delete `app/api/replicate/route.ts`. The directory `app/api/replicate/` can be removed entirely.

- [ ] **Step 4: Verify**

Run `bun dev`. Open http://localhost:3000, upload a room photo, hit Generate. Confirm it still works (check browser Network tab — request should go to `/api/generate`).

- [ ] **Step 5: Commit**

```bash
git add app/api/generate/route.ts app/(main)/page.tsx
git rm app/api/replicate/route.ts
git commit -m "feat: rename API route from /api/replicate to /api/generate"
```

---

### Task 2: Add types for item slots and placements

**Files:**

- Modify: `types/index.ts`

- [ ] **Step 1: Add types**

Append to `types/index.ts`:

```typescript
export interface ItemSlot {
  id: string;
  imageUrl: string; // base64 data URL
  filename: string;
}

export interface Placement {
  id: string; // matches ItemSlot.id
  x: number; // 0–1, relative to canvas container width
  y: number; // 0–1, relative to canvas container height
  width: number; // 0–1, relative to canvas container width
  height: number; // 0–1, relative to canvas container height
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add ItemSlot and Placement types"
```

---

### Task 3: Build `ItemUploadSlots` component

**Files:**

- Create: `components/item-upload-slots.tsx`

Renders 3 square slots in a horizontal row. Filled slots show a thumbnail with a red × badge. Empty slots show a + button. Clicking any empty slot opens the file picker. Items appear on the canvas immediately after upload (handled by the parent via `onAdd`).

- [ ] **Step 1: Create the component**

Create `components/item-upload-slots.tsx`:

```typescript
"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from "@/lib/constants";
import type { ItemSlot } from "@/types";

interface ItemUploadSlotsProps {
  items: ItemSlot[];
  onAdd: (item: ItemSlot) => void;
  onRemove: (id: string) => void;
}

export function ItemUploadSlots({ items, onAdd, onRemove }: ItemUploadSlotsProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) return;
    if (file.size > MAX_FILE_SIZE) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      onAdd({
        id: crypto.randomUUID(),
        imageUrl: reader.result as string,
        filename: file.name,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />
      {[0, 1, 2].map((i) => {
        const item = items[i];
        return item ? (
          <div key={item.id} className="relative flex-shrink-0">
            <div className="h-14 w-14 overflow-hidden rounded-lg border-2 border-indigo-500">
              <img
                src={item.imageUrl}
                alt={item.filename}
                className="h-full w-full object-cover"
              />
            </div>
            <button
              onClick={() => onRemove(item.id)}
              className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ) : (
          <button
            key={i}
            onClick={() => items.length < 3 && inputRef.current?.click()}
            disabled={items.length !== i}
            className="flex h-14 w-14 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-indigo-500/30 text-xl text-muted-foreground/40 transition-colors hover:border-indigo-500/60 disabled:cursor-default disabled:opacity-30"
          >
            +
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify it renders**

Temporarily add `<ItemUploadSlots items={[]} onAdd={() => {}} onRemove={() => {}} />` somewhere in `page.tsx`, open http://localhost:3000 and confirm 3 empty slots appear. Remove the temporary addition.

- [ ] **Step 3: Commit**

```bash
git add components/item-upload-slots.tsx
git commit -m "feat: add ItemUploadSlots component"
```

---

### Task 4: Build `PlacementCanvas` component

**Files:**

- Create: `components/placement-canvas.tsx`

The large working area. Renders the room photo as a full-size `object-cover` background. Each placement renders as an absolutely-positioned div (percentage-based) showing the item image with a blue border. A resize handle (blue square) sits in the bottom-right corner. Mouse events on the container handle both drag (move) and resize. Exposes `getComposite` via a ref so the parent can call it on Generate.

- [ ] **Step 1: Create the component**

Create `components/placement-canvas.tsx`:

```typescript
"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { ItemSlot, Placement } from "@/types";

interface PlacementCanvasProps {
  roomImage: string | null;
  items: ItemSlot[];
  placements: Placement[];
  onPlacementsChange: (placements: Placement[]) => void;
  getCompositeRef: React.MutableRefObject<(() => Promise<string>) | null>;
}

type DragState = {
  id: string;
  type: "move" | "resize";
  startX: number;
  startY: number;
} | null;

export function PlacementCanvas({
  roomImage,
  items,
  placements,
  onPlacementsChange,
  getCompositeRef,
}: PlacementCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<DragState>(null);

  const getComposite = useCallback(async (): Promise<string> => {
    if (!roomImage) throw new Error("No room image");

    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }

      const roomImg = new Image();
      roomImg.onload = async () => {
        ctx.drawImage(roomImg, 0, 0, canvas.width, canvas.height);

        for (const placement of placements) {
          const slot = items.find((s) => s.id === placement.id);
          if (!slot) continue;
          await new Promise<void>((res) => {
            const itemImg = new Image();
            itemImg.onload = () => {
              const x = placement.x * canvas.width;
              const y = placement.y * canvas.height;
              const w = placement.width * canvas.width;
              const h = placement.height * canvas.height;
              ctx.drawImage(itemImg, x, y, w, h);
              res();
            };
            itemImg.src = slot.imageUrl;
          });
        }

        resolve(canvas.toDataURL("image/png"));
      };
      roomImg.onerror = () => reject(new Error("Failed to load room image"));
      roomImg.src = roomImage;
    });
  }, [roomImage, items, placements]);

  useEffect(() => {
    getCompositeRef.current = getComposite;
  }, [getComposite, getCompositeRef]);

  const handleMouseDown = (
    e: React.MouseEvent,
    id: string,
    type: "move" | "resize"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging({ id, type, startX: e.clientX, startY: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const dx = (e.clientX - dragging.startX) / rect.width;
    const dy = (e.clientY - dragging.startY) / rect.height;

    onPlacementsChange(
      placements.map((p) => {
        if (p.id !== dragging.id) return p;
        if (dragging.type === "move") {
          return {
            ...p,
            x: Math.max(0, Math.min(1 - p.width, p.x + dx)),
            y: Math.max(0, Math.min(1 - p.height, p.y + dy)),
          };
        }
        return {
          ...p,
          width: Math.max(0.05, Math.min(1 - p.x, p.width + dx)),
          height: Math.max(0.05, Math.min(1 - p.y, p.height + dy)),
        };
      })
    );
    setDragging({ ...dragging, startX: e.clientX, startY: e.clientY });
  };

  const handleMouseUp = () => setDragging(null);

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden rounded-xl border-2 border-indigo-500/30 bg-black/50"
      style={{ minHeight: "420px" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {roomImage ? (
        <img
          src={roomImage}
          alt="Room"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <span className="text-5xl">🏠</span>
          <span className="font-mono text-xs">Upload a room photo to start</span>
        </div>
      )}

      {placements.map((p) => {
        const slot = items.find((s) => s.id === p.id);
        if (!slot) return null;
        return (
          <div
            key={p.id}
            className="absolute cursor-move rounded border-2 border-indigo-400"
            style={{
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              width: `${p.width * 100}%`,
              height: `${p.height * 100}%`,
            }}
            onMouseDown={(e) => handleMouseDown(e, p.id, "move")}
          >
            <img
              src={slot.imageUrl}
              alt={slot.filename}
              className="h-full w-full rounded object-cover opacity-80"
              draggable={false}
            />
            {/* Resize handle */}
            <div
              className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize rounded-tl bg-indigo-400"
              onMouseDown={(e) => handleMouseDown(e, p.id, "resize")}
            />
            {/* Label */}
            <div className="absolute -bottom-5 left-0 whitespace-nowrap rounded bg-indigo-500 px-1 font-mono text-[9px] text-white">
              {slot.filename}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/placement-canvas.tsx
git commit -m "feat: add PlacementCanvas component with drag/resize and composite export"
```

---

### Task 5: Update `/api/generate` to accept and use composite image

**Files:**

- Modify: `app/api/generate/route.ts`

- [ ] **Step 1: Update the route**

Replace the full contents of `app/api/generate/route.ts`:

```typescript
import { NextResponse } from "next/server";
import OpenAI from "openai";

function toFile(base64: string, name: string): File {
  const data = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(data, "base64");
  return new File([buffer], name, { type: "image/png" });
}

export async function POST(request: Request) {
  const req = await request.json();
  const { image, composite, theme, room } = req;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const roomFile = toFile(image, "room.png");
  const images: File[] = [roomFile];

  if (composite && composite !== image) {
    images.push(toFile(composite, "composite.png"));
  }

  const hasPlacement = images.length > 1;
  const prompt = hasPlacement
    ? `Redesign this ${room} in ${theme} style. The second image shows furniture items placed at their intended positions in the room — incorporate those furniture pieces into the redesign at the indicated positions. High quality, photorealistic, editorial style photo, 4k.`
    : `Transform this ${room} into a ${theme} style interior design. High quality, photorealistic, editorial style photo, symmetry, natural light, 4k, award-winning interior photography`;

  try {
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: images.length === 1 ? images[0] : images,
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const b64Image = response.data[0]?.b64_json;
    if (!b64Image) {
      return NextResponse.json(
        { error: "No image generated" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { output: [`data:image/png;base64,${b64Image}`] },
      { status: 201 }
    );
  } catch (err) {
    console.error("OpenAI error:", err);
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/generate/route.ts
git commit -m "feat: update /api/generate to accept composite image for item placement"
```

---

### Task 6: Restructure page layout and wire up all state

**Files:**

- Modify: `app/(main)/page.tsx`
- Modify: `components/design-controls.tsx` (add `compact` prop)

- [ ] **Step 1: Add `compact` prop to DesignControls**

Replace the full contents of `components/design-controls.tsx`:

```typescript
"use client";

import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { ROOM_TYPES, DESIGN_THEMES } from "@/lib/constants";
import type { RoomType, DesignTheme } from "@/types";

interface DesignControlsProps {
  selectedTheme: DesignTheme;
  selectedRoom: RoomType;
  onThemeChange: (theme: DesignTheme) => void;
  onRoomChange: (room: RoomType) => void;
  onGenerate: () => void;
  isLoading: boolean;
  canGenerate: boolean;
  compact?: boolean;
}

export function DesignControls({
  selectedTheme,
  selectedRoom,
  onThemeChange,
  onRoomChange,
  onGenerate,
  isLoading,
  canGenerate,
  compact = false,
}: DesignControlsProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Combobox
          options={DESIGN_THEMES}
          value={selectedTheme}
          onValueChange={onThemeChange}
          placeholder="Theme..."
          searchPlaceholder="Search themes..."
          emptyText="No theme found."
          disabled={isLoading}
        />
        <Combobox
          options={ROOM_TYPES}
          value={selectedRoom}
          onValueChange={onRoomChange}
          placeholder="Room..."
          searchPlaceholder="Search rooms..."
          emptyText="No room found."
          disabled={isLoading}
        />
        <Button
          onClick={onGenerate}
          disabled={!canGenerate || isLoading}
          className="flex-shrink-0"
        >
          {isLoading ? (
            <>
              <Wand2 className="animate-pulse" />
              Generating
            </>
          ) : (
            <>
              <Wand2 />
              Generate
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="flex flex-1 flex-col gap-3">
          <label className="text-sm font-medium">Design Theme</label>
          <Combobox
            options={DESIGN_THEMES}
            value={selectedTheme}
            onValueChange={onThemeChange}
            placeholder="Select theme..."
            searchPlaceholder="Search themes..."
            emptyText="No theme found."
            disabled={isLoading}
          />
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <label className="text-sm font-medium">Room Type</label>
          <Combobox
            options={ROOM_TYPES}
            value={selectedRoom}
            onValueChange={onRoomChange}
            placeholder="Select room..."
            searchPlaceholder="Search rooms..."
            emptyText="No room found."
            disabled={isLoading}
          />
        </div>
      </div>
      <Button
        size="lg"
        onClick={onGenerate}
        disabled={!canGenerate || isLoading}
        className="w-full md:w-fit"
      >
        {isLoading ? (
          <>
            <Wand2 className="animate-pulse" />
            Generating
          </>
        ) : (
          <>
            <Wand2 />
            Generate Design
          </>
        )}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite page.tsx**

Replace the full contents of `app/(main)/page.tsx`:

```typescript
"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { ImageDropzone } from "@/components/image-dropzone";
import { UploadedImage } from "@/components/uploaded-image";
import { OutputImage } from "@/components/output-image";
import { DesignControls } from "@/components/design-controls";
import { ItemUploadSlots } from "@/components/item-upload-slots";
import { PlacementCanvas } from "@/components/placement-canvas";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { CircleAlert } from "lucide-react";
import type { RoomType, DesignTheme, ItemSlot, Placement } from "@/types";

export default function HomePage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<DesignTheme>("Modern");
  const [selectedRoom, setSelectedRoom] = useState<RoomType>("Living Room");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemSlots, setItemSlots] = useState<ItemSlot[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const getCompositeRef = useRef<(() => Promise<string>) | null>(null);

  const handleImageUpload = useCallback((base64: string) => {
    setUploadedImage(base64);
    setOutputImage(null);
    setError(null);
  }, []);

  const handleRemoveImage = useCallback(() => {
    setUploadedImage(null);
    setOutputImage(null);
    setError(null);
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    toast.error(errorMessage);
  }, []);

  const handleAddItem = useCallback((item: ItemSlot) => {
    setItemSlots((prev) => {
      if (prev.length >= 3) return prev;
      return [...prev, item];
    });
    // Place item at centre of canvas at 20% width by default
    setPlacements((prev) => [
      ...prev,
      { id: item.id, x: 0.4, y: 0.4, width: 0.2, height: 0.2 },
    ]);
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItemSlots((prev) => prev.filter((s) => s.id !== id));
    setPlacements((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!uploadedImage) return;

    setIsLoading(true);
    setError(null);
    setOutputImage(null);

    try {
      let composite = uploadedImage;
      if (placements.length > 0 && getCompositeRef.current) {
        composite = await getCompositeRef.current();
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: uploadedImage,
          composite,
          theme: selectedTheme,
          room: selectedRoom,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate design");
      }

      if (data.output && data.output.length > 0) {
        setOutputImage(data.output[0]);
        toast.success("Design generated successfully!");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      handleError(message);
    } finally {
      setIsLoading(false);
    }
  }, [uploadedImage, placements, selectedTheme, selectedRoom, handleError]);

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <Alert variant="destructive">
          <CircleAlert className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Top bar: design controls + item slots */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-3">
          <DesignControls
            compact
            selectedTheme={selectedTheme}
            selectedRoom={selectedRoom}
            onThemeChange={setSelectedTheme}
            onRoomChange={setSelectedRoom}
            onGenerate={handleGenerate}
            isLoading={isLoading}
            canGenerate={!!uploadedImage}
          />
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] text-indigo-400">
              ITEMS TO PLACE
            </span>
            <ItemUploadSlots
              items={itemSlots}
              onAdd={handleAddItem}
              onRemove={handleRemoveItem}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main area: large canvas + right panel */}
      <div className="grid grid-cols-3 gap-3">
        {/* Placement canvas — 2/3 width */}
        <div className="col-span-2">
          <PlacementCanvas
            roomImage={uploadedImage}
            items={itemSlots}
            placements={placements}
            onPlacementsChange={setPlacements}
            getCompositeRef={getCompositeRef}
          />
        </div>

        {/* Right panel — 1/3 width */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Room Photo
            </p>
            {uploadedImage ? (
              <UploadedImage src={uploadedImage} onRemove={handleRemoveImage} />
            ) : (
              <ImageDropzone
                onImageUpload={handleImageUpload}
                onError={handleError}
              />
            )}
          </div>
          <div className="flex-1">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              AI Design
            </p>
            <OutputImage src={outputImage} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify full flow**

1. Open http://localhost:3000
2. Upload a room photo in the right panel — it should appear both in the right panel and as the canvas background
3. Upload 1–3 item photos in the top bar slots — each should appear on the canvas at ~centre position
4. Drag items around the canvas to reposition them
5. Drag the resize handle (blue square, bottom-right of each item) to resize
6. Hit **Generate** — loading state shows, then output appears in right panel
7. Click the download icon on the output to save the image

- [ ] **Step 4: Commit**

```bash
git add app/(main)/page.tsx components/design-controls.tsx
git commit -m "feat: restructure layout with placement canvas and item slots"
```

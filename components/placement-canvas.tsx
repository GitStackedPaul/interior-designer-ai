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
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

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
      className="relative w-full overflow-hidden rounded-xl border-2 border-indigo-500/30 bg-black/50 select-none"
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
        <div className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="text-5xl">🏠</span>
          <span className="font-mono text-xs">
            Upload a room photo to start
          </span>
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
              className="absolute right-0 bottom-0 h-3 w-3 cursor-se-resize rounded-tl bg-indigo-400"
              onMouseDown={(e) => handleMouseDown(e, p.id, "resize")}
            />
            {/* Label */}
            <div className="absolute -bottom-5 left-0 rounded bg-indigo-500 px-1 font-mono text-[9px] whitespace-nowrap text-white">
              {slot.filename}
            </div>
          </div>
        );
      })}
    </div>
  );
}

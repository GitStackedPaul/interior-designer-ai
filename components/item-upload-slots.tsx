"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
  ITEM_COLORS,
} from "@/lib/constants";
import type { ItemSlot } from "@/types";

const MAX_ITEMS = 10;

interface ItemUploadSlotsProps {
  items: ItemSlot[];
  activeItemId: string | null;
  onAdd: (item: ItemSlot) => void;
  onRemove: (id: string) => void;
  onDescriptionChange: (id: string, description: string) => void;
  onActiveChange: (id: string | null) => void;
}

export function ItemUploadSlots({
  items,
  activeItemId,
  onAdd,
  onRemove,
  onDescriptionChange,
  onActiveChange,
}: ItemUploadSlotsProps) {
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
        description: "",
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-wrap items-start gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />

      {items.map((item, idx) => {
        const color = ITEM_COLORS[idx % ITEM_COLORS.length];
        const isActive = item.id === activeItemId;
        return (
          <div key={item.id} className="flex w-28 flex-col gap-1">
            <div className="relative flex-shrink-0">
              <button
                onClick={() => onActiveChange(isActive ? null : item.id)}
                className="block h-14 w-14 overflow-hidden rounded-lg transition-all focus:outline-none"
                style={{
                  border: `2px solid ${color}`,
                  boxShadow: isActive ? `0 0 0 2px ${color}` : "none",
                }}
              >
                <img
                  src={item.imageUrl}
                  alt={item.filename}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </button>
              {/* Color badge */}
              <span
                className="absolute -bottom-1 -left-1 h-3 w-3 rounded-full border border-white/30"
                style={{ backgroundColor: color }}
              />
              <button
                onClick={() => onRemove(item.id)}
                className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
            <input
              type="text"
              value={item.description}
              onChange={(e) => onDescriptionChange(item.id, e.target.value)}
              placeholder="item description…"
              className="text-foreground placeholder:text-muted-foreground w-full rounded border border-indigo-500/30 bg-transparent px-1.5 py-0.5 font-mono text-[10px] outline-none focus:border-indigo-400"
            />
          </div>
        );
      })}

      {items.length < MAX_ITEMS && (
        <button
          onClick={() => inputRef.current?.click()}
          className="text-muted-foreground/40 flex h-14 w-14 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-indigo-500/30 text-xl transition-colors hover:border-indigo-500/60"
        >
          +
        </button>
      )}
    </div>
  );
}

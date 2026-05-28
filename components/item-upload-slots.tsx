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

export function ItemUploadSlots({
  items,
  onAdd,
  onRemove,
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
              className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ) : (
          <button
            key={i}
            onClick={() => items.length < 3 && inputRef.current?.click()}
            disabled={items.length !== i}
            className="text-muted-foreground/40 flex h-14 w-14 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-indigo-500/30 text-xl transition-colors hover:border-indigo-500/60 disabled:cursor-default disabled:opacity-30"
          >
            +
          </button>
        );
      })}
    </div>
  );
}

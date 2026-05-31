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
import { ITEM_COLORS, ITEM_COLOR_NAMES } from "@/lib/constants";
import type { RoomType, DesignTheme, ItemSlot } from "@/types";

export default function HomePage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<DesignTheme>("Modern");
  const [selectedRoom, setSelectedRoom] = useState<RoomType>("Living Room");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemSlots, setItemSlots] = useState<ItemSlot[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
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
      if (prev.length >= 10) return prev;
      return [...prev, item];
    });
    setActiveItemId(item.id);
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItemSlots((prev) => prev.filter((s) => s.id !== id));
    setActiveItemId((prev) => (prev === id ? null : prev));
  }, []);

  const handleDescriptionChange = useCallback(
    (id: string, description: string) => {
      setItemSlots((prev) =>
        prev.map((s) => (s.id === id ? { ...s, description } : s))
      );
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    if (!uploadedImage) return;

    setIsLoading(true);
    setError(null);
    setOutputImage(null);

    try {
      let composite = uploadedImage;
      if (getCompositeRef.current) {
        composite = await getCompositeRef.current();
      }

      const items = itemSlots.map((s, i) => ({
        description: s.description.trim(),
        colorName: ITEM_COLOR_NAMES[i % ITEM_COLOR_NAMES.length],
      }));

      const itemImages = itemSlots.map((s) => s.imageUrl);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: uploadedImage,
          composite,
          theme: selectedTheme,
          room: selectedRoom,
          items,
          itemImages,
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
  }, [uploadedImage, itemSlots, selectedTheme, selectedRoom, handleError]);

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <Alert variant="destructive">
          <CircleAlert className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Top bar: generate controls */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-3">
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
          <div className="flex flex-col gap-1 border-t pt-3">
            <span className="font-mono text-[10px] text-indigo-400">
              ITEMS TO PLACE — click an item to select it, then draw on the
              canvas below
            </span>
            <ItemUploadSlots
              items={itemSlots}
              activeItemId={activeItemId}
              onAdd={handleAddItem}
              onRemove={handleRemoveItem}
              onDescriptionChange={handleDescriptionChange}
              onActiveChange={setActiveItemId}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main area: drawing canvas + right panel */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Drawing canvas — 2/3 width */}
        <div className="col-span-2">
          <PlacementCanvas
            roomImage={uploadedImage}
            items={itemSlots}
            activeItemId={activeItemId}
            getCompositeRef={getCompositeRef}
          />
        </div>

        {/* Right panel — room photo */}
        <div>
          <p className="text-muted-foreground mb-1.5 text-xs font-medium">
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

        {/* AI Design — same width as canvas */}
        <div className="col-span-2">
          <p className="text-muted-foreground mb-1.5 text-xs font-medium">
            AI Design
          </p>
          <OutputImage src={outputImage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}

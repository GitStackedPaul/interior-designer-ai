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
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
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
          <div className="flex-1">
            <p className="text-muted-foreground mb-1.5 text-xs font-medium">
              AI Design
            </p>
            <OutputImage src={outputImage} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}

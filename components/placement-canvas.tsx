"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Eraser, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ITEM_COLORS } from "@/lib/constants";
import type { ItemSlot } from "@/types";

const STROKE_WIDTH = 14;
const ERASER_RADIUS = 22;

type Stroke = {
  itemId: string;
  color: string;
  points: { x: number; y: number }[];
};

interface PlacementCanvasProps {
  roomImage: string | null;
  items: ItemSlot[];
  activeItemId: string | null;
  getCompositeRef: React.MutableRefObject<(() => Promise<string>) | null>;
}

export function PlacementCanvas({
  roomImage,
  items,
  activeItemId,
  getCompositeRef,
}: PlacementCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<"draw" | "erase">("draw");
  const currentStrokeRef = useRef<Stroke | null>(null);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  const getActiveColor = useCallback(() => {
    const idx = items.findIndex((s) => s.id === activeItemId);
    return idx >= 0 ? ITEM_COLORS[idx % ITEM_COLORS.length] : "#ffffff";
  }, [items, activeItemId]);

  const redrawAll = useCallback((allStrokes: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of allStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = STROKE_WIDTH;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 0.75;
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }, []);

  useEffect(() => {
    redrawAll(strokes);
  }, [strokes, redrawAll]);

  // Keep canvas pixel dimensions matched to container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ro = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redrawAll(strokesRef.current);
    });
    ro.observe(container);
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    return () => ro.disconnect();
  }, [redrawAll]);

  const getPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!roomImage) return;
    const pos = getPos(e);
    if (tool === "draw") {
      if (!activeItemId) return;
      currentStrokeRef.current = {
        itemId: activeItemId,
        color: getActiveColor(),
        points: [pos],
      };
      setIsDrawing(true);
    } else {
      setStrokes((prev) =>
        prev.filter(
          (s) =>
            !s.points.some(
              (p) => Math.hypot(p.x - pos.x, p.y - pos.y) < ERASER_RADIUS
            )
        )
      );
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);

    if (tool === "erase") {
      setStrokes((prev) =>
        prev.filter(
          (s) =>
            !s.points.some(
              (p) => Math.hypot(p.x - pos.x, p.y - pos.y) < ERASER_RADIUS
            )
        )
      );
      return;
    }

    if (!currentStrokeRef.current) return;
    const pts = currentStrokeRef.current.points;
    currentStrokeRef.current = {
      ...currentStrokeRef.current,
      points: [...pts, pos],
    };

    // Incrementally paint the newest segment only
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && pts.length >= 1) {
      ctx.beginPath();
      ctx.strokeStyle = currentStrokeRef.current.color;
      ctx.lineWidth = STROKE_WIDTH;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 0.75;
      ctx.moveTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    const completed = currentStrokeRef.current;
    currentStrokeRef.current = null;
    setIsDrawing(false);
    if (tool === "draw" && completed && completed.points.length > 1) {
      setStrokes((prev) => [...prev, completed]);
    }
  };

  const getComposite = useCallback(async (): Promise<string> => {
    if (!roomImage) throw new Error("No room image");
    return new Promise((resolve, reject) => {
      const offscreen = document.createElement("canvas");
      offscreen.width = 1024;
      offscreen.height = 1024;
      const ctx = offscreen.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      const drawCanvas = canvasRef.current;
      const scaleX = drawCanvas ? 1024 / drawCanvas.width : 1;
      const scaleY = drawCanvas ? 1024 / drawCanvas.height : 1;
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 1024, 1024);
        for (const stroke of strokesRef.current) {
          if (stroke.points.length < 2) continue;
          ctx.beginPath();
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = STROKE_WIDTH * Math.min(scaleX, scaleY);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.globalAlpha = 0.75;
          ctx.moveTo(stroke.points[0].x * scaleX, stroke.points[0].y * scaleY);
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(
              stroke.points[i].x * scaleX,
              stroke.points[i].y * scaleY
            );
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        resolve(offscreen.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("Failed to load room image"));
      img.src = roomImage;
    });
  }, [roomImage]);

  useEffect(() => {
    getCompositeRef.current = getComposite;
  }, [getComposite, getCompositeRef]);

  const activeItem = items.find((s) => s.id === activeItemId);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={tool === "draw" ? "default" : "outline"}
          onClick={() => setTool("draw")}
          className="h-7 px-2 text-xs"
        >
          Draw
        </Button>
        <Button
          size="sm"
          variant={tool === "erase" ? "default" : "outline"}
          onClick={() => setTool("erase")}
          className="h-7 px-2 text-xs"
        >
          <Eraser className="mr-1 h-3 w-3" />
          Erase
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setStrokes([])}
          className="h-7 px-2 text-xs text-red-400 hover:text-red-500"
        >
          <Trash2 className="mr-1 h-3 w-3" />
          Clear all
        </Button>
        {activeItem ? (
          <span className="ml-auto font-mono text-[10px] text-indigo-400">
            drawing: <span style={{ color: getActiveColor() }}>■</span>{" "}
            {activeItem.filename}
          </span>
        ) : (
          <span className="text-muted-foreground/50 ml-auto font-mono text-[10px]">
            select an item below to draw its placement
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl border-2 border-indigo-500/30 bg-black/50 select-none"
        style={{ aspectRatio: "4/3" }}
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
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          style={{
            cursor: !roomImage
              ? "default"
              : tool === "draw"
                ? activeItemId
                  ? "crosshair"
                  : "not-allowed"
                : "cell",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
}

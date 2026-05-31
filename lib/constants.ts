import type { RoomType, DesignTheme } from "@/types";

export const ROOM_TYPES: RoomType[] = [
  "Living Room",
  "Bedroom",
  "Bathroom",
  "Kitchen",
  "Dining Room",
  "Home Office",
  "Kids Room",
];

export const DESIGN_THEMES: DesignTheme[] = [
  "Modern",
  "Minimalist",
  "Scandinavian",
  "Industrial",
  "Bohemian",
  "Traditional",
  "Coastal",
  "Mid-Century Modern",
];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png"];

export const ITEM_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#ec4899",
  "#eab308",
  "#06b6d4",
  "#84cc16",
  "#f43f5e",
];

export const ITEM_COLOR_NAMES = [
  "red",
  "blue",
  "green",
  "orange",
  "purple",
  "pink",
  "yellow",
  "cyan",
  "lime",
  "rose",
];

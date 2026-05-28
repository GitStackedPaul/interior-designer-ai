export type RoomType =
  | "Living Room"
  | "Bedroom"
  | "Bathroom"
  | "Kitchen"
  | "Dining Room"
  | "Home Office"
  | "Kids Room";

export type DesignTheme =
  | "Modern"
  | "Minimalist"
  | "Scandinavian"
  | "Industrial"
  | "Bohemian"
  | "Traditional"
  | "Coastal"
  | "Mid-Century Modern";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export interface ItemSlot {
  id: string;
  imageUrl: string; // base64 data URL
  filename: string;
  description: string;
}

export interface Placement {
  id: string; // matches ItemSlot.id
  x: number; // 0–1, relative to canvas container width
  y: number; // 0–1, relative to canvas container height
  width: number; // 0–1, relative to canvas container width
  height: number; // 0–1, relative to canvas container height
}

export type SectionType = "seated" | "tables" | "general-admission";

export interface CanvasSeat {
  id: string;
  row: string;
  number: number;
  x: number;
  y: number;
  status?: "available" | "reserved" | "issued" | "scanned" | "cancelled";
  attendeeName?: string;
}

export interface CanvasTable {
  id: string;
  number: number;
  x: number;
  y: number;
  seats: number;
  rotation?: number;
}

export interface CanvasSection {
  id: string;
  name: string;
  type: SectionType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  capacity?: number; // for general-admission
  seats?: CanvasSeat[];
  tables?: CanvasTable[];
  priceId?: string; // links to event section pricing
}

export interface CanvasStage {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface CanvasLayout {
  version: number;
  stageWidth: number;
  stageHeight: number;
  sections: CanvasSection[];
  stageArea?: CanvasStage;
  labels: Array<{ id: string; text: string; x: number; y: number; fontSize: number }>;
}

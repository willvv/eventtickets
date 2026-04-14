"use client";
import React, { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CanvasLayout, CanvasSection } from "@/types/canvas";
import { cn } from "@/lib/utils/cn";
import { Save, Undo, Redo, Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";

interface LayoutEditorProps {
  initialLayout?: CanvasLayout;
  onSave: (layout: CanvasLayout) => void;
  saving?: boolean;
}

const DEFAULT_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316",
];

const SECTION_TYPE_LABELS = {
  seated: "Asientos Numerados",
  tables: "Mesas",
  "general-admission": "Área General",
};

export function LayoutEditor({ initialLayout, onSave, saving }: LayoutEditorProps) {
  const [layout, setLayout] = useState<CanvasLayout>(
    initialLayout ?? {
      version: 1,
      stageWidth: 800,
      stageHeight: 600,
      sections: [],
      labels: [],
    }
  );
  const [history, setHistory] = useState<CanvasLayout[]>([]);
  const [future, setFuture] = useState<CanvasLayout[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const pushHistory = useCallback((newLayout: CanvasLayout) => {
    setHistory((h) => [...h.slice(-20), layout]);
    setFuture([]);
    setLayout(newLayout);
  }, [layout]);

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setFuture((f) => [layout, ...f]);
    setHistory((h) => h.slice(0, -1));
    setLayout(prev);
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setHistory((h) => [...h, layout]);
    setFuture((f) => f.slice(1));
    setLayout(next);
  };

  const addSection = (type: CanvasSection["type"]) => {
    const newSection: CanvasSection = {
      id: nanoid(),
      name: `Sección ${layout.sections.length + 1}`,
      type,
      x: 50 + layout.sections.length * 20,
      y: 50 + layout.sections.length * 20,
      width: type === "general-admission" ? 200 : 160,
      height: type === "general-admission" ? 150 : 120,
      color: DEFAULT_COLORS[layout.sections.length % DEFAULT_COLORS.length],
      capacity: 100,
    };
    pushHistory({ ...layout, sections: [...layout.sections, newSection] });
    setSelectedSectionId(newSection.id);
  };

  const deleteSelected = () => {
    if (!selectedSectionId) return;
    pushHistory({ ...layout, sections: layout.sections.filter((s) => s.id !== selectedSectionId) });
    setSelectedSectionId(null);
  };

  const updateSection = (id: string, updates: Partial<CanvasSection>) => {
    pushHistory({
      ...layout,
      sections: layout.sections.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    });
  };

  const selectedSection = layout.sections.find((s) => s.id === selectedSectionId);

  const handleMouseDown = (e: React.MouseEvent, sectionId: string) => {
    e.preventDefault();
    setDragging(sectionId);
    const section = layout.sections.find((s) => s.id === sectionId)!;
    const rect = canvasRef.current!.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left - section.x, y: e.clientY - rect.top - section.y });
    setSelectedSectionId(sectionId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - dragOffset.x);
    const y = Math.max(0, e.clientY - rect.top - dragOffset.y);
    setLayout((l) => ({
      ...l,
      sections: l.sections.map((s) => (s.id === dragging ? { ...s, x, y } : s)),
    }));
  };

  const handleMouseUp = () => {
    if (dragging) {
      setHistory((h) => [...h.slice(-20), layout]);
      setFuture([]);
    }
    setDragging(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white border rounded-lg">
        <Button size="sm" variant="outline" onClick={undo} disabled={!history.length}>
          <Undo className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={redo} disabled={!future.length}>
          <Redo className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border" />
        {(["seated", "tables", "general-admission"] as const).map((type) => (
          <Button key={type} size="sm" variant="outline" onClick={() => addSection(type)}>
            <Plus className="h-3 w-3 mr-1" />
            {SECTION_TYPE_LABELS[type]}
          </Button>
        ))}
        <div className="w-px h-6 bg-border" />
        <Button size="sm" variant="destructive" onClick={deleteSelected} disabled={!selectedSectionId}>
          <Trash2 className="h-4 w-4" />
        </Button>
        <div className="ml-auto">
          <Button size="sm" onClick={() => onSave({ ...layout, version: layout.version + 1 })} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50 cursor-default select-none"
          style={{ width: layout.stageWidth, height: layout.stageHeight, minWidth: 400, minHeight: 300 }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Stage indicator */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-6 py-1 bg-gray-800 text-white text-xs rounded">
            ESCENARIO
          </div>

          {layout.sections.map((section) => (
            <div
              key={section.id}
              className={cn(
                "absolute rounded-lg border-2 cursor-grab active:cursor-grabbing flex flex-col items-center justify-center text-white text-xs font-medium p-1",
                selectedSectionId === section.id ? "ring-2 ring-offset-1 ring-blue-500" : ""
              )}
              style={{
                left: section.x,
                top: section.y,
                width: section.width,
                height: section.height,
                backgroundColor: section.color + "CC",
                borderColor: section.color,
              }}
              onMouseDown={(e) => handleMouseDown(e, section.id)}
            >
              <span className="truncate w-full text-center">{section.name}</span>
              <span className="opacity-75">{SECTION_TYPE_LABELS[section.type]}</span>
              {section.capacity && <span className="opacity-75">Cap: {section.capacity}</span>}
            </div>
          ))}
        </div>

        {/* Properties panel */}
        {selectedSection && (
          <Card className="w-64 p-4 space-y-4 shrink-0">
            <h3 className="font-semibold text-sm">Propiedades</h3>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Nombre</label>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                value={selectedSection.name}
                onChange={(e) => updateSection(selectedSection.id, { name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Tipo</label>
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={selectedSection.type}
                onChange={(e) => updateSection(selectedSection.id, { type: e.target.value as CanvasSection["type"] })}
              >
                <option value="seated">Asientos Numerados</option>
                <option value="tables">Mesas</option>
                <option value="general-admission">Área General</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Capacidad</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1 text-sm"
                value={selectedSection.capacity ?? 0}
                onChange={(e) => updateSection(selectedSection.id, { capacity: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Color</label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c}
                    className={cn("w-6 h-6 rounded-full border-2", selectedSection.color === c ? "border-gray-800 scale-110" : "border-transparent")}
                    style={{ backgroundColor: c }}
                    onClick={() => updateSection(selectedSection.id, { color: c })}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>X: {Math.round(selectedSection.x)}</div>
              <div>Y: {Math.round(selectedSection.y)}</div>
              <div>W: {Math.round(selectedSection.width)}</div>
              <div>H: {Math.round(selectedSection.height)}</div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

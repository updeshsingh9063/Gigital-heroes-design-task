"use client";

import { useRef, useEffect, useCallback } from "react";
import {
  Stage, Layer, Rect, Text, Circle,
  Image as KonvaImage, Transformer, Group, Line, Arrow, Star, RegularPolygon,
} from "react-konva";
import useImage from "use-image";
import Konva from "konva";

export type ElementType = "text" | "rect" | "circle" | "image" | "triangle" | "star" | "arrow" | "line";

export interface DesignElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  // Text
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  align?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textDecoration?: string;
  // Style
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  // Shadow
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  // Star
  numPoints?: number;
  innerRadius?: number;
  outerRadius?: number;
  // Arrow / Line
  points?: number[];
  // Image
  src?: string;
}

export interface PrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DesignerCanvasProps {
  printArea: PrintArea;
  elements: DesignElement[];
  selectedId: string | null;
  stageRef: React.RefObject<Konva.Stage | null>;
  zoom: number;
  onSelect: (id: string | null) => void;
  onUpdateElement: (id: string, attrs: Partial<DesignElement>) => void;
}

function KonvaImageEl({ el, onSelect, onDragEnd, onTransformEnd }: any) {
  const [image] = useImage(el.src || "", "anonymous");
  return (
    <KonvaImage
      id={el.id}
      image={image}
      x={el.x} y={el.y}
      width={el.width || 150} height={el.height || 150}
      rotation={el.rotation || 0}
      scaleX={el.scaleX || 1} scaleY={el.scaleY || 1}
      opacity={el.opacity ?? 1}
      draggable
      onClick={() => onSelect(el.id)}
      onTap={() => onSelect(el.id)}
      onDragEnd={(e: any) => onDragEnd(el.id, e)}
      onTransformEnd={(e: any) => onTransformEnd(el.id, e)}
    />
  );
}

export default function DesignerCanvas({
  printArea, elements, selectedId, stageRef, zoom,
  onSelect, onUpdateElement,
}: DesignerCanvasProps) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const shapeRefs = useRef<Record<string, Konva.Node>>({});

  const PAD = 40;
  const stageW = printArea.width + PAD * 2;
  const stageH = printArea.height + PAD * 2;

  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const node = selectedId ? shapeRefs.current[selectedId] : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, elements]);

  const handleDragEnd = useCallback((id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    onUpdateElement(id, { x: node.x(), y: node.y() });
  }, [onUpdateElement]);

  const handleTransformEnd = useCallback((id: string, e: Konva.KonvaEventObject<Event>, type: ElementType, elRef?: DesignElement) => {
    const node = e.target;
    const sx = node.scaleX(), sy = node.scaleY();
    const attrs: Partial<DesignElement> = { x: node.x(), y: node.y(), rotation: node.rotation() };

    // Bake scale into properties where possible to keep UI inputs accurate
    if (type === "rect" || type === "image") {
      node.scaleX(1); node.scaleY(1);
      attrs.width = Math.max(10, (node.width() || 0) * sx);
      attrs.height = Math.max(10, (node.height() || 0) * sy);
      attrs.scaleX = 1; attrs.scaleY = 1;
    } else if (type === "text") {
      node.scaleX(1); node.scaleY(1);
      attrs.width = Math.max(20, (node.width() || 0) * sx);
      attrs.fontSize = Math.max(8, (elRef?.fontSize || 24) * sx);
      attrs.scaleX = 1; attrs.scaleY = 1;
    } else if (type === "circle" || type === "triangle") {
      node.scaleX(1); node.scaleY(1);
      const scale = Math.max(sx, sy);
      attrs.radius = (elRef?.radius || 50) * scale;
      attrs.scaleX = 1; attrs.scaleY = 1;
    } else if (type === "star") {
      node.scaleX(1); node.scaleY(1);
      const scale = Math.max(sx, sy);
      attrs.innerRadius = (elRef?.innerRadius || 30) * scale;
      attrs.outerRadius = (elRef?.outerRadius || 60) * scale;
      attrs.scaleX = 1; attrs.scaleY = 1;
    } else {
      // Lines, Arrows just retain scaleX / scaleY
      attrs.scaleX = sx;
      attrs.scaleY = sy;
    }

    onUpdateElement(id, attrs);
  }, [onUpdateElement]);

  const shadowProps = (el: DesignElement) => el.shadowBlur ? {
    shadowColor: el.shadowColor || "rgba(0,0,0,0.4)",
    shadowBlur: el.shadowBlur,
    shadowOffsetX: el.shadowOffsetX || 0,
    shadowOffsetY: el.shadowOffsetY || 3,
  } : {};

  const commonProps = (el: DesignElement) => ({
    id: el.id, x: el.x, y: el.y,
    rotation: el.rotation || 0,
    scaleX: el.scaleX || 1, scaleY: el.scaleY || 1,
    opacity: el.opacity ?? 1,
    draggable: true,
    onClick: () => onSelect(el.id),
    onTap: () => onSelect(el.id),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(el.id, e),
  });

  const ref = (el: DesignElement) => (node: Konva.Node | null) => {
    if (node) shapeRefs.current[el.id] = node;
  };

  return (
    <Stage
      ref={stageRef}
      width={stageW} height={stageH}
      scaleX={zoom} scaleY={zoom}
      style={{ background: "#1E1C1A", borderRadius: "12px", boxShadow: "0 8px 48px rgba(0,0,0,0.6)" }}
      onMouseDown={(e) => { if (e.target === e.target.getStage()) onSelect(null); }}
    >
      {/* Layer 1: Background (no interaction) */}
      <Layer listening={false}>
        <Rect x={0} y={0} width={stageW} height={stageH} fill="#1E1C1A" />
        <Rect x={PAD} y={PAD} width={printArea.width} height={printArea.height}
          fill="white" shadowColor="rgba(0,0,0,0.5)" shadowBlur={40} shadowOffsetY={8} cornerRadius={4} />
        <Rect x={printArea.x} y={printArea.y} width={printArea.width} height={printArea.height}
          stroke="#C45D3E" strokeWidth={1.5} dash={[8, 5]} fill="transparent" />
        {([
          [printArea.x, printArea.y, -16, 0, 0, 0, 0, -16],
          [printArea.x + printArea.width, printArea.y, 16, 0, 0, 0, 0, -16],
          [printArea.x, printArea.y + printArea.height, -16, 0, 0, 0, 0, 16],
          [printArea.x + printArea.width, printArea.y + printArea.height, 16, 0, 0, 0, 0, 16],
        ] as number[][]).map(([cx, cy, ...pts], i) => (
          <Group key={i} x={cx} y={cy}><Line points={pts} stroke="#C45D3E" strokeWidth={2} /></Group>
        ))}
      </Layer>

      {/* Layer 2: Clipped elements */}
      <Layer clipX={printArea.x} clipY={printArea.y} clipWidth={printArea.width} clipHeight={printArea.height}>
        {elements.map((el) => {
          const elRef = ref(el);
          const shadow = shadowProps(el);

          if (el.type === "text") return (
            <Text key={el.id} {...commonProps(el)} ref={elRef as any}
              text={el.text || "Text"} fontSize={el.fontSize || 24}
              fontFamily={el.fontFamily || "Outfit"} fontStyle={el.fontStyle || "normal"}
              fill={el.fill || "#1A1816"} align={el.align || "left"}
              width={el.width} letterSpacing={el.letterSpacing || 0}
              lineHeight={el.lineHeight || 1.2} textDecoration={el.textDecoration || ""}
              stroke={el.stroke} strokeWidth={el.strokeWidth || 0}
              {...shadow}
              onTransformEnd={(e) => handleTransformEnd(el.id, e, el.type, el)} />
          );

          if (el.type === "rect") return (
            <Rect key={el.id} {...commonProps(el)} ref={elRef as any}
              width={el.width || 120} height={el.height || 80}
              fill={el.fill || "#C45D3E"} stroke={el.stroke} strokeWidth={el.strokeWidth || 0}
              cornerRadius={4} {...shadow}
              onTransformEnd={(e) => handleTransformEnd(el.id, e, el.type, el)} />
          );

          if (el.type === "circle") return (
            <Circle key={el.id} {...commonProps(el)} ref={elRef as any}
              radius={el.radius || 50} fill={el.fill || "#4A8C6F"}
              stroke={el.stroke} strokeWidth={el.strokeWidth || 0} {...shadow}
              onTransformEnd={(e) => handleTransformEnd(el.id, e, el.type, el)} />
          );

          if (el.type === "triangle") return (
            <RegularPolygon key={el.id} {...commonProps(el)} ref={elRef as any}
              sides={3} radius={el.radius || 60} fill={el.fill || "#D4A03C"}
              stroke={el.stroke} strokeWidth={el.strokeWidth || 0} {...shadow}
              onTransformEnd={(e) => handleTransformEnd(el.id, e, el.type, el)} />
          );

          if (el.type === "star") return (
            <Star key={el.id} {...commonProps(el)} ref={elRef as any}
              numPoints={el.numPoints || 5}
              innerRadius={el.innerRadius || 30} outerRadius={el.outerRadius || 60}
              fill={el.fill || "#D4A03C"} stroke={el.stroke} strokeWidth={el.strokeWidth || 0} {...shadow}
              onTransformEnd={(e) => handleTransformEnd(el.id, e, el.type, el)} />
          );

          if (el.type === "arrow") return (
            <Arrow key={el.id} {...commonProps(el)} ref={elRef as any}
              points={el.points || [0, 0, 120, 0]}
              fill={el.stroke || el.fill || "#C45D3E"} stroke={el.stroke || el.fill || "#C45D3E"}
              strokeWidth={el.strokeWidth || 4} pointerLength={14} pointerWidth={12}
              onTransformEnd={(e) => handleTransformEnd(el.id, e, el.type, el)} />
          );

          if (el.type === "line") return (
            <Line key={el.id} {...commonProps(el)} ref={elRef as any}
              points={el.points || [0, 0, 150, 0]}
              stroke={el.stroke || el.fill || "#1A1816"} strokeWidth={el.strokeWidth || 3}
              lineCap="round" lineJoin="round"
              onTransformEnd={(e) => handleTransformEnd(el.id, e, el.type, el)} />
          );

          if (el.type === "image") return (
            <KonvaImageEl key={el.id} el={el} onSelect={onSelect}
              onDragEnd={handleDragEnd} onTransformEnd={(id: string, e: any) => handleTransformEnd(id, e, el.type, el)} />
          );

          return null;
        })}
      </Layer>

      {/* Layer 3: Transformer only (unclipped) */}
      <Layer>
        <Transformer ref={transformerRef}
          boundBoxFunc={(ob, nb) => (Math.abs(nb.width) < 8 || Math.abs(nb.height) < 8 ? ob : nb)}
          anchorSize={10} anchorCornerRadius={5}
          anchorStroke="#C45D3E" anchorFill="white"
          borderStroke="#C45D3E" borderDash={[4, 3]}
          rotateAnchorOffset={26}
        />
      </Layer>
    </Stage>
  );
}

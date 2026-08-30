import React, { useEffect, useMemo, useState } from "react";
import { GardenView, ModuleHealth } from "../api/gardenApi";
import { healthToPlantVisual, layoutModules } from "./gardenLogic";

const WIDTH = 900;
const HEIGHT = 570;
const SOIL_Y = HEIGHT - 140;

interface Props {
  garden: GardenView | null;
  onPlantProject?: () => void;
}

function Plant({
  x,
  y,
  health,
  selected,
  middlePlant,
  onSelect,
}: {
  x: number;
  y: number;
  health: ModuleHealth;
  selected: boolean;
  middlePlant: boolean;
  onSelect: () => void;
}) {
  const visual = healthToPlantVisual(health);
  const plantStemColor = "var(--color-forest)";
  const stemHeight = 60 + visual.heightRatio * 80;
  const moduleNameWords = health.moduleName.split(/\s+/);
  const availableStemHeight = Math.abs(SOIL_Y - y);
  const fullLeafTierCount = Math.min(3, visual.leafCount, Math.max(2, Math.floor(availableStemHeight / 34) + 1));
  const leafTierCount = middlePlant ? 2 : fullLeafTierCount;

  const leafTiers = Array.from({ length: leafTierCount }).map((_, i) => {
    const t = i / Math.max(1, leafTierCount - 1);
    const leafY = SOIL_Y + (y - SOIL_Y) * (middlePlant ? 0.52 + t * 0.38 : 0.28 + t * 0.62);
    const spread = 26 + t * 8;
    const rotation = visual.wilted ? 28 : 16;
    return (
      <g key={i} opacity={visual.wilted ? 0.65 : 0.92}>
        <path d={`M ${x} ${leafY} L ${x - spread + 9} ${leafY - 3}`} stroke={plantStemColor} strokeWidth={2.5} strokeLinecap="round" />
        <path d={`M ${x} ${leafY} L ${x + spread - 9} ${leafY - 3}`} stroke={plantStemColor} strokeWidth={2.5} strokeLinecap="round" />
        <ellipse
          cx={x - spread}
          cy={leafY - 4}
          rx={visual.wilted ? 14 : 19}
          ry={visual.wilted ? 7 : 10}
          fill={visual.leafColor}
          transform={`rotate(${-rotation} ${x - spread} ${leafY - 4})`}
        />
        <ellipse
          cx={x + spread}
          cy={leafY - 4}
          rx={visual.wilted ? 14 : 19}
          ry={visual.wilted ? 7 : 10}
          fill={visual.leafColor}
          transform={`rotate(${rotation} ${x + spread} ${leafY - 4})`}
        />
      </g>
    );
  });

  const weeds = Array.from({ length: visual.weedCount }).map((_, i) => {
    const wx = x - 26 + i * 10;
    return (
      <g key={i} opacity={0.85}>
        <line x1={wx} y1={SOIL_Y} x2={wx + 3} y2={SOIL_Y - 16} stroke="#B4562F" strokeWidth={2} />
        <circle cx={wx + 3} cy={SOIL_Y - 18} r={3.5} fill="#D9603B" />
      </g>
    );
  });

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${health.moduleName}: ${health.level.toLowerCase()}, health ${health.healthScore}`}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
      style={{ cursor: "pointer" }}
    >
      <path
        d={`M ${x} ${SOIL_Y} Q ${x + (visual.wilted ? 14 : 4)} ${y + stemHeight * 0.4} ${x} ${y}`}
        stroke={plantStemColor}
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
      />
      {leafTiers}
      {weeds}
      {selected && (
        <circle cx={x} cy={SOIL_Y + 6} r={38} fill="none" stroke="var(--color-olive)" strokeWidth={1.5} strokeDasharray="3 4" />
      )}
      <g transform={`translate(${x} ${SOIL_Y + 74})`}>
        <rect x={-58} y={-16} width={116} height={44} rx={4} fill="var(--color-ivory-deep)" />
        <text y={0} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10} fill="var(--color-charcoal)">
          {moduleNameWords.slice(0, 2).map((word, index) => (
            <tspan key={`${word}-${index}`} x={0} dy={index === 0 ? 0 : 11}>
              {word}
            </tspan>
          ))}
        </text>
        <text y={20} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={9} fill={visual.stemColor}>
          {health.level} · {health.healthScore}
        </text>
      </g>
    </g>
  );
}

export default function GardenCanvas({ garden, onPlantProject }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasGrown, setHasGrown] = useState(false);

  useEffect(() => {
    if (!garden) {
      setHasGrown(false);
      return;
    }
    setHasGrown(false);
    const animationFrame = requestAnimationFrame(() => setHasGrown(true));
    return () => cancelAnimationFrame(animationFrame);
  }, [garden?.projectId]);

  const positions = useMemo(
    () => layoutModules(garden?.modules.map((m) => m.moduleId) ?? [], WIDTH, SOIL_Y),
    [garden]
  );
  const posById = useMemo(() => new Map(positions.map((p) => [p.moduleId, p])), [positions]);
  const middlePlantId = useMemo(
    () =>
      [...positions]
        .sort(
          (first, second) =>
            Math.abs(first.x - WIDTH / 2) - Math.abs(second.x - WIDTH / 2) || second.y - first.y
        )[0]?.moduleId,
    [positions]
  );

  const selected = garden?.modules.find((m) => m.moduleId === selectedId) ?? null;

  return (
    <div className="garden-canvas-shell" style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div className={`garden-canvas-stage${garden ? " garden-canvas-stage--populated" : ""}`}>
      <svg className="garden-canvas" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" role="img" aria-label="Codebase garden">
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="var(--color-ivory)" />
        <rect x={0} y={SOIL_Y} width={WIDTH} height={HEIGHT - SOIL_Y} fill="var(--color-soil)" />

        {/* Roots: dependency edges, illuminated (more visible) when either end is unhealthy */}
        <g style={{ opacity: hasGrown ? 1 : 0, transition: "opacity 700ms ease 350ms" }}>
        {garden?.edges.map((edge, i) => {
          const from = posById.get(edge.fromModuleId);
          const to = posById.get(edge.toModuleId);
          if (!from || !to) return null;
          const fromHealth = garden.modules.find((m) => m.moduleId === edge.fromModuleId);
          const toHealth = garden.modules.find((m) => m.moduleId === edge.toModuleId);
          const minHealth = Math.min(fromHealth?.healthScore ?? 100, toHealth?.healthScore ?? 100);
          const illuminated = minHealth < 55;
          const rootY = SOIL_Y + 10;
          const midY = Math.min(SOIL_Y + 56, rootY + 14 + Math.abs(from.x - to.x) * 0.04);
          const rootColor = illuminated ? "#7A422E" : "var(--color-root)";
          const rootWidth = illuminated ? 2.5 : 1.5;
          return (
            <g key={i} opacity={illuminated ? 0.75 : 0.35} fill="none" stroke={rootColor} strokeWidth={rootWidth} strokeLinecap="round">
              <path d={`M ${from.x} ${SOIL_Y} L ${from.x} ${rootY}`} />
              <path d={`M ${from.x} ${rootY} Q ${(from.x + to.x) / 2} ${midY} ${to.x} ${rootY}`} />
              <path d={`M ${to.x} ${rootY} L ${to.x} ${SOIL_Y}`} />
            </g>
          );
        })}
        </g>

        {garden?.modules.map((health) => {
          const pos = posById.get(health.moduleId);
          if (!pos) return null;
          return (
            <g key={health.moduleId} style={{ transformBox: "view-box", transformOrigin: `${pos.x}px ${SOIL_Y}px`, transform: hasGrown ? "scaleY(1)" : "scaleY(0)", transition: "transform 850ms cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
            <Plant
              key={health.moduleId}
              x={pos.x}
              y={pos.y}
              health={health}
              selected={selectedId === health.moduleId}
              middlePlant={middlePlantId === health.moduleId}
              onSelect={() => setSelectedId(health.moduleId)}
            />
            </g>
          );
        })}
      </svg>
      {!garden && onPlantProject && (
        <div className="garden-canvas__empty-panel">
          <h2>Your Garden is waiting for a project</h2>
          <p>Plant a ZIP, a project folder, or a public GitHub repository to grow this garden from real analysis.</p>
          <button onClick={onPlantProject}>Plant Your Project</button>
        </div>
      )}
      </div>

      {garden && <aside style={{ minWidth: 240, flex: 1 }}>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>
          {selected ? selected.moduleName : garden.projectName}
        </h3>
        {selected ? (
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-olive)" }}>
              Health {selected.healthScore}/100 · {selected.level}
            </p>
            <ul style={{ paddingLeft: 18, margin: 0, fontSize: 14, lineHeight: 1.6 }}>
              {selected.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#514f45" }}>
            Overall ecosystem health: <strong>{garden.overallHealth}/100</strong>.
            Click any plant to see why it looks the way it does — every color and weed here comes
            straight from live issue data.
          </p>
        )}
      </aside>}
    </div>
  );
}

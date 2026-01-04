'use client';

import { constellation } from '@/lib/design';

interface ConstellationCanvasProps {
  name?: string;
  memberCount?: number;
}

/**
 * Placeholder constellation canvas.
 * Static layout. No physics. No drag.
 * Purpose: communicate what it is, not how it works.
 */
export function ConstellationCanvas({ name, memberCount = 0 }: ConstellationCanvasProps) {
  // Static placeholder positions (structured, not force-directed)
  const placeholderNodes = [
    { x: 50, y: 50 },
    { x: 150, y: 30 },
    { x: 130, y: 120 },
    { x: 230, y: 80 },
  ].slice(0, Math.max(memberCount, 3));

  return (
    <div className={constellation.canvas} style={{ aspectRatio: '4/3' }}>
      {/* Header */}
      {name && (
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <span className="text-sm font-medium text-neutral-900 dark:text-white">
            {name}
          </span>
          {memberCount > 0 && (
            <span className="ml-2 text-xs text-neutral-500">
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </span>
          )}
        </div>
      )}

      {/* Canvas area */}
      <div className="relative p-6" style={{ minHeight: 180 }}>
        <svg
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          viewBox="0 0 280 160"
        >
          {/* Edges (relationships) - static lines */}
          {placeholderNodes.length >= 2 && (
            <>
              <line
                x1={placeholderNodes[0].x}
                y1={placeholderNodes[0].y}
                x2={placeholderNodes[1].x}
                y2={placeholderNodes[1].y}
                className={`${constellation.edge.base} ${constellation.edge.weights.normal}`}
              />
              {placeholderNodes.length >= 3 && (
                <>
                  <line
                    x1={placeholderNodes[0].x}
                    y1={placeholderNodes[0].y}
                    x2={placeholderNodes[2].x}
                    y2={placeholderNodes[2].y}
                    className={`${constellation.edge.base} ${constellation.edge.weights.light}`}
                  />
                  <line
                    x1={placeholderNodes[1].x}
                    y1={placeholderNodes[1].y}
                    x2={placeholderNodes[2].x}
                    y2={placeholderNodes[2].y}
                    className={`${constellation.edge.base} ${constellation.edge.weights.normal}`}
                  />
                </>
              )}
              {placeholderNodes.length >= 4 && (
                <>
                  <line
                    x1={placeholderNodes[1].x}
                    y1={placeholderNodes[1].y}
                    x2={placeholderNodes[3].x}
                    y2={placeholderNodes[3].y}
                    className={`${constellation.edge.base} ${constellation.edge.weights.normal}`}
                  />
                  <line
                    x1={placeholderNodes[2].x}
                    y1={placeholderNodes[2].y}
                    x2={placeholderNodes[3].x}
                    y2={placeholderNodes[3].y}
                    className={`${constellation.edge.base} ${constellation.edge.weights.light}`}
                  />
                </>
              )}
            </>
          )}
        </svg>

        {/* Nodes (profiles) - static circles */}
        {placeholderNodes.map((pos, i) => (
          <div
            key={i}
            className={`${constellation.node.base} ${constellation.node.sizes.md} ${constellation.node.states.default} absolute`}
            style={{
              left: pos.x - 24,
              top: pos.y - 24,
            }}
          >
            <span className="text-neutral-400 dark:text-neutral-500 font-medium">
              {String.fromCharCode(65 + i)}
            </span>
          </div>
        ))}

        {/* Empty state */}
        {memberCount === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center max-w-xs">
              Constellations reveal patterns that only emerge between people.
            </p>
          </div>
        )}
      </div>

      {/* Layer toggles (disabled in placeholder) */}
      <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 flex gap-2">
        <button
          disabled
          className={`${constellation.layerToggle} opacity-50 cursor-not-allowed`}
        >
          Bowen
        </button>
        <button
          disabled
          className={`${constellation.layerToggle} opacity-50 cursor-not-allowed`}
        >
          Jung
        </button>
        <button
          disabled
          className={`${constellation.layerToggle} opacity-50 cursor-not-allowed`}
        >
          Curriculum
        </button>
      </div>
    </div>
  );
}

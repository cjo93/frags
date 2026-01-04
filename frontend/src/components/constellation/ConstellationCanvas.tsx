'use client';

import Link from 'next/link';
import { constellation } from '@/lib/design';

interface ConstellationMember {
  id: string;
  name: string;
  role?: string;
}

interface ConstellationEdge {
  from: string;
  to: string;
  relationship?: string;
}

interface ConstellationCanvasProps {
  name?: string;
  members?: ConstellationMember[];
  edges?: ConstellationEdge[];
  /** If false, shows locked overlay with upgrade CTA */
  hasAccess?: boolean;
}

/**
 * Constellation Canvas v1 (read-only)
 * 
 * Structured relational layout. No physics. No drag.
 * Visual grammar: systems diagram meets museum placard.
 * 
 * Layout: Layered bands (horizontal tiers by role/relationship depth)
 */
export function ConstellationCanvas({ 
  name, 
  members = [], 
  edges = [],
  hasAccess = true,
}: ConstellationCanvasProps) {
  const memberCount = members.length;
  
  // Structured layout: horizontal bands with staggered positions
  // Band 0 = center (self/primary), Band 1 = close relations, Band 2 = extended
  const getNodePosition = (index: number, total: number): { x: number; y: number } => {
    if (total <= 1) return { x: 140, y: 80 };
    if (total === 2) {
      return index === 0 ? { x: 100, y: 80 } : { x: 180, y: 80 };
    }
    // Layered bands for 3+ members
    const bands = [
      [{ x: 140, y: 40 }],                           // Top: primary
      [{ x: 70, y: 100 }, { x: 210, y: 100 }],       // Middle: close
      [{ x: 40, y: 140 }, { x: 140, y: 140 }, { x: 240, y: 140 }], // Bottom: extended
    ];
    
    // Distribute members across bands
    if (index === 0) return bands[0][0];
    if (index <= 2) return bands[1][Math.min(index - 1, 1)];
    return bands[2][Math.min(index - 3, 2)];
  };

  // Build node positions from members or use placeholder
  const nodes = memberCount > 0 
    ? members.map((m, i) => ({ 
        ...m, 
        ...getNodePosition(i, memberCount),
        initial: m.name.charAt(0).toUpperCase(),
      }))
    : [
        { id: 'a', name: 'A', x: 140, y: 40, initial: 'A' },
        { id: 'b', name: 'B', x: 70, y: 100, initial: 'B' },
        { id: 'c', name: 'C', x: 210, y: 100, initial: 'C' },
      ];

  // Build edges from data or use placeholder connections
  const edgeLines = edges.length > 0
    ? edges.map(e => {
        const from = nodes.find(n => n.id === e.from);
        const to = nodes.find(n => n.id === e.to);
        if (!from || !to) return null;
        return { x1: from.x, y1: from.y, x2: to.x, y2: to.y, relationship: e.relationship };
      }).filter(Boolean)
    : [
        { x1: 140, y1: 40, x2: 70, y2: 100 },
        { x1: 140, y1: 40, x2: 210, y2: 100 },
        { x1: 70, y1: 100, x2: 210, y2: 100 },
      ];

  return (
    <div className={`${constellation.canvas} relative`} style={{ aspectRatio: '4/3' }}>
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
      <div 
        className={`relative p-6 ${!hasAccess ? 'opacity-40' : ''}`} 
        style={{ minHeight: 180 }}
      >
        <svg
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          viewBox="0 0 280 180"
        >
          {/* Edges (relationships) - structured lines */}
          {edgeLines.map((edge, i) => edge && (
            <line
              key={i}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              className={`${constellation.edge.base} ${constellation.edge.weights.normal}`}
            />
          ))}
        </svg>

        {/* Nodes (profiles) - structured circles */}
        {nodes.map((node, i) => (
          <div
            key={node.id || i}
            className={`${constellation.node.base} ${constellation.node.sizes.md} ${constellation.node.states.default} absolute`}
            style={{
              left: node.x - 24,
              top: node.y - 24,
            }}
          >
            <span className="text-neutral-400 dark:text-neutral-500 font-medium">
              {node.initial}
            </span>
          </div>
        ))}
      </div>

      {/* Locked tier overlay */}
      {!hasAccess && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-neutral-950/80">
          <div className="text-center p-6">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Full relational synthesis is available in Constellation.
            </p>
            <Link
              href="/pricing"
              className="inline-flex px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-80 transition-opacity"
            >
              Unlock full synthesis
            </Link>
          </div>
        </div>
      )}

      {/* Layer toggles (disabled in v1 - read-only) */}
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

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { constellation } from '@/lib/design';

interface ConstellationMember {
  id: string;
  name: string;
  role?: 'primary' | 'close' | 'extended' | string;
}

interface ConstellationEdge {
  from: string;
  to: string;
  relationship?: string;
  weight?: 'light' | 'normal' | 'heavy';
}

type Layer = 'bowen' | 'jung' | 'curriculum';

interface ConstellationCanvasProps {
  name?: string;
  members?: ConstellationMember[];
  edges?: ConstellationEdge[];
  /** If false, shows locked overlay with upgrade CTA */
  hasAccess?: boolean;
  /** If true, layer toggles are enabled (Constellation tier only) */
  layersEnabled?: boolean;
}

/**
 * Constellation Canvas v2 (read-only, data-driven)
 * 
 * Structured relational layout. No physics. No drag.
 * Visual grammar: systems diagram meets museum placard.
 * 
 * Layout: Role-based horizontal bands
 * - Primary (self) at top center
 * - Close relations in middle band
 * - Extended relations in bottom band
 */
export function ConstellationCanvas({ 
  name, 
  members = [], 
  edges = [],
  hasAccess = true,
  layersEnabled = false,
}: ConstellationCanvasProps) {
  const [activeLayer, setActiveLayer] = useState<Layer | null>(null);
  const memberCount = members.length;
  
  // Group members by role for structured layout
  const groupedMembers = {
    primary: members.filter(m => m.role === 'primary'),
    close: members.filter(m => m.role === 'close'),
    extended: members.filter(m => !m.role || m.role === 'extended'),
  };

  // Structured layout: horizontal bands by role
  const getNodePosition = (member: ConstellationMember): { x: number; y: number } => {
    const role = member.role || 'extended';
    
    // Primary band (top center)
    if (role === 'primary') {
      const primaryCount = groupedMembers.primary.length;
      const primaryIndex = groupedMembers.primary.indexOf(member);
      const spacing = 280 / (primaryCount + 1);
      return { x: spacing * (primaryIndex + 1), y: 35 };
    }
    
    // Close band (middle)
    if (role === 'close') {
      const closeCount = groupedMembers.close.length;
      const closeIndex = groupedMembers.close.indexOf(member);
      const spacing = 280 / (closeCount + 1);
      return { x: spacing * (closeIndex + 1), y: 90 };
    }
    
    // Extended band (bottom)
    const extendedCount = groupedMembers.extended.length;
    const extendedIndex = groupedMembers.extended.indexOf(member);
    const spacing = 280 / (extendedCount + 1);
    return { x: spacing * (extendedIndex + 1), y: 145 };
  };

  // Build node positions from members or use placeholder
  const nodes = memberCount > 0 
    ? members.map((m) => ({ 
        ...m, 
        ...getNodePosition(m),
        initial: m.name.charAt(0).toUpperCase(),
      }))
    : [
        { id: 'a', name: 'A', role: 'primary', x: 140, y: 35, initial: 'A' },
        { id: 'b', name: 'B', role: 'close', x: 90, y: 90, initial: 'B' },
        { id: 'c', name: 'C', role: 'close', x: 190, y: 90, initial: 'C' },
      ];

  // Build edges from data or use placeholder connections
  const edgeLines = edges.length > 0
    ? edges.map(e => {
        const from = nodes.find(n => n.id === e.from);
        const to = nodes.find(n => n.id === e.to);
        if (!from || !to) return null;
        return { 
          x1: from.x, 
          y1: from.y, 
          x2: to.x, 
          y2: to.y, 
          relationship: e.relationship,
          weight: e.weight || 'normal',
        };
      }).filter(Boolean)
    : [
        { x1: 140, y1: 35, x2: 90, y2: 90, weight: 'normal' },
        { x1: 140, y1: 35, x2: 190, y2: 90, weight: 'normal' },
        { x1: 90, y1: 90, x2: 190, y2: 90, weight: 'light' },
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
          {/* Band labels - editorial typography */}
          <text x="12" y="38" className="fill-neutral-300 dark:fill-neutral-700 text-[8px]" style={{ fontSize: '8px' }}>Primary</text>
          <text x="12" y="93" className="fill-neutral-300 dark:fill-neutral-700 text-[8px]" style={{ fontSize: '8px' }}>Close</text>
          <text x="12" y="148" className="fill-neutral-300 dark:fill-neutral-700 text-[8px]" style={{ fontSize: '8px' }}>Extended</text>
          
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
              Iron sharpens iron. Relational synthesis is available in the Constellation tier.
            </p>
            <Link
              href="/pricing"
              className="inline-flex px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-80 transition-opacity"
            >
              Expand the mirror
            </Link>
          </div>
        </div>
      )}

      {/* Layer toggles */}
      <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
        <span className="text-xs text-neutral-400 mr-2">Layers</span>
        {(['bowen', 'jung', 'curriculum'] as Layer[]).map((layer) => (
          <button
            key={layer}
            disabled={!layersEnabled}
            onClick={() => setActiveLayer(activeLayer === layer ? null : layer)}
            data-active={activeLayer === layer}
            className={`${constellation.layerToggle} ${
              !layersEnabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {layer.charAt(0).toUpperCase() + layer.slice(1)}
          </button>
        ))}
        {!layersEnabled && (
          <span className="text-xs text-neutral-400 ml-auto">
            Requires Constellation plan
          </span>
        )}
      </div>
    </div>
  );
}

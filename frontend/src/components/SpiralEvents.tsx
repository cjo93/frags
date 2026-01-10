'use client';

import { useEffect, useState, useMemo } from 'react';

interface SpiralEvent {
  ts: number;
  user_id: string;
  event: {
    kind?: string;
    action?: string;
    args?: Record<string, unknown>;
    session_id?: string;
    pass_level?: string;
    proposals?: unknown[];
    reason?: string;
    [key: string]: unknown;
  };
}

interface SpiralEventsProps {
  userId: string;
  limit?: number;
  autoRefresh?: boolean;
}

type KindFilter = 'all' | 'proposals_offered' | 'proposal_accepted' | 'proposal_declined' | 'schedule_prompt';

const KIND_FILTERS: { value: KindFilter; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '📝' },
  { value: 'proposals_offered', label: 'Offered', icon: '📋' },
  { value: 'proposal_accepted', label: 'Accepted', icon: '✅' },
  { value: 'proposal_declined', label: 'Declined', icon: '❌' },
  { value: 'schedule_prompt', label: 'Scheduled', icon: '⏰' },
];

function formatRelativeTime(ts: number): string {
  const now = Date.now() / 1000;
  const diff = now - ts;
  
  if (diff < 60) return 'just now';
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return `${mins}m ago`;
  }
  if (diff < 86400) {
    const hrs = Math.floor(diff / 3600);
    return `${hrs}h ago`;
  }
  const days = Math.floor(diff / 86400);
  return `${days}d ago`;
}

function getEventIcon(kind: string | undefined): string {
  switch (kind) {
    case 'proposals_offered':
      return '📋';
    case 'proposal_accepted':
      return '✅';
    case 'proposal_declined':
      return '❌';
    case 'schedule_prompt':
      return '⏰';
    case 'passive_guidance_delivered':
      return '🎧';
    case 'briefing_completed':
      return '📖';
    default:
      return '📝';
  }
}

function getEventLabel(event: SpiralEvent['event']): string {
  const kind = event.kind || 'unknown';
  
  if (kind === 'proposals_offered') {
    const count = Array.isArray(event.proposals) ? event.proposals.length : 0;
    return `Offered ${count} proposal${count !== 1 ? 's' : ''}`;
  }
  
  if (kind === 'proposal_accepted' && event.action) {
    return `Accepted: ${event.action}`;
  }
  
  if (kind === 'proposal_declined' && event.action) {
    return `Declined: ${event.action}`;
  }
  
  if (kind === 'schedule_prompt') {
    const label = (event.args as Record<string, unknown>)?.label || 'reminder';
    return `Scheduled: ${label}`;
  }
  
  return kind.replace(/_/g, ' ');
}

interface SessionGroup {
  sessionId: string;
  events: SpiralEvent[];
  firstTs: number;
  lastTs: number;
}

function groupBySession(events: SpiralEvent[]): SessionGroup[] {
  const groups = new Map<string, SpiralEvent[]>();
  
  for (const event of events) {
    const sid = event.event.session_id || 'unknown';
    const existing = groups.get(sid) || [];
    existing.push(event);
    groups.set(sid, existing);
  }
  
  return Array.from(groups.entries())
    .map(([sessionId, evts]) => ({
      sessionId,
      events: evts,
      firstTs: Math.min(...evts.map(e => e.ts)),
      lastTs: Math.max(...evts.map(e => e.ts)),
    }))
    .sort((a, b) => b.lastTs - a.lastTs);
}

export default function SpiralEvents({ userId, limit = 20, autoRefresh = false }: SpiralEventsProps) {
  const [events, setEvents] = useState<SpiralEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [showMore, setShowMore] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const effectiveLimit = showMore ? 100 : limit;

  useEffect(() => {
    const doFetch = async () => {
      try {
        let url = `/api/spiral/events?user_id=${encodeURIComponent(userId)}&limit=${effectiveLimit}`;
        if (kindFilter !== 'all') {
          url += `&kind=${encodeURIComponent(kindFilter)}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.ok) {
          setEvents(data.events || []);
          setError(null);
        } else {
          setError(data.error || data.detail || 'Failed to load events');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    doFetch();
    
    if (autoRefresh) {
      const interval = setInterval(doFetch, 10000);
      return () => clearInterval(interval);
    }
  }, [userId, effectiveLimit, kindFilter, autoRefresh]);

  const sessionGroups = useMemo(() => groupBySession(events), [events]);

  const toggleSession = (sessionId: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-neutral-500">
        Loading spiral events...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-1">
        {KIND_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setKindFilter(f.value)}
            className={`px-2 py-1 text-xs rounded-full transition-colors ${
              kindFilter === f.value
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
            }`}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="p-4 text-sm text-neutral-500">
          {kindFilter !== 'all' 
            ? `No ${kindFilter.replace(/_/g, ' ')} events yet.`
            : 'No spiral events yet. Start a voice session to generate events.'
          }
        </div>
      ) : (
        <>
          {/* Grouped by session */}
          <div className="space-y-2">
            {sessionGroups.map(group => {
              const isExpanded = expandedSessions.has(group.sessionId);
              const displayEvents = isExpanded ? group.events : group.events.slice(0, 2);
              const hasMore = group.events.length > 2;
              
              return (
                <div
                  key={group.sessionId}
                  className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden"
                >
                  {/* Session header */}
                  <button
                    onClick={() => toggleSession(group.sessionId)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                  >
                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      Session {group.sessionId.slice(0, 8)}...
                    </span>
                    <span className="flex items-center gap-2 text-xs text-neutral-500">
                      <span>{group.events.length} event{group.events.length !== 1 ? 's' : ''}</span>
                      <span>{formatRelativeTime(group.lastTs)}</span>
                      {hasMore && (
                        <span className="text-neutral-400">{isExpanded ? '▼' : '▶'}</span>
                      )}
                    </span>
                  </button>
                  
                  {/* Events in session */}
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {displayEvents.map((event, idx) => (
                      <div
                        key={`${event.ts}-${idx}`}
                        className="flex items-start gap-2 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
                      >
                        <span className="text-base flex-shrink-0">
                          {getEventIcon(event.event.kind)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {getEventLabel(event.event)}
                          </div>
                          {event.event.pass_level && (
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              {event.event.pass_level.replace('PassLevel.', '')}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-neutral-400 dark:text-neutral-500 flex-shrink-0">
                          {formatRelativeTime(event.ts)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show more toggle */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowMore(!showMore)}
              className="px-3 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {showMore ? 'Show less' : 'Show 100'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

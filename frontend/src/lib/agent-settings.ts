'use client';

import { useCallback, useState } from 'react';

type AgentSettings = {
  enabled: boolean;
  memoryEnabled: boolean;
  selectedProfileId: string | null;
};

const STORAGE_KEY = 'agent_settings_v1';
const DEFAULTS: AgentSettings = { enabled: true, memoryEnabled: true, selectedProfileId: null };

function readSettings(): AgentSettings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AgentSettings>;
    return {
      enabled: parsed.enabled ?? DEFAULTS.enabled,
      memoryEnabled: parsed.memoryEnabled ?? DEFAULTS.memoryEnabled,
      selectedProfileId: parsed.selectedProfileId ?? DEFAULTS.selectedProfileId,
    };
  } catch {
    return DEFAULTS;
  }
}

function writeSettings(next: AgentSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function useAgentSettings() {
  const [settings, setSettings] = useState<AgentSettings>(() => readSettings());

  const setEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, enabled };
      writeSettings(next);
      return next;
    });
  }, []);

  const setMemoryEnabled = useCallback((memoryEnabled: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, memoryEnabled };
      writeSettings(next);
      return next;
    });
  }, []);

  const setSelectedProfileId = useCallback((selectedProfileId: string | null) => {
    setSettings((prev) => {
      const next = { ...prev, selectedProfileId };
      writeSettings(next);
      return next;
    });
  }, []);

  return {
    enabled: settings.enabled,
    memoryEnabled: settings.memoryEnabled,
    selectedProfileId: settings.selectedProfileId,
    setEnabled,
    setMemoryEnabled,
    setSelectedProfileId,
  };
}

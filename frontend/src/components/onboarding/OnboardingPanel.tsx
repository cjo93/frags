'use client';

import { useState, useEffect } from 'react';

interface OnboardingPanelProps {
  onDismiss: () => void;
}

const STORAGE_KEY = 'defrag_onboarding_seen';

export function useOnboardingState() {
  const [hasSeen, setHasSeen] = useState(true); // Default true to prevent flash

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    setHasSeen(seen === 'true');
  }, []);

  const markSeen = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setHasSeen(true);
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSeen(false);
  };

  return { hasSeen, markSeen, reset };
}

const steps = [
  'Create structured profiles.',
  'Observe patterns over time.',
  'Explore relationships when context expands.',
];

export function OnboardingPanel({ onDismiss }: OnboardingPanelProps) {
  return (
    <div className="mb-12 p-6 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
      <div className="flex items-start justify-between mb-6">
        <h2 className="text-lg font-medium">Getting started</h2>
        <button
          onClick={onDismiss}
          className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          aria-label="Skip onboarding"
        >
          Skip
        </button>
      </div>

      <ol className="space-y-3 mb-6">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm text-neutral-600 dark:text-neutral-400">
            <span className="text-neutral-400 font-medium">{i + 1}.</span>
            {step}
          </li>
        ))}
      </ol>

      <button
        onClick={onDismiss}
        className="px-4 py-2 text-sm font-medium border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        Continue to dashboard
      </button>
    </div>
  );
}

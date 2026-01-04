'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  completed: boolean;
  locked?: boolean;
}

interface OnboardingPanelProps {
  hasProfiles: boolean;
  hasSynthesis: boolean;
  hasAIAccess: boolean;
  hasConstellationAccess: boolean;
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

export function OnboardingPanel({
  hasProfiles,
  hasSynthesis,
  hasAIAccess,
  hasConstellationAccess,
  onDismiss,
}: OnboardingPanelProps) {
  const steps: OnboardingStep[] = [
    {
      id: 'profile',
      title: 'Create a profile',
      description:
        'A profile holds birth data and computed layers across Human Design, Gene Keys, numerology, and astrology. Start with yourself.',
      action: {
        label: 'Create profile',
        href: '/profile/new',
      },
      completed: hasProfiles,
    },
    {
      id: 'synthesis',
      title: 'Generate synthesis',
      description:
        'Once a profile exists, Defrag computes deterministic insights from each system. This happens automatically when you create a profile.',
      action: {
        label: 'View synthesis',
        href: '/dashboard',
      },
      completed: hasSynthesis,
    },
    {
      id: 'ai',
      title: 'Ask a question',
      description:
        'Use the AI to explore what your synthesis means. It draws only from your computed layers—no speculation, no hallucination.',
      action: {
        label: hasAIAccess ? 'Ask about a profile' : 'Requires paid plan',
        href: hasAIAccess ? '/dashboard' : '/pricing',
      },
      completed: false, // Can't track this easily
      locked: !hasAIAccess,
    },
    {
      id: 'constellation',
      title: 'Explore constellations',
      description:
        'Constellations map relationships between profiles. They reveal patterns that only emerge when you look at people together.',
      action: {
        label: hasConstellationAccess ? 'Create constellation' : 'Requires Constellation plan',
        href: hasConstellationAccess ? '/constellation/new' : '/pricing',
      },
      completed: false,
      locked: !hasConstellationAccess,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const allDone = completedCount >= 2; // Profile + synthesis = enough to dismiss

  return (
    <div className="mb-12 p-6 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium mb-1">Getting started</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Defrag synthesizes symbolic systems into a unified view of yourself and your relationships.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          aria-label="Dismiss onboarding"
        >
          {allDone ? 'Done' : 'Skip'}
        </button>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex gap-4 ${step.locked ? 'opacity-60' : ''}`}
          >
            {/* Step number / check */}
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
              {step.completed ? (
                <svg
                  className="w-5 h-5 text-neutral-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <span className="text-sm text-neutral-400 font-medium">
                  {index + 1}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className={`font-medium text-sm ${
                  step.completed
                    ? 'text-neutral-400 line-through'
                    : 'text-neutral-900 dark:text-white'
                }`}
              >
                {step.title}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                {step.description}
              </p>
              {!step.completed && (
                <div className="mt-2">
                  {step.action.href ? (
                    <Link
                      href={step.action.href}
                      className={`text-sm underline underline-offset-4 ${
                        step.locked
                          ? 'text-neutral-400'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {step.action.label}
                    </Link>
                  ) : (
                    <button
                      onClick={step.action.onClick}
                      className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline underline-offset-4"
                    >
                      {step.action.label}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

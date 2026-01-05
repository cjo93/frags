'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
  {
    id: 'not-a-test',
    title: 'This is not a personality test.',
    description:
      'Defrag synthesizes existing symbolic systems—Human Design, Gene Keys, numerology, astrology—into a unified view. Nothing is invented. Everything is computed.',
  },
  {
    id: 'patterns-emerge',
    title: 'Patterns emerge over time and between people.',
    description:
      'Your profile captures a moment. Constellations reveal relationships. The more data you add, the more structure becomes visible.',
  },
  {
    id: 'you-decide',
    title: 'You decide how deep to go.',
    description:
      'Start with your own synthesis. Add family or partners when you\'re ready. The system doesn\'t push—you lead.',
  },
];

export function OnboardingPanel({ onDismiss }: OnboardingPanelProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onDismiss();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const step = steps[currentStep];

  return (
    <div className="mb-12 p-6 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <p className="text-xs text-neutral-400 mb-2">
            {currentStep + 1} of {steps.length}
          </p>
          <h2 className="text-lg font-medium mb-2">{step.title}</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-lg">
            {step.description}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 ml-4"
          aria-label="Skip onboarding"
        >
          Skip
        </button>
      </div>

      <div className="flex items-center justify-between">
        {/* Progress dots */}
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i === currentStep
                  ? 'bg-neutral-900 dark:bg-white'
                  : i < currentStep
                  ? 'bg-neutral-400'
                  : 'bg-neutral-200 dark:bg-neutral-700'
              }`}
            />
          ))}
        </div>

        {/* Next / Continue button */}
        <button
          onClick={handleNext}
          className="px-4 py-2 text-sm font-medium border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          {isLastStep ? 'Continue to dashboard' : 'Next'}
        </button>
      </div>
    </div>
  );
}

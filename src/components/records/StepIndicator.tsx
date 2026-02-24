'use client';

import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  steps: { label: string; description: string }[];
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;

        return (
          <div key={stepNum} className="flex items-center">
            {/* ステップ */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all ${
                  isCompleted
                    ? 'bg-accent text-white'
                    : isActive
                    ? 'bg-accent text-white shadow-lg shadow-accent/30'
                    : 'bg-border text-text-muted'
                }`}
              >
                {isCompleted ? <Check size={18} /> : stepNum}
              </div>
              <div className="mt-2 text-center">
                <p
                  className={`text-xs font-semibold ${
                    isActive ? 'text-accent' : isCompleted ? 'text-text-primary' : 'text-text-muted'
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[11px] text-text-muted mt-0.5 hidden sm:block">
                  {step.description}
                </p>
              </div>
            </div>

            {/* コネクター */}
            {index < steps.length - 1 && (
              <div
                className={`mx-4 h-0.5 w-16 sm:w-24 rounded-full transition-colors ${
                  stepNum < currentStep ? 'bg-accent' : 'bg-border'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

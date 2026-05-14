import { Check } from "lucide-react";

import { cn } from "@/renderer/lib/utils";

export interface StepperStep {
  id: string;
  label: string;
}

interface StepperProps {
  steps: StepperStep[];
  currentStepId: string;
  className?: string;
}

export const Stepper = ({ steps, currentStepId, className }: StepperProps) => {
  const currentStepIndex = Math.max(
    steps.findIndex((step) => step.id === currentStepId),
    0,
  );

  return (
    <ol
      aria-label="Progress"
      className={cn("panevo-stepper", className)}
      data-step-count={steps.length}
    >
      {steps.map((step, index) => {
        const state =
          index < currentStepIndex
            ? "complete"
            : index === currentStepIndex
              ? "current"
              : "upcoming";

        return (
          <li className="panevo-stepper-item" data-state={state} key={step.id}>
            <span className="panevo-stepper-marker" aria-hidden="true">
              {state === "complete" ? <Check size={14} /> : index + 1}
            </span>
            <span
              className="panevo-stepper-label"
              aria-current={state === "current" ? "step" : undefined}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

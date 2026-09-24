interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (stepIndex: number) => void;
  canNavigateToStep?: (stepIndex: number) => boolean;
}

const STEP_LABELS = [
  'Nombre y Apellido',
  'Programas',
  'Correo',
  'Celular'
];

export function ProgressBar({
  currentStep,
  totalSteps,
  onStepClick,
  canNavigateToStep
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.round(((currentStep + 1) / totalSteps) * 100));

  return (
    <div id="progress-container" className="w-full max-w-xl mx-auto px-4 py-3">
      {/* Top progress line */}
      <div className="flex items-center justify-between text-xs font-semibold mb-2">
        <span className="tracking-wide uppercase text-[11px] text-blue-300">
          Paso {currentStep + 1} de {totalSteps} • <span className="text-amber-300 font-bold">{STEP_LABELS[currentStep] || ''}</span>
        </span>
        <span className="tabular-nums text-amber-400 font-extrabold">{percentage}%</span>
      </div>

      {/* Bar track */}
      <div className="w-full h-2 bg-blue-950/80 border border-blue-800/60 rounded-full overflow-hidden p-0.5">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-amber-300 transition-all duration-300 ease-out rounded-full shadow-sm shadow-amber-400/50"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Step dot indicator pills */}
      <div className="flex items-center justify-between mt-3 gap-1.5">
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const isCurrent = idx === currentStep;
          const isCompleted = idx < currentStep;
          const isAllowed = canNavigateToStep ? canNavigateToStep(idx) : idx <= currentStep;

          return (
            <button
              key={idx}
              id={`step-dot-${idx}`}
              type="button"
              disabled={!isAllowed}
              onClick={() => onStepClick?.(idx)}
              className={`flex-1 flex flex-col items-center py-1 transition-all rounded-md group ${
                isAllowed ? 'cursor-pointer hover:bg-blue-900/40' : 'cursor-not-allowed opacity-40'
              }`}
              title={STEP_LABELS[idx]}
            >
              <div
                className={`h-1.5 w-full rounded-full transition-all ${
                  isCurrent
                    ? 'bg-amber-400 scale-y-125 shadow-sm shadow-amber-400/50'
                    : isCompleted
                    ? 'bg-emerald-400'
                    : 'bg-blue-900/70 border border-blue-800/40'
                }`}
              />
              <span
                className={`text-[10px] mt-1 font-medium hidden sm:block truncate max-w-[80px] ${
                  isCurrent
                    ? 'text-amber-300 font-bold'
                    : isCompleted
                    ? 'text-blue-200'
                    : 'text-blue-400/70'
                }`}
              >
                {STEP_LABELS[idx]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

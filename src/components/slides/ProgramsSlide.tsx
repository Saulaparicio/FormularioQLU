import { GraduationCap, Check, ArrowRight, ArrowLeft, Layers } from 'lucide-react';
import { PROGRAM_OPTIONS } from '../../types';

interface ProgramsSlideProps {
  selectedPrograms: string[];
  onToggleProgram: (label: string) => void;
  onNext: () => void;
  onPrev: () => void;
  error?: string;
}

export function ProgramsSlide({
  selectedPrograms,
  onToggleProgram,
  onNext,
  onPrev,
  error
}: ProgramsSlideProps) {
  const isSelected = (label: string) => selectedPrograms.includes(label);

  return (
    <div id="slide-programas" className="flex flex-col items-center text-center max-w-2xl mx-auto w-full">
      <div className="w-14 h-14 rounded-2xl bg-blue-900/80 text-amber-400 flex items-center justify-center mb-4 shadow-md border border-blue-700/80">
        <GraduationCap className="w-7 h-7 stroke-[2.2]" />
      </div>

      <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 bg-amber-400/15 border border-amber-400/30 px-3.5 py-1 rounded-full mb-3">
        Paso 2 • Interés Académico
      </span>

      <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
        ¿Qué programas son de tu interés?
      </h2>
      <p className="text-blue-100/90 text-sm sm:text-base mb-4 max-w-lg">
        Puedes seleccionar <strong>más de una opción</strong> según lo que busques para ti o tu familia.
      </p>

      {/* Counter bar */}
      <div className="flex items-center justify-between w-full px-2 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-blue-200 font-medium">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>Seleccionados: <strong className="text-amber-300 font-extrabold text-sm">{selectedPrograms.length}</strong></span>
        </div>
        {selectedPrograms.length > 0 && (
          <span className="text-xs text-emerald-300 font-bold bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
            ✓ Listo para avanzar
          </span>
        )}
      </div>

      {/* Grid of options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-h-[46vh] overflow-y-auto p-1.5 text-left rounded-2xl border border-blue-800/70 bg-blue-950/60 shadow-inner">
        {PROGRAM_OPTIONS.map((item) => {
          const selected = isSelected(item.label);
          return (
            <button
              key={item.id}
              id={`prog-${item.id}`}
              type="button"
              onClick={() => onToggleProgram(item.label)}
              className={`p-3.5 rounded-xl border-2 transition-all flex items-start justify-between text-left cursor-pointer group active:scale-[0.99] ${
                selected
                  ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-md font-semibold'
                  : 'bg-[#0d2144]/90 border-blue-800/80 text-blue-100 hover:border-amber-400/80 hover:bg-[#122b54]'
              }`}
            >
              <div className="flex-1 pr-2">
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider block mb-0.5 ${
                    selected ? 'text-amber-950/80' : 'text-amber-400 group-hover:text-amber-300'
                  }`}
                >
                  {item.category}
                </span>
                <span className={`text-sm font-bold leading-snug block ${selected ? 'text-slate-950' : 'text-white'}`}>
                  {item.label}
                </span>
              </div>

              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  selected
                    ? 'bg-slate-950 text-amber-400 shadow-xs'
                    : 'border border-blue-600 text-transparent group-hover:border-amber-400'
                }`}
              >
                <Check className={`w-4 h-4 stroke-[3] ${selected ? 'opacity-100' : 'opacity-0'}`} />
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-red-300 text-sm mt-2 font-semibold w-full text-center">
          {error}
        </p>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between w-full mt-6">
        <button
          id="btn-prev-programas"
          type="button"
          onClick={onPrev}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-blue-200 hover:text-white bg-blue-950/70 hover:bg-blue-900 border border-blue-700/70 font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
          <span>Atrás</span>
        </button>

        <button
          id="btn-next-programas"
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-xl transition-all shadow-lg hover:shadow-amber-400/20 active:scale-98 cursor-pointer"
        >
          <span>Siguiente ({selectedPrograms.length})</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}

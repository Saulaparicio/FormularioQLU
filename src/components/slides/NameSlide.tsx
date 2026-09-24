import { useEffect, useRef } from 'react';
import { User, ArrowRight } from 'lucide-react';

interface NameSlideProps {
  value: string;
  onChange: (val: string) => void;
  onNext: () => void;
  error?: string;
}

export function NameSlide({ value, onChange, onNext, error }: NameSlideProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus after slide transition
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onNext();
    }
  };

  return (
    <div id="slide-nombre" className="flex flex-col items-center text-center max-w-lg mx-auto w-full">
      <div className="w-14 h-14 rounded-2xl bg-blue-900/80 text-amber-400 flex items-center justify-center mb-6 shadow-md border border-blue-700/80">
        <User className="w-7 h-7 stroke-[2.2]" />
      </div>

      <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 bg-amber-400/15 border border-amber-400/30 px-3.5 py-1 rounded-full mb-3">
        Paso 1 • Identificación
      </span>

      <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
        ¿Cuál es tu nombre y apellido?
      </h2>
      <p className="text-blue-100/90 text-base mb-8 max-w-md">
        Bienvenido a la Feria QLU. Por favor indícanos tu nombre completo para personalizar tu registro y acreditación.
      </p>

      <div className="w-full relative mb-4">
        <input
          ref={inputRef}
          id="input-nombre-completo"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ej. Ana Sofía Martínez"
          autoComplete="name"
          className={`w-full px-5 py-4 text-xl sm:text-2xl text-slate-900 placeholder:text-slate-400 bg-white rounded-xl border-2 transition-all outline-hidden shadow-lg ${
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-200'
              : 'border-blue-300/80 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/25'
          }`}
        />
        {error && (
          <p className="text-red-300 text-sm mt-2 font-semibold text-left">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between w-full mt-4">
        <span className="text-xs text-blue-200/80 flex items-center gap-1.5">
          <span>Pulsa</span>
          <kbd className="px-2 py-0.5 bg-blue-950/90 border border-blue-700 rounded text-[11px] font-mono text-amber-300 font-bold">Enter ↵</kbd>
          <span>para continuar</span>
        </span>

        <button
          id="btn-next-nombre"
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-xl transition-all shadow-lg hover:shadow-amber-400/20 active:scale-98 cursor-pointer"
        >
          <span>Siguiente</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { Mail, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';

interface EmailSlideProps {
  value: string;
  onChange: (val: string) => void;
  onNext: () => void;
  onPrev: () => void;
  error?: string;
}

export function EmailSlide({ value, onChange, onNext, onPrev, error }: EmailSlideProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
    <div id="slide-correo" className="flex flex-col items-center text-center max-w-lg mx-auto w-full">
      <div className="w-14 h-14 rounded-2xl bg-blue-900/80 text-amber-400 flex items-center justify-center mb-6 shadow-md border border-blue-700/80">
        <Mail className="w-7 h-7 stroke-[2.2]" />
      </div>

      <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 bg-amber-400/15 border border-amber-400/30 px-3.5 py-1 rounded-full mb-3">
        Paso 3 • Contacto
      </span>

      <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
        ¿A qué correo te enviamos el comprobante?
      </h2>
      <p className="text-blue-100/90 text-base mb-6 max-w-md">
        Recibirás una confirmación inmediata con el detalle de los programas que seleccionaste.
      </p>

      <div className="w-full relative mb-4">
        <input
          ref={inputRef}
          id="input-correo"
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="tu.correo@ejemplo.com"
          autoComplete="email"
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

      <div className="flex items-center gap-2 text-xs text-blue-200 bg-blue-950/70 border border-blue-800/70 px-3.5 py-2 rounded-lg mb-6 w-full text-left">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Tus datos son tratados de forma confidencial por Quality Leadership University.</span>
      </div>

      <div className="flex items-center justify-between w-full mt-2">
        <button
          id="btn-prev-correo"
          type="button"
          onClick={onPrev}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-blue-200 hover:text-white bg-blue-950/70 hover:bg-blue-900 border border-blue-700/70 font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
          <span>Atrás</span>
        </button>

        <button
          id="btn-next-correo"
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

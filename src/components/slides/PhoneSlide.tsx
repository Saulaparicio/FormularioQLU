import { useEffect, useRef, useState } from 'react';
import { Phone, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';

interface PhoneSlideProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  onPrev: () => void;
  isSubmitting: boolean;
  error?: string;
}

const COUNTRY_CODES = [
  { code: '+507', country: 'Panamá (507)', flag: '🇵🇦' },
  { code: '+1', country: 'USA / Canadá (1)', flag: '🇺🇸' },
  { code: '+57', country: 'Colombia (57)', flag: '🇨🇴' },
  { code: '+506', country: 'Costa Rica (506)', flag: '🇨🇷' },
  { code: '+58', country: 'Venezuela (58)', flag: '🇻🇪' },
  { code: '+52', country: 'México (52)', flag: '🇲🇽' },
  { code: '+34', country: 'España (34)', flag: '🇪🇸' },
  { code: '', country: 'Otro', flag: '🌐' }
];

export function PhoneSlide({
  value,
  onChange,
  onSubmit,
  onPrev,
  isSubmitting,
  error
}: PhoneSlideProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedPrefix, setSelectedPrefix] = useState('+507');

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handlePhoneInputChange = (raw: string) => {
    onChange(raw);
  };

  return (
    <div id="slide-celular" className="flex flex-col items-center text-center max-w-lg mx-auto w-full">
      <div className="w-14 h-14 rounded-2xl bg-blue-900/80 text-amber-400 flex items-center justify-center mb-6 shadow-md border border-blue-700/80">
        <Phone className="w-7 h-7 stroke-[2.2]" />
      </div>

      <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 bg-amber-400/15 border border-amber-400/30 px-3.5 py-1 rounded-full mb-3">
        Paso 4 • Contacto Final
      </span>

      <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
        ¿Cuál es tu número de celular?
      </h2>
      <p className="text-blue-100/90 text-base mb-6 max-w-md">
        Lo utilizaremos para coordinar tu atención vía WhatsApp o llamada durante la Feria QLU.
      </p>

      <div className="w-full mb-4">
        <div className="flex rounded-xl border-2 border-blue-300/80 bg-white shadow-lg focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-400/25 transition-all overflow-hidden">
          <select
            id="select-country-prefix"
            value={selectedPrefix}
            onChange={(e) => setSelectedPrefix(e.target.value)}
            className="px-3 py-4 bg-slate-50 border-r border-slate-200 text-slate-800 font-bold text-base outline-hidden cursor-pointer"
          >
            {COUNTRY_CODES.map((item, idx) => (
              <option key={idx} value={item.code}>
                {item.flag} {item.code || 'Otro'}
              </option>
            ))}
          </select>

          <input
            ref={inputRef}
            id="input-celular"
            type="tel"
            value={value}
            onChange={(e) => handlePhoneInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="6000-0000"
            autoComplete="tel"
            className="w-full px-4 py-4 text-xl sm:text-2xl text-slate-900 placeholder:text-slate-400 bg-transparent outline-hidden font-semibold"
          />
        </div>

        {error && (
          <p className="text-red-300 text-sm mt-2 font-semibold text-left">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between w-full mt-6">
        <button
          id="btn-prev-celular"
          type="button"
          disabled={isSubmitting}
          onClick={onPrev}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-blue-200 hover:text-white bg-blue-950/70 hover:bg-blue-900 border border-blue-700/70 font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
          <span>Atrás</span>
        </button>

        <button
          id="btn-submit-registro"
          type="button"
          disabled={isSubmitting}
          onClick={onSubmit}
          className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-xl transition-all shadow-lg hover:shadow-amber-400/20 active:scale-98 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Procesando registro...</span>
            </>
          ) : (
            <>
              <span>Completar Registro</span>
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

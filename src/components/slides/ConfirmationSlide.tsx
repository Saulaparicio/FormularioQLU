import { Check, CheckCircle, ExternalLink, Mail, FileSpreadsheet, RotateCcw, ShieldCheck } from 'lucide-react';
import type { SubmissionResult } from '../../types';

interface ConfirmationSlideProps {
  result: SubmissionResult;
  onReset: () => void;
  onConnectGoogle?: () => void;
  isAspiranteMode?: boolean;
}

export function ConfirmationSlide({
  result,
  onReset,
  onConnectGoogle,
  isAspiranteMode = false
}: ConfirmationSlideProps) {
  return (
    <div id="slide-confirmacion" className="flex flex-col items-center text-center max-w-xl mx-auto w-full py-2">
      {/* Big Animated checkmark icon */}
      <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center mb-5 shadow-lg shadow-emerald-950/40">
        <CheckCircle className="w-12 h-12 stroke-[2.2]" />
      </div>

      <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-3.5 py-1 rounded-full mb-2">
        Registro Exitoso
      </span>

      <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
        ¡Bienvenido a la Feria QLU!
      </h2>

      <p className="text-blue-100/90 text-base mb-6 max-w-md">
        Muchas gracias, <strong className="text-white">{result.nombreCompleto || `${result.nombre} ${result.apellido}`.trim()}</strong>. Tu información ha sido procesada correctamente.
      </p>

      {/* Sync Status Cards (Admin View vs Aspirante View) */}
      {isAspiranteMode ? (
        <div className="w-full bg-blue-950/80 border border-blue-800/80 rounded-2xl p-5 mb-6 text-left space-y-3 shadow-xl">
          <div className="flex items-center gap-3 p-3.5 bg-[#0d2144]/90 rounded-xl border border-blue-800/70 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Comprobante Oficial Enviado</p>
              <p className="text-xs text-blue-200/80">
                Enviado a tu correo: <strong className="text-amber-300 font-bold">{result.correo}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 bg-[#0d2144]/90 rounded-xl border border-blue-800/70 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Atención Personalizada QLU</p>
              <p className="text-xs text-blue-200/80">
                Un asesor académico se pondrá en contacto contigo muy pronto.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full bg-blue-950/80 border border-blue-800/80 rounded-2xl p-5 mb-6 text-left space-y-3 shadow-xl">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-300/80 mb-1">
            Comprobaciones del Administrador
          </h3>

          {/* Google Sheets status */}
          <div className="flex items-center justify-between p-3.5 bg-[#0d2144]/90 rounded-xl border border-blue-800/70 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Google Sheets «Feria QLU»</p>
                <p className="text-xs text-blue-200/80">
                  {result.sheetsSaved ? 'Fila agregada exitosamente' : 'Guardado local (listo para sincronizar)'}
                </p>
              </div>
            </div>
            {result.sheetsUrl ? (
              <a
                id="link-open-sheets"
                href={result.sheetsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 px-3 py-1.5 rounded-lg transition-all shadow-xs"
              >
                <span>Ver Hoja</span>
                <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
              </a>
            ) : !result.sheetsSaved && onConnectGoogle ? (
              <button
                id="btn-sync-sheets-now"
                type="button"
                onClick={onConnectGoogle}
                className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-950 bg-amber-400 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs"
              >
                <span>Sincronizar</span>
              </button>
            ) : (
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/40">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}
          </div>

          {/* User confirmation email */}
          <div className="flex items-center justify-between p-3.5 bg-[#0d2144]/90 rounded-xl border border-blue-800/70 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Comprobante al Aspirante</p>
                <p className="text-xs text-blue-200/80">
                  Enviado a <strong className="text-amber-300">{result.correo}</strong>
                </p>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
          </div>

          {/* Admin confirmation email */}
          <div className="flex items-center justify-between p-3.5 bg-[#0d2144]/90 rounded-xl border border-blue-800/70 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Notificación al Administrador</p>
                <p className="text-xs text-blue-200/80">
                  Enviada al correo de admisiones para gestión inmediata
                </p>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-400/30">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
          </div>
        </div>
      )}

      {/* Program Summary badges */}
      <div className="w-full text-left mb-6 px-1">
        <p className="text-xs font-bold text-blue-200 mb-2">Programas de interés registrados:</p>
        <div className="flex flex-wrap gap-1.5">
          {result.programas.map((prog, idx) => (
            <span
              key={idx}
              className="text-xs font-bold bg-blue-900/80 text-amber-300 px-3 py-1 rounded-lg border border-blue-700/80 shadow-xs"
            >
              {prog}
            </span>
          ))}
        </div>
      </div>

      {/* Button to register another person */}
      <button
        id="btn-register-another"
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-2 px-8 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-xl transition-all shadow-lg hover:shadow-amber-400/20 active:scale-98 cursor-pointer"
      >
        <RotateCcw className="w-4 h-4 stroke-[2.5]" />
        <span>Registrar a otro aspirante</span>
      </button>
    </div>
  );
}

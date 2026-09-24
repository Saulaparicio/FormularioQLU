import { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  X,
  FileSpreadsheet,
  Mail,
  ExternalLink,
  LogOut,
  Download,
  Users,
  RefreshCw,
  Loader2,
  Copy,
  Check,
  Share2
} from 'lucide-react';
import type { SubmissionResult } from '../types';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser | null;
  accessToken?: string | null;
  onLogin?: () => void;
  onLogout: () => void;
  adminEmail: string;
  onSaveAdminEmail: (email: string) => void;
  sheetUrl?: string | null;
  history: SubmissionResult[];
  onSyncPending?: () => void;
  isSyncing?: boolean;
  onSaveCustomSheet?: (input: string) => void;
  isAspiranteMode?: boolean;
  onToggleMode?: (aspirante: boolean) => void;
}

export function AdminModal({
  isOpen,
  onClose,
  user,
  accessToken,
  onLogin,
  onLogout,
  adminEmail,
  onSaveAdminEmail,
  sheetUrl,
  history,
  onSyncPending,
  isSyncing,
  onSaveCustomSheet,
  isAspiranteMode = false,
  onToggleMode
}: AdminModalProps) {
  const [emailInput, setEmailInput] = useState(adminEmail);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [sheetInput, setSheetInput] = useState('');
  const [savedSheetSuccess, setSavedSheetSuccess] = useState(false);
  const [copiedAttendee, setCopiedAttendee] = useState(false);
  const [copiedAdmin, setCopiedAdmin] = useState(false);

  const getBaseUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}`;
  };

  const attendeeUrl = `${getBaseUrl()}?modo=aspirante`;
  const adminUrl = `${getBaseUrl()}?modo=admin`;

  const copyToClipboard = async (text: string, type: 'attendee' | 'admin') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'attendee') {
        setCopiedAttendee(true);
        setTimeout(() => setCopiedAttendee(false), 2000);
      } else {
        setCopiedAdmin(true);
        setTimeout(() => setCopiedAdmin(false), 2000);
      }
    } catch {
      // fallback
    }
  };

  if (!isOpen) return null;

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveAdminEmail(emailInput);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSaveSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetInput.trim() || !onSaveCustomSheet) return;
    onSaveCustomSheet(sheetInput.trim());
    setSavedSheetSuccess(true);
    setSheetInput('');
    setTimeout(() => setSavedSheetSuccess(false), 2500);
  };

  const handleDownloadCSV = () => {
    if (history.length === 0) return;
    const headers = ['Fecha y Hora', 'Nombre y Apellido', 'Programas', 'Correo', 'Celular', 'Sheets', 'Correo Aspirante', 'Correo Admin'];
    const rows = history.map((item) => {
      const full = item.nombreCompleto || `${item.nombre || ''} ${item.apellido || ''}`.trim();
      return [
        `"${item.timestamp}"`,
        `"${full}"`,
        `"${item.programas.join(', ')}"`,
        `"${item.correo}"`,
        `"${item.celular}"`,
        `"${item.sheetsSaved ? 'SÍ' : 'NO'}"`,
        `"${item.userEmailSent ? 'SÍ' : 'NO'}"`,
        `"${item.adminEmailSent ? 'SÍ' : 'NO'}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Feria_QLU_Registros_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-xs">
              QLU
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Administración Feria QLU</h3>
              <p className="text-xs text-slate-500">Google Sheets y Notificaciones de Ingreso</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Share Links Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/70 border border-blue-200/90 rounded-2xl p-4.5 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-900 text-amber-400 flex items-center justify-center font-bold text-xs shadow-xs">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Enlaces de la Feria (Separación de Vistas)</h4>
                  <p className="text-xs text-slate-500">Copia el enlace para los aspirantes o mantén tu acceso de administrador</p>
                </div>
              </div>
            </div>

            {/* 1. Aspirante Link */}
            <div className="bg-white border border-blue-200/80 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Enlace para Aspirantes (Feria / Tablets / QR)</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Sin acceso a configuración
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Los aspirantes sólo verán el formulario de registro y su comprobante. El botón de configuración, accesos a Google Sheets y avisos técnicos están completamente ocultos.
              </p>
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  readOnly
                  value={attendeeUrl}
                  className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-700 select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(attendeeUrl, 'attendee')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-lg transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                >
                  {copiedAttendee ? <Check className="w-3.5 h-3.5 text-emerald-900 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAttendee ? '¡Copiado!' : 'Copiar'}</span>
                </button>
                {onToggleMode && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleMode(true);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold text-xs rounded-lg transition-all cursor-pointer shrink-0"
                    title="Ver aplicación como la verá el aspirante"
                  >
                    <span>Probar Vista</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. Admin Link */}
            <div className="bg-white border border-blue-200/80 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span>Enlace de Administrador</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Acceso Total
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Conserva este enlace para gestionar la hoja de cálculo de Google Sheets, forzar sincronización y descargar el CSV.
              </p>
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  readOnly
                  value={adminUrl}
                  className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-700 select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(adminUrl, 'admin')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs rounded-lg transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                >
                  {copiedAdmin ? <Check className="w-3.5 h-3.5 text-emerald-300 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAdmin ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Google Account Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Cuenta de Google Conectada
              </span>
              {user && accessToken ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Activa
                </span>
              ) : (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  No Conectada
                </span>
              )}
            </div>

            {user && accessToken ? (
              <>
                <p className="text-sm font-bold text-slate-900">{user?.displayName || 'Administrador'}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>

                <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Permisos: Sheets, Drive y Gmail</span>
                  <button
                    onClick={onLogout}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Desconectar</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <p className="text-xs text-slate-600">
                  Para guardar registros en Google Sheets «Feria QLU» y enviar correos, conecta tu cuenta de Google.
                </p>
                {onLogin && (
                  <button
                    type="button"
                    onClick={onLogin}
                    className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-lg transition-all cursor-pointer shrink-0 shadow-xs"
                  >
                    Conectar Google
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Google Sheets Link */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900">Hoja de Cálculo «Feria QLU»</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Los registros de cada aspirante se insertan automáticamente en esta hoja con fecha, nombre, apellido, programas y contactos.
                </p>

                {sheetUrl ? (
                  <div className="mt-2.5 flex items-center gap-2">
                    <a
                      href={sheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-lg border border-emerald-300 hover:bg-emerald-50 transition-all shadow-2xs"
                    >
                      <span>Abrir en Google Sheets</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-2 italic">
                    Se creará y vinculará automáticamente al registrar aspirantes con Google conectado.
                  </p>
                )}

                {/* Form to link existing spreadsheet */}
                {onSaveCustomSheet && (
                  <form onSubmit={handleSaveSheet} className="mt-3 pt-3 border-t border-emerald-200/80">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-900 mb-1">
                      Vincular Hoja Existente (URL o ID)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={sheetInput}
                        onChange={(e) => setSheetInput(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/... o ID"
                        className="flex-1 px-2.5 py-1 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer shadow-xs"
                      >
                        Vincular
                      </button>
                    </div>
                    {savedSheetSuccess && (
                      <p className="text-[11px] text-emerald-700 font-medium mt-1">
                        ✓ Hoja de cálculo vinculada correctamente.
                      </p>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Admin Email Notification Config */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-blue-900" />
              <h4 className="text-sm font-bold text-slate-900">
                Correo para Confirmación al Administrador
              </h4>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Dirección a la que llegará la notificación inmediata con los datos del aspirante para dar seguimiento a la admisión.
            </p>

            <form onSubmit={handleSaveEmail} className="flex gap-2">
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="ej: admisiones@qlu.ac.pa"
                className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer shadow-xs"
              >
                Guardar
              </button>
            </form>
            {savedSuccess && (
              <p className="text-xs text-emerald-600 font-medium mt-2">
                ✓ Correo del administrador guardado exitosamente.
              </p>
            )}
          </div>

          {/* Registrations History */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Registros en esta sesión ({history.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {history.some((h) => !h.sheetsSaved) && onSyncPending && (
                  <button
                    type="button"
                    onClick={onSyncPending}
                    disabled={isSyncing}
                    title="Enviar registros pendientes a Google Sheets"
                    className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-950 hover:text-black bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                        <span>Sincronizando...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
                        <span>Sincronizar pendientes</span>
                      </>
                    )}
                  </button>
                )}
                {history.length > 0 && (
                  <button
                    onClick={handleDownloadCSV}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-900 hover:underline cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar CSV</span>
                  </button>
                )}
              </div>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                Aún no hay registros en esta sesión.
              </p>
            ) : (
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                {history.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-900">{item.nombreCompleto || `${item.nombre || ''} ${item.apellido || ''}`.trim()}</p>
                        {item.sheetsSaved ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-medium">Hoja ✓</span>
                        ) : (
                          <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded font-medium">Local</span>
                        )}
                      </div>
                      <p className="text-slate-500">{item.correo} • {item.celular}</p>
                    </div>
                    <div className="text-right text-[11px] text-slate-400">
                      <span>{item.timestamp.split(',')[1] || item.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

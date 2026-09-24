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
  Share2,
  Send
} from 'lucide-react';
import type { SubmissionResult } from '../types';
import { appendRegistrationViaWebhook } from '../services/googleSheets';

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
  sheetWebhookUrl?: string;
  onSaveSheetWebhookUrl?: (url: string) => void;
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
  sheetWebhookUrl,
  onSaveSheetWebhookUrl,
  history,
  onSyncPending,
  isSyncing,
  onSaveCustomSheet,
  isAspiranteMode = false,
  onToggleMode
}: AdminModalProps) {
  const [emailInput, setEmailInput] = useState(adminEmail);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [sheetInput, setSheetInput] = useState(sheetUrl || '');
  const [savedSheetSuccess, setSavedSheetSuccess] = useState(false);
  const [webhookInput, setWebhookInput] = useState(sheetWebhookUrl || '');
  const [savedWebhookSuccess, setSavedWebhookSuccess] = useState(false);
  const [showScriptGuide, setShowScriptGuide] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedAttendee, setCopiedAttendee] = useState(false);
  const [copiedAdmin, setCopiedAdmin] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testWebhookResult, setTestWebhookResult] = useState<string | null>(null);

  const APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = {};

    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    // 1. Si la hoja no tiene encabezados, crearlos exactamente en orden de 8 columnas
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Marca Temporal',
        'Nombre',
        'Apellido',
        'Programas de Interés',
        'Correo Electrónico',
        'Celular',
        'Notificación Aspirante',
        'Notificación Admin'
      ]);
    }

    // 2. Extraer datos limpios
    var time = data.marcaTemporal || data.fecha || Utilities.formatDate(new Date(), "GMT-5", "MM/dd/yyyy, hh:mm:ss a");
    var fullName = (data.nombreCompleto || '').trim();
    var parts = fullName.split(/\\s+/);
    var firstName = (data.nombre || parts[0] || '').trim();
    var lastName = (data.apellido || parts.slice(1).join(' ') || '').trim();
    var progs = Array.isArray(data.programas) ? data.programas.join(', ') : (data.programasTexto || data.programas || '');
    var email = (data.correo || '').trim();
    var phone = (data.celular || '').trim();
    var notifAsp = data.notificacionAspirante || 'Enviada';
    var notifAdm = data.notificacionAdmin || 'Enviada';

    // 3. Insertar exactamente las 8 columnas en el orden de tu Google Sheet:
    // Col A: Marca Temporal
    // Col B: Nombre
    // Col C: Apellido
    // Col D: Programas de Interés
    // Col E: Correo Electrónico
    // Col F: Celular
    // Col G: Notificación Aspirante
    // Col H: Notificación Admin
    sheet.appendRow([
      time,
      firstName,
      lastName,
      progs,
      email,
      phone,
      notifAsp,
      notifAdm
    ]);

    return ContentService.createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return doPost(e);
}`;

  const handleTestWebhook = async () => {
    if (!webhookInput || !webhookInput.trim()) return;
    setIsTestingWebhook(true);
    setTestWebhookResult(null);
    try {
      const res = await appendRegistrationViaWebhook(webhookInput.trim(), {
        nombreCompleto: 'Prueba QLU',
        nombre: 'Prueba',
        apellido: 'QLU',
        programas: ['Maestría', 'Cursos'],
        correo: 'prueba@qlu.ac.pa',
        celular: '60000000'
      });
      if (res.success) {
        setTestWebhookResult('✓ Fila de prueba enviada con éxito. Abre tu Google Sheet y confirma que "Prueba" aparezca en Columna B y "QLU" en Columna C.');
      } else {
        setTestWebhookResult(`Error al enviar prueba: ${res.error}`);
      }
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || 'Error de conexión';
      setTestWebhookResult(`Error: ${msg}`);
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveSheetWebhookUrl) {
      onSaveSheetWebhookUrl(webhookInput.trim());
      setSavedWebhookSuccess(true);
      setTimeout(() => setSavedWebhookSuccess(false), 3000);
    }
  };

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

          {/* Direct Google Sheets Sync Section (No Google Account Required) */}
          <div className="bg-emerald-50/70 border border-emerald-300/80 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Google Sheets Directo (Sin Iniciar Sesión)</h4>
                  <p className="text-xs text-slate-600">
                    Inserta las respuestas directamente en tu hoja de cálculo sin requerir que el administrador conecte cuentas.
                  </p>
                </div>
              </div>
              {sheetWebhookUrl ? (
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                  Directo Activo
                </span>
              ) : (
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                  Configuración Lista
                </span>
              )}
            </div>

            {/* 1. Direct Webhook URL input */}
            <form onSubmit={handleSaveWebhook} className="bg-white border border-emerald-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-900">
                  URL de Envío Directo (Google Apps Script Web App)
                </label>
                <button
                  type="button"
                  onClick={() => setShowScriptGuide(!showScriptGuide)}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                >
                  {showScriptGuide ? 'Ocultar guía' : '¿Cómo obtener esta URL en 1 minuto?'}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Pega la URL de tu Web App de Google Sheets para que los registros se sincronicen en tiempo real de forma automática.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={webhookInput}
                  onChange={(e) => setWebhookInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                >
                  Guardar
                </button>
              </div>

              {webhookInput && (
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={isTestingWebhook}
                    onClick={handleTestWebhook}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isTestingWebhook ? 'Enviando prueba...' : 'Enviar Fila de Prueba a Google Sheets'}</span>
                  </button>
                  <span className="text-[11px] text-slate-500">
                    Inserta una fila de prueba inmediata para verificar columnas.
                  </span>
                </div>
              )}

              {testWebhookResult && (
                <div className={`p-2.5 rounded-lg text-xs font-semibold ${testWebhookResult.startsWith('✓') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {testWebhookResult}
                </div>
              )}

              {savedWebhookSuccess && (
                <p className="text-[11px] text-emerald-700 font-medium">
                  ✓ URL de sincronización directa guardada con éxito.
                </p>
              )}
            </form>

            {/* 2. Expandable guide for 1-minute Apps Script setup */}
            {showScriptGuide && (
              <div className="bg-white border border-blue-200 rounded-xl p-4 text-xs text-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-900">Pasos para conectar tu Google Sheet:</h5>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-md cursor-pointer transition-all shadow-xs"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-900 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? '¡Código Copiado!' : 'Copiar Código de Google Apps Script'}</span>
                  </button>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                  <li>Abre tu hoja de Google Sheets y en el menú superior ve a <strong>Extensiones &gt; Apps Script</strong>.</li>
                  <li>Borra cualquier código previo, haz clic arriba en <strong>«Copiar Código de Google Apps Script»</strong> y pégalo ahí.</li>
                  <li>
                    <strong className="text-amber-900 bg-amber-100 px-1 py-0.5 rounded">¡MUY IMPORTANTE SI YA LO HABÍAS IMPLEMENTADO!:</strong>
                    <br />
                    En Google Apps Script, guardar con Ctrl+S no actualiza la URL existente. Debes hacer:
                    <ul className="list-disc list-inside ml-3 mt-1 space-y-0.5 text-slate-700">
                      <li>Haz clic en <strong>Implementar &gt; Administrar implementaciones</strong>.</li>
                      <li>Haz clic en el <strong>icono de lápiz (Editar)</strong> en la esquina superior derecha.</li>
                      <li>En <strong>Versión</strong>, haz clic y selecciona <strong>«Nueva versión»</strong>.</li>
                      <li>Haz clic en el botón azul <strong>Implementar</strong>.</li>
                    </ul>
                    <em>(O simplemente haz clic en <strong>Implementar &gt; Nueva implementación</strong>, selecciona Aplicación web, acceso «Cualquier usuario» y copia la nueva URL).</em>
                  </li>
                  <li>Pega la <strong>URL de la aplicación web</strong> (termina en <code>/exec</code>) en el campo de arriba y pulsa Guardar.</li>
                </ol>
              </div>
            )}

            {/* 3. Sheet URL input for quick opening */}
            <form onSubmit={handleSaveSheet} className="bg-white border border-emerald-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-900">
                  Enlace directo a tu Google Sheet (para visualización)
                </label>
                {sheetUrl && (
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline"
                  >
                    <span>Abrir hoja en Google Sheets</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sheetInput}
                  onChange={(e) => setSheetInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  Guardar
                </button>
              </div>
              {savedSheetSuccess && (
                <p className="text-[11px] text-emerald-700 font-medium">
                  ✓ Enlace de Google Sheets guardado.
                </p>
              )}
            </form>
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

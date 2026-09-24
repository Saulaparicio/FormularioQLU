/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken
} from './services/firebaseAuth';
import {
  appendRegistrationToSheet,
  appendRegistrationViaWebhook,
  getOrCreateFeriaQLUSheet,
  extractSpreadsheetId
} from './services/googleSheets';
import { sendUserReceipt, sendAdminNotification } from './services/googleGmail';
import { Navbar } from './components/Navbar';
import { ProgressBar } from './components/ProgressBar';
import { SlideContainer } from './components/SlideContainer';
import { NameSlide } from './components/slides/NameSlide';
import { ProgramsSlide } from './components/slides/ProgramsSlide';
import { EmailSlide } from './components/slides/EmailSlide';
import { PhoneSlide } from './components/slides/PhoneSlide';
import { ConfirmationSlide } from './components/slides/ConfirmationSlide';
import { AdminModal } from './components/AdminModal';
import type { RegistrationData, SubmissionResult } from './types';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

const TOTAL_STEPS = 4;

const INITIAL_DATA: RegistrationData = {
  nombreCompleto: '',
  nombre: '',
  apellido: '',
  programas: [],
  correo: '',
  celular: ''
};

export default function App() {
  // Auth state
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Form slide state
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<number>(1);
  const [formData, setFormData] = useState<RegistrationData>(INITIAL_DATA);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

  // Admin and Sheets state
  const [adminEmail, setAdminEmail] = useState<string>(() => {
    return localStorage.getItem('feria_qlu_admin_email') || 'sapaser@gmail.com';
  });
  const [sheetUrl, setSheetUrl] = useState<string | null>(() => {
    return localStorage.getItem('feria_qlu_sheet_url') || null;
  });
  const [sheetWebhookUrl, setSheetWebhookUrl] = useState<string>(() => {
    return localStorage.getItem('feria_qlu_webhook_url') || '';
  });
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const handleSaveSheetWebhookUrl = (url: string) => {
    setSheetWebhookUrl(url);
    if (url) {
      localStorage.setItem('feria_qlu_webhook_url', url);
      // Auto-sync any pending items immediately
      setTimeout(() => {
        syncPendingQueue();
      }, 300);
    } else {
      localStorage.removeItem('feria_qlu_webhook_url');
    }
    showToast(url ? '✓ URL de Google Sheets directa guardada' : 'URL de Google Sheets removida');
  };

  // Auto-sync pending registrations on mount if webhook is configured
  useEffect(() => {
    if (sheetWebhookUrl) {
      syncPendingQueue();
    }
  }, []);
  const [history, setHistory] = useState<SubmissionResult[]>(() => {
    try {
      const saved = localStorage.getItem('feria_qlu_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Aspirante vs Admin mode state (determined by URL parameter ?modo=aspirante or stored pref)
  const [isAspiranteMode, setIsAspiranteMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    if (
      params.get('modo') === 'aspirante' ||
      params.get('publico') === 'true' ||
      params.get('kiosco') === 'true' ||
      hash === '#aspirante'
    ) {
      return true;
    }
    if (params.get('modo') === 'admin' || params.get('admin') === 'true' || hash === '#admin') {
      return false;
    }
    return localStorage.getItem('feria_qlu_modo') === 'aspirante';
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleAspiranteMode = (aspirante: boolean) => {
    setIsAspiranteMode(aspirante);
    try {
      localStorage.setItem('feria_qlu_modo', aspirante ? 'aspirante' : 'admin');
      const url = new URL(window.location.href);
      if (aspirante) {
        url.searchParams.set('modo', 'aspirante');
        url.searchParams.delete('admin');
      } else {
        url.searchParams.set('modo', 'admin');
        url.searchParams.delete('aspirante');
      }
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
    showToast(aspirante ? '✓ Modo Aspirante activado (configuración oculta)' : '✓ Modo Administrador activado');
  };

  // 1. Initialize Auth on Mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        if (currentUser.email && !localStorage.getItem('feria_qlu_admin_email')) {
          setAdminEmail(currentUser.email);
        }
      },
      () => {
        // Not signed in or token expired/unavailable
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Preload or link Google Sheet when user signs in
  useEffect(() => {
    if (accessToken && !sheetUrl) {
      getOrCreateFeriaQLUSheet(accessToken)
        .then((res) => {
          setSheetUrl(res.spreadsheetUrl);
          localStorage.setItem('feria_qlu_sheet_url', res.spreadsheetUrl);
        })
        .catch((err: unknown) => {
          const msg = (err as { message?: string })?.message || '';
          console.warn('Google Sheet init pending:', err);
          if (msg.includes('AUTH_EXPIRED') || msg.includes('401') || msg.toLowerCase().includes('credential')) {
            setAccessToken(null);
            setUser(null);
          }
        });
    }
  }, [accessToken, sheetUrl]);

  // Handle Google Sign-in
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        if (res.user.email) {
          setAdminEmail(res.user.email);
          localStorage.setItem('feria_qlu_admin_email', res.user.email);
        }
        showToast('¡Cuenta de Google conectada con éxito!');

        let currentSheetUrl = sheetUrl;
        try {
          const sheetRes = await getOrCreateFeriaQLUSheet(res.accessToken);
          currentSheetUrl = sheetRes.spreadsheetUrl;
          setSheetUrl(currentSheetUrl);
          localStorage.setItem('feria_qlu_sheet_url', currentSheetUrl);
        } catch (sErr) {
          console.warn('Google Sheet init pending:', sErr);
        }

        // Sync pending registrations if any
        await syncPendingQueue(res.accessToken, currentSheetUrl || undefined);
      }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        showToast(e?.message || 'No se pudo conectar la cuenta de Google. Inténtalo nuevamente.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Sync any registrations submitted prior to Google authentication
  const syncPendingQueue = async (token?: string, targetSheetUrl?: string) => {
    const raw = localStorage.getItem('feria_qlu_history');
    if (!raw) {
      showToast('No hay registros en el historial local.');
      return;
    }
    try {
      const items: SubmissionResult[] = JSON.parse(raw);
      const pendingItems = items.filter((i) => !i.sheetsSaved);
      if (pendingItems.length === 0) {
        showToast('Todos los registros ya están sincronizados.');
        return;
      }

      let updatedCount = 0;
      let lastErrorMessage = '';
      let activeSheetUrl = targetSheetUrl || sheetUrl;

      for (const item of items) {
        if (!item.sheetsSaved) {
          const full = item.nombreCompleto || `${item.nombre || ''} ${item.apellido || ''}`.trim();
          const regPayload: RegistrationData = {
            nombreCompleto: full,
            nombre: item.nombre,
            apellido: item.apellido,
            programas: item.programas,
            correo: item.correo,
            celular: item.celular
          };

          let itemSynced = false;

          // 1. Direct Webhook sync (Zero login required!)
          if (sheetWebhookUrl) {
            try {
              const res = await appendRegistrationViaWebhook(sheetWebhookUrl, regPayload);
              if (res.success) {
                itemSynced = true;
              } else {
                lastErrorMessage = res.error || 'Error al conectar con Google Sheets';
              }
            } catch (err: unknown) {
              lastErrorMessage = (err as { message?: string })?.message || 'Error de conexión';
            }
          } else if (token) {
            try {
              const sheetRes = await appendRegistrationToSheet(token, regPayload, true, true);
              if (sheetRes.success) {
                itemSynced = true;
                if (!activeSheetUrl && sheetRes.spreadsheetUrl) {
                  activeSheetUrl = sheetRes.spreadsheetUrl;
                  setSheetUrl(activeSheetUrl);
                  localStorage.setItem('feria_qlu_sheet_url', activeSheetUrl);
                }
              }
            } catch (syncErr: unknown) {
              const err = syncErr as { message?: string };
              lastErrorMessage = err?.message || 'Error al conectar con Google Sheets';
            }
          }

          if (itemSynced) {
            item.sheetsSaved = true;
            item.sheetsUrl = activeSheetUrl || undefined;
            item.userEmailSent = true;
            item.adminEmailSent = true;
            updatedCount++;
          }
        }
      }

      if (updatedCount > 0) {
        setHistory([...items]);
        localStorage.setItem('feria_qlu_history', JSON.stringify(items));
        setSubmissionResult((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            sheetsSaved: true,
            sheetsUrl: activeSheetUrl || prev.sheetsUrl,
            userEmailSent: true,
            adminEmailSent: true
          };
        });
        showToast(`✓ Sincronizados ${updatedCount} registro(s) a Google Sheets «Feria QLU».`);
      } else if (lastErrorMessage) {
        showToast(`No se pudo sincronizar: ${lastErrorMessage}`);
      } else if (!sheetWebhookUrl && !token) {
        showToast('Configura la URL de Google Sheets en Configuración para sincronizar.');
      }
    } catch (e) {
      console.warn('Error al procesar cola de sincronización:', e);
      showToast('Error al procesar la lista de registros.');
    }
  };

  // Trigger manual sync of pending queue
  const handleSyncPending = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncPendingQueue(accessToken || undefined, sheetUrl || undefined);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Error desconocido';
      showToast(`Error al sincronizar: ${msg}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Link a custom or existing Google Spreadsheet
  const handleSaveCustomSheet = async (input: string) => {
    const id = extractSpreadsheetId(input);
    if (!id) {
      showToast('Enlace o ID de Google Sheets no válido');
      return;
    }
    const url = `https://docs.google.com/spreadsheets/d/${id}/edit`;
    localStorage.setItem('feria_qlu_sheet_id', id);
    localStorage.setItem('feria_qlu_sheet_url', url);
    setSheetUrl(url);
    showToast('Hoja «Feria QLU» vinculada correctamente.');

    let token = accessToken;
    if (!token) {
      token = await getAccessToken();
    }
    if (token) {
      syncPendingQueue(token, url);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setIsAdminOpen(false);
    showToast('Sesión de Google cerrada.');
  };

  // Step Validation Logic
  const validateStep = (step: number): boolean => {
    const newErrors: Record<number, string> = { ...errors };

    if (step === 0) {
      const full = (formData.nombreCompleto || `${formData.nombre || ''} ${formData.apellido || ''}`.trim()).trim();
      if (!full) {
        newErrors[0] = 'Por favor ingresa tu nombre y apellido para continuar.';
        setErrors(newErrors);
        return false;
      }
      if (full.length < 3) {
        newErrors[0] = 'Por favor ingresa tu nombre y apellido completo.';
        setErrors(newErrors);
        return false;
      }
      delete newErrors[0];
    } else if (step === 1) {
      if (formData.programas.length === 0) {
        newErrors[1] = 'Por favor selecciona al menos un programa de tu interés.';
        setErrors(newErrors);
        return false;
      }
      delete newErrors[1];
    } else if (step === 2) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.correo.trim()) {
        newErrors[2] = 'El correo electrónico es obligatorio para enviarte la confirmación.';
        setErrors(newErrors);
        return false;
      }
      if (!emailRegex.test(formData.correo.trim())) {
        newErrors[2] = 'Por favor introduce una dirección de correo válida (ej: usuario@correo.com).';
        setErrors(newErrors);
        return false;
      }
      delete newErrors[2];
    } else if (step === 3) {
      const digitsOnly = formData.celular.replace(/\D/g, '');
      if (!digitsOnly) {
        newErrors[3] = 'Por favor ingresa un número de celular de contacto.';
        setErrors(newErrors);
        return false;
      }
      if (digitsOnly.length < 6) {
        newErrors[3] = 'El número de teléfono parece incompleto (mínimo 6-8 dígitos).';
        setErrors(newErrors);
        return false;
      }
      delete newErrors[3];
    }

    setErrors(newErrors);
    return true;
  };

  // Navigation handlers
  const goToNextStep = useCallback(() => {
    if (currentStep >= TOTAL_STEPS - 1) return;
    if (validateStep(currentStep)) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, formData, errors]);

  const goToPrevStep = useCallback(() => {
    if (currentStep <= 0) return;
    setDirection(-1);
    setCurrentStep((prev) => prev - 1);
  }, [currentStep]);

  const goToStepDirect = (targetIndex: number) => {
    if (targetIndex === currentStep) return;
    // Can only jump if intermediate steps are filled
    if (targetIndex < currentStep || validateStep(currentStep)) {
      setDirection(targetIndex > currentStep ? 1 : -1);
      setCurrentStep(targetIndex);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Secret admin shortcut (Alt+A or Ctrl+Shift+A) to open admin even in aspirante mode
      if (
        (e.altKey && (e.key === 'a' || e.key === 'A')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'a' || e.key === 'A'))
      ) {
        e.preventDefault();
        setIsAdminOpen(true);
        return;
      }

      // Don't intercept slide navigation when modal is open or submitting
      if (isAdminOpen || isSubmitting || isSubmitted) return;

      if (e.key === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        goToNextStep();
      } else if (e.key === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        goToPrevStep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminOpen, isSubmitting, isSubmitted, goToNextStep, goToPrevStep]);

  // Toggle Program Selection
  const handleToggleProgram = (label: string) => {
    setFormData((prev) => {
      const exists = prev.programas.includes(label);
      const updated = exists
        ? prev.programas.filter((p) => p !== label)
        : [...prev.programas, label];

      if (updated.length > 0 && errors[1]) {
        setErrors((errs) => {
          const next = { ...errs };
          delete next[1];
          return next;
        });
      }
      return { ...prev, programas: updated };
    });
  };

  // Final Form Submission Handler
  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    let token = accessToken;

    // Check if we need to obtain token
    if (!token) {
      token = await getAccessToken();
    }

    let sheetsSuccess = false;
    let finalSheetUrl = sheetUrl;
    let userMailSuccess = false;
    let adminMailSuccess = false;

    // Execute Google Workspace integrations
    // 1. Direct Webhook sync (Zero login required!)
    if (sheetWebhookUrl) {
      try {
        const directRes = await appendRegistrationViaWebhook(sheetWebhookUrl, formData);
        if (directRes.success) {
          sheetsSuccess = true;
          finalSheetUrl = sheetUrl || null;
          showToast('✓ Registrado directamente en Google Sheets «Feria QLU»');
        } else {
          console.warn('Webhook notice:', directRes.error);
        }
      } catch (directErr) {
        console.warn('Direct sync notice:', directErr);
      }
    } else if (token) {
      // 1. Google Sheets "Feria QLU" via OAuth fallback
      try {
        const sheetRes = await appendRegistrationToSheet(token, formData, true, true);
        sheetsSuccess = sheetRes.success;
        finalSheetUrl = sheetRes.spreadsheetUrl;
        setSheetUrl(finalSheetUrl);
        localStorage.setItem('feria_qlu_sheet_url', finalSheetUrl);
        showToast('✓ Registrado en Google Sheets «Feria QLU»');
      } catch (sheetErr: unknown) {
        const msg = (sheetErr as { message?: string })?.message || 'Error desconocido';
        console.error('Google Sheets sync error:', sheetErr);
        if (
          msg.includes('AUTH_EXPIRED') ||
          msg.includes('401') ||
          msg.toLowerCase().includes('token') ||
          msg.toLowerCase().includes('credential') ||
          msg.toLowerCase().includes('unauthenticated')
        ) {
          setAccessToken(null);
          setUser(null);
        }
      }
    }

    // Confirmation Emails (if authenticated)
    if (token && sheetsSuccess) {
      try {
        userMailSuccess = await sendUserReceipt(
          token,
          formData,
          user?.email || 'admisiones@qlu.ac.pa'
        );
      } catch (userMailErr) {
        console.warn('User email notice:', userMailErr);
      }

      try {
        adminMailSuccess = await sendAdminNotification(
          token,
          formData,
          adminEmail,
          finalSheetUrl || undefined
        );
      } catch (adminMailErr) {
        console.warn('Admin email notice:', adminMailErr);
      }
    }

    if (!sheetsSuccess && !sheetWebhookUrl) {
      showToast('Registro guardado localmente. Configura la URL de Google Sheets en Configuración.');
    }

    const timestamp = new Date().toLocaleString('es-PA', {
      timeZone: 'America/Panama'
    });

    const full = (formData.nombreCompleto || `${formData.nombre || ''} ${formData.apellido || ''}`.trim()).trim();
    const parts = full.split(/\s+/);
    const firstName = formData.nombre?.trim() || parts[0] || '';
    const lastName = formData.apellido?.trim() || parts.slice(1).join(' ') || '';

    const result: SubmissionResult = {
      timestamp,
      nombreCompleto: full,
      nombre: firstName,
      apellido: lastName,
      programas: formData.programas,
      correo: formData.correo.trim(),
      celular: formData.celular.trim(),
      sheetsSaved: sheetsSuccess,
      sheetsUrl: finalSheetUrl || undefined,
      userEmailSent: userMailSuccess,
      adminEmailSent: adminMailSuccess
    };

    const newHistory = [result, ...history];
    setHistory(newHistory);
    localStorage.setItem('feria_qlu_history', JSON.stringify(newHistory));

    setSubmissionResult(result);
    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  // Reset form to register another attendee
  const handleResetForm = () => {
    setFormData(INITIAL_DATA);
    setCurrentStep(0);
    setDirection(-1);
    setErrors({});
    setIsSubmitted(false);
    setSubmissionResult(null);
  };

  const handleSaveAdminEmail = (newEmail: string) => {
    setAdminEmail(newEmail);
    localStorage.setItem('feria_qlu_admin_email', newEmail);
    showToast(`Correo del administrador actualizado a: ${newEmail}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a192f] via-[#0d2247] to-[#071324] text-slate-100 selection:bg-amber-400 selection:text-slate-950 font-sans antialiased relative overflow-x-hidden">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#08152a] text-white px-4 py-3 rounded-xl shadow-2xl border border-amber-400/50 flex items-center gap-2.5 text-xs font-semibold animate-bounce">
          <AlertCircle className="w-4 h-4 text-amber-400 stroke-[2.5]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        user={user}
        accessToken={accessToken}
        onLogin={handleGoogleLogin}
        onOpenAdmin={() => setIsAdminOpen(true)}
        sheetUrl={sheetUrl}
        isLoggingIn={isLoggingIn}
        isAspiranteMode={isAspiranteMode}
      />

      {/* Helper Banner for Admin when Google Sheet Webhook is not configured (Hidden in Aspirante Mode) */}
      {!isAspiranteMode && !sheetWebhookUrl && (
        <div className="bg-amber-400/10 border-b border-amber-400/25 px-4 py-2 text-xs text-amber-200">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span>
                Para enviar datos directamente a <strong className="text-amber-300 font-bold">Google Sheets</strong> sin que el administrador inicie sesión, vincula tu hoja en Configuración.
              </span>
            </span>
            <button
              type="button"
              onClick={() => setIsAdminOpen(true)}
              className="px-3.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-lg text-xs shrink-0 cursor-pointer shadow-md active:scale-98"
            >
              Configurar Google Sheets
            </button>
          </div>
        </div>
      )}

      {/* Main Form Content Stage */}
      <main className="flex-1 flex flex-col items-center justify-between max-w-4xl mx-auto w-full px-4 sm:px-6 py-4">
        {/* Progress Bar (hidden on final confirmation) */}
        {!isSubmitted && (
          <ProgressBar
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            onStepClick={goToStepDirect}
            canNavigateToStep={(idx) => idx <= currentStep}
          />
        )}

        {/* Slide Stage Area with Swipe Support */}
        <div className="w-full flex-1 flex items-center justify-center my-auto">
          {isSubmitted && submissionResult ? (
            <ConfirmationSlide
              result={submissionResult}
              onReset={handleResetForm}
              onSyncNow={handleSyncPending}
              isAspiranteMode={isAspiranteMode}
            />
          ) : (
            <SlideContainer
              currentStep={currentStep}
              direction={direction}
              onSwipeLeft={goToNextStep}
              onSwipeRight={goToPrevStep}
            >
              {currentStep === 0 && (
                <NameSlide
                  value={formData.nombreCompleto}
                  onChange={(val) => {
                    const parts = val.trim().split(/\s+/);
                    const firstName = parts[0] || '';
                    const lastName = parts.slice(1).join(' ') || '';
                    setFormData((p) => ({
                      ...p,
                      nombreCompleto: val,
                      nombre: firstName,
                      apellido: lastName
                    }));
                  }}
                  onNext={goToNextStep}
                  error={errors[0]}
                />
              )}
              {currentStep === 1 && (
                <ProgramsSlide
                  selectedPrograms={formData.programas}
                  onToggleProgram={handleToggleProgram}
                  onNext={goToNextStep}
                  onPrev={goToPrevStep}
                  error={errors[1]}
                />
              )}
              {currentStep === 2 && (
                <EmailSlide
                  value={formData.correo}
                  onChange={(val) => setFormData((p) => ({ ...p, correo: val }))}
                  onNext={goToNextStep}
                  onPrev={goToPrevStep}
                  error={errors[2]}
                />
              )}
              {currentStep === 3 && (
                <PhoneSlide
                  value={formData.celular}
                  onChange={(val) => setFormData((p) => ({ ...p, celular: val }))}
                  onSubmit={handleSubmit}
                  onPrev={goToPrevStep}
                  isSubmitting={isSubmitting}
                  error={errors[3]}
                />
              )}
            </SlideContainer>
          )}
        </div>

        {/* Bottom Helper Bar (Slide controls & swipe hint) */}
        {!isSubmitted && (
          <footer className="w-full py-3 flex items-center justify-between text-xs text-blue-300/80 border-t border-blue-800/60 mt-4">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={goToPrevStep}
                disabled={currentStep === 0}
                className="p-1 rounded hover:bg-blue-900/60 disabled:opacity-30 disabled:cursor-not-allowed text-blue-200 cursor-pointer"
                title="Paso anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={goToNextStep}
                disabled={currentStep === TOTAL_STEPS - 1}
                className="p-1 rounded hover:bg-blue-900/60 disabled:opacity-30 disabled:cursor-not-allowed text-blue-200 cursor-pointer"
                title="Paso siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="ml-2 hidden sm:inline">Desliza o usa flechas para navegar</span>
            </div>

            {isAspiranteMode ? (
              <div className="flex items-center gap-2 text-blue-300/80">
                <span className="hidden sm:inline">Quality Leadership University • Admisiones</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline">
                  Hoja destino: <strong className="text-amber-300 font-bold">Feria QLU</strong>
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Sincronización activa" />
              </div>
            )}
          </footer>
        )}
      </main>

      {/* Admin Settings Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        user={user}
        accessToken={accessToken}
        onLogin={handleGoogleLogin}
        onLogout={handleLogout}
        adminEmail={adminEmail}
        onSaveAdminEmail={handleSaveAdminEmail}
        sheetUrl={sheetUrl}
        sheetWebhookUrl={sheetWebhookUrl}
        onSaveSheetWebhookUrl={handleSaveSheetWebhookUrl}
        history={history}
        onSaveCustomSheet={handleSaveCustomSheet}
        isSyncing={isSyncing}
        onSyncPending={handleSyncPending}
        isAspiranteMode={isAspiranteMode}
        onToggleMode={handleToggleAspiranteMode}
      />
    </div>
  );
}

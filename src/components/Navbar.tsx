import { useRef } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { ExternalLink, Settings, LogIn, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
  user: FirebaseUser | null;
  accessToken?: string | null;
  onLogin: () => void;
  onOpenAdmin: () => void;
  sheetUrl?: string | null;
  isLoggingIn: boolean;
  isAspiranteMode?: boolean;
}

export function Navbar({
  user,
  accessToken,
  onLogin,
  onOpenAdmin,
  sheetUrl,
  isLoggingIn,
  isAspiranteMode = false
}: NavbarProps) {
  const logoClicksRef = useRef<number>(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoClick = () => {
    logoClicksRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    if (logoClicksRef.current >= 3) {
      logoClicksRef.current = 0;
      onOpenAdmin();
    } else {
      clickTimerRef.current = setTimeout(() => {
        logoClicksRef.current = 0;
      }, 1200);
    }
  };

  return (
    <header id="main-header" className="w-full bg-[#08152a]/95 backdrop-blur-md border-b border-blue-800/60 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLogoClick}
            title={isAspiranteMode ? 'Quality Leadership University' : 'Panel QLU'}
            className="w-10 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center font-black text-lg tracking-wider shadow-md transition-all active:scale-95 cursor-pointer select-none"
          >
            QLU
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                Feria QLU
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/40">
                Registro Oficial
              </span>
              {!isAspiranteMode && (
                <span className="text-[9px] font-black uppercase tracking-wider bg-blue-900 text-amber-400 px-2 py-0.5 rounded-md border border-blue-700 hidden sm:inline-block">
                  Modo Admin
                </span>
              )}
            </div>
            <p className="text-[11px] text-blue-200/80 font-medium hidden sm:block">
              Quality Leadership University • Admisiones
            </p>
          </div>
        </div>

        {/* Action controls (Hidden in Aspirante Mode) */}
        {!isAspiranteMode && (
          <div className="flex items-center gap-2 sm:gap-3">
            {sheetUrl && (
              <a
                id="header-btn-sheet"
                href={sheetUrl}
                target="_blank"
                rel="noreferrer"
                title="Abrir hoja de cálculo en Google Sheets"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 rounded-lg transition-all"
              >
                <span>Feria QLU (Sheets)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {user && accessToken ? (
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-blue-100 bg-blue-900/60 border border-blue-700/60 px-2.5 py-1.5 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate max-w-[140px]">{user.email}</span>
                </div>

                <button
                  id="header-btn-admin"
                  type="button"
                  onClick={onOpenAdmin}
                  className="p-2 text-blue-200 hover:text-white hover:bg-blue-800/60 rounded-lg transition-all cursor-pointer border border-blue-700/50"
                  title="Configuración de Administrador"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                id="header-btn-login"
                type="button"
                disabled={isLoggingIn}
                onClick={onLogin}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold rounded-lg transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isLoggingIn ? 'Conectando...' : 'Conectar Google'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

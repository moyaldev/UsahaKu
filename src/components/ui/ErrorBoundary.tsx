import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import firebaseConfig from '../../../firebase-applet-config.json';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('UsahaKu ErrorBoundary:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const rawMsg = this.state.error?.message || '';
    const isQuotaExceeded = rawMsg.includes('Quota exceeded');
    const isDailyReadQuota = rawMsg.includes(
      "Quota exceeded for quota metric 'Free daily read units per project (free tier database)'"
    );
    const upgradeUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

    let displayTitle = 'Terjadi Gangguan Sinkronisasi Cloud';
    let displayDesc =
      'Koneksi atau izin akses ke database cloud mengalami kendala. Silakan muat ulang halaman atau coba masuk kembali.';

    if (isQuotaExceeded) {
      displayTitle = 'Kuota Harian Database Cloud Tercapai';
      displayDesc =
        'Batas penggunaan harian gratis Firestore telah tercapai dan akan direset keesokan harinya.';
    }

    return (
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-[#E8EDF3] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-[#10243B]">{displayTitle}</h1>
            <p className="text-sm text-[#52677E] leading-relaxed">{displayDesc}</p>
            {isDailyReadQuota && (
              <p className="text-xs text-[#52677E] pt-1">
                Anda juga dapat meninjau paket database di{' '}
                <a
                  href={upgradeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0D8A62] font-medium underline"
                >
                  Firebase Console
                </a>
                .
              </p>
            )}
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors w-full"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Muat Ulang Aplikasi</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}

import React from 'react';
import { Cloud, CheckCircle2, ShieldCheck, Smartphone } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  isLoading,
  errorMessage,
}) => {
  return (
    <div className="min-h-screen bg-[#F6F8FB] flex flex-col lg:flex-row">
      {/* Left Brand Panel */}
      <div className="lg:w-[46%] bg-[#10243B] text-white p-8 sm:p-12 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-[0_6px_16px_rgba(16,185,129,0.3)]">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 6.5C4 5.11929 5.11929 4 6.5 4H14.5C15.8807 4 17 5.11929 17 6.5V17.5C17 18.8807 15.8807 20 14.5 20H6.5C5.11929 20 4 18.8807 4 17.5V6.5Z"
                  stroke="currentColor"
                  strokeWidth="2.1"
                />
                <path
                  d="M8 9H13M8 13H13M17 9H19.5C20.3284 9 21 9.67157 21 10.5V17.5C21 18.8807 19.8807 20 18.5 20H14.5"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <div>
              <span className="block text-xl font-bold tracking-tight text-white leading-none">
                UsahaKu
              </span>
              <span className="block text-xs text-[#8EA5BC] mt-1">
                Platform Manajemen UMKM
              </span>
            </div>
          </div>

          <div className="mt-12 space-y-4 max-w-md">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug text-white">
              Catatan usaha tersimpan aman dan bisa dibuka dari mana saja.
            </h1>
            <p className="text-sm text-[#AEBFD0] leading-relaxed">
              Masuk dengan akun Google untuk menyinkronkan penjualan, stok produk, piutang pelanggan, dan arus kas secara otomatis ke cloud.
            </p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-3.5 max-w-md">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#1B3551]/70 border border-[#2B4661]">
            <Cloud className="w-5 h-5 text-[#5BE0B0] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-white">Tersimpan Otomatis di Cloud</p>
              <p className="text-xs text-[#91A7BD] mt-0.5">
                Riwayat transaksi dan stok tidak hilang saat browser dibersihkan atau berganti perangkat.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#1B3551]/70 border border-[#2B4661]">
            <Smartphone className="w-5 h-5 text-[#5BE0B0] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-white">Akses Multi-Perangkat Real-Time</p>
              <p className="text-xs text-[#91A7BD] mt-0.5">
                Buka pencatatan usaha yang sama dari laptop toko, tablet kasir, maupun ponsel Anda.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#1B3551]/70 border border-[#2B4661]">
            <ShieldCheck className="w-5 h-5 text-[#5BE0B0] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-white">Data Terpisah Per Akun</p>
              <p className="text-xs text-[#91A7BD] mt-0.5">
                Setiap akun Google hanya dapat mengakses catatan usaha miliknya sendiri.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sign-In Card */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white border border-[#E8EDF3] rounded-2xl p-7 sm:p-9 shadow-[0_10px_30px_rgba(16,36,59,0.05)] space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-[#10243B]">Masuk ke UsahaKu</h2>
            <p className="text-sm text-[#52677E]">
              Gunakan akun Google Anda untuk mulai mencatat atau melanjutkan riwayat usaha Anda.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
              {errorMessage}
            </div>
          )}

          <button
            type="button"
            onClick={onLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 text-sm font-semibold text-[#10243B] bg-white border border-[#CBD5E1] hover:border-[#94A3B8] hover:bg-slate-50 rounded-xl transition-colors shadow-xs disabled:opacity-60 disabled:cursor-not-allowed min-h-[48px]"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-8.97Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>{isLoading ? 'Menghubungkan ke Google...' : 'Masuk dengan Google'}</span>
          </button>

          <div className="pt-4 border-t border-[#E8EDF3] space-y-2 text-xs text-[#64748B]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
              <span>Mendukung ekspor &amp; impor backup JSON kapan saja</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
              <span>Data lokal yang pernah diisi otomatis tersinkron saat login pertama</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

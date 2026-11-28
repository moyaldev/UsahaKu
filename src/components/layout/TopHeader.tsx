import React from 'react';
import { Calendar, Menu, Plus } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { PageKey } from '../../types/business';

interface TopHeaderProps {
  onOpenMobileMenu: () => void;
  onQuickSale: () => void;
}

const PAGE_LABELS: Record<PageKey, string> = {
  dashboard: 'Dashboard',
  penjualan: 'Manajemen Penjualan',
  produk: 'Produk & Stok',
  kalkulator: 'Kalkulator Harga',
  pelanggan: 'Pelanggan & Utang',
  pemasok: 'Pemasok',
  pembelian: 'Pembelian Stok',
  keuangan: 'Manajemen Keuangan',
  pesanan: 'Pesanan & Agenda',
  laporan: 'Laporan & Analisis',
  pengaturan: 'Backup & Pengaturan',
};

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenMobileMenu, onQuickSale }) => {
  const { activePage, data } = useStore();

  const todayLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-b border-[#E8EDF3] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Buka menu navigasi"
          className="lg:hidden p-2 -ml-2 text-[#52677E] hover:text-[#172B43] hover:bg-slate-100 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="hidden sm:inline text-[#8190A3] truncate max-w-[180px]">
            {data.profile.namaUsaha}
          </span>
          <span className="hidden sm:inline text-[#CBD5E1]" aria-hidden="true">
            /
          </span>
          <h1 className="font-semibold text-[#172B43] truncate whitespace-nowrap">
            {PAGE_LABELS[activePage]}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden md:flex items-center gap-1.5 text-xs text-[#748398]">
          <Calendar className="w-3.5 h-3.5 text-[#8190A3]" />
          <span>{todayLabel}</span>
        </div>

        <button
          type="button"
          onClick={onQuickSale}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg shadow-[0_4px_10px_rgba(16,185,129,0.2)] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Catat Penjualan</span>
        </button>
      </div>
    </header>
  );
};

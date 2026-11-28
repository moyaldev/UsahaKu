import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Calculator,
  Users,
  Truck,
  ClipboardList,
  Wallet,
  CalendarClock,
  BarChart3,
  Settings,
  Store,
  X,
  LogOut,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { PageKey } from '../../types/business';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavGroup {
  label: string;
  items: { key: PageKey; title: string; icon: React.ComponentType<{ className?: string }> }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Ringkasan & Harian',
    items: [
      { key: 'dashboard', title: 'Dashboard', icon: LayoutDashboard },
      { key: 'penjualan', title: 'Penjualan', icon: ShoppingBag },
      { key: 'produk', title: 'Produk & Stok', icon: Package },
      { key: 'pesanan', title: 'Pesanan & Agenda', icon: CalendarClock },
    ],
  },
  {
    label: 'Relasi & Pengadaan',
    items: [
      { key: 'pelanggan', title: 'Pelanggan & Utang', icon: Users },
      { key: 'pemasok', title: 'Pemasok', icon: Truck },
      { key: 'pembelian', title: 'Pembelian Stok', icon: ClipboardList },
    ],
  },
  {
    label: 'Keuangan & Alat',
    items: [
      { key: 'keuangan', title: 'Keuangan', icon: Wallet },
      { key: 'kalkulator', title: 'Kalkulator Harga', icon: Calculator },
      { key: 'laporan', title: 'Laporan & Ekspor', icon: BarChart3 },
      { key: 'pengaturan', title: 'Backup & Pengaturan', icon: Settings },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { activePage, setActivePage, data, lowStockProducts, user, logout } = useStore();
  const pendingOrdersCount = data.orders.filter(
    (o) => o.status === 'menunggu' || o.status === 'diproses'
  ).length;

  const handleSelect = (page: PageKey) => {
    setActivePage(page);
    onCloseMobile();
  };

  const renderContent = () => (
    <div className="flex flex-col h-full max-h-screen bg-[#10243B] text-[#DCE6F0] w-64 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4 shrink-0">
        <button
          type="button"
          onClick={() => handleSelect('dashboard')}
          className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-lg"
        >
          <span className="w-9 h-9 rounded-xl bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-[0_6px_16px_rgba(16,185,129,0.28)]">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
            <span className="block text-lg font-bold tracking-tight text-white leading-none">
              UsahaKu
            </span>
            <span className="block text-[10px] text-[#8EA5BC] tracking-wide mt-1">
              Manajemen UMKM
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Tutup menu navigasi"
          className="lg:hidden p-2 -mr-1 text-[#91A7BD] hover:text-white hover:bg-[#1B3551] rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Workspace Card */}
      <div className="px-4 pb-3 shrink-0">
        <button
          type="button"
          onClick={() => handleSelect('pengaturan')}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#1B3551] border border-[#2B4661] hover:border-[#3A5B7D] transition-colors text-left"
        >
          <span className="w-8 h-8 rounded-lg bg-[#D9F8ED] text-[#087C58] flex items-center justify-center shrink-0">
            <Store className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">
              {data.profile.namaUsaha}
            </p>
            <p className="text-[10px] text-[#91A7BD] truncate">
              {data.profile.kategoriUsaha || 'UMKM'}
            </p>
          </div>
        </button>
      </div>

      {/* Navigation Groups */}
      <nav
        className="flex-1 min-h-0 overflow-y-auto sidebar-scroll px-3 py-1 space-y-3"
        aria-label="Menu utama"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold text-[#7790A8] tracking-wider">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.key;
                const badgeCount =
                  item.key === 'produk'
                    ? lowStockProducts.length
                    : item.key === 'pesanan'
                    ? pendingOrdersCount
                    : 0;

                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item.key)}
                      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors min-h-[44px] lg:min-h-[34px] ${
                        isActive
                          ? 'bg-[#173B4A] text-[#5BE0B0] font-semibold'
                          : 'text-[#AEBFD0] hover:text-white hover:bg-[#1B3551] font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-[#5BE0B0]' : 'text-[#8EA5BC]'
                          }`}
                        />
                        <span className="truncate whitespace-nowrap">{item.title}</span>
                      </span>
                      {badgeCount > 0 && (
                        <span
                          className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                            item.key === 'produk'
                              ? 'bg-[#3D2E1E] text-[#FBBF24]'
                              : 'bg-[#29435C] text-[#C8D6E3]'
                          }`}
                        >
                          {badgeCount}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Account Footer (Pinned at bottom of 100vh sidebar) */}
      <div className="px-3 py-3 border-t border-[#294158] shrink-0 bg-[#10243B]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleSelect('pengaturan')}
            className="flex-1 min-w-0 flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-[#1B3551] transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-[#1B3551] border border-[#2B4661] overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-[#D9F8ED]">
              {data.profile.avatarUrl ? (
                <img
                  src={data.profile.avatarUrl}
                  alt={data.profile.namaPemilik}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span>{data.profile.namaPemilik.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {data.profile.namaPemilik}
              </p>
              <p className="text-[11px] text-[#91A7BD] truncate">
                {user?.email || data.profile.emailPemilik || 'Akun & Pengaturan'}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => void logout()}
            title="Keluar dari akun"
            aria-label="Keluar dari akun"
            className="p-2 text-[#91A7BD] hover:text-white hover:bg-[#1B3551] rounded-lg transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar (100% tinggi viewport) */}
      <aside className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:h-screen shrink-0">
        {renderContent()}
      </aside>
      {/* Spacer selebar sidebar pada desktop */}
      <div className="hidden lg:block w-64 shrink-0" aria-hidden="true" />

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#10243B]/50 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{renderContent()}</div>
        </div>
      )}
    </>
  );
};

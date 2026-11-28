import React, { useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { ToastContainer } from './components/ui/ToastContainer';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { LoginScreen } from './components/auth/LoginScreen';
import { DashboardPage } from './pages/DashboardPage';
import { SalesPage } from './pages/SalesPage';
import { ProductsPage } from './pages/ProductsPage';
import { PricingCalculatorPage } from './pages/PricingCalculatorPage';
import { CustomersPage } from './pages/CustomersPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { FinancePage } from './pages/FinancePage';
import { OrdersCalendarPage } from './pages/OrdersCalendarPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsBackupPage } from './pages/SettingsBackupPage';

const UsahaKuShell: React.FC = () => {
  const {
    user,
    authLoading,
    authSubmitting,
    authError,
    syncLoading,
    isSyncingWrite,
    signInWithGoogle,
    activePage,
    setActivePage,
  } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openQuickSaleModal, setOpenQuickSaleModal] = useState(false);

  if (authLoading || (user && syncLoading)) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#10243B] text-[#5BE0B0] flex items-center justify-center mb-4 shadow-sm">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
        </div>
        <p className="text-sm font-semibold text-[#10243B]">
          {authLoading ? 'Memeriksa sesi akun...' : 'Menyinkronkan data usaha dari cloud...'}
        </p>
        <p className="text-xs text-[#64748B] mt-1">
          Mohon tunggu sebentar, pencatatan Anda sedang disiapkan.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        onLogin={signInWithGoogle}
        isLoading={authSubmitting}
        errorMessage={authError}
      />
    );
  }

  const handleQuickSale = () => {
    setActivePage('penjualan');
    setOpenQuickSaleModal(true);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage onOpenNewSale={handleQuickSale} />;
      case 'penjualan':
        return (
          <SalesPage
            externalOpenNew={openQuickSaleModal}
            onResetExternalOpen={() => setOpenQuickSaleModal(false)}
          />
        );
      case 'produk':
        return <ProductsPage />;
      case 'kalkulator':
        return <PricingCalculatorPage />;
      case 'pelanggan':
        return <CustomersPage />;
      case 'pemasok':
        return <SuppliersPage />;
      case 'pembelian':
        return <PurchasesPage />;
      case 'keuangan':
        return <FinancePage />;
      case 'pesanan':
        return <OrdersCalendarPage />;
      case 'laporan':
        return <ReportsPage />;
      case 'pengaturan':
        return <SettingsBackupPage />;
      default:
        return <DashboardPage onOpenNewSale={handleQuickSale} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F6F8FB] text-[#172B43]">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onQuickSale={handleQuickSale}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {renderPage()}
        </main>

        <footer className="px-4 sm:px-6 lg:px-8 py-4 border-t border-[#E8EDF3] bg-white/70 text-xs text-[#8190A3] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>UsahaKu — Kelola Usaha Lebih Mudah, Kembangkan Lebih Cepat.</span>
          <span>
            {isSyncingWrite ? 'Menyimpan perubahan ke cloud...' : 'Tersinkronisasi ke Cloud · Mata Uang IDR'}
          </span>
        </footer>
      </div>

      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <UsahaKuShell />
      </StoreProvider>
    </ErrorBoundary>
  );
}

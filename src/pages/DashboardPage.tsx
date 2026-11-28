import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Lightbulb,
  Package,
  Plus,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SalesTrendChart } from '../components/charts/BusinessCharts';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDateID, formatDateTimeID, formatIDR, toISODateLocal } from '../utils/formatters';

interface DashboardPageProps {
  onOpenNewSale: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onOpenNewSale }) => {
  const { data, insights, lowStockProducts, setActivePage } = useStore();
  const [chartDays, setChartDays] = useState<7 | 14 | 30>(7);

  const activeSales = useMemo(
    () => data.sales.filter((s) => s.status === 'selesai'),
    [data.sales]
  );

  const metrics = useMemo(() => {
    const totalPenjualan = activeSales.reduce((sum, s) => sum + s.totalHarga, 0);
    const totalKeuntunganKotor = activeSales.reduce((sum, s) => sum + s.totalKeuntungan, 0);
    const totalPengeluaran = data.finance
      .filter((f) => f.tipe === 'pengeluaran')
      .reduce((sum, f) => sum + f.jumlah, 0);
    const marginRataRata =
      totalPenjualan > 0 ? Math.round((totalKeuntunganKotor / totalPenjualan) * 100) : 0;

    return {
      totalPenjualan,
      totalKeuntunganKotor,
      totalPengeluaran,
      jumlahProduk: data.products.length,
      marginRataRata,
    };
  }, [activeSales, data.finance, data.products.length]);

  const chartSeries = useMemo(() => {
    const labels: string[] = [];
    const revenueSeries: number[] = [];
    const profitSeries: number[] = [];

    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = toISODateLocal(d);
      const label = new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
      }).format(d);

      const daySales = activeSales.filter((s) => s.tanggal.slice(0, 10) === iso);
      labels.push(label);
      revenueSeries.push(daySales.reduce((sum, s) => sum + s.totalHarga, 0));
      profitSeries.push(daySales.reduce((sum, s) => sum + s.totalKeuntungan, 0));
    }

    return { labels, revenueSeries, profitSeries };
  }, [activeSales, chartDays]);

  const recentSales = useMemo(() => data.sales.slice(0, 5), [data.sales]);

  const upcomingOrders = useMemo(
    () =>
      data.orders
        .filter((o) => o.status === 'menunggu' || o.status === 'diproses')
        .sort((a, b) => a.tenggatWaktu.localeCompare(b.tenggatWaktu))
        .slice(0, 4),
    [data.orders]
  );

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-wider uppercase text-[#0B9B70]">
            Ringkasan Usaha · {data.profile.kategoriUsaha || 'UMKM'}
          </p>
          <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[#172B43] mt-1">
            {data.profile.namaUsaha}
          </h2>
          <p className="text-xs sm:text-sm text-[#8492A3] mt-0.5">
            {data.profile.taglineUsaha}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setActivePage('produk')}
            className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#50647B] bg-white border border-[#E5EBF1] hover:bg-[#F7FAFC] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Kelola Produk
          </button>
          <button
            type="button"
            onClick={onOpenNewSale}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg shadow-[0_4px_10px_rgba(16,185,129,0.22)] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Transaksi Baru</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <section
        aria-label="Ringkasan Metrik Usaha"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <div className="bg-white border border-[#E8EDF3] rounded-2xl p-5 shadow-[0_8px_28px_rgba(20,42,66,0.045)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8190A2]">Total Penjualan</span>
            <span className="w-8 h-8 rounded-lg bg-[#E6F9F1] text-[#0B9B70] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-[#1A3049] font-mono tabular-nums mt-3">
            {formatIDR(metrics.totalPenjualan)}
          </p>
          <p className="text-xs text-[#9AA6B4] mt-2">
            Dari{' '}
            <span className="font-mono tabular-nums font-semibold text-[#344A62]">
              {activeSales.length}
            </span>{' '}
            transaksi selesai
          </p>
        </div>

        <div className="bg-white border border-[#E8EDF3] rounded-2xl p-5 shadow-[0_8px_28px_rgba(20,42,66,0.045)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8190A2]">Keuntungan Penjualan</span>
            <span className="w-8 h-8 rounded-lg bg-[#F1EDFF] text-[#8B70D7] flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-[#087C58] font-mono tabular-nums mt-3">
            {formatIDR(metrics.totalKeuntunganKotor)}
          </p>
          <p className="text-xs text-[#9AA6B4] mt-2">
            Margin rata-rata{' '}
            <span className="font-mono tabular-nums font-semibold text-[#344A62]">
              {metrics.marginRataRata}%
            </span>
          </p>
        </div>

        <div className="bg-white border border-[#E8EDF3] rounded-2xl p-5 shadow-[0_8px_28px_rgba(20,42,66,0.045)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8190A2]">Total Pengeluaran</span>
            <span className="w-8 h-8 rounded-lg bg-[#FFF4E3] text-[#D99525] flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-[#1A3049] font-mono tabular-nums mt-3">
            {formatIDR(metrics.totalPengeluaran)}
          </p>
          <p className="text-xs text-[#9AA6B4] mt-2">Belanja stok &amp; biaya operasional</p>
        </div>

        <div className="bg-white border border-[#E8EDF3] rounded-2xl p-5 shadow-[0_8px_28px_rgba(20,42,66,0.045)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8190A2]">Jumlah Produk Aktif</span>
            <span className="w-8 h-8 rounded-lg bg-[#EAF4FF] text-[#4C91D7] flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-[#1A3049] font-mono tabular-nums mt-3">
            {metrics.jumlahProduk}
          </p>
          <p className="text-xs mt-2">
            {lowStockProducts.length > 0 ? (
              <button
                type="button"
                onClick={() => setActivePage('produk')}
                className="text-amber-700 hover:underline font-semibold"
              >
                {lowStockProducts.length} produk stok menipis
              </button>
            ) : metrics.jumlahProduk > 0 ? (
              <span className="text-[#0B9B70] font-medium">Semua stok dalam batas aman</span>
            ) : (
              <button
                type="button"
                onClick={() => setActivePage('produk')}
                className="text-[#0B9B70] hover:underline font-semibold"
              >
                Tambah produk pertama
              </button>
            )}
          </p>
        </div>
      </section>

      {/* Main Chart + Business Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Grafik Penjualan */}
        <div className="xl:col-span-2 bg-white border border-[#E8EDF3] rounded-2xl p-5 shadow-[0_8px_28px_rgba(20,42,66,0.045)] flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0F3F6]">
            <div>
              <h3 className="text-sm font-bold text-[#243A53]">
                Performa Penjualan &amp; Keuntungan
              </h3>
              <p className="text-xs text-[#94A1AF] mt-0.5">
                Pergerakan omzet dan laba kotor harian berdasarkan transaksi selesai
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-[#F6F8FB] border border-[#E8EDF3] rounded-lg self-start sm:self-auto">
              {([7, 14, 30] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setChartDays(days)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    chartDays === days
                      ? 'bg-white text-[#172B43] shadow-xs'
                      : 'text-[#8190A3] hover:text-[#172B43]'
                  }`}
                >
                  {days} Hari
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex-1">
            {activeSales.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="Belum ada grafik penjualan"
                description="Catat transaksi penjualan pertama Anda untuk melihat grafik perkembangan omzet harian."
                actionLabel="Catat Penjualan"
                onAction={onOpenNewSale}
              />
            ) : (
              <SalesTrendChart
                labels={chartSeries.labels}
                revenueSeries={chartSeries.revenueSeries}
                profitSeries={chartSeries.profitSeries}
              />
            )}
          </div>
        </div>

        {/* Business Insights */}
        <div className="bg-white border border-[#E8EDF3] rounded-2xl p-5 shadow-[0_8px_28px_rgba(20,42,66,0.045)] flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-[#F0F3F6]">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#E6F9F1] text-[#0B9B70] flex items-center justify-center">
                <Lightbulb className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-[#243A53]">Insight Usaha</h3>
            </div>
            <span className="text-[11px] text-[#94A1AF]">Berbasis data usaha</span>
          </div>

          <div className="space-y-2.5 pt-3 flex-1">
            {insights.slice(0, 4).map((ins) => (
              <div
                key={ins.id}
                className="p-3 rounded-xl bg-[#F7FAF9] border border-[#EDF3F0]"
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span
                    className={`font-bold ${
                      ins.prioritas === 'tinggi'
                        ? 'text-red-700'
                        : ins.prioritas === 'sedang'
                        ? 'text-amber-700'
                        : 'text-[#0B9B70]'
                    }`}
                  >
                    {ins.kategori} ·{' '}
                    {ins.prioritas === 'tinggi'
                      ? 'Perlu Tindakan'
                      : ins.prioritas === 'sedang'
                      ? 'Perhatian'
                      : 'Ringkasan'}
                  </span>
                </div>
                <p className="text-xs font-bold text-[#172B43] mt-1">{ins.judul}</p>
                <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                  {ins.ringkasan}
                </p>
                <button
                  type="button"
                  onClick={() => setActivePage(ins.targetPage)}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#059669] hover:text-[#047857]"
                >
                  <span>{ins.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Stok Menipis, Transaksi Terbaru, Agenda Terdekat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Produk dengan Stok Menipis */}
        <div className="bg-white border border-[#E8EDF3] rounded-2xl p-5 shadow-[0_8px_28px_rgba(20,42,66,0.045)]">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#F0F3F6]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-[#243A53]">Peringatan Stok</h3>
            </div>
            <button
              type="button"
              onClick={() => setActivePage('produk')}
              className="text-xs font-semibold text-[#059669] hover:underline whitespace-nowrap shrink-0"
            >
              Lihat Semua
            </button>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-[#344A62]">
                {data.products.length === 0
                  ? 'Belum ada produk tercatat'
                  : 'Stok produk dalam kondisi aman'}
              </p>
              <p className="text-xs text-[#94A1AF] mt-1">
                {data.products.length === 0
                  ? 'Tambahkan produk pertama di menu Produk & Stok.'
                  : 'Tidak ada produk di bawah batas minimum saat ini.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#F0F3F6] mt-1">
              {lowStockProducts.slice(0, 5).map((prod) => (
                <li key={prod.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#172B43] truncate">{prod.nama}</p>
                    <p className="text-xs text-[#8190A3]">
                      {prod.kategori} · Batas min {prod.stokMinimum} {prod.satuan}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-mono tabular-nums font-bold ${
                        prod.stok <= 0 ? 'text-red-700' : 'text-amber-700'
                      }`}
                    >
                      {prod.stok} {prod.satuan}
                    </p>
                    <p className="text-[11px] text-[#8190A3]">
                      {prod.stok <= 0 ? 'Habis' : 'Menipis'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Transaksi Terbaru */}
        <div className="bg-white border border-[#E8EDF3] rounded-2xl p-5 shadow-[0_8px_28px_rgba(20,42,66,0.045)]">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#F0F3F6]">
            <h3 className="text-sm font-bold text-[#243A53]">Transaksi Terbaru</h3>
            <button
              type="button"
              onClick={() => setActivePage('penjualan')}
              className="text-xs font-semibold text-[#059669] hover:underline whitespace-nowrap shrink-0"
            >
              Semua Penjualan
            </button>
          </div>

          {recentSales.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-[#344A62]">Belum ada transaksi penjualan</p>
              <button
                type="button"
                onClick={onOpenNewSale}
                className="mt-3 text-xs font-bold text-[#059669] hover:underline"
              >
                + Catat Transaksi Pertama
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#F0F3F6] mt-1">
              {recentSales.map((sale) => (
                <li key={sale.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#172B43] truncate">
                      {sale.customerName}
                    </p>
                    <p className="text-xs text-[#8190A3] truncate">
                      <span className="font-mono">{sale.nomorInvoice}</span> ·{' '}
                      {sale.metodePembayaran} · {formatDateTimeID(sale.tanggal)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-mono tabular-nums font-bold ${
                        sale.status === 'dibatalkan'
                          ? 'text-slate-400 line-through'
                          : 'text-[#172B43]'
                      }`}
                    >
                      {formatIDR(sale.totalHarga)}
                    </p>
                    <p
                      className={`text-[11px] font-medium ${
                        sale.status === 'dibatalkan' ? 'text-red-600' : 'text-[#0B9B70]'
                      }`}
                    >
                      {sale.status === 'dibatalkan' ? 'Dibatalkan' : 'Selesai'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pesanan & Tenggat Terdekat */}
        <div className="bg-white border border-[#E8EDF3] rounded-2xl p-5 shadow-[0_8px_28px_rgba(20,42,66,0.045)]">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#F0F3F6]">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-[#52677E]" />
              <h3 className="text-sm font-bold text-[#243A53]">Agenda &amp; Pesanan</h3>
            </div>
            <button
              type="button"
              onClick={() => setActivePage('pesanan')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#059669] hover:underline whitespace-nowrap shrink-0"
            >
              <span>Kalender</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingOrders.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-[#344A62]">Tidak ada pesanan aktif</p>
              <p className="text-xs text-[#94A1AF] mt-1">
                Tambahkan jadwal pesanan atau pengingat di menu Pesanan &amp; Agenda.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#F0F3F6] mt-1">
              {upcomingOrders.map((ord) => (
                <li key={ord.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#172B43] truncate">{ord.judul}</p>
                    <p className="text-xs text-[#8190A3] truncate">
                      {ord.customerName} · Tenggat {formatDateID(ord.tenggatWaktu)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold shrink-0 ${
                      ord.status === 'diproses' ? 'text-[#0B9B70]' : 'text-amber-700'
                    }`}
                  >
                    {ord.status === 'diproses' ? 'Diproses' : 'Menunggu'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

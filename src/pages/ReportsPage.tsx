import React, { useMemo, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { exportToCSV, formatDateID, formatIDR, toISODateLocal } from '../utils/formatters';
import { SalesTrendChart } from '../components/charts/BusinessCharts';
import { EmptyState } from '../components/ui/EmptyState';

export const ReportsPage: React.FC = () => {
  const { data, notify } = useStore();

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return toISODateLocal(d);
  });
  const [endDate, setEndDate] = useState(() => toISODateLocal(new Date()));

  const filteredSales = useMemo(
    () =>
      data.sales.filter((s) => {
        if (s.status !== 'selesai') return false;
        const d = s.tanggal.slice(0, 10);
        return (!startDate || d >= startDate) && (!endDate || d <= endDate);
      }),
    [data.sales, endDate, startDate]
  );

  const filteredExpenses = useMemo(
    () =>
      data.finance.filter((f) => {
        if (f.tipe !== 'pengeluaran') return false;
        return (!startDate || f.tanggal >= startDate) && (!endDate || f.tanggal <= endDate);
      }),
    [data.finance, endDate, startDate]
  );

  const summary = useMemo(() => {
    const totalPenjualan = filteredSales.reduce((s, x) => s + x.totalHarga, 0);
    const totalKeuntungan = filteredSales.reduce((s, x) => s + x.totalKeuntungan, 0);
    const totalPengeluaran = filteredExpenses.reduce((s, x) => s + x.jumlah, 0);
    const totalUnitTerjual = filteredSales.reduce(
      (s, x) => s + x.items.reduce((acc, i) => acc + i.qty, 0),
      0
    );
    return {
      totalPenjualan,
      totalKeuntungan,
      totalPengeluaran,
      totalUnitTerjual,
      jumlahTransaksi: filteredSales.length,
    };
  }, [filteredExpenses, filteredSales]);

  // Analisis Performa Produk (Terlaris vs Performa Rendah)
  const productPerformance = useMemo(() => {
    const map = new Map<
      string,
      { id: string; nama: string; kategori: string; qty: number; omzet: number; profit: number; stok: number }
    >();

    data.products.forEach((p) => {
      map.set(p.id, {
        id: p.id,
        nama: p.nama,
        kategori: p.kategori,
        qty: 0,
        omzet: 0,
        profit: 0,
        stok: p.stok,
      });
    });

    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const current = map.get(item.productId) || {
          id: item.productId,
          nama: item.productName,
          kategori: '-',
          qty: 0,
          omzet: 0,
          profit: 0,
          stok: 0,
        };
        current.qty += item.qty;
        current.omzet += item.subtotal;
        current.profit += item.profit;
        map.set(item.productId, current);
      });
    });

    const all = Array.from(map.values());
    const topSelling = [...all].filter((x) => x.qty > 0).sort((a, b) => b.qty - a.qty);
    const lowPerforming = [...all].sort((a, b) => a.qty - b.qty || a.omzet - b.omzet);

    return { topSelling, lowPerforming };
  }, [data.products, filteredSales]);

  // Grafik tren berdasarkan tanggal pada rentang terpilih
  const trendData = useMemo(() => {
    const byDate = new Map<string, { omzet: number; profit: number }>();
    filteredSales.forEach((s) => {
      const d = s.tanggal.slice(0, 10);
      const curr = byDate.get(d) || { omzet: 0, profit: 0 };
      curr.omzet += s.totalHarga;
      curr.profit += s.totalKeuntungan;
      byDate.set(d, curr);
    });

    const sortedDates = Array.from(byDate.keys()).sort();
    return {
      labels: sortedDates.map((d) => formatDateID(d)),
      revenueSeries: sortedDates.map((d) => byDate.get(d)!.omzet),
      profitSeries: sortedDates.map((d) => byDate.get(d)!.profit),
    };
  }, [filteredSales]);

  const handleExportSalesCSV = () => {
    if (filteredSales.length === 0) {
      notify('warning', 'Tidak ada data penjualan pada rentang tanggal ini');
      return;
    }
    const headers = [
      'No Invoice',
      'Tanggal',
      'Pelanggan',
      'Metode Pembayaran',
      'Daftar Produk',
      'Total Penjualan (IDR)',
      'Modal (IDR)',
      'Keuntungan Kotor (IDR)',
    ];
    const rows = filteredSales.map((s) => [
      s.nomorInvoice,
      s.tanggal.slice(0, 10),
      s.customerName,
      s.metodePembayaran,
      s.items.map((i) => `${i.qty}x ${i.productName}`).join('; '),
      s.totalHarga,
      s.totalModal,
      s.totalKeuntungan,
    ]);
    exportToCSV(`laporan-penjualan-usahaku-${startDate}-sd-${endDate}`, headers, rows);
    notify('success', 'Laporan penjualan diekspor ke CSV');
  };

  const handleExportProductsCSV = () => {
    if (productPerformance.lowPerforming.length === 0) {
      notify('warning', 'Belum ada data produk untuk diekspor');
      return;
    }
    const headers = [
      'Nama Produk',
      'Kategori',
      'Unit Terjual',
      'Omzet (IDR)',
      'Keuntungan (IDR)',
      'Sisa Stok',
    ];
    const rows = productPerformance.topSelling
      .concat(productPerformance.lowPerforming.filter((x) => x.qty === 0))
      .map((p) => [p.nama, p.kategori, p.qty, p.omzet, p.profit, p.stok]);
    exportToCSV(`laporan-performa-produk-${startDate}-sd-${endDate}`, headers, rows);
    notify('success', 'Laporan performa produk diekspor ke CSV');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Laporan &amp; Analisis Usaha</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Evaluasi penjualan, laba, pengeluaran, dan performa produk berdasarkan rentang tanggal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportProductsCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Produk CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportSalesCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Penjualan CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Tanggal */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            Dari Tanggal
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 text-sm font-mono border border-slate-200 rounded-lg"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            Sampai Tanggal
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 text-sm font-mono border border-slate-200 rounded-lg"
          />
        </div>
      </div>

      {/* Ringkasan Periode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Laporan Penjualan</p>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {formatIDR(summary.totalPenjualan)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {summary.jumlahTransaksi} transaksi · {summary.totalUnitTerjual} unit
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Laporan Keuntungan Kotor</p>
          <p className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
            {formatIDR(summary.totalKeuntungan)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Margin:{' '}
            {summary.totalPenjualan > 0
              ? Math.round((summary.totalKeuntungan / summary.totalPenjualan) * 100)
              : 0}
            %
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Laporan Pengeluaran</p>
          <p className="text-xl font-bold font-mono tabular-nums text-red-700 mt-1">
            {formatIDR(summary.totalPengeluaran)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {filteredExpenses.length} catatan pengeluaran
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Rata-rata Nilai Transaksi</p>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {formatIDR(
              summary.jumlahTransaksi > 0
                ? summary.totalPenjualan / summary.jumlahTransaksi
                : 0
            )}
          </p>
          <p className="text-xs text-slate-500 mt-1">Per struk selesai</p>
        </div>
      </div>

      {/* Grafik Perkembangan Usaha */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-base font-semibold text-slate-900 pb-4 border-b border-slate-100">
          Grafik Perkembangan Usaha ({formatDateID(startDate)} – {formatDateID(endDate)})
        </h3>
        <div className="pt-4">
          {trendData.labels.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Tidak ada data transaksi pada periode ini"
              description="Ubah rentang tanggal atau catat transaksi penjualan baru untuk melihat grafik perkembangan usaha."
            />
          ) : (
            <SalesTrendChart
              labels={trendData.labels}
              revenueSeries={trendData.revenueSeries}
              profitSeries={trendData.profitSeries}
            />
          )}
        </div>
      </div>

      {/* Produk Terlaris vs Performa Rendah */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">Produk Terlaris</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Diurutkan dari jumlah unit terjual terbanyak pada periode terpilih.
            </p>
          </div>
          {productPerformance.topSelling.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 text-center">
              Belum ada penjualan produk pada periode ini.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Produk</th>
                  <th className="py-2.5 px-4 text-right">Terjual</th>
                  <th className="py-2.5 px-4 text-right">Omzet</th>
                  <th className="py-2.5 px-4 text-right">Laba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productPerformance.topSelling.slice(0, 6).map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 px-4 font-medium text-slate-900">{p.nama}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">{p.qty}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                      {formatIDR(p.omzet)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                      {formatIDR(p.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">
              Produk Performa Rendah / Perlu Promosi
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Produk dengan penjualan paling sedikit atau belum terjual pada periode ini.
            </p>
          </div>
          {productPerformance.lowPerforming.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 text-center">
              Belum ada produk di katalog.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Produk</th>
                  <th className="py-2.5 px-4 text-right">Terjual</th>
                  <th className="py-2.5 px-4 text-right">Sisa Stok</th>
                  <th className="py-2.5 px-4 text-right">Omzet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productPerformance.lowPerforming.slice(0, 6).map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 px-4 font-medium text-slate-900">{p.nama}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-amber-700 font-semibold">
                      {p.qty}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600">
                      {p.stok}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                      {formatIDR(p.omzet)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

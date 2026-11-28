import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Wallet } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { FinanceEntry, FinanceType } from '../types/business';
import { formatDateID, formatIDR, toISODateLocal } from '../utils/formatters';
import { CashflowBarChart } from '../components/charts/BusinessCharts';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EmptyState } from '../components/ui/EmptyState';

const INCOME_CATEGORIES = [
  'Penjualan Produk',
  'Pelunasan Piutang',
  'Tambahan Modal',
  'Pemasukan Lainnya',
];

const EXPENSE_CATEGORIES = [
  'Pembelian Stok',
  'Kemasan & Perlengkapan',
  'Operasional & Listrik',
  'Transportasi & Ongkir',
  'Promosi & Iklan',
  'Gaji / Upah',
  'Pengeluaran Lainnya',
];

export const FinancePage: React.FC = () => {
  const { data, addFinanceEntry, deleteFinanceEntry } = useStore();

  const [period, setPeriod] = useState<'7hari' | '30hari' | 'semua'>('30hari');
  const [typeFilter, setTypeFilter] = useState<'semua' | FinanceType>('semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FinanceEntry | null>(null);

  // Form
  const [tipe, setTipe] = useState<FinanceType>('pengeluaran');
  const [tanggal, setTanggal] = useState(() => toISODateLocal(new Date()));
  const [kategori, setKategori] = useState(EXPENSE_CATEGORIES[1]);
  const [deskripsi, setDeskripsi] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [metode, setMetode] = useState('Tunai');

  const filteredEntries = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    if (period === '7hari') cutoff.setDate(now.getDate() - 6);
    if (period === '30hari') cutoff.setDate(now.getDate() - 29);
    const cutoffStr = toISODateLocal(cutoff);

    return data.finance
      .filter((f) => {
        if (period !== 'semua' && f.tanggal < cutoffStr) return false;
        if (typeFilter !== 'semua' && f.tipe !== typeFilter) return false;
        return true;
      })
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [data.finance, period, typeFilter]);

  const summary = useMemo(() => {
    const pemasukan = filteredEntries
      .filter((f) => f.tipe === 'pemasukan')
      .reduce((sum, f) => sum + f.jumlah, 0);
    const pengeluaran = filteredEntries
      .filter((f) => f.tipe === 'pengeluaran')
      .reduce((sum, f) => sum + f.jumlah, 0);
    return {
      pemasukan,
      pengeluaran,
      arusKasBersih: pemasukan - pengeluaran,
    };
  }, [filteredEntries]);

  // Laporan Laba Rugi Sederhana berdasarkan penjualan selesai vs biaya operasional
  const profitLoss = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    if (period === '7hari') cutoff.setDate(now.getDate() - 6);
    if (period === '30hari') cutoff.setDate(now.getDate() - 29);
    const cutoffStr = toISODateLocal(cutoff);

    const salesInPeriod = data.sales.filter(
      (s) => s.status === 'selesai' && (period === 'semua' || s.tanggal.slice(0, 10) >= cutoffStr)
    );

    const pendapatanUsaha = salesInPeriod.reduce((sum, s) => sum + s.totalHarga, 0);
    const hpp = salesInPeriod.reduce((sum, s) => sum + s.totalModal, 0);
    const labaKotor = pendapatanUsaha - hpp;
    const bebanOperasional = filteredEntries
      .filter((f) => f.tipe === 'pengeluaran' && f.kategori !== 'Pembelian Stok')
      .reduce((sum, f) => sum + f.jumlah, 0);
    const labaBersih = labaKotor - bebanOperasional;

    return { pendapatanUsaha, hpp, labaKotor, bebanOperasional, labaBersih };
  }, [data.sales, filteredEntries, period]);

  const chartSeries = useMemo(() => {
    const days = period === '7hari' ? 7 : 10;
    const labels: string[] = [];
    const incomeSeries: number[] = [];
    const expenseSeries: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = toISODateLocal(d);
      labels.push(
        new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(d)
      );
      const dayItems = data.finance.filter((f) => f.tanggal === iso);
      incomeSeries.push(
        dayItems.filter((f) => f.tipe === 'pemasukan').reduce((s, f) => s + f.jumlah, 0)
      );
      expenseSeries.push(
        dayItems.filter((f) => f.tipe === 'pengeluaran').reduce((s, f) => s + f.jumlah, 0)
      );
    }

    return { labels, incomeSeries, expenseSeries };
  }, [data.finance, period]);

  const handleOpenAdd = (initialType: FinanceType) => {
    setTipe(initialType);
    setKategori(initialType === 'pemasukan' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[1]);
    setTanggal(toISODateLocal(new Date()));
    setDeskripsi('');
    setJumlah('');
    setMetode('Tunai');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addFinanceEntry({
      tanggal,
      tipe,
      kategori,
      deskripsi,
      jumlah: Number(jumlah) || 0,
      metode,
    });
    if (res.ok) setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Manajemen Keuangan &amp; Arus Kas</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Pantau pemasukan, pengeluaran operasional, arus kas bersih, dan ringkasan laba rugi.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenAdd('pemasukan')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Pemasukan</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAdd('pengeluaran')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Pengeluaran</span>
          </button>
        </div>
      </div>

      {/* Ringkasan Arus Kas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Pemasukan</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
            {formatIDR(summary.pemasukan)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Pengeluaran</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-red-700 mt-1">
            {formatIDR(summary.pengeluaran)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Arus Kas Bersih</p>
          <p
            className={`text-2xl font-bold font-mono tabular-nums mt-1 ${
              summary.arusKasBersih >= 0 ? 'text-slate-900' : 'text-red-700'
            }`}
          >
            {formatIDR(summary.arusKasBersih)}
          </p>
        </div>
      </div>

      {/* Chart Arus Kas + Laba Rugi Sederhana */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">
              Grafik Arus Kas Harian
            </h3>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
              {(
                [
                  { k: '7hari', label: '7 Hari' },
                  { k: '30hari', label: '30 Hari' },
                  { k: 'semua', label: 'Semua' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.k}
                  type="button"
                  onClick={() => setPeriod(opt.k)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    period === opt.k
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-4">
            <CashflowBarChart
              labels={chartSeries.labels}
              incomeSeries={chartSeries.incomeSeries}
              expenseSeries={chartSeries.expenseSeries}
            />
          </div>
        </div>

        {/* Laporan Laba Rugi Sederhana */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 pb-3 border-b border-slate-100">
              Laba &amp; Rugi Sederhana
            </h3>
            <dl className="divide-y divide-slate-100 text-sm mt-2">
              <div className="py-2.5 flex justify-between gap-2">
                <dt className="text-slate-600">Pendapatan Penjualan</dt>
                <dd className="font-mono tabular-nums font-medium text-slate-900">
                  {formatIDR(profitLoss.pendapatanUsaha)}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-2">
                <dt className="text-slate-600">Harga Pokok Modal (HPP)</dt>
                <dd className="font-mono tabular-nums text-red-700">
                  -{formatIDR(profitLoss.hpp)}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-2 font-semibold">
                <dt className="text-slate-800">Laba Kotor</dt>
                <dd className="font-mono tabular-nums text-slate-900">
                  {formatIDR(profitLoss.labaKotor)}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-2">
                <dt className="text-slate-600">Beban Operasional</dt>
                <dd className="font-mono tabular-nums text-red-700">
                  -{formatIDR(profitLoss.bebanOperasional)}
                </dd>
              </div>
            </dl>
          </div>
          <div className="pt-4 mt-2 border-t border-slate-200 flex items-baseline justify-between">
            <span className="text-sm font-bold text-slate-900">Estimasi Laba Bersih</span>
            <span
              className={`text-xl font-bold font-mono tabular-nums ${
                profitLoss.labaBersih >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {formatIDR(profitLoss.labaBersih)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Tabel Buku Kas */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">Buku Kas Transaksi</h3>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            {(
              [
                { k: 'semua', label: 'Semua' },
                { k: 'pemasukan', label: 'Pemasukan' },
                { k: 'pengeluaran', label: 'Pengeluaran' },
              ] as const
            ).map((t) => (
              <button
                key={t.k}
                type="button"
                onClick={() => setTypeFilter(t.k)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  typeFilter === t.k
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Wallet}
              title="Belum ada catatan keuangan pada periode ini"
              description="Catat pemasukan atau pengeluaran operasional usaha Anda untuk memantau arus kas."
              actionLabel="Catat Pengeluaran"
              onAction={() => handleOpenAdd('pengeluaran')}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Deskripsi</th>
                  <th className="py-3 px-4">Metode</th>
                  <th className="py-3 px-4 text-right">Nominal</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {formatDateID(entry.tanggal)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-xs font-semibold ${
                          entry.tipe === 'pemasukan' ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {entry.kategori}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800">{entry.deskripsi}</td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{entry.metode}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold whitespace-nowrap">
                      <span
                        className={
                          entry.tipe === 'pemasukan' ? 'text-emerald-700' : 'text-red-700'
                        }
                      >
                        {entry.tipe === 'pemasukan' ? '+' : '-'}
                        {formatIDR(entry.jumlah)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(entry)}
                        aria-label={`Hapus catatan ${entry.deskripsi}`}
                        className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah Catatan Keuangan */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={tipe === 'pemasukan' ? 'Catat Pemasukan' : 'Catat Pengeluaran'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setTipe('pemasukan');
                setKategori(INCOME_CATEGORIES[0]);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md ${
                tipe === 'pemasukan' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Pemasukan
            </button>
            <button
              type="button"
              onClick={() => {
                setTipe('pengeluaran');
                setKategori(EXPENSE_CATEGORIES[1]);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md ${
                tipe === 'pengeluaran' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Pengeluaran
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal</label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                {(tipe === 'pemasukan' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deskripsi Transaksi *
            </label>
            <input
              type="text"
              required
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Contoh: Beli kemasan plastik & stiker"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nominal (IDR) *
              </label>
              <input
                type="number"
                min={1}
                required
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Metode</label>
              <select
                value={metode}
                onChange={(e) => setMetode(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="Tunai">Tunai</option>
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="QRIS">QRIS</option>
                <option value="E-Wallet">E-Wallet</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
            >
              Simpan Catatan
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteFinanceEntry(deleteTarget.id);
        }}
        title="Hapus Catatan Keuangan?"
        description={`Catatan "${deleteTarget?.deskripsi || ''}" senilai ${formatIDR(
          deleteTarget?.jumlah || 0
        )} akan dihapus dari buku kas.`}
        confirmLabel="Hapus Catatan"
      />
    </div>
  );
};

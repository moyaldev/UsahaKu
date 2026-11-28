import React, { useMemo, useState } from 'react';
import { CreditCard, Edit2, Eye, Plus, Search, Trash2, Users } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Customer } from '../types/business';
import { formatDateTimeID, formatIDR } from '../utils/formatters';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EmptyState } from '../components/ui/EmptyState';

export const CustomersPage: React.FC = () => {
  const {
    data,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    recordDebtTransaction,
  } = useStore();

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'semua' | 'punya_utang'>('semua');

  // Form Pelanggan
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [nama, setNama] = useState('');
  const [kontak, setKontak] = useState('');
  const [alamat, setAlamat] = useState('');
  const [catatan, setCatatan] = useState('');

  // Detail & Riwayat Pelanggan
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  // Modal Utang / Pembayaran Utang
  const [debtTarget, setDebtTarget] = useState<Customer | null>(null);
  const [debtType, setDebtType] = useState<'bayar_utang' | 'tambah_utang'>('bayar_utang');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtMethod, setDebtMethod] = useState('Tunai');
  const [debtNote, setDebtNote] = useState('');

  // Hapus
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.customers.filter((c) => {
      if (filterMode === 'punya_utang' && c.totalUtang <= 0) return false;
      if (!q) return true;
      return (
        c.nama.toLowerCase().includes(q) ||
        c.kontak.toLowerCase().includes(q) ||
        c.catatan.toLowerCase().includes(q)
      );
    });
  }, [data.customers, filterMode, search]);

  const totalPiutang = useMemo(
    () => data.customers.reduce((sum, c) => sum + c.totalUtang, 0),
    [data.customers]
  );

  const openAdd = () => {
    setEditingCustomer(null);
    setNama('');
    setKontak('');
    setAlamat('');
    setCatatan('');
    setIsFormOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setNama(c.nama);
    setKontak(c.kontak);
    setAlamat(c.alamat);
    setCatatan(c.catatan);
    setIsFormOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nama: nama.trim(),
      kontak: kontak.trim(),
      alamat: alamat.trim(),
      catatan: catatan.trim(),
    };
    const res = editingCustomer
      ? updateCustomer(editingCustomer.id, payload)
      : addCustomer(payload);
    if (res.ok) setIsFormOpen(false);
  };

  const openDebtModal = (c: Customer, defaultType: 'bayar_utang' | 'tambah_utang') => {
    setDebtTarget(c);
    setDebtType(defaultType);
    setDebtAmount(defaultType === 'bayar_utang' ? String(c.totalUtang) : '');
    setDebtMethod('Tunai');
    setDebtNote('');
  };

  const handleSubmitDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtTarget) return;
    const res = recordDebtTransaction(
      debtTarget.id,
      debtType,
      Number(debtAmount) || 0,
      debtMethod,
      debtNote
    );
    if (res.ok) setDebtTarget(null);
  };

  const detailSales = useMemo(() => {
    if (!detailCustomer) return [];
    return data.sales.filter((s) => s.customerId === detailCustomer.id);
  }, [data.sales, detailCustomer]);

  const detailDebts = useMemo(() => {
    if (!detailCustomer) return [];
    return data.debtRecords.filter((d) => d.customerId === detailCustomer.id);
  }, [data.debtRecords, detailCustomer]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pelanggan &amp; Catatan Utang</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola data pelanggan, riwayat belanja, dan pencatatan kasbon/piutang usaha.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pelanggan</span>
        </button>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Pelanggan Terdaftar</p>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {data.customers.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Pelanggan Memiliki Utang</p>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {data.customers.filter((c) => c.totalUtang > 0).length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Piutang Belum Lunas</p>
          <p className="text-xl font-bold font-mono tabular-nums text-amber-700 mt-1">
            {formatIDR(totalPiutang)}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, kontak, atau catatan pelanggan..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto">
          <button
            type="button"
            onClick={() => setFilterMode('semua')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              filterMode === 'semua'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Pelanggan
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('punya_utang')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              filterMode === 'punya_utang'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ada Utang Aktif
          </button>
        </div>
      </div>

      {/* Table */}
      {filteredCustomers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum ada data pelanggan"
          description="Simpan data pelanggan tetap atau reseller Anda untuk memantau total belanja dan catatan kasbon."
          actionLabel="Tambah Pelanggan"
          onAction={openAdd}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Pelanggan</th>
                  <th className="py-3 px-4">Kontak</th>
                  <th className="py-3 px-4 text-right">Transaksi</th>
                  <th className="py-3 px-4 text-right">Total Pembelian</th>
                  <th className="py-3 px-4 text-right">Sisa Utang</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{c.nama}</p>
                      {c.catatan && (
                        <p className="text-xs text-slate-500 truncate max-w-xs">{c.catatan}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-xs whitespace-nowrap">
                      {c.kontak || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {c.jumlahTransaksi}x
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                      {formatIDR(c.totalPembelian)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          c.totalUtang > 0 ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {c.totalUtang > 0 ? formatIDR(c.totalUtang) : 'Lunas'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            openDebtModal(c, c.totalUtang > 0 ? 'bayar_utang' : 'tambah_utang')
                          }
                          title="Catat utang atau pembayaran utang"
                          aria-label={`Kelola utang ${c.nama}`}
                          className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailCustomer(c)}
                          aria-label={`Detail ${c.nama}`}
                          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          aria-label={`Edit ${c.nama}`}
                          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
                          aria-label={`Hapus ${c.nama}`}
                          className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Pelanggan */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Pelanggan *
            </label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Ibu Ratna Dewi / Toko Maju"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nomor Telepon / WhatsApp
            </label>
            <input
              type="text"
              value={kontak}
              onChange={(e) => setKontak(e.target.value)}
              placeholder="0812-xxxx-xxxx"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat</label>
            <input
              type="text"
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder="Alamat pengiriman atau domisili"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Pelanggan
            </label>
            <textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Preferensi produk, jadwal order, atau ketentuan tempo"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
            >
              Simpan Pelanggan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Utang / Pembayaran */}
      <Modal
        isOpen={Boolean(debtTarget)}
        onClose={() => setDebtTarget(null)}
        title={`Utang & Pembayaran · ${debtTarget?.nama || ''}`}
        maxWidthClass="max-w-md"
      >
        {debtTarget && (
          <form onSubmit={handleSubmitDebt} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-sm">
              <span className="text-slate-600">Sisa Utang Saat Ini</span>
              <span className="font-mono font-bold text-amber-700">
                {formatIDR(debtTarget.totalUtang)}
              </span>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setDebtType('bayar_utang');
                  setDebtAmount(String(debtTarget.totalUtang || ''));
                }}
                disabled={debtTarget.totalUtang <= 0}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-40 ${
                  debtType === 'bayar_utang'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Catat Pembayaran
              </button>
              <button
                type="button"
                onClick={() => {
                  setDebtType('tambah_utang');
                  setDebtAmount('');
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  debtType === 'tambah_utang'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Tambah Catatan Utang
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nominal (IDR) *
              </label>
              <input
                type="number"
                min={1}
                max={debtType === 'bayar_utang' ? debtTarget.totalUtang : undefined}
                required
                value={debtAmount}
                onChange={(e) => setDebtAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Metode Pembayaran
              </label>
              <select
                value={debtMethod}
                onChange={(e) => setDebtMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="Tunai">Tunai</option>
                <option value="QRIS">QRIS</option>
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="E-Wallet">E-Wallet</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan</label>
              <input
                type="text"
                value={debtNote}
                onChange={(e) => setDebtNote(e.target.value)}
                placeholder="Contoh: Cicilan tahap 1 atau pelunasan via transfer"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDebtTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
              >
                Simpan
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Detail Pelanggan */}
      <Modal
        isOpen={Boolean(detailCustomer)}
        onClose={() => setDetailCustomer(null)}
        title={detailCustomer?.nama || ''}
        subtitle={`${detailCustomer?.kontak || '-'} · ${detailCustomer?.alamat || 'Alamat belum diisi'}`}
        maxWidthClass="max-w-2xl"
      >
        {detailCustomer && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3 pb-4 border-b border-slate-200 text-sm">
              <div>
                <p className="text-xs text-slate-500">Total Pembelian</p>
                <p className="font-mono font-bold text-slate-900 mt-0.5">
                  {formatIDR(detailCustomer.totalPembelian)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Jumlah Transaksi</p>
                <p className="font-mono font-bold text-slate-900 mt-0.5">
                  {detailCustomer.jumlahTransaksi}x
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Sisa Utang</p>
                <p className="font-mono font-bold text-amber-700 mt-0.5">
                  {formatIDR(detailCustomer.totalUtang)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2">
                Riwayat Transaksi Belanja
              </h4>
              {detailSales.length === 0 ? (
                <p className="text-xs text-slate-500">Belum ada transaksi tercatat.</p>
              ) : (
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {detailSales.map((s) => (
                    <li key={s.id} className="px-3.5 py-2.5 flex justify-between text-xs">
                      <div>
                        <span className="font-mono font-semibold text-slate-900">
                          {s.nomorInvoice}
                        </span>{' '}
                        · <span className="text-slate-500">{formatDateTimeID(s.tanggal)}</span>
                        <p className="text-slate-600 mt-0.5">
                          {s.items.map((i) => `${i.qty}x ${i.productName}`).join(', ')}
                        </p>
                      </div>
                      <span className="font-mono font-semibold text-slate-900 shrink-0">
                        {formatIDR(s.totalHarga)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2">
                Riwayat Utang &amp; Pembayaran
              </h4>
              {detailDebts.length === 0 ? (
                <p className="text-xs text-slate-500">Tidak ada catatan utang/pembayaran.</p>
              ) : (
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {detailDebts.map((d) => (
                    <li key={d.id} className="px-3.5 py-2.5 flex justify-between text-xs">
                      <div>
                        <span
                          className={`font-semibold ${
                            d.tipe === 'bayar_utang' ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {d.tipe === 'bayar_utang' ? 'Pembayaran Utang' : 'Tambah Utang'}
                        </span>{' '}
                        · <span className="text-slate-500">{formatDateTimeID(d.tanggal)}</span>
                        <p className="text-slate-600 mt-0.5">{d.catatan}</p>
                      </div>
                      <span className="font-mono font-semibold text-slate-900 shrink-0">
                        {d.tipe === 'bayar_utang' ? '-' : '+'}
                        {formatIDR(d.jumlah)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteCustomer(deleteTarget.id);
        }}
        title="Hapus Data Pelanggan?"
        description={`Data pelanggan "${deleteTarget?.nama || ''}" akan dihapus. Pastikan tidak ada piutang aktif yang masih perlu ditagih.`}
        confirmLabel="Hapus Pelanggan"
      />
    </div>
  );
};

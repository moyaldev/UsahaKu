import React, { useMemo, useState } from 'react';
import { Eye, Plus, RotateCcw, Search, ShoppingBag, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { PaymentMethod, Sale } from '../types/business';
import { formatDateTimeID, formatIDR, toISODateLocal } from '../utils/formatters';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EmptyState } from '../components/ui/EmptyState';

interface SalesPageProps {
  externalOpenNew?: boolean;
  onResetExternalOpen?: () => void;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'Tunai',
  'QRIS',
  'Transfer Bank',
  'E-Wallet',
  'Utang / Kasbon',
];

export const SalesPage: React.FC<SalesPageProps> = ({
  externalOpenNew = false,
  onResetExternalOpen,
}) => {
  const { data, createSale, cancelSale, setActivePage } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'semua' | 'selesai' | 'dibatalkan'>('semua');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);

  // State form transaksi baru
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [manualCustomerName, setManualCustomerName] = useState('Pelanggan Umum');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tunai');
  const [saleDate, setSaleDate] = useState(() => toISODateLocal(new Date()));
  const [notes, setNotes] = useState('');
  const [cartItems, setCartItems] = useState<{ productId: string; qty: number }[]>([]);
  const [pickProductId, setPickProductId] = useState('');
  const [pickQty, setPickQty] = useState(1);

  const modalOpen = isNewModalOpen || externalOpenNew;

  const closeNewModal = () => {
    setIsNewModalOpen(false);
    onResetExternalOpen?.();
  };

  const resetForm = () => {
    setSelectedCustomerId('');
    setManualCustomerName('Pelanggan Umum');
    setPaymentMethod('Tunai');
    setSaleDate(toISODateLocal(new Date()));
    setNotes('');
    setCartItems([]);
    setPickProductId('');
    setPickQty(1);
  };

  const availableProducts = useMemo(
    () => data.products.filter((p) => p.stok > 0),
    [data.products]
  );

  const handleAddToCart = () => {
    if (!pickProductId || pickQty <= 0) return;
    const prod = data.products.find((p) => p.id === pickProductId);
    if (!prod) return;

    setCartItems((prev) => {
      const existing = prev.find((i) => i.productId === pickProductId);
      const nextQty = (existing?.qty || 0) + pickQty;
      const clampedQty = Math.min(nextQty, prod.stok);
      if (existing) {
        return prev.map((i) =>
          i.productId === pickProductId ? { ...i, qty: clampedQty } : i
        );
      }
      return [...prev, { productId: pickProductId, qty: clampedQty }];
    });
    setPickProductId('');
    setPickQty(1);
  };

  const updateCartQty = (productId: string, qty: number) => {
    const prod = data.products.find((p) => p.id === productId);
    if (!prod) return;
    if (qty <= 0) {
      setCartItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setCartItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, qty: Math.min(qty, prod.stok) } : i
      )
    );
  };

  const cartSummary = useMemo(() => {
    let totalHarga = 0;
    let totalModal = 0;
    const resolved = cartItems
      .map((item) => {
        const prod = data.products.find((p) => p.id === item.productId);
        if (!prod) return null;
        const subtotal = prod.hargaJual * item.qty;
        const modal = prod.hargaModal * item.qty;
        totalHarga += subtotal;
        totalModal += modal;
        return { ...item, product: prod, subtotal };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    return {
      items: resolved,
      totalHarga,
      estimasiKeuntungan: totalHarga - totalModal,
    };
  }, [cartItems, data.products]);

  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createSale({
      customerId: selectedCustomerId || undefined,
      customerName: selectedCustomerId ? undefined : manualCustomerName,
      metodePembayaran: paymentMethod,
      catatan: notes,
      tanggal: `${saleDate}T${new Date().toTimeString().slice(0, 8)}`,
      items: cartItems,
    });
    if (res.ok) {
      resetForm();
      closeNewModal();
    }
  };

  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.sales.filter((s) => {
      if (statusFilter !== 'semua' && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.nomorInvoice.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.items.some((i) => i.productName.toLowerCase().includes(q))
      );
    });
  }, [data.sales, search, statusFilter]);

  const summaryStats = useMemo(() => {
    const selesai = data.sales.filter((s) => s.status === 'selesai');
    return {
      count: selesai.length,
      omzet: selesai.reduce((sum, s) => sum + s.totalHarga, 0),
      profit: selesai.reduce((sum, s) => sum + s.totalKeuntungan, 0),
    };
  }, [data.sales]);

  return (
    <div className="space-y-6">
      {/* Header & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Riwayat &amp; Pencatatan Penjualan</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Setiap transaksi otomatis mengurangi stok barang dan mencatat pemasukan usaha.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Penjualan</span>
        </button>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Transaksi Selesai</p>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {summaryStats.count}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Omzet</p>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {formatIDR(summaryStats.omzet)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Estimasi Laba Kotor</p>
          <p className="text-xl font-bold font-mono tabular-nums text-emerald-800 mt-1">
            {formatIDR(summaryStats.profit)}
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
            placeholder="Cari nomor invoice, pelanggan, atau nama produk..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto">
          {(['semua', 'selesai', 'dibatalkan'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize whitespace-nowrap shrink-0 ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filteredSales.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Belum ada data penjualan yang sesuai"
          description={
            data.sales.length === 0
              ? 'Catat penjualan pertama Anda untuk melacak omzet, laba, dan pengurangan stok secara otomatis.'
              : 'Coba ubah kata kunci pencarian atau filter status transaksi.'
          }
          actionLabel="Tambah Penjualan"
          onAction={() => setIsNewModalOpen(true)}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Invoice &amp; Tanggal</th>
                  <th className="py-3 px-4">Pelanggan</th>
                  <th className="py-3 px-4">Produk</th>
                  <th className="py-3 px-4">Pembayaran</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Untung</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="font-mono text-xs font-semibold text-slate-900">
                        {sale.nomorInvoice}
                      </p>
                      <p className="text-xs text-slate-500">{formatDateTimeID(sale.tanggal)}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{sale.customerName}</p>
                    </td>
                    <td className="py-3 px-4 max-w-[240px]">
                      <p className="text-slate-700 truncate">
                        {sale.items.map((i) => `${i.qty}x ${i.productName}`).join(', ')}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {sale.metodePembayaran}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {formatIDR(sale.totalHarga)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 whitespace-nowrap">
                      {sale.status === 'dibatalkan' ? '-' : formatIDR(sale.totalKeuntungan)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-xs font-semibold ${
                          sale.status === 'selesai' ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {sale.status === 'selesai' ? 'Selesai' : 'Dibatalkan'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailSale(sale)}
                          aria-label={`Lihat detail ${sale.nomorInvoice}`}
                          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {sale.status === 'selesai' && (
                          <button
                            type="button"
                            onClick={() => setSaleToCancel(sale)}
                            aria-label={`Batalkan ${sale.nomorInvoice}`}
                            title="Batalkan transaksi & kembalikan stok"
                            className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tambah Penjualan */}
      <Modal
        isOpen={modalOpen}
        onClose={closeNewModal}
        title="Catat Transaksi Penjualan"
        subtitle="Stok produk akan berkurang otomatis setelah transaksi disimpan."
        maxWidthClass="max-w-2xl"
      >
        {data.products.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-600">
              Anda belum memiliki produk di katalog. Tambahkan produk terlebih dahulu sebelum mencatat penjualan.
            </p>
            <button
              type="button"
              onClick={() => {
                closeNewModal();
                setActivePage('produk');
              }}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
            >
              Ke Halaman Produk
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitSale} className="space-y-5">
            {/* Pilih Produk */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-700">
                Tambah Produk ke Transaksi
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={pickProductId}
                  onChange={(e) => setPickProductId(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="">-- Pilih produk tersedia --</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({formatIDR(p.hargaJual)} · Stok: {p.stok} {p.satuan})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={pickQty}
                  onChange={(e) => setPickQty(Math.max(1, Number(e.target.value)))}
                  className="w-full sm:w-24 px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  aria-label="Jumlah produk"
                />
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!pickProductId}
                  className="px-4 py-2 text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  + Tambah
                </button>
              </div>
            </div>

            {/* Daftar Item */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              {cartSummary.items.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  Belum ada produk yang dipilih. Pilih produk di atas lalu klik + Tambah.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cartSummary.items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 truncate">{item.product.nama}</p>
                        <p className="text-xs text-slate-500 font-mono">
                          {formatIDR(item.product.hargaJual)} / {item.product.satuan} · Maks{' '}
                          {item.product.stok}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          min={1}
                          max={item.product.stok}
                          value={item.qty}
                          onChange={(e) =>
                            updateCartQty(item.productId, Number(e.target.value))
                          }
                          className="w-16 px-2 py-1 text-sm text-center font-mono border border-slate-200 rounded-md"
                        />
                        <span className="w-28 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {formatIDR(item.subtotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.productId, 0)}
                          aria-label={`Hapus ${item.product.nama}`}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pelanggan & Pembayaran */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pelanggan
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="">Pelanggan Umum (Non-Member)</option>
                  {data.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama}
                    </option>
                  ))}
                </select>
                {!selectedCustomerId && (
                  <input
                    type="text"
                    value={manualCustomerName}
                    onChange={(e) => setManualCustomerName(e.target.value)}
                    placeholder="Nama pembeli (opsional)"
                    className="mt-2 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                {paymentMethod === 'Utang / Kasbon' && !selectedCustomerId && (
                  <p className="text-xs text-amber-700 mt-1.5">
                    Pilih pelanggan terdaftar di sebelah kiri untuk mencatat Kasbon / Utang.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Transaksi
                </label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Pesanan COD atau tanpa gula"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Total Ringkasan */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <div>
                <p className="text-xs text-slate-500">Total Pembayaran</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {formatIDR(cartSummary.totalHarga)}
                </p>
                <p className="text-xs text-emerald-700 font-mono tabular-nums">
                  Estimasi untung: {formatIDR(cartSummary.estimasiKeuntungan)}
                </p>
              </div>
              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={closeNewModal}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={cartSummary.items.length === 0}
                  className="px-5 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Simpan Transaksi
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Detail Transaksi */}
      <Modal
        isOpen={Boolean(detailSale)}
        onClose={() => setDetailSale(null)}
        title={`Detail Transaksi ${detailSale?.nomorInvoice || ''}`}
        subtitle={detailSale ? formatDateTimeID(detailSale.tanggal) : undefined}
      >
        {detailSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm pb-3 border-b border-slate-100">
              <div>
                <p className="text-xs text-slate-500">Pelanggan</p>
                <p className="font-semibold text-slate-900">{detailSale.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Metode Pembayaran</p>
                <p className="font-semibold text-slate-900">{detailSale.metodePembayaran}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <p
                  className={`font-semibold ${
                    detailSale.status === 'selesai' ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {detailSale.status === 'selesai' ? 'Selesai' : 'Dibatalkan'}
                </p>
              </div>
              {detailSale.catatan && (
                <div>
                  <p className="text-xs text-slate-500">Catatan</p>
                  <p className="text-slate-700">{detailSale.catatan}</p>
                </div>
              )}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-200">
                  <th className="py-2 text-left">Produk</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Harga</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detailSale.items.map((item, idx) => (
                  <tr key={`${item.productId}_${idx}`}>
                    <td className="py-2.5 text-slate-900">{item.productName}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">
                      {item.qty} {item.satuan}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums">
                      {formatIDR(item.hargaJual)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold">
                      {formatIDR(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-3 border-t border-slate-200 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Harga</span>
                <span className="font-mono tabular-nums font-bold text-slate-900">
                  {formatIDR(detailSale.totalHarga)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Modal</span>
                <span className="font-mono tabular-nums text-slate-700">
                  {formatIDR(detailSale.totalModal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Keuntungan Kotor</span>
                <span className="font-mono tabular-nums font-semibold text-emerald-700">
                  {formatIDR(detailSale.totalKeuntungan)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Konfirmasi Batalkan Transaksi */}
      <ConfirmModal
        isOpen={Boolean(saleToCancel)}
        onClose={() => setSaleToCancel(null)}
        onConfirm={() => {
          if (saleToCancel) cancelSale(saleToCancel.id);
        }}
        title="Batalkan Transaksi Penjualan?"
        description={`Transaksi ${saleToCancel?.nomorInvoice || ''} senilai ${formatIDR(
          saleToCancel?.totalHarga || 0
        )} akan dibatalkan. Stok produk akan otomatis dikembalikan dan catatan pemasukan/kasbon terkait akan disesuaikan.`}
        confirmLabel="Ya, Batalkan & Kembalikan Stok"
        tone="warning"
      />
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { ClipboardList, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Purchase } from '../types/business';
import { formatDateTimeID, formatIDR, toISODateLocal } from '../utils/formatters';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';

export const PurchasesPage: React.FC = () => {
  const { data, createPurchase, setActivePage } = useStore();
  const [search, setSearch] = useState('');
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [detailPurchase, setDetailPurchase] = useState<Purchase | null>(null);

  // Form pembelian baru
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Transfer Bank');
  const [purchaseDate, setPurchaseDate] = useState(() => toISODateLocal(new Date()));
  const [updateHargaModal, setUpdateHargaModal] = useState(true);
  const [catatan, setCatatan] = useState('');
  const [items, setItems] = useState<
    { productId: string; qty: number; hargaBeliSatuan: number }[]
  >([]);
  const [pickProductId, setPickProductId] = useState('');
  const [pickQty, setPickQty] = useState(10);
  const [pickCost, setPickCost] = useState(0);

  const handleSelectPickProduct = (productId: string) => {
    setPickProductId(productId);
    const prod = data.products.find((p) => p.id === productId);
    if (prod) setPickCost(prod.hargaModal);
  };

  const handleAddItem = () => {
    if (!pickProductId || pickQty <= 0) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === pickProductId);
      if (existing) {
        return prev.map((i) =>
          i.productId === pickProductId
            ? { ...i, qty: i.qty + pickQty, hargaBeliSatuan: pickCost }
            : i
        );
      }
      return [...prev, { productId: pickProductId, qty: pickQty, hargaBeliSatuan: pickCost }];
    });
    setPickProductId('');
    setPickQty(10);
    setPickCost(0);
  };

  const totalBiayaForm = useMemo(
    () => items.reduce((sum, i) => sum + i.qty * i.hargaBeliSatuan, 0),
    [items]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createPurchase({
      supplierId,
      metodePembayaran: paymentMethod,
      catatan,
      tanggal: `${purchaseDate}T${new Date().toTimeString().slice(0, 8)}`,
      updateHargaModal,
      items,
    });
    if (res.ok) {
      setIsNewOpen(false);
      setSupplierId('');
      setItems([]);
      setCatatan('');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.purchases;
    return data.purchases.filter(
      (p) =>
        p.nomorPO.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q) ||
        p.items.some((i) => i.productName.toLowerCase().includes(q))
    );
  }, [data.purchases, search]);

  const totalPengeluaranPembelian = useMemo(
    () => data.purchases.reduce((sum, p) => sum + p.totalBiaya, 0),
    [data.purchases]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Manajemen Pembelian Stok</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Catat kulakan barang dari pemasok. Stok produk bertambah dan pengeluaran keuangan tercatat otomatis.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsNewOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Pembelian</span>
        </button>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Order Pembelian</p>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {data.purchases.length} PO
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Biaya Pembelian Stok</p>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {formatIDR(totalPengeluaranPembelian)}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor PO, pemasok, atau nama barang..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Belum ada riwayat pembelian"
          description="Catat pembelian barang dari pemasok untuk menambah stok produk Anda secara otomatis."
          actionLabel="Catat Pembelian"
          onAction={() => setIsNewOpen(true)}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Nomor PO &amp; Tanggal</th>
                  <th className="py-3 px-4">Pemasok</th>
                  <th className="py-3 px-4">Barang Dibeli</th>
                  <th className="py-3 px-4">Pembayaran</th>
                  <th className="py-3 px-4 text-right">Total Biaya</th>
                  <th className="py-3 px-4 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="font-mono text-xs font-semibold text-slate-900">{po.nomorPO}</p>
                      <p className="text-xs text-slate-500">{formatDateTimeID(po.tanggal)}</p>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{po.supplierName}</td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-700">
                      {po.items.map((i) => `${i.qty}x ${i.productName}`).join(', ')}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {po.metodePembayaran}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {formatIDR(po.totalBiaya)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setDetailPurchase(po)}
                        aria-label={`Lihat detail ${po.nomorPO}`}
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Pembelian Baru */}
      <Modal
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        title="Catat Pembelian Barang"
        subtitle="Stok barang akan bertambah dan pengeluaran otomatis masuk ke buku kas."
        maxWidthClass="max-w-2xl"
      >
        {data.suppliers.length === 0 || data.products.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-slate-600">
              Pastikan minimal ada 1 data pemasok dan 1 produk di katalog sebelum mencatat pembelian stok.
            </p>
            <div className="flex justify-center gap-2">
              {data.suppliers.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsNewOpen(false);
                    setActivePage('pemasok');
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 rounded-lg"
                >
                  Tambah Pemasok
                </button>
              )}
              {data.products.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsNewOpen(false);
                    setActivePage('produk');
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 rounded-lg"
                >
                  Tambah Produk
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Pemasok *
                </label>
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="">-- Pilih pemasok --</option>
                  {data.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Pembelian
                </label>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Pilih Barang */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Tambah Barang yang Dibeli
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <select
                  value={pickProductId}
                  onChange={(e) => handleSelectPickProduct(e.target.value)}
                  className="sm:col-span-5 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">-- Pilih produk --</option>
                  {data.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} (Stok: {p.stok})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={pickQty}
                  onChange={(e) => setPickQty(Math.max(1, Number(e.target.value)))}
                  placeholder="Qty"
                  className="sm:col-span-2 px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
                <input
                  type="number"
                  min={0}
                  value={pickCost}
                  onChange={(e) => setPickCost(Math.max(0, Number(e.target.value)))}
                  placeholder="Harga Beli"
                  className="sm:col-span-3 px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!pickProductId}
                  className="sm:col-span-2 px-3 py-2 text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 rounded-lg"
                >
                  + Item
                </button>
              </div>
            </div>

            {/* Daftar Item Pembelian */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              {items.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-5">
                  Belum ada barang ditambahkan ke daftar pembelian.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const prod = data.products.find((p) => p.id === item.productId);
                    return (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between px-4 py-2.5 text-sm"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{prod?.nama}</p>
                          <p className="text-xs text-slate-500 font-mono">
                            {item.qty} {prod?.satuan} × {formatIDR(item.hargaBeliSatuan)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-semibold text-slate-900">
                            {formatIDR(item.qty * item.hargaBeliSatuan)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setItems((prev) =>
                                prev.filter((i) => i.productId !== item.productId)
                              )
                            }
                            className="p-1 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Transfer Bank">Transfer Bank</option>
                  <option value="Tunai">Tunai</option>
                  <option value="E-Wallet">E-Wallet</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan
                </label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Contoh: Restok akhir pekan"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={updateHargaModal}
                onChange={(e) => setUpdateHargaModal(e.target.checked)}
                className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
              />
              <span>Perbarui harga modal produk sesuai harga beli terbaru di atas</span>
            </label>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Biaya Pembelian</p>
                <p className="text-xl font-bold font-mono tabular-nums text-slate-900">
                  {formatIDR(totalBiayaForm)}
                </p>
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={items.length === 0 || !supplierId}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg"
                >
                  Simpan Pembelian
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Detail Pembelian */}
      <Modal
        isOpen={Boolean(detailPurchase)}
        onClose={() => setDetailPurchase(null)}
        title={`Detail Pembelian ${detailPurchase?.nomorPO || ''}`}
        subtitle={detailPurchase ? formatDateTimeID(detailPurchase.tanggal) : undefined}
      >
        {detailPurchase && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm pb-3 border-b border-slate-100">
              <div>
                <p className="text-xs text-slate-500">Pemasok</p>
                <p className="font-semibold text-slate-900">{detailPurchase.supplierName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Metode Pembayaran</p>
                <p className="font-semibold text-slate-900">{detailPurchase.metodePembayaran}</p>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-200">
                  <th className="py-2 text-left">Barang</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Harga Beli</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detailPurchase.items.map((i, idx) => (
                  <tr key={`${i.productId}_${idx}`}>
                    <td className="py-2 text-slate-900">{i.productName}</td>
                    <td className="py-2 text-right font-mono">
                      {i.qty} {i.satuan}
                    </td>
                    <td className="py-2 text-right font-mono">{formatIDR(i.hargaBeliSatuan)}</td>
                    <td className="py-2 text-right font-mono font-semibold">
                      {formatIDR(i.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pt-3 border-t border-slate-200 flex justify-between text-sm">
              <span className="text-slate-600">Total Biaya</span>
              <span className="font-mono font-bold text-slate-900">
                {formatIDR(detailPurchase.totalBiaya)}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

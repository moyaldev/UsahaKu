import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Edit2,
  History,
  Package,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types/business';
import { formatDateTimeID, formatIDR } from '../utils/formatters';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EmptyState } from '../components/ui/EmptyState';

export const ProductsPage: React.FC = () => {
  const { data, lowStockProducts, addProduct, updateProduct, deleteProduct, adjustStock } =
    useStore();

  const [activeTab, setActiveTab] = useState<'katalog' | 'riwayat'>('katalog');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Modal Tambah/Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [sku, setSku] = useState('');
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState('');
  const [hargaModal, setHargaModal] = useState('');
  const [hargaJual, setHargaJual] = useState('');
  const [stok, setStok] = useState('');
  const [stokMinimum, setStokMinimum] = useState(String(data.profile.batasStokMenipisDefault));
  const [satuan, setSatuan] = useState('pcs');

  // Modal Penyesuaian Stok
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustNewStock, setAdjustNewStock] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Modal Hapus
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>(['Semua']);
    data.products.forEach((p) => {
      if (p.kategori) set.add(p.kategori);
    });
    return Array.from(set);
  }, [data.products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.products.filter((p) => {
      if (onlyLowStock && p.stok > p.stokMinimum) return false;
      if (categoryFilter !== 'Semua' && p.kategori !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.nama.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.kategori.toLowerCase().includes(q)
      );
    });
  }, [categoryFilter, data.products, onlyLowStock, search]);

  const openAddModal = () => {
    setEditingProduct(null);
    setSku('');
    setNama('');
    setKategori('');
    setHargaModal('');
    setHargaJual('');
    setStok('0');
    setStokMinimum(String(data.profile.batasStokMenipisDefault));
    setSatuan('pcs');
    setIsFormOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setSku(prod.sku);
    setNama(prod.nama);
    setKategori(prod.kategori);
    setHargaModal(String(prod.hargaModal));
    setHargaJual(String(prod.hargaJual));
    setStok(String(prod.stok));
    setStokMinimum(String(prod.stokMinimum));
    setSatuan(prod.satuan);
    setIsFormOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      sku: sku.trim(),
      nama: nama.trim(),
      kategori: kategori.trim() || 'Umum',
      hargaModal: Math.max(0, Number(hargaModal) || 0),
      hargaJual: Math.max(0, Number(hargaJual) || 0),
      stok: Math.max(0, Math.floor(Number(stok) || 0)),
      stokMinimum: Math.max(0, Math.floor(Number(stokMinimum) || 0)),
      satuan: satuan.trim() || 'pcs',
    };

    const res = editingProduct
      ? updateProduct(editingProduct.id, payload)
      : addProduct(payload);

    if (res.ok) {
      setIsFormOpen(false);
    }
  };

  const openAdjustModal = (prod: Product) => {
    setAdjustTarget(prod);
    setAdjustNewStock(String(prod.stok));
    setAdjustNotes('');
  };

  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    const res = adjustStock(
      adjustTarget.id,
      Math.max(0, Math.floor(Number(adjustNewStock) || 0)),
      adjustNotes
    );
    if (res.ok) {
      setAdjustTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Manajemen Produk &amp; Stok</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Pantau harga modal, harga jual, batas stok minimum, dan riwayat keluar-masuk barang.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Produk</span>
        </button>
      </div>

      {/* Low Stock Alert Strip */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                Peringatan Stok Menipis ({lowStockProducts.length} produk)
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                {lowStockProducts
                  .slice(0, 3)
                  .map((p) => `${p.nama} (${p.stok} ${p.satuan})`)
                  .join(' · ')}
                {lowStockProducts.length > 3 ? ` · +${lowStockProducts.length - 3} lainnya` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('katalog');
              setOnlyLowStock((prev) => !prev);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-amber-900 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            {onlyLowStock ? 'Tampilkan Semua Produk' : 'Filter Stok Menipis'}
          </button>
        </div>
      )}

      {/* Tabs + Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setActiveTab('katalog')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'katalog'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Daftar Produk ({data.products.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('riwayat')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'riwayat'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat Perubahan Stok ({data.stockHistory.length})</span>
          </button>
        </div>

        {activeTab === 'katalog' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 lg:justify-end">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama produk atau SKU..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  Kategori: {cat}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'katalog' ? (
        filteredProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Belum ada produk"
            description={
              data.products.length === 0
                ? 'Tambahkan produk pertama Anda lengkap dengan harga modal, harga jual, dan jumlah stok.'
                : 'Tidak ada produk yang cocok dengan filter atau pencarian saat ini.'
            }
            actionLabel="Tambah Produk"
            onAction={openAddModal}
          />
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Produk &amp; SKU</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4 text-right">Harga Modal</th>
                    <th className="py-3 px-4 text-right">Harga Jual</th>
                    <th className="py-3 px-4 text-right">Untung / Unit</th>
                    <th className="py-3 px-4 text-right">Stok</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredProducts.map((prod) => {
                    const profitUnit = prod.hargaJual - prod.hargaModal;
                    const marginPct =
                      prod.hargaJual > 0 ? Math.round((profitUnit / prod.hargaJual) * 100) : 0;
                    const isOut = prod.stok <= 0;
                    const isLow = prod.stok > 0 && prod.stok <= prod.stokMinimum;

                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{prod.nama}</p>
                          <p className="text-xs text-slate-500 font-mono">
                            {prod.sku} · Satuan {prod.satuan}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {prod.kategori}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                          {formatIDR(prod.hargaModal)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                          {formatIDR(prod.hargaJual)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                          <span className={profitUnit >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                            {formatIDR(profitUnit)}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">({marginPct}%)</span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <p
                            className={`font-mono tabular-nums font-semibold ${
                              isOut
                                ? 'text-red-700'
                                : isLow
                                ? 'text-amber-700'
                                : 'text-slate-900'
                            }`}
                          >
                            {prod.stok} {prod.satuan}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {isOut
                              ? 'Stok habis'
                              : isLow
                              ? `Menipis (min ${prod.stokMinimum})`
                              : `Aman (min ${prod.stokMinimum})`}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openAdjustModal(prod)}
                              title="Sesuaikan stok manual"
                              aria-label={`Sesuaikan stok ${prod.nama}`}
                              className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <ArrowUpDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(prod)}
                              aria-label={`Edit ${prod.nama}`}
                              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(prod)}
                              aria-label={`Hapus ${prod.nama}`}
                              className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : data.stockHistory.length === 0 ? (
        <EmptyState
          icon={History}
          title="Belum ada riwayat pergerakan stok"
          description="Riwayat stok tercatat otomatis saat ada penjualan, pembelian, atau penyesuaian manual."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Produk</th>
                  <th className="py-3 px-4">Jenis</th>
                  <th className="py-3 px-4 text-right">Perubahan</th>
                  <th className="py-3 px-4 text-right">Stok Akhir</th>
                  <th className="py-3 px-4">Referensi &amp; Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.stockHistory.map((h) => {
                  const tipeLabel =
                    h.tipe === 'masuk'
                      ? 'Stok Masuk'
                      : h.tipe === 'keluar'
                      ? 'Penjualan'
                      : h.tipe === 'retur_batal'
                      ? 'Batal Jual'
                      : 'Penyesuaian';
                  const delta = h.stokSesudah - h.stokSebelum;
                  return (
                    <tr key={h.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap font-mono">
                        {formatDateTimeID(h.tanggal)}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{h.productName}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`text-xs font-semibold ${
                            delta >= 0 ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {tipeLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold whitespace-nowrap">
                        <span className={delta >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                          {delta >= 0 ? `+${delta}` : delta}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                        {h.stokSesudah}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        <span className="font-mono font-medium text-slate-800">{h.referensi}</span> ·{' '}
                        {h.catatan}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Produk */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Produk *
              </label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Kopi Susu Gula Aren 250ml"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori
              </label>
              <input
                type="text"
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                placeholder="Minuman / Camilan / Jasa"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode SKU (Opsional)
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Otomatis jika dikosongkan"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Harga Modal (IDR) *
              </label>
              <input
                type="number"
                min={0}
                required
                value={hargaModal}
                onChange={(e) => setHargaModal(e.target.value)}
                placeholder="10000"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Harga Jual (IDR) *
              </label>
              <input
                type="number"
                min={0}
                required
                value={hargaJual}
                onChange={(e) => setHargaJual(e.target.value)}
                placeholder="18000"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stok Saat Ini *
              </label>
              <input
                type="number"
                min={0}
                required
                value={stok}
                onChange={(e) => setStok(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batas Stok Menipis
              </label>
              <input
                type="number"
                min={0}
                value={stokMinimum}
                onChange={(e) => setStokMinimum(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Satuan Unit
              </label>
              <input
                type="text"
                value={satuan}
                onChange={(e) => setSatuan(e.target.value)}
                placeholder="pcs / botol / pouch / box / kg"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
            >
              {editingProduct ? 'Simpan Perubahan' : 'Simpan Produk'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Penyesuaian Stok */}
      <Modal
        isOpen={Boolean(adjustTarget)}
        onClose={() => setAdjustTarget(null)}
        title={`Sesuaikan Stok · ${adjustTarget?.nama || ''}`}
        maxWidthClass="max-w-md"
      >
        {adjustTarget && (
          <form onSubmit={handleConfirmAdjust} className="space-y-4">
            <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
              Stok tercatat saat ini:{' '}
              <span className="font-mono font-semibold text-slate-900">
                {adjustTarget.stok} {adjustTarget.satuan}
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stok Fisik Terbaru ({adjustTarget.satuan})
              </label>
              <input
                type="number"
                min={0}
                required
                value={adjustNewStock}
                onChange={(e) => setAdjustNewStock(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alasan Penyesuaian
              </label>
              <input
                type="text"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="Contoh: Stok opname / barang rusak / bonus produksi"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAdjustTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
              >
                Simpan Stok
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Konfirmasi Hapus Produk */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteProduct(deleteTarget.id);
        }}
        title="Hapus Produk?"
        description={`Produk "${deleteTarget?.nama || ''}" akan dihapus dari katalog aktif. Riwayat transaksi penjualan lama tetap tersimpan.`}
        confirmLabel="Hapus Produk"
      />
    </div>
  );
};

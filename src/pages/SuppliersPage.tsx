import React, { useMemo, useState } from 'react';
import { Edit2, Eye, Plus, Search, Trash2, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Supplier } from '../types/business';
import { formatDateTimeID, formatIDR } from '../utils/formatters';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EmptyState } from '../components/ui/EmptyState';

export const SuppliersPage: React.FC = () => {
  const { data, addSupplier, updateSupplier, deleteSupplier } = useStore();
  const [search, setSearch] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [nama, setNama] = useState('');
  const [kontak, setKontak] = useState('');
  const [alamat, setAlamat] = useState('');
  const [produkText, setProdukText] = useState('');
  const [catatan, setCatatan] = useState('');

  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.suppliers;
    return data.suppliers.filter(
      (s) =>
        s.nama.toLowerCase().includes(q) ||
        s.kontak.toLowerCase().includes(q) ||
        s.produkDisediakan.some((p) => p.toLowerCase().includes(q))
    );
  }, [data.suppliers, search]);

  const openAdd = () => {
    setEditing(null);
    setNama('');
    setKontak('');
    setAlamat('');
    setProdukText('');
    setCatatan('');
    setIsFormOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setNama(s.nama);
    setKontak(s.kontak);
    setAlamat(s.alamat);
    setProdukText(s.produkDisediakan.join(', '));
    setCatatan(s.catatan);
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const produkDisediakan = produkText
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

    const payload = {
      nama: nama.trim(),
      kontak: kontak.trim(),
      alamat: alamat.trim(),
      produkDisediakan,
      catatan: catatan.trim(),
    };

    const res = editing ? updateSupplier(editing.id, payload) : addSupplier(payload);
    if (res.ok) setIsFormOpen(false);
  };

  const getPurchaseStats = (supplierId: string) => {
    const list = data.purchases.filter((p) => p.supplierId === supplierId);
    return {
      count: list.length,
      total: list.reduce((sum, p) => sum + p.totalBiaya, 0),
      list,
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Manajemen Pemasok</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Simpan kontak supplier, daftar barang pasokan, dan riwayat pembelian barang.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pemasok</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama pemasok, kontak, atau produk pasokan..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Belum ada data pemasok"
          description="Catat daftar pemasok atau distributor barang Anda agar proses restok lebih teratur."
          actionLabel="Tambah Pemasok"
          onAction={openAdd}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Nama Pemasok</th>
                  <th className="py-3 px-4">Kontak</th>
                  <th className="py-3 px-4">Produk yang Disediakan</th>
                  <th className="py-3 px-4 text-right">Pembelian</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((sup) => {
                  const stats = getPurchaseStats(sup.id);
                  return (
                    <tr key={sup.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{sup.nama}</p>
                        {sup.catatan && (
                          <p className="text-xs text-slate-500 truncate max-w-xs">{sup.catatan}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {sup.kontak || '-'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 max-w-xs">
                        {sup.produkDisediakan.length > 0
                          ? sup.produkDisediakan.join(' · ')
                          : 'Belum dicatat'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <p className="font-mono tabular-nums font-semibold text-slate-900">
                          {formatIDR(stats.total)}
                        </p>
                        <p className="text-xs text-slate-500">{stats.count} kali order</p>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailSupplier(sup)}
                            aria-label={`Detail ${sup.nama}`}
                            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(sup)}
                            aria-label={`Edit ${sup.nama}`}
                            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(sup)}
                            aria-label={`Hapus ${sup.nama}`}
                            className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
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
      )}

      {/* Modal Form Pemasok */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? 'Edit Pemasok' : 'Tambah Pemasok Baru'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Pemasok *
            </label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: UD Sumber Kopi Nusantara"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nomor Kontak / WhatsApp
            </label>
            <input
              type="text"
              value={kontak}
              onChange={(e) => setKontak(e.target.value)}
              placeholder="0811-xxxx-xxxx"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat</label>
            <input
              type="text"
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder="Alamat gudang atau toko pemasok"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Produk yang Disediakan (pisahkan dengan koma)
            </label>
            <input
              type="text"
              value={produkText}
              onChange={(e) => setProdukText(e.target.value)}
              placeholder="Biji Kopi Robusta, Gula Aren Cair, Kemasan Botol"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Pemasok
            </label>
            <textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Jadwal kirim, minimal order, atau syarat diskon"
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
              Simpan Pemasok
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Detail Pemasok */}
      <Modal
        isOpen={Boolean(detailSupplier)}
        onClose={() => setDetailSupplier(null)}
        title={detailSupplier?.nama || ''}
        subtitle={`${detailSupplier?.kontak || '-'} · ${detailSupplier?.alamat || '-'}`}
        maxWidthClass="max-w-xl"
      >
        {detailSupplier && (
          <div className="space-y-4">
            <div className="text-sm">
              <p className="text-xs font-semibold text-slate-500">Produk yang Disediakan</p>
              <p className="text-slate-900 mt-1">
                {detailSupplier.produkDisediakan.length > 0
                  ? detailSupplier.produkDisediakan.join(' · ')
                  : '-'}
              </p>
            </div>
            {detailSupplier.catatan && (
              <div className="text-sm">
                <p className="text-xs font-semibold text-slate-500">Catatan</p>
                <p className="text-slate-700 mt-1">{detailSupplier.catatan}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">
                Riwayat Pembelian dari Pemasok Ini
              </p>
              {getPurchaseStats(detailSupplier.id).list.length === 0 ? (
                <p className="text-xs text-slate-500">Belum ada riwayat pembelian tercatat.</p>
              ) : (
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {getPurchaseStats(detailSupplier.id).list.map((po) => (
                    <li key={po.id} className="px-3.5 py-2.5 flex justify-between text-xs">
                      <div>
                        <span className="font-mono font-semibold text-slate-900">
                          {po.nomorPO}
                        </span>{' '}
                        · <span className="text-slate-500">{formatDateTimeID(po.tanggal)}</span>
                        <p className="text-slate-600 mt-0.5">
                          {po.items.map((i) => `${i.qty}x ${i.productName}`).join(', ')}
                        </p>
                      </div>
                      <span className="font-mono font-semibold text-slate-900 shrink-0">
                        {formatIDR(po.totalBiaya)}
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
          if (deleteTarget) deleteSupplier(deleteTarget.id);
        }}
        title="Hapus Data Pemasok?"
        description={`Pemasok "${deleteTarget?.nama || ''}" akan dihapus dari daftar pemasok aktif.`}
        confirmLabel="Hapus Pemasok"
      />
    </div>
  );
};

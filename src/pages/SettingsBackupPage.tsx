import React, { useEffect, useRef, useState } from 'react';
import { Cloud, Database, Download, LogOut, Save, Trash2, Upload } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { exportToJSON, formatDateTimeID, toISODateLocal } from '../utils/formatters';
import { ConfirmModal } from '../components/ui/ConfirmModal';

export const SettingsBackupPage: React.FC = () => {
  const { data, user, logout, updateProfile, importBackupData, clearAllData, notify } =
    useStore();

  const [namaUsaha, setNamaUsaha] = useState(data.profile.namaUsaha);
  const [taglineUsaha, setTaglineUsaha] = useState(data.profile.taglineUsaha);
  const [kategoriUsaha, setKategoriUsaha] = useState(data.profile.kategoriUsaha);
  const [alamat, setAlamat] = useState(data.profile.alamat);
  const [telepon, setTelepon] = useState(data.profile.telepon);
  const [namaPemilik, setNamaPemilik] = useState(data.profile.namaPemilik);
  const [emailPemilik, setEmailPemilik] = useState(data.profile.emailPemilik);
  const [batasStok, setBatasStok] = useState(String(data.profile.batasStokMenipisDefault));

  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setNamaUsaha(data.profile.namaUsaha);
    setTaglineUsaha(data.profile.taglineUsaha);
    setKategoriUsaha(data.profile.kategoriUsaha);
    setAlamat(data.profile.alamat);
    setTelepon(data.profile.telepon);
    setNamaPemilik(data.profile.namaPemilik);
    setEmailPemilik(data.profile.emailPemilik);
    setBatasStok(String(data.profile.batasStokMenipisDefault));
  }, [data.profile]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      ...data.profile,
      namaUsaha: namaUsaha.trim(),
      taglineUsaha: taglineUsaha.trim(),
      kategoriUsaha: kategoriUsaha.trim(),
      alamat: alamat.trim(),
      telepon: telepon.trim(),
      namaPemilik: namaPemilik.trim(),
      emailPemilik: emailPemilik.trim(),
      mataUang: 'IDR',
      batasStokMenipisDefault: Math.max(1, Math.floor(Number(batasStok) || 5)),
    });
  };

  const handleExportJSON = () => {
    exportToJSON(`backup-usahaku-${toISODateLocal(new Date())}`, data);
    notify('success', 'File backup JSON berhasil diunduh');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const res = importBackupData(content);
      if (res.ok) {
        // Sinkronkan field form jika import berhasil
        const loaded = JSON.parse(content);
        if (loaded?.profile) {
          setNamaUsaha(loaded.profile.namaUsaha || '');
          setTaglineUsaha(loaded.profile.taglineUsaha || '');
          setKategoriUsaha(loaded.profile.kategoriUsaha || '');
          setAlamat(loaded.profile.alamat || '');
          setTelepon(loaded.profile.telepon || '');
          setNamaPemilik(loaded.profile.namaPemilik || '');
          setEmailPemilik(loaded.profile.emailPemilik || '');
          setBatasStok(String(loaded.profile.batasStokMenipisDefault || 5));
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Backup Data &amp; Pengaturan Usaha</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Atur identitas usaha, profil pemilik, preferensi mata uang Rupiah (IDR), serta cadangkan data ke file JSON.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Profil Usaha & Pemilik */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">Profil Usaha &amp; Pemilik</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Informasi ini ditampilkan pada header aplikasi dan ringkasan usaha Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Usaha *
              </label>
              <input
                type="text"
                required
                value={namaUsaha}
                onChange={(e) => setNamaUsaha(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tagline / Deskripsi Singkat Usaha
              </label>
              <input
                type="text"
                value={taglineUsaha}
                onChange={(e) => setTaglineUsaha(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bidang / Kategori Usaha
              </label>
              <input
                type="text"
                value={kategoriUsaha}
                onChange={(e) => setKategoriUsaha(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Telepon Usaha
              </label>
              <input
                type="text"
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Usaha
              </label>
              <input
                type="text"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Pemilik / Pengguna *
              </label>
              <input
                type="text"
                required
                value={namaPemilik}
                onChange={(e) => setNamaPemilik(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Pemilik
              </label>
              <input
                type="email"
                value={emailPemilik}
                onChange={(e) => setEmailPemilik(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mata Uang Utama
              </label>
              <input
                type="text"
                readOnly
                value="Rupiah Indonesia (IDR)"
                className="w-full px-3 py-2 text-sm bg-slate-50 text-slate-600 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batas Default Stok Menipis
              </label>
              <input
                type="number"
                min={1}
                value={batasStok}
                onChange={(e) => setBatasStok(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </form>

        {/* Backup & Penyimpanan Cloud */}
        <div className="lg:col-span-5 space-y-6">
          {/* Akun Google & Sinkronisasi Cloud */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Cloud className="w-4 h-4 text-emerald-700" />
              <h3 className="text-base font-semibold text-slate-900">Akun &amp; Sinkronisasi Cloud</h3>
            </div>

            <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {user?.displayName || data.profile.namaPemilik}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {user?.email || data.profile.emailPemilik}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Seluruh pencatatan produk, penjualan, pelanggan, dan keuangan tersimpan otomatis di database cloud yang terhubung ke akun Google ini sehingga bisa diakses dari perangkat mana saja.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Database className="w-4 h-4 text-emerald-700" />
              <h3 className="text-base font-semibold text-slate-900">Backup &amp; Restore JSON</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Selain tersimpan di cloud, Anda juga dapat mengunduh salinan cadangan (backup) berformat JSON secara berkala atau memulihkannya kapan saja.
            </p>

            <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
              <p>
                Terakhir diperbarui:{' '}
                <span className="font-mono text-slate-800">
                  {formatDateTimeID(data.lastUpdated)}
                </span>
              </p>
              <p>
                Ringkasan data:{' '}
                <span className="font-mono text-slate-800">
                  {data.products.length} produk · {data.sales.length} penjualan ·{' '}
                  {data.customers.length} pelanggan
                </span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor JSON</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Impor Backup</span>
              </button>
            </div>
          </div>

          {/* Manajemen Data */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 pb-3 border-b border-slate-100">
              Pengaturan Data
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Gunakan opsi di bawah ini jika Anda ingin memulai ulang pencatatan usaha dari awal.
            </p>
            <div>
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Kosongkan Semua Data Transaksi</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearAllData}
        title="Kosongkan Seluruh Data Usaha?"
        description="Semua produk, transaksi penjualan, pelanggan, pemasok, keuangan, dan pesanan akan dihapus permanen dari penyimpanan cloud akun Anda."
        confirmLabel="Ya, Kosongkan Semua Data"
        tone="danger"
      />
    </div>
  );
};

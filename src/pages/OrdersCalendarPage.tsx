import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Plus,
  Trash2,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { OrderAgenda, OrderStatus } from '../types/business';
import { formatDateID, formatIDR, toISODateLocal } from '../utils/formatters';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EmptyState } from '../components/ui/EmptyState';

const STATUS_OPTIONS: { value: OrderStatus; label: string; colorClass: string }[] = [
  { value: 'menunggu', label: 'Menunggu', colorClass: 'text-amber-700' },
  { value: 'diproses', label: 'Diproses', colorClass: 'text-sky-700' },
  { value: 'selesai', label: 'Selesai', colorClass: 'text-emerald-700' },
  { value: 'dibatalkan', label: 'Dibatalkan', colorClass: 'text-red-600' },
];

const WEEKDAYS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export const OrdersCalendarPage: React.FC = () => {
  const { data, addOrder, updateOrder, updateOrderStatus, deleteOrder } = useStore();

  const [viewMode, setViewMode] = useState<'daftar' | 'kalender'>('kalender');
  const [statusFilter, setStatusFilter] = useState<'semua' | OrderStatus>('semua');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // State bulan kalender
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Modal Tambah/Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<OrderAgenda | null>(null);
  const [judul, setJudul] = useState('');
  const [tipe, setTipe] = useState<'pesanan' | 'pengingat'>('pesanan');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [kontak, setKontak] = useState('');
  const [produkRingkasan, setProdukRingkasan] = useState('');
  const [estimasiNilai, setEstimasiNilai] = useState('');
  const [status, setStatus] = useState<OrderStatus>('menunggu');
  const [tanggalPesan, setTanggalPesan] = useState(() => toISODateLocal(new Date()));
  const [tenggatWaktu, setTenggatWaktu] = useState(() => toISODateLocal(new Date()));
  const [catatan, setCatatan] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<OrderAgenda | null>(null);

  const todayStr = toISODateLocal(new Date());

  const openAdd = (defaultDate?: string) => {
    setEditing(null);
    setJudul('');
    setTipe('pesanan');
    setCustomerId('');
    setCustomerName('');
    setKontak('');
    setProdukRingkasan('');
    setEstimasiNilai('');
    setStatus('menunggu');
    setTanggalPesan(todayStr);
    setTenggatWaktu(defaultDate || todayStr);
    setCatatan('');
    setIsFormOpen(true);
  };

  const openEdit = (ord: OrderAgenda) => {
    setEditing(ord);
    setJudul(ord.judul);
    setTipe(ord.tipe);
    setCustomerId(ord.customerId || '');
    setCustomerName(ord.customerName);
    setKontak(ord.kontak);
    setProdukRingkasan(ord.produkRingkasan);
    setEstimasiNilai(String(ord.estimasiNilai || ''));
    setStatus(ord.status);
    setTanggalPesan(ord.tanggalPesan);
    setTenggatWaktu(ord.tenggatWaktu);
    setCatatan(ord.catatan);
    setIsFormOpen(true);
  };

  const handleSelectCustomer = (id: string) => {
    setCustomerId(id);
    const cust = data.customers.find((c) => c.id === id);
    if (cust) {
      setCustomerName(cust.nama);
      setKontak(cust.kontak);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      judul: judul.trim(),
      tipe,
      customerId: customerId || undefined,
      customerName: customerName.trim() || 'Internal / Umum',
      kontak: kontak.trim(),
      produkRingkasan: produkRingkasan.trim(),
      estimasiNilai: Math.max(0, Number(estimasiNilai) || 0),
      status,
      tanggalPesan,
      tenggatWaktu,
      catatan: catatan.trim(),
    };

    const res = editing ? updateOrder(editing.id, payload) : addOrder(payload);
    if (res.ok) setIsFormOpen(false);
  };

  const filteredOrders = useMemo(() => {
    return data.orders
      .filter((o) => {
        if (statusFilter !== 'semua' && o.status !== statusFilter) return false;
        if (selectedDate && o.tenggatWaktu !== selectedDate) return false;
        return true;
      })
      .sort((a, b) => a.tenggatWaktu.localeCompare(b.tenggatWaktu));
  }, [data.orders, selectedDate, statusFilter]);

  const calendarDays = useMemo(() => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Senin = 0, Minggu = 6
    const startOffset = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();

    const cells: { dateStr: string | null; dayNum: number | null }[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ dateStr: null, dayNum: null });
    }
    for (let d = 1; d <= totalDays; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr: iso, dayNum: d });
    }
    return cells;
  }, [calendarCursor]);

  const monthLabel = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(calendarCursor);

  const urgentReminders = useMemo(
    () =>
      data.orders.filter(
        (o) => (o.status === 'menunggu' || o.status === 'diproses') && o.tenggatWaktu <= todayStr
      ),
    [data.orders, todayStr]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pesanan &amp; Kalender Agenda Usaha</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola pre-order pelanggan, tenggat waktu pengiriman, dan pengingat aktivitas usaha.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAdd(selectedDate || todayStr)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pesanan / Agenda</span>
        </button>
      </div>

      {/* Pengingat Aktif Hari Ini */}
      {urgentReminders.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-950">
              {urgentReminders.length} Pesanan/Agenda Memerlukan Perhatian Hari Ini
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              {urgentReminders
                .slice(0, 3)
                .map((u) => `${u.judul} (tenggat ${formatDateID(u.tenggatWaktu)})`)
                .join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Mode & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setViewMode('kalender')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'kalender'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kalender &amp; Daftar
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('daftar');
              setSelectedDate('');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'daftar'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tabel Lengkap ({data.orders.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate('')}
              className="px-2.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg"
            >
              Tanggal: {formatDateID(selectedDate)} ×
            </button>
          )}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'semua' | OrderStatus)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white"
          >
            <option value="semua">Semua Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                Status: {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kalender & Daftar */}
      {viewMode === 'kalender' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Kalender Bulanan */}
          <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900 capitalize">{monthLabel}</h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setCalendarCursor(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                    )
                  }
                  aria-label="Bulan sebelumnya"
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setCalendarCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                    setSelectedDate(todayStr);
                  }}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCalendarCursor(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                    )
                  }
                  aria-label="Bulan berikutnya"
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mt-4 text-center text-xs font-semibold text-slate-500">
              {WEEKDAYS_ID.map((w) => (
                <div key={w} className="py-1.5">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 mt-1">
              {calendarDays.map((cell, idx) => {
                if (!cell.dateStr || !cell.dayNum) {
                  return <div key={`empty_${idx}`} className="h-16 sm:h-20" />;
                }
                const dayOrders = data.orders.filter((o) => o.tenggatWaktu === cell.dateStr);
                const isToday = cell.dateStr === todayStr;
                const isSelected = cell.dateStr === selectedDate;
                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() =>
                      setSelectedDate((prev) => (prev === cell.dateStr ? '' : cell.dateStr!))
                    }
                    className={`h-16 sm:h-20 p-1.5 rounded-lg border text-left flex flex-col justify-between transition-colors ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/70'
                        : isToday
                        ? 'border-slate-400 bg-slate-50'
                        : 'border-slate-100 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        isToday ? 'font-bold text-emerald-700' : 'text-slate-700'
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    {dayOrders.length > 0 && (
                      <div className="space-y-0.5 overflow-hidden">
                        <p className="text-[10px] font-semibold text-emerald-800 truncate">
                          {dayOrders.length} agenda
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Daftar Agenda Terpilih */}
          <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {selectedDate ? `Agenda ${formatDateID(selectedDate)}` : 'Semua Agenda & Pesanan'}
                </h3>
                <p className="text-xs text-slate-500">
                  {filteredOrders.length} item ditampilkan
                </p>
              </div>
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => openAdd(selectedDate)}
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  + Tambah di Tanggal Ini
                </button>
              )}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-slate-600">Tidak ada agenda atau pesanan di filter ini.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 mt-1 flex-1 overflow-y-auto max-h-[460px]">
                {filteredOrders.map((ord) => (
                  <li key={ord.id} className="py-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">
                          {ord.tipe === 'pengingat' ? 'Pengingat Usaha' : 'Pesanan Pelanggan'} ·
                          Tenggat <span className="font-mono">{formatDateID(ord.tenggatWaktu)}</span>
                        </p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{ord.judul}</p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {ord.customerName}
                          {ord.produkRingkasan ? ` · ${ord.produkRingkasan}` : ''}
                        </p>
                      </div>
                      {ord.estimasiNilai > 0 && (
                        <span className="text-xs font-mono font-semibold text-slate-900 shrink-0">
                          {formatIDR(ord.estimasiNilai)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <select
                        value={ord.status}
                        onChange={(e) =>
                          updateOrderStatus(ord.id, e.target.value as OrderStatus)
                        }
                        className="px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-md bg-white"
                      >
                        {STATUS_OPTIONS.map((st) => (
                          <option key={st.value} value={st.value}>
                            {st.label}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(ord)}
                          aria-label={`Edit ${ord.judul}`}
                          className="p-1.5 text-slate-400 hover:text-slate-900 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(ord)}
                          aria-label={`Hapus ${ord.judul}`}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={CalendarIcon}
          title="Belum ada pesanan atau agenda"
          description="Catat pesanan pre-order pelanggan atau pengingat jadwal restok agar tidak ada yang terlewat."
          actionLabel="Tambah Pesanan / Agenda"
          onAction={() => openAdd(todayStr)}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Agenda / Pesanan</th>
                  <th className="py-3 px-4">Pelanggan</th>
                  <th className="py-3 px-4">Tgl Pesan</th>
                  <th className="py-3 px-4">Tenggat</th>
                  <th className="py-3 px-4 text-right">Estimasi Nilai</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{ord.judul}</p>
                      <p className="text-xs text-slate-500">{ord.produkRingkasan || ord.catatan}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{ord.customerName}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {formatDateID(ord.tanggalPesan)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-800 whitespace-nowrap">
                      {formatDateID(ord.tenggatWaktu)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {ord.estimasiNilai > 0 ? formatIDR(ord.estimasiNilai) : '-'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <select
                        value={ord.status}
                        onChange={(e) =>
                          updateOrderStatus(ord.id, e.target.value as OrderStatus)
                        }
                        className="px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-md bg-white"
                      >
                        {STATUS_OPTIONS.map((st) => (
                          <option key={st.value} value={st.value}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(ord)}
                          aria-label={`Edit ${ord.judul}`}
                          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(ord)}
                          aria-label={`Hapus ${ord.judul}`}
                          className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
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

      {/* Modal Tambah/Edit Pesanan */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? 'Edit Pesanan / Agenda' : 'Tambah Pesanan atau Agenda'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setTipe('pesanan')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md ${
                tipe === 'pesanan' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Pesanan Pelanggan
            </button>
            <button
              type="button"
              onClick={() => setTipe('pengingat')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md ${
                tipe === 'pengingat' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Pengingat Aktivitas Usaha
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Judul Pesanan / Agenda *
            </label>
            <input
              type="text"
              required
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Pre-Order 10 Box Brownies atau Restok Kemasan"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pelanggan Terdaftar (Opsional)
              </label>
              <select
                value={customerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="">-- Input manual --</option>
                {data.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Kontak / Pihak Terkait
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nama pemesan atau pemasok"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ringkasan Produk / Item
              </label>
              <input
                type="text"
                value={produkRingkasan}
                onChange={(e) => setProdukRingkasan(e.target.value)}
                placeholder="Contoh: 10x Brownies Almond"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estimasi Nilai (IDR)
              </label>
              <input
                type="number"
                min={0}
                value={estimasiNilai}
                onChange={(e) => setEstimasiNilai(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Pesan
              </label>
              <input
                type="date"
                value={tanggalPesan}
                onChange={(e) => setTanggalPesan(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tenggat Waktu *
              </label>
              <input
                type="date"
                required
                value={tenggatWaktu}
                onChange={(e) => setTenggatWaktu(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan</label>
            <textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Detail pengiriman, jam ambil, atau instruksi khusus"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
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
              Simpan
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteOrder(deleteTarget.id);
        }}
        title="Hapus Pesanan / Agenda?"
        description={`"${deleteTarget?.judul || ''}" akan dihapus dari kalender dan daftar agenda usaha.`}
        confirmLabel="Hapus"
      />
    </div>
  );
};

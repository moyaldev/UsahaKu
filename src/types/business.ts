export type PageKey =
  | 'dashboard'
  | 'penjualan'
  | 'produk'
  | 'kalkulator'
  | 'pelanggan'
  | 'pemasok'
  | 'pembelian'
  | 'keuangan'
  | 'pesanan'
  | 'laporan'
  | 'pengaturan';

export type PaymentMethod =
  | 'Tunai'
  | 'QRIS'
  | 'Transfer Bank'
  | 'E-Wallet'
  | 'Utang / Kasbon';

export type SaleStatus = 'selesai' | 'dibatalkan';

export type OrderStatus = 'menunggu' | 'diproses' | 'selesai' | 'dibatalkan';

export type StockMovementType = 'masuk' | 'keluar' | 'penyesuaian' | 'retur_batal';

export type FinanceType = 'pemasukan' | 'pengeluaran';

export interface BusinessProfile {
  namaUsaha: string;
  taglineUsaha: string;
  kategoriUsaha: string;
  alamat: string;
  telepon: string;
  namaPemilik: string;
  emailPemilik: string;
  avatarUrl: string;
  mataUang: 'IDR';
  batasStokMenipisDefault: number;
}

export interface Product {
  id: string;
  sku: string;
  nama: string;
  kategori: string;
  hargaModal: number;
  hargaJual: number;
  stok: number;
  stokMinimum: number;
  satuan: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockHistory {
  id: string;
  productId: string;
  productName: string;
  tipe: StockMovementType;
  jumlah: number;
  stokSebelum: number;
  stokSesudah: number;
  referensi: string;
  catatan: string;
  tanggal: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  satuan: string;
  qty: number;
  hargaJual: number;
  hargaModal: number;
  subtotal: number;
  profit: number;
}

export interface Sale {
  id: string;
  nomorInvoice: string;
  tanggal: string;
  customerId?: string;
  customerName: string;
  items: SaleItem[];
  totalHarga: number;
  totalModal: number;
  totalKeuntungan: number;
  metodePembayaran: PaymentMethod;
  status: SaleStatus;
  catatan: string;
}

export interface Customer {
  id: string;
  nama: string;
  kontak: string;
  alamat: string;
  catatan: string;
  totalPembelian: number;
  jumlahTransaksi: number;
  totalUtang: number;
  createdAt: string;
}

export interface DebtRecord {
  id: string;
  customerId: string;
  customerName: string;
  tipe: 'tambah_utang' | 'bayar_utang';
  jumlah: number;
  metode: string;
  catatan: string;
  tanggal: string;
  saleId?: string;
}

export interface Supplier {
  id: string;
  nama: string;
  kontak: string;
  alamat: string;
  produkDisediakan: string[];
  catatan: string;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  satuan: string;
  qty: number;
  hargaBeliSatuan: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  nomorPO: string;
  tanggal: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalBiaya: number;
  metodePembayaran: string;
  catatan: string;
}

export interface FinanceEntry {
  id: string;
  tanggal: string;
  tipe: FinanceType;
  kategori: string;
  deskripsi: string;
  jumlah: number;
  metode: string;
  referensiId?: string;
}

export interface OrderAgenda {
  id: string;
  judul: string;
  customerId?: string;
  customerName: string;
  kontak: string;
  produkRingkasan: string;
  estimasiNilai: number;
  status: OrderStatus;
  tanggalPesan: string;
  tenggatWaktu: string;
  catatan: string;
  tipe: 'pesanan' | 'pengingat';
}

export interface UsahaKuData {
  version: string;
  lastUpdated: string;
  profile: BusinessProfile;
  products: Product[];
  stockHistory: StockHistory[];
  sales: Sale[];
  customers: Customer[];
  debtRecords: DebtRecord[];
  suppliers: Supplier[];
  purchases: Purchase[];
  finance: FinanceEntry[];
  orders: OrderAgenda[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
}

export interface BusinessInsight {
  id: string;
  prioritas: 'tinggi' | 'sedang' | 'info';
  kategori: 'Stok' | 'Margin' | 'Penjualan' | 'Piutang' | 'Agenda';
  judul: string;
  ringkasan: string;
  rekomendasi: string;
  targetPage: PageKey;
  actionLabel: string;
}

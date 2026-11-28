import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
  DocumentReference,
  FieldValue,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { createEmptyData, DEFAULT_AVATAR_URL, STORAGE_KEY } from '../services/storageAdapter';
import {
  BusinessInsight,
  BusinessProfile,
  Customer,
  DebtRecord,
  FinanceEntry,
  OrderAgenda,
  OrderStatus,
  PageKey,
  PaymentMethod,
  Product,
  Purchase,
  PurchaseItem,
  Sale,
  SaleItem,
  StockHistory,
  Supplier,
  ToastMessage,
  UsahaKuData,
} from '../types/business';
import { generateDocNumber, generateId, toISODateLocal } from '../utils/formatters';
import { generateBusinessInsights } from '../utils/insights';

interface ActionResult {
  ok: boolean;
  message?: string;
}

interface CreateSaleInput {
  customerId?: string;
  customerName?: string;
  metodePembayaran: PaymentMethod;
  catatan: string;
  tanggal?: string;
  items: { productId: string; qty: number }[];
}

interface CreatePurchaseInput {
  supplierId: string;
  metodePembayaran: string;
  catatan: string;
  tanggal?: string;
  updateHargaModal: boolean;
  items: { productId: string; qty: number; hargaBeliSatuan: number }[];
}

interface StoreContextValue {
  user: User | null;
  authLoading: boolean;
  authSubmitting: boolean;
  authError: string | null;
  syncLoading: boolean;
  isSyncingWrite: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;

  data: UsahaKuData;
  activePage: PageKey;
  setActivePage: (page: PageKey) => void;
  insights: BusinessInsight[];
  lowStockProducts: Product[];
  toasts: ToastMessage[];
  notify: (type: ToastMessage['type'], title: string, description?: string) => void;
  dismissToast: (id: string) => void;

  // Produk & Stok
  addProduct: (input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => ActionResult;
  updateProduct: (id: string, input: Partial<Omit<Product, 'id' | 'createdAt'>>) => ActionResult;
  deleteProduct: (id: string) => ActionResult;
  adjustStock: (productId: string, newStock: number, catatan: string) => ActionResult;

  // Penjualan
  createSale: (input: CreateSaleInput) => ActionResult;
  cancelSale: (saleId: string) => ActionResult;

  // Pelanggan & Utang
  addCustomer: (input: Omit<Customer, 'id' | 'totalPembelian' | 'jumlahTransaksi' | 'totalUtang' | 'createdAt'>) => ActionResult;
  updateCustomer: (id: string, input: Partial<Omit<Customer, 'id' | 'createdAt'>>) => ActionResult;
  deleteCustomer: (id: string) => ActionResult;
  recordDebtTransaction: (
    customerId: string,
    tipe: 'tambah_utang' | 'bayar_utang',
    jumlah: number,
    metode: string,
    catatan: string
  ) => ActionResult;

  // Pemasok
  addSupplier: (input: Omit<Supplier, 'id' | 'createdAt'>) => ActionResult;
  updateSupplier: (id: string, input: Partial<Omit<Supplier, 'id' | 'createdAt'>>) => ActionResult;
  deleteSupplier: (id: string) => ActionResult;

  // Pembelian
  createPurchase: (input: CreatePurchaseInput) => ActionResult;

  // Keuangan
  addFinanceEntry: (input: Omit<FinanceEntry, 'id'>) => ActionResult;
  deleteFinanceEntry: (id: string) => ActionResult;

  // Pesanan & Agenda
  addOrder: (input: Omit<OrderAgenda, 'id'>) => ActionResult;
  updateOrder: (id: string, input: Partial<Omit<OrderAgenda, 'id'>>) => ActionResult;
  updateOrderStatus: (id: string, status: OrderStatus) => ActionResult;
  deleteOrder: (id: string) => ActionResult;

  // Pengaturan & Backup
  updateProfile: (profile: BusinessProfile) => ActionResult;
  importBackupData: (rawJson: string) => ActionResult;
  clearAllData: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const ALLOWED_PAYMENT_METHODS: PaymentMethod[] = [
  'Tunai',
  'QRIS',
  'Transfer Bank',
  'E-Wallet',
  'Utang / Kasbon',
];

const ALLOWED_ORDER_STATUSES: OrderStatus[] = ['menunggu', 'diproses', 'selesai', 'dibatalkan'];

function clip(val: unknown, maxLen: number, fallback = ''): string {
  const s = typeof val === 'string' ? val.trim() : String(val ?? '').trim();
  if (!s) return fallback.slice(0, maxLen);
  return s.slice(0, maxLen);
}

function nonNeg(val: unknown, fallback = 0): number {
  const n = Number(val);
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
}

function posNum(val: unknown, fallback = 1): number {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function sanitizeDocId(raw: unknown, prefix: string): string {
  const str = typeof raw === 'string' ? raw.trim() : '';
  const cleaned = str.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
  if (cleaned.length >= 1 && /^[a-zA-Z0-9_-]+$/.test(cleaned)) {
    return cleaned;
  }
  return generateId(prefix);
}

function tsToIso(val: unknown, fallback?: string): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string' && val.trim()) {
    return val;
  }
  return fallback || new Date().toISOString();
}

function sanitizeAvatarUrl(url: unknown): string {
  const str = typeof url === 'string' ? url.trim() : '';
  if (!str || str.length > 500) {
    return DEFAULT_AVATAR_URL;
  }
  return str;
}

function buildProfileDoc(
  uid: string,
  p: Partial<BusinessProfile>,
  userFallback?: User | null
) {
  const googleName = userFallback?.displayName?.trim() || 'Pemilik Usaha';
  const googleEmail = userFallback?.email?.trim() || '';
  const googleAvatar = userFallback?.photoURL?.trim() || '';

  return {
    ownerId: uid,
    namaUsaha: clip(p.namaUsaha, 120, 'Usaha Saya'),
    taglineUsaha: clip(p.taglineUsaha, 200, 'Kelola Usaha Lebih Mudah, Kembangkan Lebih Cepat.'),
    kategoriUsaha: clip(p.kategoriUsaha, 80, 'UMKM'),
    alamat: clip(p.alamat, 240, ''),
    telepon: clip(p.telepon, 40, ''),
    namaPemilik: clip(
      p.namaPemilik && p.namaPemilik !== 'Pemilik Usaha' ? p.namaPemilik : googleName,
      100,
      'Pemilik Usaha'
    ),
    emailPemilik: clip(p.emailPemilik || googleEmail, 120, ''),
    avatarUrl: sanitizeAvatarUrl(
      p.avatarUrl && p.avatarUrl !== DEFAULT_AVATAR_URL ? p.avatarUrl : googleAvatar || DEFAULT_AVATAR_URL
    ),
    mataUang: 'IDR' as const,
    batasStokMenipisDefault: Math.min(10000, Math.max(0, Math.round(nonNeg(p.batasStokMenipisDefault, 5)))),
  };
}

interface BatchSetOp {
  type: 'set';
  ref: DocumentReference;
  data: Record<string, unknown>;
  mergeUpdate?: boolean;
}

interface BatchDeleteOp {
  type: 'delete';
  ref: DocumentReference;
}

type BatchOp = BatchSetOp | BatchDeleteOp;

async function commitInChunks(ops: BatchOp[]): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const chunk = ops.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      if (op.type === 'set') {
        if (op.mergeUpdate) {
          batch.update(op.ref, op.data as Record<string, FieldValue | Partial<unknown>>);
        } else {
          batch.set(op.ref, op.data);
        }
      } else {
        batch.delete(op.ref);
      }
    }
    await batch.commit();
  }
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [pendingWrites, setPendingWrites] = useState(0);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const [data, setData] = useState<UsahaKuData>(() => createEmptyData());
  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  if (fatalError) {
    throw fatalError;
  }

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (type: ToastMessage['type'], title: string, description?: string) => {
      const id = generateId('toast');
      setToasts((prev) => [...prev.slice(-3), { id, type, title, description }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 4200);
    },
    [dismissToast]
  );

  const reportFirestoreFailure = useCallback(
    (error: unknown, operationType: OperationType, path: string | null) => {
      try {
        handleFirestoreError(error, operationType, path);
      } catch (formatted) {
        setFatalError(formatted instanceof Error ? formatted : new Error(String(formatted)));
      }
    },
    []
  );

  const writeDatasetToFirestore = useCallback(
    async (
      uid: string,
      source: UsahaKuData,
      firebaseUser?: User | null,
      profileExists = false
    ) => {
      const parentOps: BatchOp[] = [];
      const childOps: BatchOp[] = [];

      // 1. Profile
      const profileRef = doc(db, 'users', uid, 'profile', 'business');
      const baseProfile = buildProfileDoc(uid, source.profile || {}, firebaseUser);
      if (profileExists) {
        const {
          namaUsaha,
          taglineUsaha,
          kategoriUsaha,
          alamat,
          telepon,
          namaPemilik,
          emailPemilik,
          avatarUrl,
          batasStokMenipisDefault,
        } = baseProfile;
        parentOps.push({
          type: 'set',
          ref: profileRef,
          data: {
            namaUsaha,
            taglineUsaha,
            kategoriUsaha,
            alamat,
            telepon,
            namaPemilik,
            emailPemilik,
            avatarUrl,
            batasStokMenipisDefault,
            updatedAt: serverTimestamp(),
          },
          mergeUpdate: true,
        });
      } else {
        parentOps.push({
          type: 'set',
          ref: profileRef,
          data: {
            ...baseProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        });
      }

      // 2. Map & sanitize parent IDs so references stay consistent & valid
      const productIdMap = new Map<string, string>();
      for (const p of source.products || []) {
        const cleanId = sanitizeDocId(p.id, 'prd');
        productIdMap.set(p.id, cleanId);
        parentOps.push({
          type: 'set',
          ref: doc(db, 'users', uid, 'products', cleanId),
          data: {
            ownerId: uid,
            sku: clip(p.sku, 60, `SKU-${Math.floor(1000 + Math.random() * 9000)}`),
            nama: clip(p.nama, 150, 'Produk'),
            kategori: clip(p.kategori, 80, 'Umum'),
            hargaModal: nonNeg(p.hargaModal, 0),
            hargaJual: nonNeg(p.hargaJual, 0),
            stok: nonNeg(p.stok, 0),
            stokMinimum: nonNeg(p.stokMinimum, 5),
            satuan: clip(p.satuan, 30, 'pcs'),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        });
      }

      const customerIdMap = new Map<string, string>();
      for (const c of source.customers || []) {
        const cleanId = sanitizeDocId(c.id, 'cust');
        customerIdMap.set(c.id, cleanId);
        parentOps.push({
          type: 'set',
          ref: doc(db, 'users', uid, 'customers', cleanId),
          data: {
            ownerId: uid,
            nama: clip(c.nama, 120, 'Pelanggan'),
            kontak: clip(c.kontak, 40, ''),
            alamat: clip(c.alamat, 240, ''),
            catatan: clip(c.catatan, 300, ''),
            totalPembelian: nonNeg(c.totalPembelian, 0),
            jumlahTransaksi: nonNeg(c.jumlahTransaksi, 0),
            totalUtang: nonNeg(c.totalUtang, 0),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        });
      }

      const supplierIdMap = new Map<string, string>();
      for (const s of source.suppliers || []) {
        const cleanId = sanitizeDocId(s.id, 'sup');
        supplierIdMap.set(s.id, cleanId);
        const produkList = Array.isArray(s.produkDisediakan)
          ? s.produkDisediakan.slice(0, 50).map((x) => clip(x, 100, '')).filter(Boolean)
          : [];
        parentOps.push({
          type: 'set',
          ref: doc(db, 'users', uid, 'suppliers', cleanId),
          data: {
            ownerId: uid,
            nama: clip(s.nama, 120, 'Pemasok'),
            kontak: clip(s.kontak, 40, ''),
            alamat: clip(s.alamat, 240, ''),
            produkDisediakan: produkList,
            catatan: clip(s.catatan, 300, ''),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        });
      }

      // Commit parent collections first so existsAfter() rules succeed even across multiple chunks
      await commitInChunks(parentOps);

      // 3. Dependent child collections
      for (const sh of source.stockHistory || []) {
        const mappedProdId = productIdMap.get(sh.productId);
        if (!mappedProdId) continue; // Skip orphan stock logs
        const cleanId = sanitizeDocId(sh.id, 'stk');
        const tipe = ['masuk', 'keluar', 'penyesuaian', 'retur_batal'].includes(sh.tipe)
          ? sh.tipe
          : 'penyesuaian';
        childOps.push({
          type: 'set',
          ref: doc(db, 'users', uid, 'stockHistory', cleanId),
          data: {
            ownerId: uid,
            productId: mappedProdId,
            productName: clip(sh.productName, 150, 'Produk'),
            tipe,
            jumlah: nonNeg(sh.jumlah, 0),
            stokSebelum: nonNeg(sh.stokSebelum, 0),
            stokSesudah: nonNeg(sh.stokSesudah, 0),
            referensi: clip(sh.referensi, 100, ''),
            catatan: clip(sh.catatan, 300, ''),
            tanggal: clip(sh.tanggal, 40, new Date().toISOString()),
            createdAt: serverTimestamp(),
          },
        });
      }

      const saleIdMap = new Map<string, string>();
      for (const sl of source.sales || []) {
        const cleanId = sanitizeDocId(sl.id, 'sale');
        saleIdMap.set(sl.id, cleanId);
        const mappedCustId = sl.customerId ? customerIdMap.get(sl.customerId) || '' : '';
        const rawItems = Array.isArray(sl.items) ? sl.items.slice(0, 50) : [];
        if (rawItems.length === 0) continue;
        const metodePembayaran = ALLOWED_PAYMENT_METHODS.includes(sl.metodePembayaran)
          ? sl.metodePembayaran
          : 'Tunai';
        const status = sl.status === 'dibatalkan' ? 'dibatalkan' : 'selesai';
        childOps.push({
          type: 'set',
          ref: doc(db, 'users', uid, 'sales', cleanId),
          data: {
            ownerId: uid,
            nomorInvoice: clip(sl.nomorInvoice, 60, generateDocNumber('INV')),
            tanggal: clip(sl.tanggal, 40, new Date().toISOString()),
            customerId: mappedCustId,
            customerName: clip(sl.customerName, 120, 'Pelanggan Umum'),
            items: rawItems.map((it) => ({
              productId: productIdMap.get(it.productId) || sanitizeDocId(it.productId, 'prd'),
              productName: clip(it.productName, 150, 'Produk'),
              satuan: clip(it.satuan, 30, 'pcs'),
              qty: posNum(it.qty, 1),
              hargaJual: nonNeg(it.hargaJual, 0),
              hargaModal: nonNeg(it.hargaModal, 0),
              subtotal: nonNeg(it.subtotal, 0),
              profit: Number.isFinite(Number(it.profit)) ? Number(it.profit) : 0,
            })),
            totalHarga: nonNeg(sl.totalHarga, 0),
            totalModal: nonNeg(sl.totalModal, 0),
            totalKeuntungan: Number.isFinite(Number(sl.totalKeuntungan))
              ? Number(sl.totalKeuntungan)
              : 0,
            metodePembayaran,
            status,
            catatan: clip(sl.catatan, 300, ''),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        });
      }

      for (const dr of source.debtRecords || []) {
        const mappedCustId = customerIdMap.get(dr.customerId);
        if (!mappedCustId) continue;
        const jumlah = Number(dr.jumlah);
        if (!Number.isFinite(jumlah) || jumlah <= 0) continue;
        const cleanId = sanitizeDocId(dr.id, 'debt');
        childOps.push({
          type: 'set',
          ref: doc(db, 'users', uid, 'debtRecords', cleanId),
          data: {
            ownerId: uid,
            customerId: mappedCustId,
            customerName: clip(dr.customerName, 120, 'Pelanggan'),
            tipe: dr.tipe === 'bayar_utang' ? 'bayar_utang' : 'tambah_utang',
            jumlah,
            metode: clip(dr.metode, 60, 'Tunai'),
            catatan: clip(dr.catatan, 300, ''),
            tanggal: clip(dr.tanggal, 40, new Date().toISOString()),
            saleId: dr.saleId ? saleIdMap.get(dr.saleId) || sanitizeDocId(dr.saleId, 'sale') : '',
            createdAt: serverTimestamp(),
          },
        });
      }

      for (const pr of source.purchases || []) {
        const mappedSupId = supplierIdMap.get(pr.supplierId);
        if (!mappedSupId) continue;
        const rawItems = Array.isArray(pr.items) ? pr.items.slice(0, 50) : [];
        if (rawItems.length === 0) continue;
        const cleanId = sanitizeDocId(pr.id, 'pur');
        childOps.push({
          type: 'set',
          ref: doc(db, 'users', uid, 'purchases', cleanId),
          data: {
            ownerId: uid,
            nomorPO: clip(pr.nomorPO, 60, generateDocNumber('PO')),
            tanggal: clip(pr.tanggal, 40, new Date().toISOString()),
            supplierId: mappedSupId,
            supplierName: clip(pr.supplierName, 120, 'Pemasok'),
            items: rawItems.map((it) => ({
              productId: productIdMap.get(it.productId) || sanitizeDocId(it.productId, 'prd'),
              productName: clip(it.productName, 150, 'Produk'),
              satuan: clip(it.satuan, 30, 'pcs'),
              qty: posNum(it.qty, 1),
              hargaBeliSatuan: nonNeg(it.hargaBeliSatuan, 0),
              subtotal: nonNeg(it.subtotal, 0),
            })),
            totalBiaya: nonNeg(pr.totalBiaya, 0),
            metodePembayaran: clip(pr.metodePembayaran, 60, 'Tunai'),
            catatan: clip(pr.catatan, 300, ''),
            createdAt: serverTimestamp(),
          },
        });
      }

      for (const fn of source.finance || []) {
        const jumlah = Number(fn.jumlah);
        if (!Number.isFinite(jumlah) || jumlah <= 0) continue;
        const cleanId = sanitizeDocId(fn.id, 'fin');
        childOps.push({
          type: 'set',
          ref: doc(db, 'users', uid, 'finance', cleanId),
          data: {
            ownerId: uid,
            tanggal: clip(fn.tanggal, 40, toISODateLocal(new Date())),
            tipe: fn.tipe === 'pemasukan' ? 'pemasukan' : 'pengeluaran',
            kategori: clip(fn.kategori, 80, 'Lainnya'),
            deskripsi: clip(fn.deskripsi, 300, 'Transaksi'),
            jumlah,
            metode: clip(fn.metode, 60, 'Tunai'),
            referensiId: clip(fn.referensiId, 128, ''),
            createdAt: serverTimestamp(),
          },
        });
      }

      for (const ord of source.orders || []) {
        const cleanId = sanitizeDocId(ord.id, 'ord');
        const mappedCustId = ord.customerId ? customerIdMap.get(ord.customerId) || '' : '';
        const status = ALLOWED_ORDER_STATUSES.includes(ord.status) ? ord.status : 'menunggu';
        childOps.push({
          type: 'set',
          ref: doc(db, 'users', uid, 'orders', cleanId),
          data: {
            ownerId: uid,
            judul: clip(ord.judul, 160, 'Pesanan'),
            customerId: mappedCustId,
            customerName: clip(ord.customerName, 120, 'Pelanggan'),
            kontak: clip(ord.kontak, 40, ''),
            produkRingkasan: clip(ord.produkRingkasan, 240, ''),
            estimasiNilai: nonNeg(ord.estimasiNilai, 0),
            status,
            tanggalPesan: clip(ord.tanggalPesan, 40, toISODateLocal(new Date())),
            tenggatWaktu: clip(ord.tenggatWaktu, 40, toISODateLocal(new Date())),
            catatan: clip(ord.catatan, 300, ''),
            tipe: ord.tipe === 'pengingat' ? 'pengingat' : 'pesanan',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        });
      }

      if (childOps.length > 0) {
        await commitInChunks(childOps);
      }
    },
    []
  );

  // Auth & Real-Time Firestore Listeners
  useEffect(() => {
    let unsubscribers: (() => void)[] = [];
    let isCancelled = false;

    const cleanupListeners = () => {
      for (const unsub of unsubscribers) {
        unsub();
      }
      unsubscribers = [];
    };

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      cleanupListeners();

      if (!firebaseUser) {
        setUser(null);
        setData(createEmptyData());
        setAuthLoading(false);
        setSyncLoading(false);
        return;
      }

      if (!firebaseUser.emailVerified) {
        setAuthError('Akun Google Anda perlu memiliki email yang terverifikasi untuk menggunakan penyimpanan cloud.');
        await signOut(auth);
        setAuthLoading(false);
        setSyncLoading(false);
        return;
      }

      setUser(firebaseUser);
      setAuthError(null);
      setAuthLoading(false);
      setSyncLoading(true);

      const uid = firebaseUser.uid;
      const profilePath = `users/${uid}/profile/business`;
      const profileRef = doc(db, 'users', uid, 'profile', 'business');

      try {
        const profileSnap = await getDoc(profileRef);
        if (isCancelled) return;

        if (!profileSnap.exists()) {
          // Cek apakah ada data lokal dari sesi sebelum login cloud
          let localCandidate: UsahaKuData | null = null;
          try {
            const rawLocal = localStorage.getItem(STORAGE_KEY);
            if (rawLocal) {
              const parsed = JSON.parse(rawLocal) as UsahaKuData;
              const hasRecords =
                (parsed?.products?.length || 0) > 0 ||
                (parsed?.sales?.length || 0) > 0 ||
                (parsed?.customers?.length || 0) > 0 ||
                (parsed?.suppliers?.length || 0) > 0 ||
                (parsed?.finance?.length || 0) > 0 ||
                (parsed?.orders?.length || 0) > 0 ||
                (parsed?.profile?.namaUsaha && parsed.profile.namaUsaha !== 'Usaha Saya');
              if (hasRecords) {
                localCandidate = parsed;
              }
            }
          } catch {
            localCandidate = null;
          }

          if (localCandidate) {
            await writeDatasetToFirestore(uid, localCandidate, firebaseUser);
            notify(
              'success',
              'Data lokal tersinkronkan ke cloud',
              'Catatan Anda sebelumnya kini tersimpan aman di akun Google Anda.'
            );
          } else {
            const defaultProfile = buildProfileDoc(uid, createEmptyData().profile, firebaseUser);
            await setDoc(profileRef, {
              ...defaultProfile,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        }
      } catch (err) {
        if (!isCancelled) {
          reportFirestoreFailure(err, OperationType.WRITE, profilePath);
          setSyncLoading(false);
        }
        return;
      }

      if (isCancelled) return;

      const loadedKeys = new Set<string>();
      const markLoaded = (key: string) => {
        loadedKeys.add(key);
        if (loadedKeys.size >= 10) {
          setSyncLoading(false);
        }
      };

      // 1. Profile listener
      unsubscribers.push(
        onSnapshot(
          profileRef,
          (snap) => {
            if (snap.exists()) {
              const d = snap.data();
              setData((prev) => ({
                ...prev,
                lastUpdated: tsToIso(d.updatedAt, prev.lastUpdated),
                profile: {
                  namaUsaha: d.namaUsaha || 'Usaha Saya',
                  taglineUsaha: d.taglineUsaha || '',
                  kategoriUsaha: d.kategoriUsaha || 'UMKM',
                  alamat: d.alamat || '',
                  telepon: d.telepon || '',
                  namaPemilik: d.namaPemilik || firebaseUser.displayName || 'Pemilik Usaha',
                  emailPemilik: d.emailPemilik || firebaseUser.email || '',
                  avatarUrl: d.avatarUrl || DEFAULT_AVATAR_URL,
                  mataUang: 'IDR',
                  batasStokMenipisDefault:
                    typeof d.batasStokMenipisDefault === 'number' ? d.batasStokMenipisDefault : 5,
                },
              }));
            }
            markLoaded('profile');
          },
          (err) => reportFirestoreFailure(err, OperationType.GET, profilePath)
        )
      );

      // Helper for collection listeners with required ownerId filter
      const subscribeCol = <T,>(
        colName: keyof Pick<
          UsahaKuData,
          | 'products'
          | 'stockHistory'
          | 'sales'
          | 'customers'
          | 'debtRecords'
          | 'suppliers'
          | 'purchases'
          | 'finance'
          | 'orders'
        >,
        mapper: (id: string, docData: Record<string, unknown>) => T,
        sorter: (a: T, b: T) => number
      ) => {
        const colPath = `users/${uid}/${colName}`;
        const q = query(collection(db, 'users', uid, colName), where('ownerId', '==', uid));
        const unsub = onSnapshot(
          q,
          (snapshot) => {
            const list = snapshot.docs
              .map((docSnap) => mapper(docSnap.id, docSnap.data()))
              .sort(sorter);
            setData((prev) => ({
              ...prev,
              lastUpdated: new Date().toISOString(),
              [colName]: list,
            }));
            markLoaded(colName);
          },
          (err) => reportFirestoreFailure(err, OperationType.LIST, colPath)
        );
        unsubscribers.push(unsub);
      };

      subscribeCol<Product>(
        'products',
        (id, d) => ({
          id,
          sku: String(d.sku || ''),
          nama: String(d.nama || ''),
          kategori: String(d.kategori || 'Umum'),
          hargaModal: Number(d.hargaModal || 0),
          hargaJual: Number(d.hargaJual || 0),
          stok: Number(d.stok || 0),
          stokMinimum: Number(d.stokMinimum || 0),
          satuan: String(d.satuan || 'pcs'),
          createdAt: tsToIso(d.createdAt),
          updatedAt: tsToIso(d.updatedAt),
        }),
        (a, b) => b.createdAt.localeCompare(a.createdAt)
      );

      subscribeCol<StockHistory>(
        'stockHistory',
        (id, d) => ({
          id,
          productId: String(d.productId || ''),
          productName: String(d.productName || ''),
          tipe: (d.tipe as StockHistory['tipe']) || 'penyesuaian',
          jumlah: Number(d.jumlah || 0),
          stokSebelum: Number(d.stokSebelum || 0),
          stokSesudah: Number(d.stokSesudah || 0),
          referensi: String(d.referensi || ''),
          catatan: String(d.catatan || ''),
          tanggal: String(d.tanggal || tsToIso(d.createdAt)),
        }),
        (a, b) => b.tanggal.localeCompare(a.tanggal)
      );

      subscribeCol<Sale>(
        'sales',
        (id, d) => ({
          id,
          nomorInvoice: String(d.nomorInvoice || ''),
          tanggal: String(d.tanggal || ''),
          customerId: d.customerId ? String(d.customerId) : undefined,
          customerName: String(d.customerName || 'Pelanggan Umum'),
          items: Array.isArray(d.items) ? (d.items as SaleItem[]) : [],
          totalHarga: Number(d.totalHarga || 0),
          totalModal: Number(d.totalModal || 0),
          totalKeuntungan: Number(d.totalKeuntungan || 0),
          metodePembayaran: (d.metodePembayaran as PaymentMethod) || 'Tunai',
          status: (d.status as Sale['status']) || 'selesai',
          catatan: String(d.catatan || ''),
        }),
        (a, b) => b.tanggal.localeCompare(a.tanggal)
      );

      subscribeCol<Customer>(
        'customers',
        (id, d) => ({
          id,
          nama: String(d.nama || ''),
          kontak: String(d.kontak || ''),
          alamat: String(d.alamat || ''),
          catatan: String(d.catatan || ''),
          totalPembelian: Number(d.totalPembelian || 0),
          jumlahTransaksi: Number(d.jumlahTransaksi || 0),
          totalUtang: Number(d.totalUtang || 0),
          createdAt: tsToIso(d.createdAt),
        }),
        (a, b) => b.createdAt.localeCompare(a.createdAt)
      );

      subscribeCol<DebtRecord>(
        'debtRecords',
        (id, d) => ({
          id,
          customerId: String(d.customerId || ''),
          customerName: String(d.customerName || ''),
          tipe: (d.tipe as DebtRecord['tipe']) || 'tambah_utang',
          jumlah: Number(d.jumlah || 0),
          metode: String(d.metode || ''),
          catatan: String(d.catatan || ''),
          tanggal: String(d.tanggal || ''),
          saleId: d.saleId ? String(d.saleId) : undefined,
        }),
        (a, b) => b.tanggal.localeCompare(a.tanggal)
      );

      subscribeCol<Supplier>(
        'suppliers',
        (id, d) => ({
          id,
          nama: String(d.nama || ''),
          kontak: String(d.kontak || ''),
          alamat: String(d.alamat || ''),
          produkDisediakan: Array.isArray(d.produkDisediakan)
            ? d.produkDisediakan.map(String)
            : [],
          catatan: String(d.catatan || ''),
          createdAt: tsToIso(d.createdAt),
        }),
        (a, b) => b.createdAt.localeCompare(a.createdAt)
      );

      subscribeCol<Purchase>(
        'purchases',
        (id, d) => ({
          id,
          nomorPO: String(d.nomorPO || ''),
          tanggal: String(d.tanggal || ''),
          supplierId: String(d.supplierId || ''),
          supplierName: String(d.supplierName || ''),
          items: Array.isArray(d.items) ? (d.items as PurchaseItem[]) : [],
          totalBiaya: Number(d.totalBiaya || 0),
          metodePembayaran: String(d.metodePembayaran || ''),
          catatan: String(d.catatan || ''),
        }),
        (a, b) => b.tanggal.localeCompare(a.tanggal)
      );

      subscribeCol<FinanceEntry>(
        'finance',
        (id, d) => ({
          id,
          tanggal: String(d.tanggal || ''),
          tipe: (d.tipe as FinanceEntry['tipe']) || 'pemasukan',
          kategori: String(d.kategori || ''),
          deskripsi: String(d.deskripsi || ''),
          jumlah: Number(d.jumlah || 0),
          metode: String(d.metode || ''),
          referensiId: d.referensiId ? String(d.referensiId) : undefined,
        }),
        (a, b) => b.tanggal.localeCompare(a.tanggal)
      );

      subscribeCol<OrderAgenda>(
        'orders',
        (id, d) => ({
          id,
          judul: String(d.judul || ''),
          customerId: d.customerId ? String(d.customerId) : undefined,
          customerName: String(d.customerName || ''),
          kontak: String(d.kontak || ''),
          produkRingkasan: String(d.produkRingkasan || ''),
          estimasiNilai: Number(d.estimasiNilai || 0),
          status: (d.status as OrderStatus) || 'menunggu',
          tanggalPesan: String(d.tanggalPesan || ''),
          tenggatWaktu: String(d.tenggatWaktu || ''),
          catatan: String(d.catatan || ''),
          tipe: (d.tipe as OrderAgenda['tipe']) || 'pesanan',
        }),
        (a, b) => a.tenggatWaktu.localeCompare(b.tenggatWaktu)
      );
    });

    return () => {
      isCancelled = true;
      cleanupListeners();
      unsubAuth();
    };
  }, [notify, reportFirestoreFailure, writeDatasetToFirestore]);

  const signInWithGoogle = useCallback(async () => {
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError('Proses masuk dibatalkan. Silakan klik tombol di bawah untuk mencoba kembali.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('Popup login diblokir oleh browser Anda. Izinkan popup untuk melanjutkan.');
      } else {
        setAuthError('Gagal masuk dengan Google. Periksa koneksi internet Anda dan coba lagi.');
      }
    } finally {
      setAuthSubmitting(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setActivePage('dashboard');
      notify('info', 'Anda telah keluar dari akun');
    } catch {
      notify('error', 'Gagal keluar dari akun');
    }
  }, [notify]);

  const runAsyncWrite = useCallback(
    (opType: OperationType, path: string, fn: () => Promise<void>) => {
      setPendingWrites((n) => n + 1);
      fn()
        .catch((err) => {
          reportFirestoreFailure(err, opType, path);
        })
        .finally(() => {
          setPendingWrites((n) => Math.max(0, n - 1));
        });
    },
    [reportFirestoreFailure]
  );

  const lowStockProducts = useMemo(
    () => data.products.filter((p) => p.stok <= p.stokMinimum).sort((a, b) => a.stok - b.stok),
    [data.products]
  );

  const insights = useMemo(() => generateBusinessInsights(data), [data]);

  // --- PRODUK & STOK ---
  const addProduct = useCallback(
    (input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): ActionResult => {
      if (!user) return { ok: false, message: 'Silakan masuk terlebih dahulu' };
      if (!input.nama.trim()) {
        notify('error', 'Nama produk wajib diisi');
        return { ok: false, message: 'Nama produk wajib diisi' };
      }
      const uid = user.uid;
      const productId = generateId('prd');
      const nowIso = new Date().toISOString();
      const stok = nonNeg(input.stok, 0);
      const payload = {
        ownerId: uid,
        sku: clip(input.sku, 60, `SKU-${Math.floor(1000 + Math.random() * 9000)}`),
        nama: clip(input.nama, 150, 'Produk'),
        kategori: clip(input.kategori, 80, 'Umum'),
        hargaModal: nonNeg(input.hargaModal, 0),
        hargaJual: nonNeg(input.hargaJual, 0),
        stok,
        stokMinimum: nonNeg(input.stokMinimum, 5),
        satuan: clip(input.satuan, 30, 'pcs'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      runAsyncWrite(OperationType.CREATE, `users/${uid}/products/${productId}`, async () => {
        const batch = writeBatch(db);
        batch.set(doc(db, 'users', uid, 'products', productId), payload);
        if (stok > 0) {
          const histId = generateId('stk');
          batch.set(doc(db, 'users', uid, 'stockHistory', histId), {
            ownerId: uid,
            productId,
            productName: payload.nama,
            tipe: 'masuk',
            jumlah: stok,
            stokSebelum: 0,
            stokSesudah: stok,
            referensi: 'Stok Awal',
            catatan: 'Penambahan produk baru',
            tanggal: nowIso,
            createdAt: serverTimestamp(),
          });
        }
        await batch.commit();
      });

      notify('success', 'Produk ditambahkan', `${payload.nama} berhasil disimpan.`);
      return { ok: true };
    },
    [notify, runAsyncWrite, user]
  );

  const updateProduct = useCallback(
    (id: string, input: Partial<Omit<Product, 'id' | 'createdAt'>>): ActionResult => {
      if (!user) return { ok: false };
      const existing = data.products.find((p) => p.id === id);
      if (!existing) {
        notify('error', 'Produk tidak ditemukan');
        return { ok: false };
      }

      const uid = user.uid;
      const nowIso = new Date().toISOString();
      const nextStok = typeof input.stok === 'number' ? nonNeg(input.stok, existing.stok) : existing.stok;
      const nextNama = clip(input.nama ?? existing.nama, 150, existing.nama);

      const updateFields: Record<string, unknown> = {
        sku: clip(input.sku ?? existing.sku, 60, existing.sku),
        nama: nextNama,
        kategori: clip(input.kategori ?? existing.kategori, 80, existing.kategori),
        hargaModal: nonNeg(input.hargaModal ?? existing.hargaModal, existing.hargaModal),
        hargaJual: nonNeg(input.hargaJual ?? existing.hargaJual, existing.hargaJual),
        stok: nextStok,
        stokMinimum: nonNeg(input.stokMinimum ?? existing.stokMinimum, existing.stokMinimum),
        satuan: clip(input.satuan ?? existing.satuan, 30, existing.satuan),
        updatedAt: serverTimestamp(),
      };

      runAsyncWrite(OperationType.UPDATE, `users/${uid}/products/${id}`, async () => {
        const batch = writeBatch(db);
        batch.update(doc(db, 'users', uid, 'products', id), updateFields);
        if (nextStok !== existing.stok) {
          const diff = nextStok - existing.stok;
          batch.set(doc(db, 'users', uid, 'stockHistory', generateId('stk')), {
            ownerId: uid,
            productId: existing.id,
            productName: nextNama,
            tipe: 'penyesuaian',
            jumlah: Math.abs(diff),
            stokSebelum: existing.stok,
            stokSesudah: nextStok,
            referensi: 'Edit Produk',
            catatan: clip(`Penyesuaian stok (${diff > 0 ? `+${diff}` : diff})`, 300),
            tanggal: nowIso,
            createdAt: serverTimestamp(),
          });
        }
        await batch.commit();
      });

      notify('success', 'Produk diperbarui');
      return { ok: true };
    },
    [data.products, notify, runAsyncWrite, user]
  );

  const deleteProduct = useCallback(
    (id: string): ActionResult => {
      if (!user) return { ok: false };
      const target = data.products.find((p) => p.id === id);
      if (!target) return { ok: false };
      const uid = user.uid;

      runAsyncWrite(OperationType.DELETE, `users/${uid}/products/${id}`, async () => {
        await deleteDoc(doc(db, 'users', uid, 'products', id));
      });

      notify('success', 'Produk dihapus', `${target.nama} telah dihapus dari daftar produk.`);
      return { ok: true };
    },
    [data.products, notify, runAsyncWrite, user]
  );

  const adjustStock = useCallback(
    (productId: string, newStock: number, catatan: string): ActionResult => {
      if (!user) return { ok: false };
      const target = data.products.find((p) => p.id === productId);
      if (!target) return { ok: false };
      if (!Number.isFinite(newStock) || newStock < 0) {
        notify('error', 'Stok tidak boleh kurang dari 0');
        return { ok: false };
      }
      const diff = newStock - target.stok;
      if (diff === 0) {
        notify('info', 'Tidak ada perubahan stok');
        return { ok: true };
      }

      const uid = user.uid;
      const nowIso = new Date().toISOString();
      const histId = generateId('stk');

      runAsyncWrite(OperationType.UPDATE, `users/${uid}/products/${productId}`, async () => {
        const batch = writeBatch(db);
        batch.update(doc(db, 'users', uid, 'products', productId), {
          stok: newStock,
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'users', uid, 'stockHistory', histId), {
          ownerId: uid,
          productId: target.id,
          productName: clip(target.nama, 150),
          tipe: 'penyesuaian',
          jumlah: Math.abs(diff),
          stokSebelum: target.stok,
          stokSesudah: newStock,
          referensi: 'Penyesuaian Manual',
          catatan: clip(catatan.trim() || `Koreksi stok (${diff > 0 ? `+${diff}` : diff})`, 300),
          tanggal: nowIso,
          createdAt: serverTimestamp(),
        });
        await batch.commit();
      });

      notify('success', 'Stok disesuaikan', `${target.nama} kini tersedia ${newStock} ${target.satuan}.`);
      return { ok: true };
    },
    [data.products, notify, runAsyncWrite, user]
  );

  // --- PENJUALAN ---
  const createSale = useCallback(
    (input: CreateSaleInput): ActionResult => {
      if (!user) return { ok: false };
      if (input.items.length === 0) {
        notify('error', 'Pilih minimal 1 produk untuk dijual');
        return { ok: false, message: 'Keranjang kosong' };
      }
      if (input.items.length > 50) {
        notify('error', 'Maksimal 50 jenis produk dalam satu transaksi');
        return { ok: false };
      }

      const saleItems: SaleItem[] = [];
      const productMap = new Map<string, Product>();

      for (const reqItem of input.items) {
        const product = data.products.find((p) => p.id === reqItem.productId);
        if (!product) {
          notify('error', 'Salah satu produk tidak ditemukan');
          return { ok: false };
        }
        if (reqItem.qty <= 0) {
          notify('error', `Jumlah untuk ${product.nama} harus lebih dari 0`);
          return { ok: false };
        }
        if (product.stok < reqItem.qty) {
          notify(
            'error',
            `Stok ${product.nama} tidak mencukupi`,
            `Tersedia ${product.stok} ${product.satuan}, diminta ${reqItem.qty}.`
          );
          return { ok: false };
        }

        const subtotal = product.hargaJual * reqItem.qty;
        const modalTotal = product.hargaModal * reqItem.qty;
        productMap.set(product.id, product);
        saleItems.push({
          productId: product.id,
          productName: clip(product.nama, 150),
          satuan: clip(product.satuan, 30),
          qty: reqItem.qty,
          hargaJual: product.hargaJual,
          hargaModal: product.hargaModal,
          subtotal,
          profit: subtotal - modalTotal,
        });
      }

      if (input.metodePembayaran === 'Utang / Kasbon' && !input.customerId) {
        notify('error', 'Pilih pelanggan untuk transaksi Kasbon / Utang');
        return { ok: false };
      }

      const customer = input.customerId
        ? data.customers.find((c) => c.id === input.customerId)
        : undefined;

      const totalHarga = saleItems.reduce((sum, i) => sum + i.subtotal, 0);
      const totalModal = saleItems.reduce((sum, i) => sum + i.hargaModal * i.qty, 0);
      const totalKeuntungan = totalHarga - totalModal;
      const nowIso = input.tanggal ? new Date(input.tanggal).toISOString() : new Date().toISOString();
      const dateOnly = nowIso.slice(0, 10);
      const saleId = generateId('sale');
      const nomorInvoice = generateDocNumber('INV');
      const customerName = clip(
        customer ? customer.nama : input.customerName?.trim() || 'Pelanggan Umum',
        120,
        'Pelanggan Umum'
      );
      const uid = user.uid;

      runAsyncWrite(OperationType.CREATE, `users/${uid}/sales/${saleId}`, async () => {
        const batch = writeBatch(db);

        batch.set(doc(db, 'users', uid, 'sales', saleId), {
          ownerId: uid,
          nomorInvoice,
          tanggal: nowIso,
          customerId: customer?.id || '',
          customerName,
          items: saleItems,
          totalHarga,
          totalModal,
          totalKeuntungan,
          metodePembayaran: input.metodePembayaran,
          status: 'selesai',
          catatan: clip(input.catatan, 300),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        for (const item of saleItems) {
          const prod = productMap.get(item.productId)!;
          const nextStok = Math.max(0, prod.stok - item.qty);
          batch.update(doc(db, 'users', uid, 'products', prod.id), {
            stok: nextStok,
            updatedAt: serverTimestamp(),
          });
          batch.set(doc(db, 'users', uid, 'stockHistory', generateId('stk')), {
            ownerId: uid,
            productId: prod.id,
            productName: item.productName,
            tipe: 'keluar',
            jumlah: item.qty,
            stokSebelum: prod.stok,
            stokSesudah: nextStok,
            referensi: nomorInvoice,
            catatan: clip(`Penjualan ke ${customerName}`, 300),
            tanggal: nowIso,
            createdAt: serverTimestamp(),
          });
        }

        if (customer) {
          batch.update(doc(db, 'users', uid, 'customers', customer.id), {
            totalPembelian: customer.totalPembelian + totalHarga,
            jumlahTransaksi: customer.jumlahTransaksi + 1,
            totalUtang:
              input.metodePembayaran === 'Utang / Kasbon'
                ? customer.totalUtang + totalHarga
                : customer.totalUtang,
            updatedAt: serverTimestamp(),
          });

          if (input.metodePembayaran === 'Utang / Kasbon' && totalHarga > 0) {
            batch.set(doc(db, 'users', uid, 'debtRecords', generateId('debt')), {
              ownerId: uid,
              customerId: customer.id,
              customerName: clip(customer.nama, 120),
              tipe: 'tambah_utang',
              jumlah: totalHarga,
              metode: 'Utang / Kasbon',
              catatan: clip(`Transaksi penjualan ${nomorInvoice}`, 300),
              tanggal: nowIso,
              saleId,
              createdAt: serverTimestamp(),
            });
          }
        }

        if (input.metodePembayaran !== 'Utang / Kasbon' && totalHarga > 0) {
          batch.set(doc(db, 'users', uid, 'finance', generateId('fin')), {
            ownerId: uid,
            tanggal: dateOnly,
            tipe: 'pemasukan',
            kategori: 'Penjualan Produk',
            deskripsi: clip(`Penjualan ${nomorInvoice} (${customerName})`, 300),
            jumlah: totalHarga,
            metode: input.metodePembayaran,
            referensiId: saleId,
            createdAt: serverTimestamp(),
          });
        }

        await batch.commit();
      });

      notify(
        'success',
        `Transaksi ${nomorInvoice} tersimpan`,
        'Stok produk dan ringkasan keuangan otomatis diperbarui di cloud.'
      );
      return { ok: true };
    },
    [data.customers, data.products, notify, runAsyncWrite, user]
  );

  const cancelSale = useCallback(
    (saleId: string): ActionResult => {
      if (!user) return { ok: false };
      const target = data.sales.find((s) => s.id === saleId);
      if (!target) {
        notify('error', 'Transaksi tidak ditemukan');
        return { ok: false };
      }
      if (target.status === 'dibatalkan') {
        notify('info', 'Transaksi ini sudah dibatalkan');
        return { ok: false };
      }

      const uid = user.uid;
      const nowIso = new Date().toISOString();

      runAsyncWrite(OperationType.UPDATE, `users/${uid}/sales/${saleId}`, async () => {
        const batch = writeBatch(db);

        batch.update(doc(db, 'users', uid, 'sales', saleId), {
          status: 'dibatalkan',
          updatedAt: serverTimestamp(),
        });

        for (const item of target.items) {
          const prod = data.products.find((p) => p.id === item.productId);
          if (!prod) continue; // Produk sudah dihapus sebelumnya
          const nextStok = prod.stok + item.qty;
          batch.update(doc(db, 'users', uid, 'products', prod.id), {
            stok: nextStok,
            updatedAt: serverTimestamp(),
          });
          batch.set(doc(db, 'users', uid, 'stockHistory', generateId('stk')), {
            ownerId: uid,
            productId: prod.id,
            productName: clip(item.productName, 150),
            tipe: 'retur_batal',
            jumlah: item.qty,
            stokSebelum: prod.stok,
            stokSesudah: nextStok,
            referensi: clip(target.nomorInvoice, 100),
            catatan: clip(`Pengembalian stok dari pembatalan ${target.nomorInvoice}`, 300),
            tanggal: nowIso,
            createdAt: serverTimestamp(),
          });
        }

        if (target.customerId) {
          const customer = data.customers.find((c) => c.id === target.customerId);
          if (customer) {
            batch.update(doc(db, 'users', uid, 'customers', customer.id), {
              totalPembelian: Math.max(0, customer.totalPembelian - target.totalHarga),
              jumlahTransaksi: Math.max(0, customer.jumlahTransaksi - 1),
              totalUtang:
                target.metodePembayaran === 'Utang / Kasbon'
                  ? Math.max(0, customer.totalUtang - target.totalHarga)
                  : customer.totalUtang,
              updatedAt: serverTimestamp(),
            });

            if (target.metodePembayaran === 'Utang / Kasbon' && target.totalHarga > 0) {
              batch.set(doc(db, 'users', uid, 'debtRecords', generateId('debt')), {
                ownerId: uid,
                customerId: customer.id,
                customerName: clip(target.customerName, 120),
                tipe: 'bayar_utang',
                jumlah: target.totalHarga,
                metode: 'Pembatalan Transaksi',
                catatan: clip(`Koreksi utang karena pembatalan ${target.nomorInvoice}`, 300),
                tanggal: nowIso,
                saleId: target.id,
                createdAt: serverTimestamp(),
              });
            }
          }
        }

        const linkedFinance = data.finance.filter((f) => f.referensiId === saleId);
        for (const fin of linkedFinance) {
          batch.delete(doc(db, 'users', uid, 'finance', fin.id));
        }

        await batch.commit();
      });

      notify(
        'warning',
        `Transaksi ${target.nomorInvoice} dibatalkan`,
        'Stok barang telah dikembalikan ke gudang.'
      );
      return { ok: true };
    },
    [data.customers, data.finance, data.products, data.sales, notify, runAsyncWrite, user]
  );

  // --- PELANGGAN & UTANG ---
  const addCustomer = useCallback(
    (
      input: Omit<Customer, 'id' | 'totalPembelian' | 'jumlahTransaksi' | 'totalUtang' | 'createdAt'>
    ): ActionResult => {
      if (!user) return { ok: false };
      if (!input.nama.trim()) {
        notify('error', 'Nama pelanggan wajib diisi');
        return { ok: false };
      }
      const uid = user.uid;
      const custId = generateId('cust');
      const nama = clip(input.nama, 120);

      runAsyncWrite(OperationType.CREATE, `users/${uid}/customers/${custId}`, async () => {
        await setDoc(doc(db, 'users', uid, 'customers', custId), {
          ownerId: uid,
          nama,
          kontak: clip(input.kontak, 40),
          alamat: clip(input.alamat, 240),
          catatan: clip(input.catatan, 300),
          totalPembelian: 0,
          jumlahTransaksi: 0,
          totalUtang: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      notify('success', 'Pelanggan ditambahkan', `${nama} berhasil disimpan.`);
      return { ok: true };
    },
    [notify, runAsyncWrite, user]
  );

  const updateCustomer = useCallback(
    (id: string, input: Partial<Omit<Customer, 'id' | 'createdAt'>>): ActionResult => {
      if (!user) return { ok: false };
      const existing = data.customers.find((c) => c.id === id);
      if (!existing) return { ok: false };
      const uid = user.uid;

      runAsyncWrite(OperationType.UPDATE, `users/${uid}/customers/${id}`, async () => {
        await updateDoc(doc(db, 'users', uid, 'customers', id), {
          nama: clip(input.nama ?? existing.nama, 120, existing.nama),
          kontak: clip(input.kontak ?? existing.kontak, 40),
          alamat: clip(input.alamat ?? existing.alamat, 240),
          catatan: clip(input.catatan ?? existing.catatan, 300),
          updatedAt: serverTimestamp(),
        });
      });

      notify('success', 'Data pelanggan diperbarui');
      return { ok: true };
    },
    [data.customers, notify, runAsyncWrite, user]
  );

  const deleteCustomer = useCallback(
    (id: string): ActionResult => {
      if (!user) return { ok: false };
      const target = data.customers.find((c) => c.id === id);
      if (!target) return { ok: false };
      const uid = user.uid;

      runAsyncWrite(OperationType.DELETE, `users/${uid}/customers/${id}`, async () => {
        await deleteDoc(doc(db, 'users', uid, 'customers', id));
      });

      notify('success', 'Pelanggan dihapus', `${target.nama} telah dihapus.`);
      return { ok: true };
    },
    [data.customers, notify, runAsyncWrite, user]
  );

  const recordDebtTransaction = useCallback(
    (
      customerId: string,
      tipe: 'tambah_utang' | 'bayar_utang',
      jumlah: number,
      metode: string,
      catatan: string
    ): ActionResult => {
      if (!user) return { ok: false };
      const customer = data.customers.find((c) => c.id === customerId);
      if (!customer) return { ok: false };
      if (!Number.isFinite(jumlah) || jumlah <= 0) {
        notify('error', 'Nominal harus lebih dari 0');
        return { ok: false };
      }
      if (tipe === 'bayar_utang' && jumlah > customer.totalUtang) {
        notify('error', 'Nominal pembayaran melebihi sisa utang pelanggan');
        return { ok: false };
      }

      const uid = user.uid;
      const nowIso = new Date().toISOString();
      const recordId = generateId('debt');
      const nextUtang =
        tipe === 'tambah_utang'
          ? customer.totalUtang + jumlah
          : Math.max(0, customer.totalUtang - jumlah);

      runAsyncWrite(OperationType.CREATE, `users/${uid}/debtRecords/${recordId}`, async () => {
        const batch = writeBatch(db);
        batch.update(doc(db, 'users', uid, 'customers', customerId), {
          totalUtang: nextUtang,
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'users', uid, 'debtRecords', recordId), {
          ownerId: uid,
          customerId: customer.id,
          customerName: clip(customer.nama, 120),
          tipe,
          jumlah,
          metode: clip(metode, 60, 'Tunai'),
          catatan: clip(
            catatan.trim() || (tipe === 'bayar_utang' ? 'Pembayaran utang' : 'Pencatatan utang'),
            300
          ),
          tanggal: nowIso,
          saleId: '',
          createdAt: serverTimestamp(),
        });
        if (tipe === 'bayar_utang') {
          batch.set(doc(db, 'users', uid, 'finance', generateId('fin')), {
            ownerId: uid,
            tanggal: toISODateLocal(new Date()),
            tipe: 'pemasukan',
            kategori: 'Pelunasan Piutang',
            deskripsi: clip(`Pembayaran utang dari ${customer.nama}`, 300),
            jumlah,
            metode: clip(metode, 60, 'Tunai'),
            referensiId: recordId,
            createdAt: serverTimestamp(),
          });
        }
        await batch.commit();
      });

      notify(
        'success',
        tipe === 'bayar_utang' ? 'Pembayaran utang dicatat' : 'Catatan utang ditambahkan',
        `${customer.nama} · ${metode}`
      );
      return { ok: true };
    },
    [data.customers, notify, runAsyncWrite, user]
  );

  // --- PEMASOK ---
  const addSupplier = useCallback(
    (input: Omit<Supplier, 'id' | 'createdAt'>): ActionResult => {
      if (!user) return { ok: false };
      if (!input.nama.trim()) {
        notify('error', 'Nama pemasok wajib diisi');
        return { ok: false };
      }
      const uid = user.uid;
      const supId = generateId('sup');
      const nama = clip(input.nama, 120);
      const produkDisediakan = (input.produkDisediakan || [])
        .slice(0, 50)
        .map((x) => clip(x, 100))
        .filter(Boolean);

      runAsyncWrite(OperationType.CREATE, `users/${uid}/suppliers/${supId}`, async () => {
        await setDoc(doc(db, 'users', uid, 'suppliers', supId), {
          ownerId: uid,
          nama,
          kontak: clip(input.kontak, 40),
          alamat: clip(input.alamat, 240),
          produkDisediakan,
          catatan: clip(input.catatan, 300),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      notify('success', 'Pemasok ditambahkan', nama);
      return { ok: true };
    },
    [notify, runAsyncWrite, user]
  );

  const updateSupplier = useCallback(
    (id: string, input: Partial<Omit<Supplier, 'id' | 'createdAt'>>): ActionResult => {
      if (!user) return { ok: false };
      const existing = data.suppliers.find((s) => s.id === id);
      if (!existing) return { ok: false };
      const uid = user.uid;
      const produkDisediakan = (input.produkDisediakan ?? existing.produkDisediakan)
        .slice(0, 50)
        .map((x) => clip(x, 100))
        .filter(Boolean);

      runAsyncWrite(OperationType.UPDATE, `users/${uid}/suppliers/${id}`, async () => {
        await updateDoc(doc(db, 'users', uid, 'suppliers', id), {
          nama: clip(input.nama ?? existing.nama, 120, existing.nama),
          kontak: clip(input.kontak ?? existing.kontak, 40),
          alamat: clip(input.alamat ?? existing.alamat, 240),
          produkDisediakan,
          catatan: clip(input.catatan ?? existing.catatan, 300),
          updatedAt: serverTimestamp(),
        });
      });

      notify('success', 'Data pemasok diperbarui');
      return { ok: true };
    },
    [data.suppliers, notify, runAsyncWrite, user]
  );

  const deleteSupplier = useCallback(
    (id: string): ActionResult => {
      if (!user) return { ok: false };
      const target = data.suppliers.find((s) => s.id === id);
      if (!target) return { ok: false };
      const uid = user.uid;

      runAsyncWrite(OperationType.DELETE, `users/${uid}/suppliers/${id}`, async () => {
        await deleteDoc(doc(db, 'users', uid, 'suppliers', id));
      });

      notify('success', 'Pemasok dihapus', target.nama);
      return { ok: true };
    },
    [data.suppliers, notify, runAsyncWrite, user]
  );

  // --- PEMBELIAN ---
  const createPurchase = useCallback(
    (input: CreatePurchaseInput): ActionResult => {
      if (!user) return { ok: false };
      const supplier = data.suppliers.find((s) => s.id === input.supplierId);
      if (!supplier) {
        notify('error', 'Pilih pemasok terlebih dahulu');
        return { ok: false };
      }
      if (input.items.length === 0) {
        notify('error', 'Tambahkan minimal 1 produk yang dibeli');
        return { ok: false };
      }
      if (input.items.length > 50) {
        notify('error', 'Maksimal 50 jenis produk dalam satu pembelian');
        return { ok: false };
      }

      const purchaseItems: PurchaseItem[] = [];
      const productMap = new Map<string, Product>();

      for (const req of input.items) {
        const prod = data.products.find((p) => p.id === req.productId);
        if (!prod) return { ok: false };
        if (req.qty <= 0 || req.hargaBeliSatuan < 0) {
          notify('error', `Periksa jumlah dan harga beli untuk ${prod.nama}`);
          return { ok: false };
        }
        productMap.set(prod.id, prod);
        purchaseItems.push({
          productId: prod.id,
          productName: clip(prod.nama, 150),
          satuan: clip(prod.satuan, 30),
          qty: req.qty,
          hargaBeliSatuan: req.hargaBeliSatuan,
          subtotal: req.qty * req.hargaBeliSatuan,
        });
      }

      const totalBiaya = purchaseItems.reduce((sum, i) => sum + i.subtotal, 0);
      const nowIso = input.tanggal ? new Date(input.tanggal).toISOString() : new Date().toISOString();
      const dateOnly = nowIso.slice(0, 10);
      const nomorPO = generateDocNumber('PO');
      const purchaseId = generateId('pur');
      const uid = user.uid;

      runAsyncWrite(OperationType.CREATE, `users/${uid}/purchases/${purchaseId}`, async () => {
        const batch = writeBatch(db);

        batch.set(doc(db, 'users', uid, 'purchases', purchaseId), {
          ownerId: uid,
          nomorPO,
          tanggal: nowIso,
          supplierId: supplier.id,
          supplierName: clip(supplier.nama, 120),
          items: purchaseItems,
          totalBiaya,
          metodePembayaran: clip(input.metodePembayaran, 60, 'Tunai'),
          catatan: clip(input.catatan, 300),
          createdAt: serverTimestamp(),
        });

        for (const item of purchaseItems) {
          const prod = productMap.get(item.productId)!;
          const nextStok = prod.stok + item.qty;
          const prodUpdate: Record<string, FieldValue | number> = input.updateHargaModal
            ? {
                stok: nextStok,
                hargaModal: item.hargaBeliSatuan,
                updatedAt: serverTimestamp(),
              }
            : {
                stok: nextStok,
                updatedAt: serverTimestamp(),
              };

          batch.update(doc(db, 'users', uid, 'products', prod.id), prodUpdate);
          batch.set(doc(db, 'users', uid, 'stockHistory', generateId('stk')), {
            ownerId: uid,
            productId: prod.id,
            productName: item.productName,
            tipe: 'masuk',
            jumlah: item.qty,
            stokSebelum: prod.stok,
            stokSesudah: nextStok,
            referensi: nomorPO,
            catatan: clip(`Pembelian dari ${supplier.nama}`, 300),
            tanggal: nowIso,
            createdAt: serverTimestamp(),
          });
        }

        if (totalBiaya > 0) {
          batch.set(doc(db, 'users', uid, 'finance', generateId('fin')), {
            ownerId: uid,
            tanggal: dateOnly,
            tipe: 'pengeluaran',
            kategori: 'Pembelian Stok',
            deskripsi: clip(`Pembelian ${nomorPO} (${supplier.nama})`, 300),
            jumlah: totalBiaya,
            metode: clip(input.metodePembayaran, 60, 'Tunai'),
            referensiId: purchaseId,
            createdAt: serverTimestamp(),
          });
        }

        await batch.commit();
      });

      notify(
        'success',
        `Pembelian ${nomorPO} dicatat`,
        'Stok produk bertambah dan pengeluaran keuangan tercatat otomatis.'
      );
      return { ok: true };
    },
    [data.products, data.suppliers, notify, runAsyncWrite, user]
  );

  // --- KEUANGAN ---
  const addFinanceEntry = useCallback(
    (input: Omit<FinanceEntry, 'id'>): ActionResult => {
      if (!user) return { ok: false };
      if (!input.deskripsi.trim() || !Number.isFinite(input.jumlah) || input.jumlah <= 0) {
        notify('error', 'Deskripsi dan nominal transaksi keuangan harus valid');
        return { ok: false };
      }
      const uid = user.uid;
      const finId = generateId('fin');

      runAsyncWrite(OperationType.CREATE, `users/${uid}/finance/${finId}`, async () => {
        await setDoc(doc(db, 'users', uid, 'finance', finId), {
          ownerId: uid,
          tanggal: clip(input.tanggal, 40, toISODateLocal(new Date())),
          tipe: input.tipe === 'pemasukan' ? 'pemasukan' : 'pengeluaran',
          kategori: clip(input.kategori, 80, 'Lainnya'),
          deskripsi: clip(input.deskripsi, 300),
          jumlah: input.jumlah,
          metode: clip(input.metode, 60, 'Tunai'),
          referensiId: clip(input.referensiId, 128, ''),
          createdAt: serverTimestamp(),
        });
      });

      notify(
        'success',
        input.tipe === 'pemasukan' ? 'Pemasukan dicatat' : 'Pengeluaran dicatat'
      );
      return { ok: true };
    },
    [notify, runAsyncWrite, user]
  );

  const deleteFinanceEntry = useCallback(
    (id: string): ActionResult => {
      if (!user) return { ok: false };
      const uid = user.uid;

      runAsyncWrite(OperationType.DELETE, `users/${uid}/finance/${id}`, async () => {
        await deleteDoc(doc(db, 'users', uid, 'finance', id));
      });

      notify('success', 'Catatan keuangan dihapus');
      return { ok: true };
    },
    [notify, runAsyncWrite, user]
  );

  // --- PESANAN & AGENDA ---
  const addOrder = useCallback(
    (input: Omit<OrderAgenda, 'id'>): ActionResult => {
      if (!user) return { ok: false };
      if (!input.judul.trim()) {
        notify('error', 'Judul pesanan atau agenda wajib diisi');
        return { ok: false };
      }
      const uid = user.uid;
      const ordId = generateId('ord');
      const status = ALLOWED_ORDER_STATUSES.includes(input.status) ? input.status : 'menunggu';

      runAsyncWrite(OperationType.CREATE, `users/${uid}/orders/${ordId}`, async () => {
        await setDoc(doc(db, 'users', uid, 'orders', ordId), {
          ownerId: uid,
          judul: clip(input.judul, 160),
          customerId: clip(input.customerId, 128, ''),
          customerName: clip(input.customerName, 120, 'Umum'),
          kontak: clip(input.kontak, 40),
          produkRingkasan: clip(input.produkRingkasan, 240),
          estimasiNilai: nonNeg(input.estimasiNilai, 0),
          status,
          tanggalPesan: clip(input.tanggalPesan, 40, toISODateLocal(new Date())),
          tenggatWaktu: clip(input.tenggatWaktu, 40, toISODateLocal(new Date())),
          catatan: clip(input.catatan, 300),
          tipe: input.tipe === 'pengingat' ? 'pengingat' : 'pesanan',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      notify('success', 'Pesanan / agenda ditambahkan');
      return { ok: true };
    },
    [notify, runAsyncWrite, user]
  );

  const updateOrder = useCallback(
    (id: string, input: Partial<Omit<OrderAgenda, 'id'>>): ActionResult => {
      if (!user) return { ok: false };
      const existing = data.orders.find((o) => o.id === id);
      if (!existing) return { ok: false };
      if (existing.status === 'dibatalkan') {
        notify('error', 'Pesanan yang sudah dibatalkan tidak dapat diubah');
        return { ok: false };
      }
      const uid = user.uid;
      const nextStatus = input.status ?? existing.status;

      runAsyncWrite(OperationType.UPDATE, `users/${uid}/orders/${id}`, async () => {
        await updateDoc(doc(db, 'users', uid, 'orders', id), {
          judul: clip(input.judul ?? existing.judul, 160, existing.judul),
          customerId: clip(input.customerId ?? existing.customerId, 128, ''),
          customerName: clip(input.customerName ?? existing.customerName, 120, existing.customerName),
          kontak: clip(input.kontak ?? existing.kontak, 40),
          produkRingkasan: clip(input.produkRingkasan ?? existing.produkRingkasan, 240),
          estimasiNilai: nonNeg(input.estimasiNilai ?? existing.estimasiNilai, existing.estimasiNilai),
          status: ALLOWED_ORDER_STATUSES.includes(nextStatus) ? nextStatus : existing.status,
          tanggalPesan: clip(input.tanggalPesan ?? existing.tanggalPesan, 40, existing.tanggalPesan),
          tenggatWaktu: clip(input.tenggatWaktu ?? existing.tenggatWaktu, 40, existing.tenggatWaktu),
          catatan: clip(input.catatan ?? existing.catatan, 300),
          tipe: (input.tipe ?? existing.tipe) === 'pengingat' ? 'pengingat' : 'pesanan',
          updatedAt: serverTimestamp(),
        });
      });

      notify('success', 'Pesanan / agenda diperbarui');
      return { ok: true };
    },
    [data.orders, notify, runAsyncWrite, user]
  );

  const updateOrderStatus = useCallback(
    (id: string, status: OrderStatus): ActionResult => {
      if (!user) return { ok: false };
      const existing = data.orders.find((o) => o.id === id);
      if (!existing) return { ok: false };
      if (existing.status === 'dibatalkan') {
        notify('error', 'Pesanan yang sudah dibatalkan tidak dapat diubah');
        return { ok: false };
      }
      const uid = user.uid;

      runAsyncWrite(OperationType.UPDATE, `users/${uid}/orders/${id}`, async () => {
        await updateDoc(doc(db, 'users', uid, 'orders', id), {
          status,
          updatedAt: serverTimestamp(),
        });
      });

      notify('success', 'Status pesanan diperbarui');
      return { ok: true };
    },
    [data.orders, notify, runAsyncWrite, user]
  );

  const deleteOrder = useCallback(
    (id: string): ActionResult => {
      if (!user) return { ok: false };
      const uid = user.uid;

      runAsyncWrite(OperationType.DELETE, `users/${uid}/orders/${id}`, async () => {
        await deleteDoc(doc(db, 'users', uid, 'orders', id));
      });

      notify('success', 'Pesanan / agenda dihapus');
      return { ok: true };
    },
    [notify, runAsyncWrite, user]
  );

  // --- PENGATURAN & BACKUP ---
  const updateProfile = useCallback(
    (profile: BusinessProfile): ActionResult => {
      if (!user) return { ok: false };
      if (!profile.namaUsaha.trim() || !profile.namaPemilik.trim()) {
        notify('error', 'Nama usaha dan nama pemilik wajib diisi');
        return { ok: false };
      }
      const uid = user.uid;

      runAsyncWrite(OperationType.UPDATE, `users/${uid}/profile/business`, async () => {
        await updateDoc(doc(db, 'users', uid, 'profile', 'business'), {
          namaUsaha: clip(profile.namaUsaha, 120, 'Usaha Saya'),
          taglineUsaha: clip(profile.taglineUsaha, 200),
          kategoriUsaha: clip(profile.kategoriUsaha, 80, 'UMKM'),
          alamat: clip(profile.alamat, 240),
          telepon: clip(profile.telepon, 40),
          namaPemilik: clip(profile.namaPemilik, 100, 'Pemilik Usaha'),
          emailPemilik: clip(profile.emailPemilik, 120),
          avatarUrl: sanitizeAvatarUrl(profile.avatarUrl),
          batasStokMenipisDefault: Math.min(
            10000,
            Math.max(0, Math.round(nonNeg(profile.batasStokMenipisDefault, 5)))
          ),
          updatedAt: serverTimestamp(),
        });
      });

      notify('success', 'Profil usaha & pengguna disimpan');
      return { ok: true };
    },
    [notify, runAsyncWrite, user]
  );

  const deleteAllCollectionsForUser = useCallback(async (uid: string) => {
    const collectionsToClear = [
      'stockHistory',
      'sales',
      'debtRecords',
      'purchases',
      'finance',
      'orders',
      'products',
      'customers',
      'suppliers',
    ];
    const deleteOps: BatchOp[] = [];
    for (const colName of collectionsToClear) {
      const snap = await getDocs(
        query(collection(db, 'users', uid, colName), where('ownerId', '==', uid))
      );
      for (const docSnap of snap.docs) {
        deleteOps.push({ type: 'delete', ref: docSnap.ref });
      }
    }
    if (deleteOps.length > 0) {
      await commitInChunks(deleteOps);
    }
  }, []);

  const importBackupData = useCallback(
    (rawJson: string): ActionResult => {
      if (!user) return { ok: false };
      try {
        const parsed = JSON.parse(rawJson) as UsahaKuData;
        if (
          !parsed ||
          typeof parsed !== 'object' ||
          !parsed.profile ||
          !Array.isArray(parsed.products) ||
          !Array.isArray(parsed.sales) ||
          !Array.isArray(parsed.finance)
        ) {
          notify(
            'error',
            'Format file backup tidak valid',
            'Pastikan file berasal dari ekspor JSON UsahaKu.'
          );
          return { ok: false };
        }

        const uid = user.uid;
        runAsyncWrite(OperationType.WRITE, `users/${uid}`, async () => {
          await deleteAllCollectionsForUser(uid);
          await writeDatasetToFirestore(uid, parsed, user, true);
        });

        notify('success', 'Data backup sedang dipulihkan ke cloud');
        return { ok: true };
      } catch {
        notify(
          'error',
          'Gagal membaca file JSON',
          'File rusak atau bukan format JSON yang benar.'
        );
        return { ok: false };
      }
    },
    [deleteAllCollectionsForUser, notify, runAsyncWrite, user, writeDatasetToFirestore]
  );

  const clearAllData = useCallback(() => {
    if (!user) return;
    const uid = user.uid;
    runAsyncWrite(OperationType.DELETE, `users/${uid}`, async () => {
      await deleteAllCollectionsForUser(uid);
    });
    notify('warning', 'Seluruh data transaksi dan produk telah dikosongkan dari cloud');
  }, [deleteAllCollectionsForUser, notify, runAsyncWrite, user]);

  return (
    <StoreContext.Provider
      value={{
        user,
        authLoading,
        authSubmitting,
        authError,
        syncLoading,
        isSyncingWrite: pendingWrites > 0,
        signInWithGoogle,
        logout,
        data,
        activePage,
        setActivePage,
        insights,
        lowStockProducts,
        toasts,
        notify,
        dismissToast,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        createSale,
        cancelSale,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        recordDebtTransaction,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        createPurchase,
        addFinanceEntry,
        deleteFinanceEntry,
        addOrder,
        updateOrder,
        updateOrderStatus,
        deleteOrder,
        updateProfile,
        importBackupData,
        clearAllData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore harus digunakan di dalam StoreProvider');
  return ctx;
}

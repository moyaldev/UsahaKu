# Security Specification (`security_spec.md`) — UsahaKu

## 1. Data Invariants
1. **Strict Tenant Isolation**: Every document lives under `/users/{userId}/...` where `userId == request.auth.uid`, `email_verified == true`, and `data.ownerId == request.auth.uid`. No cross-user reads or writes are permitted.
2. **Path ID Hardening**: All document IDs (`userId`, `productId`, `saleId`, `customerId`, `supplierId`, `purchaseId`, `historyId`, `recordId`, `entryId`, `orderId`) must match `^[a-zA-Z0-9_\-]+$` with length `1..128`.
3. **Immutable Ownership & Timestamps**: `ownerId` and `createdAt` cannot be modified after creation. `createdAt == request.time` on creation and `updatedAt == request.time` on creation/update.
4. **No Ghost Fields**: Every `create` validates exact required and allowed key sets (`hasAll` + `hasOnly`). Every `update` validates `isValid[Entity](incoming())` and restricts `affectedKeys().hasOnly(...)` per action.
5. **Terminal State Locking**: Cancelled sales (`status == 'dibatalkan'`) and cancelled orders (`status == 'dibatalkan'`) cannot be mutated after cancellation.
6. **Bounded Arrays & Strings**: Every string has an explicit `.size()` bound; arrays (`items`, `produkDisediakan`) are bounded to `.size() <= 50`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return `PERMISSION_DENIED`)
1. **Unauthenticated Read/Write**: `request.auth == null` reading `/users/u1/products/p1` -> DENIED.
2. **Unverified Email Write**: `request.auth.token.email_verified == false` creating a product -> DENIED.
3. **Cross-User Access**: User `u2` reading or writing `/users/u1/sales/s1` -> DENIED.
4. **Identity Spoofing**: User `u1` creating `/users/u1/products/p1` with `ownerId: "u2"` -> DENIED.
5. **Shadow / Ghost Field Injection**: Creating a `Product` with an extra `isAdmin: true` field -> DENIED (`hasOnly` rejects).
6. **Client Timestamp Forgery**: Creating a `Sale` with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` -> DENIED.
7. **Immutable Field Tampering**: Updating `Product.createdAt` or `Product.ownerId` -> DENIED.
8. **ID Poisoning**: Creating a document with ID `../../../etc/passwd` or 500-char string -> DENIED (`isValidId`).
9. **String Resource Exhaustion**: Creating a `Product` with `nama` > 150 chars or `catatan` > 300 chars -> DENIED.
10. **Terminal State Bypass**: Updating a `Sale` whose `existing().status == 'dibatalkan'` -> DENIED.
11. **Orphaned StockHistory**: Creating a `StockHistory` referencing a non-existent `productId` -> DENIED (`existsAfter`).
12. **Blanket List Scraping**: Listing `/users/u1/customers` without matching `ownerId == request.auth.uid` -> DENIED.

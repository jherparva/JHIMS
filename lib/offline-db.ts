/**
 * JHIMS OFFLINE ENGINE
 * Gestor de persistencia local para ventas sin conexión.
 */

const DB_NAME = 'JHIMS_OFFLINE_DB';
const DB_VERSION = 4;
const STORE_SALES = 'pending_sales';
const STORE_PRODUCTS = 'cached_products';
const STORE_CUSTOMERS = 'cached_customers';
const STORE_PENDING_CUSTOMERS = 'pending_customers';
const STORE_SESSION = 'auth_session';

export class OfflineDB {
    private db: IDBDatabase | null = null;

    async open(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event: any) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_SALES)) {
                    db.createObjectStore(STORE_SALES, { keyPath: 'localId', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
                    db.createObjectStore(STORE_PRODUCTS, { keyPath: '_id' });
                }
                if (!db.objectStoreNames.contains(STORE_CUSTOMERS)) {
                    db.createObjectStore(STORE_CUSTOMERS, { keyPath: '_id' });
                }
                if (!db.objectStoreNames.contains(STORE_PENDING_CUSTOMERS)) {
                    db.createObjectStore(STORE_PENDING_CUSTOMERS, { keyPath: 'localId', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(STORE_SESSION)) {
                    db.createObjectStore(STORE_SESSION, { keyPath: 'id' });
                }
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // --- PRODUCTOS ---
    async cacheProducts(products: any[]) {
        const db = await this.open();
        const tx = db.transaction(STORE_PRODUCTS, 'readwrite');
        const store = tx.objectStore(STORE_PRODUCTS);
        store.clear();
        products.forEach(p => store.put(p));
    }

    async getCachedProducts(): Promise<any[]> {
        const db = await this.open();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_PRODUCTS, 'readonly');
            const request = tx.objectStore(STORE_PRODUCTS).getAll();
            request.onsuccess = () => resolve(request.result);
        });
    }

    // --- CLIENTES ---
    async cacheCustomers(customers: any[]) {
        const db = await this.open();
        const tx = db.transaction(STORE_CUSTOMERS, 'readwrite');
        const store = tx.objectStore(STORE_CUSTOMERS);
        store.clear();
        customers.forEach(c => store.put(c));
    }

    async getCachedCustomers(): Promise<any[]> {
        const db = await this.open();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_CUSTOMERS, 'readonly');
            const request = tx.objectStore(STORE_CUSTOMERS).getAll();
            request.onsuccess = () => resolve(request.result);
        });
    }

    async savePendingCustomer(customer: any) {
        const db = await this.open();
        const tx = db.transaction(STORE_PENDING_CUSTOMERS, 'readwrite');
        const store = tx.objectStore(STORE_PENDING_CUSTOMERS);
        return new Promise((resolve) => {
            const request = store.add({ ...customer, localId: Date.now() });
            request.onsuccess = () => resolve(request.result);
        });
    }

    async getPendingCustomers(): Promise<any[]> {
        const db = await this.open();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_PENDING_CUSTOMERS, 'readonly');
            const request = tx.objectStore(STORE_PENDING_CUSTOMERS).getAll();
            request.onsuccess = () => resolve(request.result);
        });
    }

    async removeSyncedCustomer(localId: any) {
        const db = await this.open();
        const tx = db.transaction(STORE_PENDING_CUSTOMERS, 'readwrite');
        tx.objectStore(STORE_PENDING_CUSTOMERS).delete(localId);
    }

    // --- VENTAS PENDIENTES ---
    async savePendingSale(sale: any) {
        const db = await this.open();
        const tx = db.transaction(STORE_SALES, 'readwrite');
        tx.objectStore(STORE_SALES).add({
            ...sale,
            offline: true,
            synced: false,
            createdAt: new Date().toISOString()
        });
    }

    async getPendingSales(): Promise<any[]> {
        const db = await this.open();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_SALES, 'readonly');
            const request = tx.objectStore(STORE_SALES).getAll();
            request.onsuccess = () => resolve(request.result);
        });
    }

    async removeSyncedSale(localId: number) {
        const db = await this.open();
        const tx = db.transaction(STORE_SALES, 'readwrite');
        tx.objectStore(STORE_SALES).delete(localId);
    }

    // --- SESIÓN ---
    async setSession(userData: any) {
        const db = await this.open();
        const tx = db.transaction(STORE_SESSION, 'readwrite');
        tx.objectStore(STORE_SESSION).put({ id: 'current', ...userData });
    }

    async getSession(): Promise<any | null> {
        const db = await this.open();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_SESSION, 'readonly');
            const request = tx.objectStore(STORE_SESSION).get('current');
            request.onsuccess = () => resolve(request.result);
        });
    }

    async clearSession() {
        const db = await this.open();
        const tx = db.transaction(STORE_SESSION, 'readwrite');
        tx.objectStore(STORE_SESSION).delete('current');
    }
}

export const jhimsOffline = new OfflineDB();

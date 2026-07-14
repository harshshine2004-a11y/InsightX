const DB_NAME = 'OfflineExcelDashboardDB';
const DB_VERSION = 2;
const STORE_WORKBOOKS = 'workbooks';
const STORE_PREFS = 'preferences';
const STORE_PIVOTS = 'saved_pivots';

export interface ColumnInfo {
  name: string;
  type: 'numeric' | 'date' | 'category' | 'text' | 'percentage' | 'currency' | 'empty';
}

export interface SheetData {
  rows: any[];
  headers: string[];
  columnsInfo: ColumnInfo[];
  headerMappings?: { [originalHeader: string]: string };
}

export interface WorkbookFile {
  id: string; // Usually filename or generated id
  filename: string;
  size: number;
  uploadedAt: number;
  lastOpened: number;
  sheets: { [sheetName: string]: SheetData };
  summary: {
    totalSheets: number;
    totalRecords: number;
    qualityScore: number;
    dateColumnsCount: number;
    numericColumnsCount: number;
    categoryColumnsCount: number;
  };
}

export interface SavedPivot {
  id: string;
  name: string;
  workbookId: string;
  sheetName: string;
  rows: string[];
  columns: string[];
  values: { field: string; aggType: string }[];
  totalsSettings: {
    grandTotal: boolean;
    rowTotals: boolean;
    colTotals: boolean;
    subtotals: boolean;
  };
}

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_WORKBOOKS)) {
        db.createObjectStore(STORE_WORKBOOKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PREFS)) {
        db.createObjectStore(STORE_PREFS);
      }
      if (!db.objectStoreNames.contains(STORE_PIVOTS)) {
        db.createObjectStore(STORE_PIVOTS, { keyPath: 'id' });
      }
    };
  });
}

export const dbService = {
  async saveWorkbook(workbook: WorkbookFile): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_WORKBOOKS, 'readwrite');
      const store = transaction.objectStore(STORE_WORKBOOKS);
      const request = store.put(workbook);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getAllWorkbooks(): Promise<WorkbookFile[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_WORKBOOKS, 'readonly');
      const store = transaction.objectStore(STORE_WORKBOOKS);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as WorkbookFile[];
        results.sort((a, b) => b.uploadedAt - a.uploadedAt);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async getWorkbook(id: string): Promise<WorkbookFile | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_WORKBOOKS, 'readonly');
      const store = transaction.objectStore(STORE_WORKBOOKS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteWorkbook(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_WORKBOOKS, 'readwrite');
      const store = transaction.objectStore(STORE_WORKBOOKS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async savePreference(key: string, value: any): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_PREFS, 'readwrite');
      const store = transaction.objectStore(STORE_PREFS);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getPreference<T>(key: string): Promise<T | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_PREFS, 'readonly');
      const store = transaction.objectStore(STORE_PREFS);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async savePivot(pivot: SavedPivot): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_PIVOTS, 'readwrite');
      const store = transaction.objectStore(STORE_PIVOTS);
      const request = store.put(pivot);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getPivotsForWorkbook(workbookId: string): Promise<SavedPivot[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_PIVOTS, 'readonly');
      const store = transaction.objectStore(STORE_PIVOTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const all = request.result as SavedPivot[];
        resolve(all.filter(p => p.workbookId === workbookId));
      };
      request.onerror = () => reject(request.error);
    });
  },

  async deletePivot(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_PIVOTS, 'readwrite');
      const store = transaction.objectStore(STORE_PIVOTS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async clearAll(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_WORKBOOKS, STORE_PREFS, STORE_PIVOTS], 'readwrite');
      transaction.objectStore(STORE_WORKBOOKS).clear();
      transaction.objectStore(STORE_PREFS).clear();
      transaction.objectStore(STORE_PIVOTS).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
};

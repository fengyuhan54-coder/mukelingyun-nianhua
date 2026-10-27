import type { CreationTask } from './muling-types';

export type MulingHandoff = { id: string; reference: string; createdAt: number };
type StoreName = 'tasks' | 'handoffs';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('muling-creation', 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('tasks')) request.result.createObjectStore('tasks', { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains('handoffs')) request.result.createObjectStore('handoffs', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('无法打开本机相册'));
  });
}
async function transact<T>(storeName: StoreName, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = action(tx.objectStore(storeName));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onerror = tx.onabort = () => { db.close(); reject(new Error('本机相册保存失败，请检查浏览器存储空间，或下载作品备份。')); };
  });
}
export async function saveTask(task: CreationTask) { await transact('tasks', 'readwrite', store => store.put(task)); }
export async function deleteTask(id: string) { await transact('tasks', 'readwrite', store => store.delete(id)); }
export async function listTasks(): Promise<CreationTask[]> {
  const tasks = await transact<CreationTask[]>('tasks', 'readonly', store => store.getAll());
  return tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getTask(id: string): Promise<CreationTask | undefined> {
  return transact<CreationTask | undefined>('tasks', 'readonly', store => store.get(id));
}

export async function saveHandoffReference(reference: string) {
  const id = crypto.randomUUID();
  await transact('handoffs', 'readwrite', store => store.put({ id, reference, createdAt: Date.now() }));
  return id;
}

export async function getHandoffReference(id: string): Promise<string | undefined> {
  const handoff = await transact<MulingHandoff | undefined>('handoffs', 'readonly', store => store.get(id));
  if (!handoff || Date.now() - handoff.createdAt > 30 * 60 * 1000) return undefined;
  return handoff.reference;
}
export async function takeHandoffReference(id: string): Promise<string | undefined> {
  const handoff = await transact<MulingHandoff | undefined>('handoffs', 'readonly', store => store.get(id));
  await transact('handoffs', 'readwrite', store => store.delete(id));
  if (!handoff || Date.now() - handoff.createdAt > 30 * 60 * 1000) return undefined;
  return handoff.reference;
}


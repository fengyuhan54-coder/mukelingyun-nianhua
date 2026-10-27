export type AnimateWork = {
  id: string;
  title: string;
  summary: string;
  prompt: string;
  resolution: string;
  duration: number;
  createdAt: number;
  videoBlob?: Blob;
  remoteUrl?: string;
  taskId?: string;
  sourceArtifactId?: string;
};

const DATABASE_NAME = 'muling-animate-works';
const STORE_NAME = 'works';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('无法打开动态作品库'));
  });
}

function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then(database => new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    transaction.oncomplete = () => {
      database.close();
      resolve(request.result);
    };
    transaction.onerror = transaction.onabort = () => {
      database.close();
      reject(new Error('动态作品保存失败，请检查浏览器存储空间'));
    };
  }));
}

export async function saveAnimateWork(work: AnimateWork) {
  await transact('readwrite', store => store.put(work));
}

export async function listAnimateWorks(): Promise<AnimateWork[]> {
  const works = await transact<AnimateWork[]>('readonly', store => store.getAll());
  return works.sort((left, right) => right.createdAt - left.createdAt);
}

export async function deleteAnimateWork(id: string) {
  await transact('readwrite', store => store.delete(id));
}

export async function migrateLegacyAnimateWorks() {
  const key = '__animate_saved_works__';
  const raw = localStorage.getItem(key);
  if (!raw) return;
  try {
    const legacy = JSON.parse(raw) as Array<{
      id?: string;
      title?: string;
      videoUrl?: string;
      summary?: string;
      prompt?: string;
      resolution?: string;
      duration?: number;
      createdAt?: number;
    }>;
    for (const item of legacy) {
      if (!item.videoUrl) continue;
      await saveAnimateWork({
        id: item.id || crypto.randomUUID(),
        title: item.title || '光影新生国风动效',
        summary: item.summary || '由光影新生 AI 动效创作生成',
        prompt: item.prompt || '',
        resolution: item.resolution || '视频',
        duration: item.duration || 0,
        createdAt: item.createdAt || Date.now(),
        remoteUrl: item.videoUrl,
      });
    }
    localStorage.removeItem(key);
  } catch {
    // 保留无法迁移的旧记录，避免用户数据丢失。
  }
}

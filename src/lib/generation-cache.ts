'use client';

// 会话级生成结果缓存管理
// 使用 sessionStorage 存储，键值对格式：生成页类型 + 用户会话ID
// TTL: 30分钟

export interface CachedGenerationResult {
  // 作品数据
  images: {
    id: string;
    url: string; // Base64 或临时存储路径
    prompt?: string;
  }[];
  
  // 评分数据
  evaluation: {
    dimensions: { name: string; max: number; description?: string }[];
    values: number[];
    totalScore: number;
    scores: Record<string, number>;
    analysis: string;
  } | null;
  
  // 文化科普数据
  culture: {
    dynasty?: { name: string; features: string[]; culturalContext: string };
    architecture?: { type: string; name: string; description: string; keyElements: string[] };
    printStyle?: { name: string; features: string[]; culturalSignificance: string };
    description: string;
    tips: string[];
  } | null;
  
  // 原始表单数据（用于历史作品溯源）
  formData: Record<string, string>;
  
  // 元数据
  type: 'annual-painting' | 'architecture';
  generatedAt: number; // 时间戳
  cachedAt: number; // 缓存时间戳
}

// TTL: 30分钟
const CACHE_TTL = 30 * 60 * 1000;

// 获取会话ID（标签页唯一标识）
function getSessionId(): string {
  // 每次标签页打开生成新的会话ID
  if (typeof window === 'undefined') return '';
  
  let sessionId = sessionStorage.getItem('__generation_session_id__');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('__generation_session_id__', sessionId);
  }
  return sessionId;
}

// 生成缓存键名
function getCacheKey(type: 'annual-painting' | 'architecture'): string {
  const sessionId = getSessionId();
  return `__generation_cache_${type}_${sessionId}__`;
}

// 获取缓存
export function getGenerationCache(
  type: 'annual-painting' | 'architecture'
): CachedGenerationResult | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = getCacheKey(type);
    const cached = sessionStorage.getItem(key);
    
    if (!cached) return null;
    
    const data: CachedGenerationResult = JSON.parse(cached);
    
    // 检查是否过期
    const now = Date.now();
    if (now - data.cachedAt > CACHE_TTL) {
      // 已过期，删除缓存
      sessionStorage.removeItem(key);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

// 保存缓存
export function setGenerationCache(
  type: 'annual-painting' | 'architecture',
  data: Omit<CachedGenerationResult, 'type' | 'cachedAt'>
): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getCacheKey(type);
    const cacheData: CachedGenerationResult = {
      ...data,
      type,
      cachedAt: Date.now()
    };
    
    sessionStorage.setItem(key, JSON.stringify(cacheData));
    
    // 同时更新历史作品存储（供溯源功能使用）
    // 注意：这需要 artwork-storage.ts 中的接口兼容
    if (typeof window !== 'undefined' && (window as any).__updateArtworkCache) {
      (window as any).__updateArtworkCache(type, {
        id: data.images[0]?.id || `cached_${Date.now()}`,
        imageUrl: data.images[0]?.url || '',
        type,
        formData: data.formData,
        generatedAt: data.generatedAt
      });
    }
  } catch (error) {
    console.warn('Failed to save generation cache:', error);
  }
}

// 清除指定类型的缓存
export function clearGenerationCache(
  type: 'annual-painting' | 'architecture'
): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getCacheKey(type);
    sessionStorage.removeItem(key);
  } catch {
    // 忽略错误
  }
}

// 清除所有生成缓存
export function clearAllGenerationCaches(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('__generation_cache_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch {
    // 忽略错误
  }
}

// 检查缓存是否存在且有效（不检查过期）
export function hasValidCache(
  type: 'annual-painting' | 'architecture'
): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const key = getCacheKey(type);
    return sessionStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

// 获取缓存剩余有效时间（毫秒）
export function getCacheRemainingTime(
  type: 'annual-painting' | 'architecture'
): number {
  if (typeof window === 'undefined') return 0;
  
  try {
    const key = getCacheKey(type);
    const cached = sessionStorage.getItem(key);
    
    if (!cached) return 0;
    
    const data: CachedGenerationResult = JSON.parse(cached);
    const elapsed = Date.now() - data.cachedAt;
    const remaining = CACHE_TTL - elapsed;
    
    return Math.max(0, remaining);
  } catch {
    return 0;
  }
}

// 格式化剩余时间
export function formatCacheRemainingTime(ms: number): string {
  if (ms <= 0) return '已过期';
  
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes}分${seconds > 0 ? `${seconds}秒` : ''}`;
  }
  return `${seconds}秒`;
}

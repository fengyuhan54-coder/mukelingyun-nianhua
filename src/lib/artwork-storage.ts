/**
 * 历史作品存储模块
 * 使用内存存储（生产环境建议使用数据库）
 */

// 作品记录类型
export interface ArtworkRecord {
  id: string;
  type: 'annual-painting' | 'architecture';
  imageUrl: string;
  prompt: string;
  style?: string;
  styleName?: string;
  theme?: string;
  themeName?: string;
  dynasty?: string;
  architectureType?: string;
  createdAt: string;
}

// 内存存储
const artworkRecords: ArtworkRecord[] = [];

// 最大存储记录数
const MAX_RECORDS = 100;

/**
 * 保存作品记录
 */
export function saveArtworkRecord(record: Omit<ArtworkRecord, 'id' | 'createdAt'>): ArtworkRecord {
  const newRecord: ArtworkRecord = {
    ...record,
    id: `art_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
  };

  // 添加到数组开头（最新优先）
  artworkRecords.unshift(newRecord);

  // 超过最大数量时删除最旧的记录
  if (artworkRecords.length > MAX_RECORDS) {
    artworkRecords.pop();
  }

  return newRecord;
}

/**
 * 获取作品记录
 */
export function getArtworkRecords(type?: 'annual-painting' | 'architecture'): ArtworkRecord[] {
  if (type) {
    return artworkRecords.filter(r => r.type === type);
  }
  return artworkRecords;
}

/**
 * 根据ID获取单条记录
 */
export function getArtworkRecordById(id: string): ArtworkRecord | undefined {
  return artworkRecords.find(r => r.id === id);
}

/**
 * 清除所有记录（仅用于测试）
 */
export function clearArtworkRecords(): void {
  artworkRecords.length = 0;
}

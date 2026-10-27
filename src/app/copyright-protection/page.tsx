'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import WorkbenchBackButton from '@/components/WorkbenchBackButton';

// 历史作品类型
interface ArtworkRecord {
  id: string;
  type: 'annual-painting' | 'architecture';
  imageUrl: string;
  prompt: string;
  params: Record<string, string>;
  createdAt: string;
}

// 流派数据
const ANNUAL_PAINTING_STYLES = [
  { id: 'zhuxian', name: '开封朱仙镇', region: '豫' },
  { id: 'yangliuqing', name: '天津杨柳青', region: '津' },
  { id: 'taohuawu', name: '苏州桃花坞', region: '苏' },
  { id: 'yangjiapu', name: '山东杨家埠', region: '鲁' },
  { id: 'mianzhu', name: '四川绵竹', region: '川' },
];

const ANNUAL_PAINTING_THEMES = [
  { id: 'menshen', name: '门神' },
  { id: 'shoushou', name: '福禄寿喜' },
  { id: 'caidan', name: '财神' },
  { id: 'guanyin', name: '观音' },
  { id: 'wawa', name: '娃娃' },
  { id: 'shinv', name: '仕女' },
];

// 样式定义
const styles = {
  page: {
    minHeight: '100vh',
    background: `
      linear-gradient(180deg, #faf8f5 0%, #f5f0e8 100%),
      url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d4c4a8' fill-opacity='0.1'%3E%3Cpath d='M0 0h10v10H0zM20 0h10v10H20zM10 10h10v10H10zM0 20h10v10H0zM20 20h10v10H20zM10 30h10v10H10zM0 40h10v10H0zM20 40h10v10H20zM10 50h10v10H10zM0 60h10v10H0zM20 60h10v10H20zM10 70h10v10H10zM0 80h10v10H0zM20 80h10v10H20zM10 90h10v10H10z'/%3E%3C/g%3E%3C/svg%3E")
    `,
    backgroundAttachment: 'fixed' as const,
  },
  header: {
    background: 'linear-gradient(135deg, #c45656 0%, #a34545 100%)',
    color: 'white',
    padding: '32px 20px',
    textAlign: 'center' as const,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  headerPattern: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    opacity: 0.5,
  },
  headerContent: {
    position: 'relative' as const,
    zIndex: 1,
  },
  navBanner: {
    background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
    padding: '10px 20px',
    textAlign: 'center' as const,
  },
  navLink: {
    color: 'white',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.15)',
    padding: '6px 16px',
    borderRadius: '20px',
  },
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '0 20px',
  },
  mainContent: {
    padding: '30px 0',
  },

  // 顶部上传区 - 新布局
  uploadSection: {
    background: 'linear-gradient(180deg, #fff9f0 0%, #f5ebe0 100%)',
    borderRadius: '16px',
    border: '3px solid #d4af37',
    padding: '24px',
    marginBottom: '24px',
    position: 'relative' as const,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  uploadSectionTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#8b4513',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  uploadGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1px 1fr',
    gap: '24px',
    alignItems: 'stretch',
  },
  uploadDivider: {
    background: 'linear-gradient(to bottom, transparent, #d4af37, transparent)',
    width: '1px',
  },
  uploadColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  uploadFrame: {
    border: '4px solid #8b4513',
    borderImage: `repeating-linear-gradient(
      45deg,
      #8b4513,
      #8b4513 10px,
      #d4af37 10px,
      #d4af37 20px
    ) 4`,
    background: '#fffef8',
    minHeight: '180px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px',
    position: 'relative' as const,
    borderRadius: '8px',
  },
  uploadFrameCorner: {
    position: 'absolute' as const,
    width: '24px',
    height: '24px',
    border: '3px solid #c45656',
  },
  uploadIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  uploadHint: {
    fontSize: '13px',
    color: '#8b4513',
    marginTop: '8px',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '240px',
    objectFit: 'contain' as const,
    borderRadius: '8px',
  },

  // 历史作品按钮
  historyButton: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    width: '100%',
    minHeight: '180px',
    padding: '30px',
    background: 'linear-gradient(180deg, #fffdf5 0%, #f9f0e3 100%)',
    border: '3px dashed #d4af37',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  historyButtonIcon: {
    fontSize: '48px',
  },
  historyButtonText: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#8b4513',
    textAlign: 'center' as const,
  },

  // 模态遮罩
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    background: '#fffef8',
    borderRadius: '16px',
    border: '4px solid #d4af37',
    width: '100%',
    maxWidth: '800px',
    maxHeight: '85vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalHeader: {
    background: 'linear-gradient(135deg, #c45656 0%, #a34545 100%)',
    color: 'white',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 700,
  },
  modalClose: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTabs: {
    display: 'flex',
    borderBottom: '2px solid #e8e4e0',
    background: '#faf8f5',
  },
  modalTab: {
    flex: 1,
    padding: '14px 20px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#666',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    borderBottom: '3px solid transparent',
  },
  modalTabActive: {
    color: '#c45656',
    borderBottomColor: '#c45656',
    background: '#fff',
  },
  modalBody: {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#999',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    opacity: 0.5,
  },
  artworkGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '16px',
  },
  artworkItem: {
    cursor: 'pointer',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '3px solid transparent',
    transition: 'all 0.2s',
  },
  artworkItemSelected: {
    borderColor: '#c45656',
    boxShadow: '0 4px 16px rgba(196, 86, 86, 0.4)',
  },
  artworkImage: {
    width: '100%',
    aspectRatio: '1',
    objectFit: 'cover' as const,
    background: '#f5f5f5',
  },
  artworkInfo: {
    padding: '10px',
    background: '#faf8f5',
    fontSize: '12px',
    color: '#666',
  },
  modalFooter: {
    padding: '16px 24px',
    borderTop: '2px solid #e8e4e0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    background: '#faf8f5',
  },
  modalCancelBtn: {
    padding: '10px 24px',
    background: '#f5f5f5',
    border: '2px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#666',
    cursor: 'pointer',
  },
  modalConfirmBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #c45656 0%, #a34545 100%)',
    border: '2px solid #8b2020',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'white',
    cursor: 'pointer',
    opacity: 0.5,
  },
  modalConfirmBtnActive: {
    opacity: 1,
    cursor: 'pointer',
  },

  // 中间功能区
  functionSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '24px',
  },
  functionCard: {
    background: 'linear-gradient(180deg, #fffdf5 0%, #f9f0e3 100%)',
    borderRadius: '16px',
    border: '3px solid #d4af37',
    padding: '24px',
    position: 'relative' as const,
    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
  },
  functionCardLeft: {
    borderColor: '#c45656',
  },
  functionCardRight: {
    borderColor: '#2e8b57',
  },
  functionCardTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#333',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingBottom: '12px',
    borderBottom: '2px dashed #d4c4a8',
  },
  functionDescription: {
    fontSize: '14px',
    color: '#666',
    lineHeight: 1.7,
    marginBottom: '16px',
  },
  priceTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: 'linear-gradient(135deg, #fff5e6 0%, #ffe4cc 100%)',
    border: '2px solid #d4af37',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '16px',
    fontWeight: 700,
    color: '#8b4513',
    marginBottom: '16px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    marginBottom: '16px',
    fontSize: '15px',
    color: '#333',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    accentColor: '#c45656',
  },

  // 表单区域
  formSection: {
    background: '#faf8f5',
    border: '2px solid #d4c4a8',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '16px',
  },
  formTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#8b4513',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e0d4c4',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  formLabel: {
    fontSize: '13px',
    color: '#666',
    fontWeight: 500,
  },
  formInput: {
    padding: '10px 12px',
    border: '2px solid #d4c4a8',
    borderRadius: '8px',
    fontSize: '14px',
    background: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s',
  },

  // 印章按钮
  sealButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px 20px',
    marginTop: '16px',
    background: 'linear-gradient(135deg, #c45656 0%, #a34545 100%)',
    color: 'white',
    border: '3px solid #8b2020',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(196, 86, 86, 0.3)',
    position: 'relative' as const,
  },
  sealDecorate: {
    position: 'absolute' as const,
    top: '-8px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#c45656',
    padding: '2px 12px',
    borderRadius: '4px',
    fontSize: '10px',
    color: '#fff',
    border: '1px solid #8b2020',
  },

  // 区块链平台跳转按钮
  platformButtonRow: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
    marginTop: '16px',
  },
  platformButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #2e8b57 0%, #1e6b47 100%)',
    color: 'white',
    border: '2px solid #1e6b47',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(46, 139, 87, 0.3)',
  },
  platformGuideText: {
    fontSize: '14px',
    color: '#666',
    marginTop: '16px',
    textAlign: 'center' as const,
  },

  // 底部区域
  footerSection: {
    background: 'linear-gradient(180deg, #f5ebe0 0%, #ebe0d0 100%)',
    borderRadius: '16px',
    border: '2px solid #d4c4a8',
    padding: '30px',
    textAlign: 'center' as const,
  },
  footerTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#8b4513',
    marginBottom: '16px',
  },
  hotline: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#c45656',
    marginBottom: '20px',
    letterSpacing: '2px',
  },
  copyrightText: {
    fontSize: '13px',
    color: '#888',
    lineHeight: 1.8,
    maxWidth: '600px',
    margin: '0 auto',
  },
};

// 窗棂装饰组件
function WindowLattice() {
  return (
    <svg width="100%" height="20" viewBox="0 0 100 20" preserveAspectRatio="none" style={{ margin: '12px 0' }}>
      <pattern id="lattice" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="10" height="10" fill="#d4c4a8" />
        <rect x="10" y="10" width="10" height="10" fill="#d4c4a8" />
      </pattern>
      <rect width="100%" height="20" fill="url(#lattice)" />
    </svg>
  );
}

// 回纹装饰组件
function HuiwenDecoration() {
  return (
    <div style={{
      height: '8px',
      background: `repeating-linear-gradient(
        90deg,
        #d4af37 0px,
        #d4af37 6px,
        transparent 6px,
        transparent 12px
      )`,
      margin: '16px 0',
    }} />
  );
}

// 历史作品模态组件
function HistoryModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'annual-painting' | 'architecture'>('annual-painting');
  const [records, setRecords] = useState<ArtworkRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchRecords();
    }
  }, [isOpen, activeTab]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/artwork-history?type=${activeTab}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
      }
    } catch (error) {
      console.error('Failed to fetch records:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    const selected = records.find((r) => r.id === selectedId);
    if (selected) {
      onSelect(selected.imageUrl);
      onClose();
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* 模态头部 */}
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>📚 历史作品溯源</span>
          <button style={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* 标签页 */}
        <div style={styles.modalTabs}>
          <button
            style={{
              ...styles.modalTab,
              ...(activeTab === 'annual-painting' ? styles.modalTabActive : {}),
            }}
            onClick={() => {
              setActiveTab('annual-painting');
              setSelectedId(null);
            }}
          >
            🖼️ 木版年画作品
          </button>
          <button
            style={{
              ...styles.modalTab,
              ...(activeTab === 'architecture' ? styles.modalTabActive : {}),
            }}
            onClick={() => {
              setActiveTab('architecture');
              setSelectedId(null);
            }}
          >
            🏛️ 古建筑作品
          </button>
        </div>

        {/* 模态内容 */}
        <div style={styles.modalBody}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              加载中...
            </div>
          ) : records.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📭</div>
              <p style={{ fontSize: '15px', marginBottom: '8px' }}>暂无该类历史生成作品</p>
              <p style={{ fontSize: '13px' }}>请先前往操作台创作</p>
            </div>
          ) : (
            <div style={styles.artworkGrid}>
              {records.map((record) => (
                <div
                  key={record.id}
                  style={{
                    ...styles.artworkItem,
                    ...(selectedId === record.id ? styles.artworkItemSelected : {}),
                  }}
                  onClick={() => setSelectedId(record.id)}
                >
                  <img
                    src={record.imageUrl}
                    alt="作品缩略图"
                    style={styles.artworkImage}
                    loading="lazy"
                  />
                  <div style={styles.artworkInfo}>
                    <div style={{ marginBottom: '4px' }}>
                      {record.type === 'annual-painting' ? '木版年画' : '古建筑'}
                    </div>
                    <div style={{ color: '#999' }}>{formatDate(record.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 模态底部 */}
        <div style={styles.modalFooter}>
          <button style={styles.modalCancelBtn} onClick={onClose}>
            取消
          </button>
          <button
            style={{
              ...styles.modalConfirmBtn,
              ...(selectedId ? styles.modalConfirmBtnActive : {}),
            }}
            onClick={handleConfirm}
            disabled={!selectedId}
          >
            ✓ 确认选择
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CopyrightProtectionPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 历史作品模态
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // 著作权代理登记状态
  const [copyrightEnabled, setCopyrightEnabled] = useState(false);
  const [copyrightForm, setCopyrightForm] = useState({
    name: '',
    idCard: '',
    phone: '',
    email: '',
  });
  const [copyrightSubmitted, setCopyrightSubmitted] = useState(false);

  // 区块链存证状态
  const [blockchainEnabled, setBlockchainEnabled] = useState(false);

  // 处理文件上传
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('仅支持 JPG、PNG、WebP 格式图片');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 触发文件选择
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // 从历史作品选择
  const handleHistorySelect = (imageUrl: string) => {
    setUploadedImage(imageUrl);
    setSelectedStyle('');
    setSelectedTheme('');
  };

  // 提交著作权代理登记
  const handleCopyrightSubmit = () => {
    if (!copyrightForm.name || !copyrightForm.idCard || !copyrightForm.phone || !copyrightForm.email) {
      alert('请填写完整信息');
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(copyrightForm.phone)) {
      alert('请输入正确的手机号');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(copyrightForm.email)) {
      alert('请输入正确的邮箱地址');
      return;
    }

    setCopyrightSubmitted(true);
    alert('著作权代理登记申请已提交，工作人员将在 1-3 个工作日内与您联系。');
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerPattern} />
        <div style={styles.headerContent}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '8px' }}>
            木刻灵韵•智绘年画
          </h1>
          <p style={{ fontSize: '1rem', opacity: 0.9 }}>
            基于扣子平台 · 内置古建筑专属Prompt模板 · 支持6维评估与文化科普
          </p>
        </div>
      </header>

      {/* Navigation Banner */}
      <WorkbenchBackButton />

      <main style={styles.mainContent}>
        <div style={styles.container}>
          {/* ========== 顶部上传区 (20%) ========== */}
          <section style={styles.uploadSection}>
            <h2 style={styles.uploadSectionTitle}>
              <span>📤</span>
              上传您的作品
            </h2>

            <div style={styles.uploadGrid}>
              {/* 左区：本地上传 */}
              <div style={styles.uploadColumn}>
                <div
                  style={styles.uploadFrame}
                  onClick={triggerFileSelect}
                >
                  <div style={{ ...styles.uploadFrameCorner, top: '8px', left: '8px', borderRight: 'none', borderBottom: 'none' }} />
                  <div style={{ ...styles.uploadFrameCorner, top: '8px', right: '8px', borderLeft: 'none', borderBottom: 'none' }} />
                  <div style={{ ...styles.uploadFrameCorner, bottom: '8px', left: '8px', borderRight: 'none', borderTop: 'none' }} />
                  <div style={{ ...styles.uploadFrameCorner, bottom: '8px', right: '8px', borderLeft: 'none', borderTop: 'none' }} />

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                  />

                  {uploadedImage ? (
                    <div style={{ textAlign: 'center' as const, width: '100%' }}>
                      <img src={uploadedImage} alt="预览" style={styles.previewImage} />
                      <p style={{ ...styles.uploadHint, marginTop: '12px' }}>
                        🔄 点击可重新上传
                      </p>
                    </div>
                  ) : (
                    <>
                      <div style={styles.uploadIcon}>🖼️</div>
                      <p style={{ fontSize: '16px', color: '#8b4513', fontWeight: 600 }}>
                        点击上传年画作品
                      </p>
                      <p style={styles.uploadHint}>
                        仅支持本系统生成的年画作品
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 中间分割线 */}
              <div style={styles.uploadDivider} />

              {/* 右区：历史作品溯源 */}
              <div style={styles.uploadColumn}>
                <div
                  style={{
                    ...styles.uploadFrame,
                    minHeight: '180px',
                    borderColor: '#c45656',
                    borderImage: `repeating-linear-gradient(
                      45deg,
                      #c45656,
                      #c45656 10px,
                      #e8a0a0 10px,
                      #e8a0a0 20px
                    ) 4`,
                  }}
                  onClick={() => setShowHistoryModal(true)}
                >
                  <div style={{ ...styles.uploadFrameCorner, top: '8px', left: '8px', borderRight: 'none', borderBottom: 'none' }} />
                  <div style={{ ...styles.uploadFrameCorner, top: '8px', right: '8px', borderLeft: 'none', borderBottom: 'none' }} />
                  <div style={{ ...styles.uploadFrameCorner, bottom: '8px', left: '8px', borderRight: 'none', borderTop: 'none' }} />
                  <div style={{ ...styles.uploadFrameCorner, bottom: '8px', right: '8px', borderLeft: 'none', borderTop: 'none' }} />

                  <div style={styles.historyButtonIcon}>📚</div>
                  <div style={styles.historyButtonText}>
                    <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
                      历史作品溯源存证
                    </div>
                    <div style={{ fontSize: '13px', color: '#999', fontWeight: 400 }}>
                      快速调取本平台历史生成作品
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 选择来源信息 */}
            {uploadedImage && (
              <div style={{ marginTop: '16px' }}>
                <WindowLattice />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={styles.formLabel}>选择年画流派</label>
                    <select
                      value={selectedStyle}
                      onChange={(e) => setSelectedStyle(e.target.value)}
                      style={{ ...styles.formInput, width: '100%' }}
                    >
                      <option value="">请选择...</option>
                      {ANNUAL_PAINTING_STYLES.map((style) => (
                        <option key={style.id} value={style.id}>
                          {style.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={styles.formLabel}>选择年画主题</label>
                    <select
                      value={selectedTheme}
                      onChange={(e) => setSelectedTheme(e.target.value)}
                      style={{ ...styles.formInput, width: '100%' }}
                    >
                      <option value="">请选择...</option>
                      {ANNUAL_PAINTING_THEMES.map((theme) => (
                        <option key={theme.id} value={theme.id}>
                          {theme.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ========== 中间功能区 (60%) ========== */}
          <div style={styles.functionSection}>
            {/* 左侧：著作权代理登记 */}
            <section style={{ ...styles.functionCard, ...styles.functionCardLeft }}>
              <h3 style={{ ...styles.functionCardTitle, color: '#c45656' }}>
                <span>📜</span>
                著作权代理登记
              </h3>
              <p style={styles.functionDescription}>
                由专业版权代理机构为您提供作品著作权登记代理服务，完成登记后可获得国家版权局颁发的《作品登记证书》，具有法律效力，可用于维权举证、授权交易等场景。
              </p>

              <div style={styles.priceTag}>
                💰 费用：10 元 / 每张
              </div>

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={copyrightEnabled}
                  onChange={(e) => setCopyrightEnabled(e.target.checked)}
                  style={styles.checkbox}
                />
                <span>我需要办理著作权代理登记</span>
              </label>

              {copyrightEnabled && (
                <div style={styles.formSection}>
                  <div style={styles.formTitle}>📝 请填写您的信息</div>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>姓名</label>
                      <input
                        type="text"
                        value={copyrightForm.name}
                        onChange={(e) => setCopyrightForm({ ...copyrightForm, name: e.target.value })}
                        placeholder="请输入真实姓名"
                        style={styles.formInput}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>身份证号</label>
                      <input
                        type="text"
                        value={copyrightForm.idCard}
                        onChange={(e) => setCopyrightForm({ ...copyrightForm, idCard: e.target.value })}
                        placeholder="请输入身份证号码"
                        style={styles.formInput}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>联系电话</label>
                      <input
                        type="tel"
                        value={copyrightForm.phone}
                        onChange={(e) => setCopyrightForm({ ...copyrightForm, phone: e.target.value })}
                        placeholder="请输入手机号码"
                        style={styles.formInput}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>电子邮箱</label>
                      <input
                        type="email"
                        value={copyrightForm.email}
                        onChange={(e) => setCopyrightForm({ ...copyrightForm, email: e.target.value })}
                        placeholder="请输入邮箱地址"
                        style={styles.formInput}
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                style={{
                  ...styles.sealButton,
                  opacity: !copyrightEnabled || !uploadedImage ? 0.5 : 1,
                  cursor: !copyrightEnabled || !uploadedImage ? 'not-allowed' : 'pointer',
                }}
                disabled={!copyrightEnabled || !uploadedImage}
                onClick={handleCopyrightSubmit}
              >
                <div style={styles.sealDecorate}>著作权</div>
                📌 保存并提交申请
              </button>

              {copyrightSubmitted && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px',
                    background: '#fff3e0',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#e65100',
                    textAlign: 'center',
                  }}
                >
                  ✅ 申请已提交，工作人员将尽快与您联系
                </div>
              )}
            </section>

            {/* 右侧：区块链存证 */}
            <section style={{ ...styles.functionCard, ...styles.functionCardRight }}>
              <h3 style={{ ...styles.functionCardTitle, color: '#2e8b57' }}>
                <span>⛓️</span>
                区块链存证
              </h3>
              <p style={styles.functionDescription}>
                利用区块链不可篡改、可追溯的技术特性，将您的作品信息生成唯一的数字指纹（哈希值）并上链存储，生成具有时间戳的存证证书，可作为维权时的电子证据。
              </p>

              <div
                style={{
                  ...styles.priceTag,
                  background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                  borderColor: '#2e8b57',
                }}
              >
                💰 费用：30 元 / 每张
              </div>

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={blockchainEnabled}
                  onChange={(e) => setBlockchainEnabled(e.target.checked)}
                  style={{ ...styles.checkbox, accentColor: '#2e8b57' }}
                />
                <span>我需要办理区块链存证</span>
              </label>

              {blockchainEnabled && (
                <>
                  <p style={styles.platformGuideText}>选择以下平台进行区块链存证</p>
                  <div style={styles.platformButtonRow}>
                    <a
                      href="https://antchain.antgroup.com/solutions/acdc"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.platformButton}
                    >
                      🔗 鲸探数藏
                    </a>
                    <a
                      href="https://xuper.baidu.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.platformButton}
                    >
                      🔗 百度超级链
                    </a>
                    <a
                      href="https://www.zxinchain.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.platformButton}
                    >
                      🔗 至信链
                    </a>
                  </div>
                </>
              )}
            </section>
          </div>

          {/* ========== 底部说明区 (20%) ========== */}
          <section style={styles.footerSection}>
            <HuiwenDecoration />
            <h3 style={styles.footerTitle}>📞 服务热线</h3>
            <div style={styles.hotline}>400-888-6666</div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
              服务时间：周一至周五 9:00-18:00（节假日除外）
            </p>
            <HuiwenDecoration />

            <div style={styles.copyrightText}>
              <p style={{ marginBottom: '12px' }}>
                <strong>版权声明</strong>
              </p>
              <p>
                本平台仅为用户提供 AI 创作工具及版权登记代理服务，所生成作品版权归用户所有。
                区块链存证服务由第三方专业机构提供，链上数据可作为电子证据使用，但具体法律效力
                以司法机关认定为准。如有任何版权纠纷，建议咨询专业律师。
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* 历史作品模态 */}
      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onSelect={handleHistorySelect}
      />

      {/* 页面底部 */}
      <footer
        style={{
          textAlign: 'center',
          padding: '20px',
          color: '#999',
          fontSize: '12px',
          borderTop: '1px solid #e8e4e0',
          marginTop: '20px',
        }}
      >
        © 2024 木版年画AI文生图智能体 · 传承非遗文化
      </footer>
    </div>
  );
}


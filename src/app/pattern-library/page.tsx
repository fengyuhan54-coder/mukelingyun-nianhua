'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WorkbenchBackButton from '@/components/WorkbenchBackButton';
import TaskContextBar from '@/components/TaskContextBar';
import { mergeCreativeTaskCulture, setActiveCreativeTaskId, updateCreativeTaskStep } from '@/lib/creative-task-storage';
import {
  ALL_PATTERN_CATEGORIES,
  getPatternById,
  type PatternItem
} from '@/lib/pattern-library-data';
import { getPatternAssetUrl, hasPatternAsset } from '@/lib/pattern-assets-map';
import { SVG_ICONS, hasPatternSVG } from '@/lib/pattern-svg-icons';

// 色彩项类型定义
interface ColorItem {
  id: string;
  name: string;
  pinyin: string;
  color: string;
  hex?: string;
  rgb?: string;
  meaning: string;
  application?: string;
}

// 素材图片占位图组件（带问号提示）
const PatternPlaceholder = ({ 
  patternName, 
  size = 40 
}: { 
  patternName: string; 
  size?: number;
}) => {
  return (
    <div style={{
      width: size,
      height: size,
      background: 'linear-gradient(135deg, #e8dcc8 0%, #d4c4a8 100%)',
      borderRadius: '8px',
      border: '2px dashed #8b7355',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2px',
      filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.1))'
    }}>
      <span style={{
        fontSize: size * 0.4,
        color: '#8b3a62',
        fontWeight: 700,
        lineHeight: 1,
      }}>?</span>
      <span style={{
        fontSize: size * 0.15,
        color: '#8b7355',
        fontWeight: 500,
        maxWidth: size * 0.9,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>{patternName.slice(0, 2)}</span>
    </div>
  );
};

// 素材图片组件
const PatternAssetImage = ({ 
  patternName,
  size = 40 
}: { 
  patternName: string;
  size?: number;
}) => {
  const assetUrl = getPatternAssetUrl(patternName);
  
  if (!assetUrl) {
    return <PatternPlaceholder patternName={patternName} size={size} />;
  }
  
  return (
    <img 
      src={assetUrl}
      alt={patternName}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        borderRadius: '8px',
        filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.1))',
        background: '#faf8f5',
        padding: '4px',
        border: '1px solid #e8dcc8'
      }}
    />
  );
};

// SVG图标组件（备用）
const PatternIcon = ({ 
  symbol, 
  size = 40,
}: { 
  symbol: string; 
  size?: number;
}) => {
  const hasSvg = hasPatternSVG(symbol);
  
  if (!hasSvg) {
    return <PatternPlaceholder patternName={symbol} size={size} />;
  }
  
  const svgString = SVG_ICONS[symbol];
  const svgWithSize = svgString.replace(
    /<svg([^>]*)>/,
    `<svg$1 width="${size}" height="${size}">`
  );
  
  return (
    <div 
      style={{ 
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.1))'
      }}
      dangerouslySetInnerHTML={{ __html: svgWithSize }}
    />
  );
};

// 渲染纹样图片：优先素材图，其次SVG，最后占位图
const PatternImage = ({ 
  patternName,
  size = 40 
}: { 
  patternName: string;
  size?: number;
}) => {
  // 优先使用素材图片
  if (hasPatternAsset(patternName)) {
    return <PatternAssetImage patternName={patternName} size={size} />;
  }
  
  // 其次使用SVG图标
  if (hasPatternSVG(patternName)) {
    return <PatternIcon symbol={patternName} size={size} />;
  }
  
  // 最后使用占位图
  return <PatternPlaceholder patternName={patternName} size={size} />;
};

// 分类图标组件
// HEX转RGB辅助函数
function hexToRgb(hex: string): string {
  // 如果已经是rgb格式直接返回
  if (hex.startsWith('rgb')) return hex;
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`;
  }
  return hex;
}

const CategoryIcon = ({ icon }: { icon: string }) => {
  return <PatternIcon symbol={icon} size={28} />;
};

// 纹样库数据接口
interface SelectedPattern {
  pattern: PatternItem;
  timestamp: number;
}

// 样式定义
const styles = {
  page: {
    minHeight: '100vh',
    background: `
      linear-gradient(180deg, #faf8f5 0%, #f5f0e8 100%),
      url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d4c4a8' fill-opacity='0.08'%3E%3Cpath d='M0 0h10v10H0zM20 0h10v10H20zM10 10h10v10H10zM0 20h10v10H0zM20 20h10v10H20zM10 30h10v10H10zM0 40h10v10H0zM20 40h10v10H20zM10 50h10v10H10zM0 60h10v10H0zM20 60h10v10H20zM10 70h10v10H10zM0 80h10v10H0zM20 80h10v10H20zM10 90h10v10H10z'/%3E%3C/g%3E%3C/svg%3E")
    `,
    backgroundAttachment: 'fixed' as const,
  },
  header: {
    background: 'linear-gradient(135deg, #c45656 0%, #8b3a62 100%)',
    color: 'white',
    padding: '36px 20px',
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
  headerTitle: {
    fontSize: '32px',
    fontWeight: 700,
    margin: 0,
    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
  },
  headerSubtitle: {
    fontSize: '16px',
    marginTop: '8px',
    opacity: 0.9,
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px',
  },

  // 三大分类卡片区域
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '24px',
    marginBottom: '32px',
  },
  categoryCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '3px solid transparent',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  categoryCardActive: {
    borderColor: '#c45656',
    boxShadow: '0 8px 24px rgba(196, 86, 86, 0.25)',
    transform: 'translateY(-4px)',
  },
  categoryIconWrapper: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    fontSize: '28px',
  },
  categoryName: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#8b3a62',
    marginBottom: '8px',
  },
  categoryDesc: {
    fontSize: '14px',
    color: '#666',
    lineHeight: 1.6,
  },
  categoryCount: {
    marginTop: '12px',
    fontSize: '13px',
    color: '#999',
  },

  // 内容区域
  contentSection: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
  },
  contentHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '2px solid #f0e8e0',
  },
  contentTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#8b3a62',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#faf8f5',
    borderRadius: '20px',
    padding: '8px 16px',
    border: '2px solid #e8e0d5',
  },
  searchInput: {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: '14px',
    width: '180px',
    color: '#333',
  },

  // 子分类标签
  subcategoryWrapper: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
    marginBottom: '24px',
  },
  subcategoryTag: {
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '2px solid transparent',
  },
  subcategoryTagInactive: {
    background: '#f5f0e8',
    color: '#666',
    borderColor: '#e8e0d5',
  },
  subcategoryTagActive: {
    background: 'linear-gradient(135deg, #c45656 0%, #8b3a62 100%)',
    color: 'white',
    borderColor: 'transparent',
  },

  // 纹样网格
  patternGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px',
  },
  patternCard: {
    background: '#faf8f5',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    border: '2px solid transparent',
    position: 'relative' as const,
  },
  patternCardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
  },
  patternCardSelected: {
    borderColor: '#c45656',
    background: '#fff5f5',
  },
  patternSymbol: {
    fontSize: '36px',
    textAlign: 'center' as const,
    marginBottom: '12px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patternName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    textAlign: 'center' as const,
    marginBottom: '6px',
  },
  patternMeaning: {
    fontSize: '12px',
    color: '#888',
    textAlign: 'center' as const,
    lineHeight: 1.5,
  },
  patternBadge: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    background: '#c45656',
    color: 'white',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '10px',
  },

  // 选中纹样区域
  selectedSection: {
    marginTop: '24px',
    background: 'linear-gradient(135deg, #fff9f0 0%, #f5ebe0 100%)',
    borderRadius: '16px',
    padding: '20px',
    border: '3px solid #d4af37',
  },
  selectedHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  selectedTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#8b4513',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  clearBtn: {
    background: '#c45656',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  syncButton: {
    background: '#8B4513',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(139, 69, 19, 0.3)',
  },
  selectedList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '12px',
  },
  selectedItem: {
    background: 'white',
    borderRadius: '12px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: '2px solid #e8d5c4',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  selectedItemSymbol: {
    fontSize: '24px',
  },
  selectedItemInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  selectedItemName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
  },
  selectedItemCategory: {
    fontSize: '12px',
    color: '#888',
  },
  selectedItemRemove: {
    background: 'transparent',
    border: 'none',
    color: '#c45656',
    cursor: 'pointer',
    fontSize: '18px',
    marginLeft: 'auto',
    padding: '4px',
  },
  applyBtn: {
    width: '100%',
    marginTop: '16px',
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #c45656 0%, #8b3a62 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(196, 86, 86, 0.3)',
  },
  applyBtnDisabled: {
    background: '#ccc',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },

  // 提示信息
  emptyTip: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    color: '#999',
    fontSize: '15px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
    opacity: 0.5,
  },

  // 详情弹窗
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modalContent: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '500px',
    width: '100%',
    position: 'relative' as const,
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#8b3a62',
  },
  closeBtn: {
    position: 'absolute' as const,
    right: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    fontSize: '28px',
    color: '#8b4513',
    cursor: 'pointer',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'background 0.2s',
  },
  modalClose: {
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999',
    padding: '4px',
  },
  modalBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  modalColorPreview: {
    width: '100%',
    height: '120px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  modalDetailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  modalDetailItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  modalDetailItemFull: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    gridColumn: '1 / -1',
  },
  modalDetailLabel: {
    fontSize: '12px',
    color: '#999',
    fontWeight: 500,
  },
  modalDetailValue: {
    fontSize: '14px',
    color: '#333',
  },
  modalSymbol: {
    textAlign: 'center' as const,
    marginBottom: '16px',
    padding: '20px',
    background: '#faf6f0',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInfo: {
    background: '#faf8f5',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
  },
  modalMeaning: {
    fontSize: '14px',
    color: '#666',
    lineHeight: 1.7,
  },
  modalExample: {
    fontSize: '13px',
    color: '#888',
    fontStyle: 'italic',
    marginTop: '8px',
  },
  modalCategory: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
  },
  modalCategoryTag: {
    background: '#f0e8e0',
    color: '#8b3a62',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
  },

  // ========== 传统色彩库样式 ==========
  colorLibrarySection: {
    marginTop: '32px',
    padding: '24px',
    background: 'linear-gradient(135deg, #fff9f5 0%, #faf3eb 100%)',
    borderRadius: '16px',
    border: '2px solid #e8d5c4',
  },
  colorLibraryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  colorLibraryTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#8b4513',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  colorCategoryTabs: {
    display: 'flex',
    gap: '8px',
  },
  colorCategoryTab: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: '2px solid #d4af37',
    background: 'white',
    color: '#8b4513',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  colorCategoryTabActive: {
    background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
    color: 'white',
    border: '2px solid #d4af37',
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '16px',
  },
  colorCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '12px',
    border: '2px solid #e8d5c4',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  colorCardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
  },
  colorCardSelected: {
    borderColor: '#c45656',
    boxShadow: '0 0 0 2px rgba(196, 86, 86, 0.2)',
  },
  colorCardHighlighted: {
    borderColor: '#d4af37',
    boxShadow: '0 0 0 3px rgba(212, 175, 55, 0.3)',
    animation: 'pulse 1.5s infinite',
  },
  colorPreview: {
    width: '100%',
    height: '80px',
    borderRadius: '8px',
    marginBottom: '10px',
    border: '3px solid #8B4513',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  colorPreviewInner: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
  },
  colorPreviewText: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.9)',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    fontWeight: 600,
    letterSpacing: '1px',
  },
  colorPreviewOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
    pointerEvents: 'none' as const,
  },
  colorName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '2px',
  },
  colorPinyin: {
    fontSize: '11px',
    color: '#888',
    marginBottom: '4px',
  },
  colorMeaning: {
    fontSize: '11px',
    color: '#c45656',
    lineHeight: 1.4,
  },
  colorBadge: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    background: '#d4af37',
    color: 'white',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '10px',
  },
  colorSelectedBadge: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    background: '#c45656',
    color: 'white',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '10px',
  },

  // ========== 联动操作台样式 ==========
  linkageSection: {
    marginTop: '32px',
    padding: '24px',
    background: 'linear-gradient(135deg, #f5f0e8 0%, #ebe3d5 100%)',
    borderRadius: '16px',
    border: '2px solid #d4af37',
  },
  linkageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  linkageTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#8b4513',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  linkageTip: {
    fontSize: '13px',
    color: '#888',
    background: '#fff9f0',
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid #e8d5c4',
  },
  linkageContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap' as const,
  },
  linkagePatternCount: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'white',
    padding: '12px 20px',
    borderRadius: '12px',
    border: '2px solid #c45656',
  },
  linkagePatternLabel: {
    fontSize: '14px',
    color: '#666',
  },
  linkagePatternValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#c45656',
  },
  linkageArrow: {
    fontSize: '24px',
    color: '#d4af37',
  },
  linkageColorCount: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'white',
    padding: '12px 20px',
    borderRadius: '12px',
    border: '2px solid #d4af37',
  },
  linkageColorLabel: {
    fontSize: '14px',
    color: '#666',
  },
  linkageColorValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#d4af37',
  },
};

// 三大分类配置
const CATEGORY_CONFIG = [
  {
    id: 'personnel-costume',
    name: '人物服饰纹',
    desc: '涵盖衣物纹样、头饰纹样、戏装纹样等，展现传统年画中人物服饰的精美细节',
    icon: 'heyi',
    color: 'linear-gradient(135deg, #c45656 0%, #a34545 100%)',
    count: 0,
  },
  {
    id: 'auspicious-beast',
    name: '吉祥瑞兽纹',
    desc: '收录龙凤麒麟、四灵瑞兽、虫鱼鸟蝶等，寓意吉祥如意、福寿安康',
    icon: 'long',
    color: 'linear-gradient(135deg, #8b3a62 0%, #6b2a4a 100%)',
    count: 0,
  },
  {
    id: 'decorative-pattern',
    name: '装饰底纹',
    desc: '包含吉祥器物、植物纹样、几何纹样等，为年画提供丰富的背景装饰元素',
    icon: 'hehua',
    color: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
    count: 0,
  },
];

// 计算各分类数量
ALL_PATTERN_CATEGORIES.forEach(cat => {
  const config = CATEGORY_CONFIG.find(c => c.id === cat.id);
  if (config) {
    config.count = cat.subcategories.reduce((sum, sub) => sum + sub.patterns.length, 0);
  }
});

// 传统色彩库数据
const COLOR_CATEGORIES = [
  {
    id: 'main',
    name: '木版年画主色',
    colors: [
      { id: 'zhuhong', name: '朱红', pinyin: 'Zhū Hóng', color: '#D9381E', meaning: '喜庆、热烈、驱邪' },
      { id: 'datonghong', name: '大红', pinyin: 'Dà Hóng', color: '#E83636', meaning: '吉祥、热烈、祝福' },
      { id: 'chenghong', name: '橙红', pinyin: 'Chéng Hóng', color: '#E85D04', meaning: '温暖、热情、活力' },
      { id: 'jin', name: '金色', pinyin: 'Jīn Sè', color: '#D4AF37', meaning: '尊贵、财富、光辉' },
      { id: 'huang', name: '明黄', pinyin: 'Míng Huáng', color: '#FFD700', meaning: '皇家、辉煌、至高' },
      { id: 'lv', name: '石绿', pinyin: 'Shí Lǜ', color: '#4A7C59', meaning: '生机、自然、和谐' },
      { id: 'qing', name: '群青', pinyin: 'Qún Qīng', color: '#4169E1', meaning: '深邃、宁静、雅致' },
      { id: 'lan', name: '石蓝', pinyin: 'Shí Lán', color: '#2E5A88', meaning: '稳重、典雅、清新' },
      { id: 'zi', name: '紫色', pinyin: 'Zǐ Sè', color: '#6B3FA0', meaning: '高贵、神秘、祥瑞' },
      { id: 'hei', name: '墨黑', pinyin: 'Mò Hēi', color: '#1C1C1C', meaning: '沉稳、庄重、纳福' },
      { id: 'bai', name: '铅白', pinyin: 'Qiān Bái', color: '#F5F5F5', meaning: '纯洁、干净、素雅' },
      { id: 'tu', name: '赭石', pinyin: 'Zhě Shí', color: '#8B4513', meaning: '厚重、沉稳、朴实' },
    ]
  },
  {
    id: 'auspicious',
    name: '民俗吉祥色',
    colors: [
      { id: 'xiao', name: '桃红', pinyin: 'Táo Hóng', color: '#F08080', meaning: '春意、少女、娇美' },
      { id: 'fu', name: '福字红', pinyin: 'Fú Zì Hóng', color: '#C41E3A', meaning: '福气、吉祥、幸福' },
      { id: 'lu', name: '禄字绿', pinyin: 'Lù Zì Lǜ', color: '#228B22', meaning: '俸禄、功名、事业' },
      { id: 'shou', name: '寿字黄', pinyin: 'Shòu Zì Huáng', color: '#DAA520', meaning: '长寿、福祉、尊贵' },
      { id: 'xi', name: '喜字粉', pinyin: 'Xǐ Zì Fěn', color: '#FFB6C1', meaning: '喜事、婚嫁、快乐' },
      { id: 'cai', name: '财字金', pinyin: 'Cái Zì Jīn', color: '#FFD700', meaning: '财富、财运、生意' },
      { id: 'he', name: '和合色', pinyin: 'Hé Hé Sè', color: '#D2B48C', meaning: '和合、融洽、美好' },
      { id: 'ping', name: '平安青', pinyin: 'Píng Ān Qīng', color: '#5F9EA0', meaning: '平安、吉祥、顺畅' },
      { id: 'ruyi', name: '如意紫', pinyin: 'Rú Yì Zǐ', color: '#9370DB', meaning: '如意、顺心、吉祥' },
      { id: 'jixiang', name: '吉祥蓝', pinyin: 'Jí Xiáng Lán', color: '#6495ED', meaning: '吉祥、美好、希望' },
      { id: 'lian', name: '连年红', pinyin: 'Lián Nián Hóng', color: '#DC143C', meaning: '连年有余、吉祥' },
      { id: 'baoli', name: '报喜色', pinyin: 'Bào Xǐ Sè', color: '#FF6347', meaning: '喜讯、捷报、欢乐' },
    ]
  },
  {
    id: 'regional',
    name: '地域流派专色',
    colors: [
      { id: 'zhuxianhong', name: '朱仙镇红', pinyin: 'Zhū Xiān Zhèn Hóng', color: '#B22222', meaning: '朱仙镇年画专用色' },
      { id: 'zhuxianhuang', name: '朱仙镇黄', pinyin: 'Zhū Xiān Zhèn Huáng', color: '#DAA520', meaning: '古朴厚重' },
      { id: 'yangliuhuang', name: '杨柳青黄', pinyin: 'Yáng Liǔ Qīng Huáng', color: '#F0E68C', meaning: '杨柳青年画仕女色' },
      { id: 'yangliufeng', name: '杨柳青粉', pinyin: 'Yáng Liǔ Qīng Fěn', color: '#FFE4E1', meaning: '细腻娇嫩' },
      { id: 'taohuawuqing', name: '桃花坞青', pinyin: 'Táo Huā Wù Qīng', color: '#4682B4', meaning: '桃花坞年画蓝印花布色' },
      { id: 'taohuawulan', name: '桃花坞蓝', pinyin: 'Táo Huā Wù Lán', color: '#483D8B', meaning: '江南水乡雅致' },
      { id: 'yangjiapuhong', name: '杨家埠红', pinyin: 'Yáng Jiā Bù Hóng', color: '#CD5C5C', meaning: '杨家埠年画红' },
      { id: 'yangjiapulu', name: '杨家埠绿', pinyin: 'Yáng Jiā Bù Lǜ', color: '#6B8E23', meaning: '民间质朴' },
      { id: 'mianzhugreen', name: '绵竹绿', pinyin: 'Mián Zhú Lǜ', color: '#2E8B57', meaning: '绵竹年画竹绿' },
      { id: 'mianzhufeng', name: '绵竹粉', pinyin: 'Mián Zhú Fěn', color: '#FFB7C5', meaning: '柔美秀丽' },
    ]
  },
];

// 纹样与色彩关联映射（用于自动高亮）
const PATTERN_COLOR_ASSOCIATIONS: Record<string, string[]> = {
  // 瑞兽纹 → 吉祥色
  'ma': ['fu', 'lian'],
  'lv': ['fu', 'lian'],
  'hu': ['bao', 'jixiang'],
  'hudie': ['xi', 'xiao'],
  'bianfu': ['xi', 'ruyi'],
  // 人物服饰纹 → 主色
  'cuihonghua': ['xiao', 'baoli'],
  'zhuhuarongqiu': ['xiao', 'yangliufeng'],
  'banfenguan': ['jin', 'yangliuhuang'],
  'honghua': ['fu', 'baoli'],
  'lingzi': ['qing', 'taohuawulan'],
  'dingzi': ['tu', 'yangjiapuhong'],
  'yuwen': ['qing', 'mianzhugreen'],
  'sanjiaowen': ['tu', 'zhuxianhuang'],
  'huiwen': ['tu', 'zhuxianhuang'],
  'shuibowen': ['qing', 'lan'],
  'tuanhuawen': ['xi', 'xiao'],
  'dianzhuangwen': ['tu', 'yangjiapulu'],
};

// 纹样分类与色彩分类关联
const CATEGORY_COLOR_ASSOCIATIONS: Record<string, string> = {
  'personnel-costume': 'main',      // 人物服饰纹 → 主色
  'auspicious-beast': 'auspicious', // 吉祥瑞兽纹 → 吉祥色
  'decorative-pattern': 'regional',  // 装饰底纹 → 地域流派专色
};

export default function PatternLibraryPage() {
  const [taskId, setTaskId] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('personnel-costume');
  const [activeSubcategory, setActiveSubcategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPatterns, setSelectedPatterns] = useState<SelectedPattern[]>([]);
  const [hoveredPattern, setHoveredPattern] = useState<string | null>(null);
  const [detailPattern, setDetailPattern] = useState<PatternItem | null>(null);

  // 色彩库状态
  const [activeColorCategory, setActiveColorCategory] = useState<string>('main');
  const [highlightedColors, setHighlightedColors] = useState<ColorItem[]>([]);
  const [selectedColors, setSelectedColors] = useState<ColorItem[]>([]);
  const [dressSelectionChanged, setDressSelectionChanged] = useState(false);
  const [colorModal, setColorModal] = useState<ColorItem | null>(null);

  useEffect(() => {
    if (!dressSelectionChanged) return;
    localStorage.setItem('__nianhua_dress_selection__', JSON.stringify({
      patterns: selectedPatterns.map(item => ({ id: item.pattern.id, name: item.pattern.name, meaning: item.pattern.meaning })),
      colors: selectedColors.map(item => ({ id: item.id, name: item.name, color: item.color })),
      timestamp: Date.now(),
    }));
  }, [dressSelectionChanged, selectedPatterns, selectedColors]);

  useEffect(() => {
    const linked = new URLSearchParams(window.location.search).get('taskId') || '';
    setTaskId(linked);
    if (linked) setActiveCreativeTaskId(linked);
  }, []);

  // 获取当前分类数据
  const currentCategory = ALL_PATTERN_CATEGORIES.find(cat => cat.id === activeCategory);

  // 获取当前子分类
  const currentSubcategories = currentCategory?.subcategories || [];

  // 初始化子分类
  useEffect(() => {
    if (currentSubcategories.length > 0 && !activeSubcategory) {
      setActiveSubcategory(currentSubcategories[0].id);
    }
  }, [activeCategory, currentSubcategories, activeSubcategory]);

  // 获取当前显示的纹样
  const getDisplayPatterns = () => {
    const patterns: any[] = [];

    if (activeSubcategory) {
      const subcategory = currentSubcategories.find(sub => sub.id === activeSubcategory);
      if (subcategory) {
        patterns.push(...subcategory.patterns);
      }
    } else {
      currentSubcategories.forEach(sub => {
        patterns.push(...sub.patterns);
      });
    }

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return patterns.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.meaning.toLowerCase().includes(query) ||
        p.example.toLowerCase().includes(query)
      );
    }

    return patterns;
  };

  const displayPatterns = getDisplayPatterns();

  // 选中纹样
  const handlePatternClick = (pattern: PatternItem) => {
    setDressSelectionChanged(true);
    const exists = selectedPatterns.some(s => s.pattern.id === pattern.id);
    if (exists) {
      setSelectedPatterns(selectedPatterns.filter(s => s.pattern.id !== pattern.id));
    } else {
      if (selectedPatterns.length < 10) {
        setSelectedPatterns([...selectedPatterns, {
          pattern,
          timestamp: Date.now()
        }]);
      }
    }

    // 根据选中纹样自动高亮对应色组
    const patternIdLower = pattern.id.toLowerCase();
    const matchedColors: ColorItem[] = [];

    // 先尝试精确匹配
    for (const [key, colorIds] of Object.entries(PATTERN_COLOR_ASSOCIATIONS)) {
      if (patternIdLower.includes(key) || key.includes(patternIdLower)) {
        // 找到对应的ColorItem对象
        for (const colorId of colorIds) {
          for (const cat of COLOR_CATEGORIES) {
            const colorItem = cat.colors.find(c => c.id === colorId);
            if (colorItem && !matchedColors.some(m => m.id === colorItem.id)) {
              matchedColors.push(colorItem);
            }
          }
        }
      }
    }

    // 如果没有精确匹配，根据分类关联
    if (matchedColors.length === 0) {
      const categoryColorId = CATEGORY_COLOR_ASSOCIATIONS[activeCategory];
      if (categoryColorId) {
        const category = COLOR_CATEGORIES.find(c => c.id === categoryColorId);
        if (category) {
          matchedColors.push(...category.colors);
        }
      }
    }

    setHighlightedColors([...new Set(matchedColors)]);

    // 如果高亮的色彩不在当前分类，自动切换到对应分类
    const currentColorCategory = COLOR_CATEGORIES.find(c => c.id === activeColorCategory);
    const hasHighlightInCurrent = matchedColors.some(c => currentColorCategory?.colors.some(cc => cc.id === c.id));

    if (matchedColors.length > 0 && !hasHighlightInCurrent) {
      // 查找包含高亮色彩的分类
      for (const cat of COLOR_CATEGORIES) {
        if (cat.colors.some(c => matchedColors.some(m => m.id === c.id))) {
          setActiveColorCategory(cat.id);
          break;
        }
      }
    }
  };

  // 移除选中
  const handleRemovePattern = (patternId: string) => {
    setDressSelectionChanged(true);
    setSelectedPatterns(selectedPatterns.filter(s => s.pattern.id !== patternId));
  };

  // 清空选中纹样
  const handleClearPatterns = () => {
    setDressSelectionChanged(true);
    setSelectedPatterns([]);
  };

  // 清空选中色彩
  const handleClearColors = () => {
    setDressSelectionChanged(true);
    setSelectedColors([]);
  };

  // 清空所有选中
  const handleClearAll = () => {
    setDressSelectionChanged(true);
    setSelectedPatterns([]);
    setSelectedColors([]);
  };

  // 同步到AIGC操作台 - 同时同步纹样和色彩，并跳转到操作台页面
  const handleSyncToAIGC = async () => {
    if (selectedPatterns.length === 0 && selectedColors.length === 0) {
      alert('请先选择纹样或色彩');
      return;
    }

    // 提取纹样ID列表
    const patternIds = selectedPatterns.map(p => p.pattern.id);
    
    // 提取色值列表
    const colorValues = selectedColors;

    // 保存到localStorage供AIGC操作台读取
    localStorage.setItem('pendingPatterns', JSON.stringify(selectedPatterns));
    localStorage.setItem('pendingPatternIds', JSON.stringify(patternIds));
    localStorage.setItem('pendingColors', JSON.stringify(selectedColors));
    localStorage.setItem('pendingColorValues', JSON.stringify(colorValues));
    localStorage.setItem('pendingTimestamp', Date.now().toString());
    localStorage.setItem('syncFromKnowledgeBase', 'true');

    if (taskId) {
      await mergeCreativeTaskCulture(taskId, selectedPatterns.map(item => item.pattern.name), selectedColors.map(item => item.name), selectedPatterns.map(item => item.pattern.meaning));
      await updateCreativeTaskStep(taskId, 'knowledge', 'completed');
      window.location.href = '/?taskId=' + encodeURIComponent(taskId);
    } else {
      window.location.href = '/annual-painting';
    }
  };

  // 应用到AIGC操作台 - 同时同步纹样和色彩
  const handleApplyToAIGC = async () => {
    if (selectedPatterns.length === 0 && selectedColors.length === 0) {
      alert('请先选择纹样或色彩');
      return;
    }

    // 构建纹样描述
    const patternNames = selectedPatterns.map(s => s.pattern.name).join('、');
    const patternMeaning = selectedPatterns.map(s => s.pattern.meaning).join('；');

    // 获取所有选中的色彩完整对象
    const allSelectedColors: ColorItem[] = [];
    COLOR_CATEGORIES.forEach(cat => {
      cat.colors.forEach(color => {
        if (selectedColors.some(c => c.id === color.id)) {
          allSelectedColors.push(color);
        }
      });
    });

    // 存储到 localStorage，供 AIGC 操作台读取
    const data = {
      patterns: selectedPatterns.map(s => ({
        id: s.pattern.id,
        name: s.pattern.name,
        meaning: s.pattern.meaning,
        symbol: s.pattern.symbol,
      })),
      colors: allSelectedColors.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        meaning: c.meaning,
      })),
      combinedText: patternNames ? `融入${patternNames}纹样（${patternMeaning}）` : '',
      timestamp: Date.now()
    };

    localStorage.setItem('__pattern_library_selection__', JSON.stringify(data));

    // 提示用户
    let message = '';
    if (selectedPatterns.length > 0 && selectedColors.length > 0) {
      message = `已同步 ${selectedPatterns.length} 个纹样和 ${selectedColors.length} 个色彩到「木版年画AIGC操作台」！`;
    } else if (selectedPatterns.length > 0) {
      message = `已同步 ${selectedPatterns.length} 个纹样到「木版年画AIGC操作台」！`;
    } else {
      message = `已同步 ${selectedColors.length} 个色彩到「木版年画AIGC操作台」！`;
    }
    alert(message);

    if (taskId) {
      await mergeCreativeTaskCulture(taskId, selectedPatterns.map(item => item.pattern.name), allSelectedColors.map(item => item.name), selectedPatterns.map(item => item.pattern.meaning));
      await updateCreativeTaskStep(taskId, 'knowledge', 'completed');
      window.location.href = '/?taskId=' + encodeURIComponent(taskId);
    } else {
      window.location.href = '/annual-painting';
    }
  };

  // 打开详情弹窗
  const handleOpenDetail = (e: React.MouseEvent, pattern: PatternItem) => {
    e.stopPropagation();
    setDetailPattern(pattern);
  };

  // 选中色彩
  const handleColorClick = (color: ColorItem) => {
    setDressSelectionChanged(true);
    const exists = selectedColors.some(c => c.id === color.id);
    if (exists) {
      setSelectedColors(selectedColors.filter(c => c.id !== color.id));
    } else {
      setSelectedColors([...selectedColors, color]);
    }
  };

  return (
    <div style={styles.page}>
      <WorkbenchBackButton />
      <TaskContextBar taskId={taskId || undefined} />

      {/* 顶部标题区域 */}
      <div style={styles.header}>
        <div style={styles.headerPattern} />
        <div style={styles.headerContent}>
          <h1 style={styles.headerTitle}>木版年画数字化知识库</h1>
          <p style={styles.headerSubtitle}>基于开封朱仙镇木版年画的纹样资源库，支持选型联动AIGC创作</p>
        </div>
      </div>

      <div style={styles.container}>
        {/* 三大分类卡片 */}
        <div style={styles.categoryGrid}>
          {CATEGORY_CONFIG.map(cat => (
            <div
              key={cat.id}
              style={{
                ...styles.categoryCard,
                ...(activeCategory === cat.id ? styles.categoryCardActive : {}),
              }}
              onClick={() => {
                setActiveCategory(cat.id);
                setActiveSubcategory('');
                setSearchQuery('');
              }}
              onMouseEnter={(e) => {
                if (activeCategory !== cat.id) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeCategory !== cat.id) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <div style={{
                ...styles.categoryIconWrapper,
                background: cat.color,
              }}>
                <CategoryIcon icon={cat.icon} />
              </div>
              <h3 style={styles.categoryName}>{cat.name}</h3>
              <p style={styles.categoryDesc}>{cat.desc}</p>
              <p style={styles.categoryCount}>共 {cat.count} 个纹样</p>

              {activeCategory === cat.id && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: cat.color,
                }} />
              )}
            </div>
          ))}
        </div>

        {/* 内容区域 */}
        <div style={styles.contentSection}>
          {/* 搜索和标题 */}
          <div style={styles.contentHeader}>
            <h2 style={styles.contentTitle}>
              <span>🔍</span>
              <span>{currentCategory?.name || '纹样库'}</span>
            </h2>
            <div style={styles.searchBox}>
              <span style={{ fontSize: '16px' }}>🔎</span>
              <input
                type="text"
                placeholder="搜索纹样名称..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>

          {/* 子分类标签 */}
          <div style={styles.subcategoryWrapper}>
            <div
              style={{
                ...styles.subcategoryTag,
                ...(activeSubcategory === '' ? styles.subcategoryTagActive : styles.subcategoryTagInactive),
              }}
              onClick={() => setActiveSubcategory('')}
            >
              全部 ({currentCategory?.subcategories.reduce((sum, sub) => sum + sub.patterns.length, 0) || 0})
            </div>
            {currentSubcategories.map(sub => (
              <div
                key={sub.id}
                style={{
                  ...styles.subcategoryTag,
                  ...(activeSubcategory === sub.id ? styles.subcategoryTagActive : styles.subcategoryTagInactive),
                }}
                onClick={() => setActiveSubcategory(sub.id)}
              >
                {sub.name} ({sub.patterns.length})
              </div>
            ))}
          </div>

          {/* 纹样网格 */}
          {displayPatterns.length > 0 ? (
            <div style={styles.patternGrid}>
              {displayPatterns.map(pattern => {
                const isSelected = selectedPatterns.some(s => s.pattern.id === pattern.id);
                return (
                  <div
                    key={pattern.id}
                    style={{
                      ...styles.patternCard,
                      ...(hoveredPattern === pattern.id ? styles.patternCardHover : {}),
                      ...(isSelected ? styles.patternCardSelected : {}),
                    }}
                    onClick={() => handlePatternClick(pattern)}
                    onMouseEnter={() => setHoveredPattern(pattern.id)}
                    onMouseLeave={() => setHoveredPattern(null)}
                  >
                    {isSelected && <span style={styles.patternBadge}>已选</span>}

                    <div
                      style={{...styles.patternSymbol, cursor: 'pointer'}}
                      onClick={(e) => handleOpenDetail(e, pattern)}
                    >
                      <PatternImage patternName={pattern.name} size={48} />
                    </div>

                    <div style={styles.patternName}>{pattern.name}</div>
                    <div style={styles.patternMeaning}>{pattern.meaning}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.emptyTip}>
              <div style={styles.emptyIcon}>🔍</div>
              <p>未找到匹配的纹样</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>试试其他关键词或分类</p>
            </div>
          )}
        </div>



        {/* ========== 木版年画传统色彩库 ========== */}
        <div style={styles.colorLibrarySection}>
          {/* 标题 */}
          <div style={styles.colorLibraryHeader}>
            <div style={styles.colorLibraryTitle}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              木版年画传统色彩库
            </div>
            {/* 分类切换 */}
            <div style={styles.colorCategoryTabs}>
              {COLOR_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  style={{
                    ...styles.colorCategoryTab,
                    ...(activeColorCategory === cat.id ? styles.colorCategoryTabActive : {})
                  }}
                  onClick={() => setActiveColorCategory(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* 色彩网格 */}
          <div style={styles.colorGrid}>
            {(COLOR_CATEGORIES.find(c => c.id === activeColorCategory)?.colors || []).map(color => {
              const isHighlighted = highlightedColors.some(c => c.id === color.id);
              const isSelected = selectedColors.some(c => c.id === color.id);

              return (
                <div
                  key={color.id}
                  style={{
                    ...styles.colorCard,
                    ...(isHighlighted ? styles.colorCardHighlighted : {}),
                    ...(isSelected ? styles.colorCardSelected : {}),
                  }}
                  onClick={() => handleColorClick(color)}
                  onDoubleClick={() => setColorModal(color)}
                >
                  {/* 色彩预览（带年画质感的色块图片） */}
                  <div
                    style={{
                      ...styles.colorPreview,
                      background: '#5D4037',
                    }}
                  >
                    <div
                      style={{
                        ...styles.colorPreviewInner,
                        background: color.color,
                      }}
                    >
                      <span style={styles.colorPreviewText}>{color.color}</span>
                      <div style={styles.colorPreviewOverlay} />
                    </div>
                  </div>
                  {/* 色彩名称 */}
                  <div style={styles.colorName}>{color.name}</div>
                  {/* 拼音 */}
                  <div style={styles.colorPinyin}>{color.pinyin}</div>
                  {/* 寓意 */}
                  <div style={styles.colorMeaning}>{color.meaning}</div>

                  {/* 徽章 */}
                  {isHighlighted && !isSelected && (
                    <div style={styles.colorBadge}>推荐</div>
                  )}
                  {isSelected && (
                    <div style={styles.colorSelectedBadge}>已选</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ========== 智能联动操作台 ========== */}
        <div style={styles.linkageSection}>
          <div style={styles.linkageHeader}>
            <div style={styles.linkageTitle}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c45656" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              智能联动 AIGC 操作台
            </div>
            <div style={styles.linkageTip}>
              选中纹样将自动匹配推荐色彩组
            </div>
          </div>

          {/* 第一层：已选纹样 + 已选色彩 */}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div style={styles.linkagePatternCount}>
              <span style={styles.linkagePatternLabel}>已选纹样</span>
              <span style={styles.linkagePatternValue}>{selectedPatterns.length}</span>
            </div>

            <div style={styles.linkageColorCount}>
              <span style={styles.linkageColorLabel}>已选色彩</span>
              <span style={styles.linkageColorValue}>{selectedColors.length}</span>
            </div>
          </div>

          {/* 第二层：已选纹样详情 - 显示缩略图与名称 */}
          {selectedPatterns.length > 0 && (
            <div style={{ marginBottom: '16px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #e8d5c4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', color: '#888' }}>已选纹样 ({selectedPatterns.length})</div>
                <button
                  onClick={handleClearPatterns}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    color: '#c0392b',
                    background: '#fff5f5',
                    border: '1px solid #c0392b',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  清空纹样
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {selectedPatterns.map(sp => (
                  <div key={sp.pattern.id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '60px',
                  }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '6px',
                      background: '#f5f0e8',
                      border: '1px solid #d4c4b0',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {(() => {
                        const assetUrl = getPatternAssetUrl(sp.pattern.name);
                        if (assetUrl) {
                          return <img src={assetUrl} alt={sp.pattern.name} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />;
                        }
                        return <span style={{ fontSize: '20px' }}>{sp.pattern.symbol}</span>;
                      })()}
                    </div>
                    <span style={{ fontSize: '11px', color: '#8b4513', marginTop: '4px', textAlign: 'center', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sp.pattern.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 已选色彩展示栏 */}
          {selectedColors.length > 0 && (
            <div style={{ marginBottom: '16px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #e8d5c4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', color: '#888' }}>已选色彩 ({selectedColors.length})</div>
                <button
                  onClick={handleClearColors}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    color: '#c0392b',
                    background: '#fff5f5',
                    border: '1px solid #c0392b',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  清空色彩
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {selectedColors.map((color, idx) => (
                  <div key={`${color.id}-${idx}`} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    background: '#f9f6f2',
                    borderRadius: '6px',
                    border: '1px solid #e8d5c4',
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      background: color.color,
                      border: '1px solid rgba(0,0,0,0.1)',
                    }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '11px', color: '#8b4513', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {color.name}
                      </span>
                      <span style={{ fontSize: '10px', color: '#999' }}>{color.color}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 第三层：推荐色彩网格 */}
          <div style={{
            padding: '16px',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e8d5c4',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '12px',
              paddingBottom: '10px',
              borderBottom: '1px solid #f0e6d8'
            }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#8b4513' }}>推荐色彩组</span>
              {selectedPatterns.length === 0 && (
                <span style={{ fontSize: '12px', color: '#999' }}>（请先选择纹样）</span>
              )}
            </div>
            
            {/* 推荐色彩展示 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {highlightedColors.length > 0 ? (
                highlightedColors.map(color => (
                  <div key={color.name} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px',
                    background: '#faf8f5',
                    borderRadius: '8px',
                    border: '2px solid #d4af37',
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      background: color.color,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      border: '2px solid #fff',
                    }} />
                    <span style={{ fontSize: '11px', color: '#666' }}>{color.name}</span>
                  </div>
                ))
              ) : (
                <div style={{
                  width: '100%',
                  padding: '20px',
                  textAlign: 'center',
                  color: '#999',
                  fontSize: '13px'
                }}>
                  {selectedPatterns.length === 0 
                    ? '请先在纹样库中选择纹样，系统将自动推荐匹配的色组' 
                    : '暂无匹配的推荐色彩'}
                </div>
              )}
            </div>
          </div>

          {/* 同步按钮 */}
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
            <button
              style={styles.syncButton}
              onClick={() => void handleSyncToAIGC()}
              disabled={selectedPatterns.length === 0 && selectedColors.length === 0}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
              {taskId ? '应用到当前任务' : '同步到木版年画 AIGC 操作台'}
            </button>
            <button
              type="button"
              style={{ ...styles.syncButton, marginLeft: '10px', background: '#fff8f3', color: '#9b302b', border: '1px solid #c45656' }}
              onClick={() => { window.location.href = '/nianhua-dress'; }}
            >
              用于年画变装 ↗
            </button>
          </div>
        </div>

        </div>

        {/* 色彩详情弹窗 */}
        {colorModal && (
          <div style={styles.modalOverlay} onClick={() => setColorModal(null)}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>{colorModal.name}</h3>
                <button style={styles.closeBtn} onClick={() => setColorModal(null)}>×</button>
              </div>
              <div style={styles.modalBody}>
                {/* 大图预览 */}
                <div style={{
                  ...styles.modalColorPreview,
                  background: colorModal.color,
                }} />
                {/* 详细信息 */}
                <div style={styles.modalDetailGrid}>
                  <div style={styles.modalDetailItem}>
                    <span style={styles.modalDetailLabel}>色彩名称</span>
                    <span style={styles.modalDetailValue}>{colorModal.name}</span>
                  </div>
                  <div style={styles.modalDetailItem}>
                    <span style={styles.modalDetailLabel}>拼音</span>
                    <span style={styles.modalDetailValue}>{colorModal.pinyin}</span>
                  </div>
                  <div style={styles.modalDetailItem}>
                    <span style={styles.modalDetailLabel}>HEX值</span>
                    <span style={{...styles.modalDetailValue, fontFamily: 'monospace'}}>{colorModal.color}</span>
                  </div>
                  <div style={styles.modalDetailItem}>
                    <span style={styles.modalDetailLabel}>RGB值</span>
                    <span style={{...styles.modalDetailValue, fontFamily: 'monospace'}}>{hexToRgb(colorModal.color)}</span>
                  </div>
                  <div style={styles.modalDetailItemFull}>
                    <span style={styles.modalDetailLabel}>文化寓意</span>
                    <span style={styles.modalDetailValue}>{colorModal.meaning}</span>
                  </div>
                  <div style={styles.modalDetailItemFull}>
                    <span style={styles.modalDetailLabel}>应用场景</span>
                    <span style={styles.modalDetailValue}>年画创作、装饰设计</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* 详情弹窗 */}
      {detailPattern && (
        <div style={styles.modal} onClick={() => setDetailPattern(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{detailPattern.name}</h3>
              <button style={styles.modalClose} onClick={() => setDetailPattern(null)}>×</button>
            </div>

            <div style={styles.modalSymbol}>
              <PatternImage patternName={detailPattern.name} size={100} />
            </div>

            <div style={styles.modalCategory}>
              <span style={styles.modalCategoryTag}>{detailPattern.categoryName}</span>
              <span style={styles.modalCategoryTag}>{detailPattern.subcategoryName}</span>
            </div>

            <div style={styles.modalInfo}>
              <p style={styles.modalMeaning}>
                <strong>寓意：</strong>{detailPattern.meaning}
              </p>
              {detailPattern.example && (
                <p style={styles.modalExample}>
                  <strong>示例：</strong>{detailPattern.example}
                </p>
              )}
            </div>

            <button
              style={{
                ...styles.applyBtn,
                ...(selectedPatterns.some(s => s.pattern.id === detailPattern.id) ? styles.applyBtnDisabled : {}),
              }}
              onClick={() => {
                handlePatternClick(detailPattern);
                setDetailPattern(null);
              }}
            >
              {selectedPatterns.some(s => s.pattern.id === detailPattern.id) ? '✓ 已选中' : '+ 选中此纹样'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


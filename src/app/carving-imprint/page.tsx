'use client';

import { useState, useRef, useCallback, DragEvent, useEffect } from 'react';
import WorkbenchBackButton from '@/components/WorkbenchBackButton';
import { 
  extractLayers, 
  mergeLayers, 
  loadImage, 
  fileToDataURL, 
  type Layer 
} from '@/lib/image-processor';

type ProcessStage = 'idle' | 'separating' | 'separated' | 'integrating' | 'integrated';
type KnowledgeTab = 'separate' | 'integrate' | 'craft';

// 样式定义
const styles = {
  pageContainer: {
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
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '0 16px',
  },
  mainContent: {
    padding: '30px 0',
  },

  // 通栏视频模块
  videoSection: {
    width: '100%',
    background: '#1a1a1a',
    padding: '16px',
    boxSizing: 'border-box' as const,
  },
  videoContainer: {
    width: '100%',
    height: '350px',
    background: '#000',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative' as const,
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  videoElement: {
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
  },
  videoOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(124,58,237,0.1) 100%)',
    color: '#fff',
    fontSize: '14px',
  },
  videoHint: {
    background: 'rgba(0,0,0,0.7)',
    padding: '8px 16px',
    borderRadius: '20px',
    marginTop: '12px',
    fontSize: '12px',
  },

  // 核心区双栏布局
  coreSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '24px',
  },
  
  // 左栏上传区卡片
  uploadCard: {
    background: 'linear-gradient(180deg, #fff9f0 0%, #f5ebe0 100%)',
    borderRadius: '16px',
    border: '3px solid #d4af37',
    padding: '20px',
    position: 'relative' as const,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  uploadFrame: {
    border: '4px solid #8b4513',
    background: `
      repeating-linear-gradient(
        45deg,
        #f5e6d3 0px,
        #f5e6d3 10px,
        #fffef8 10px,
        #fffef8 20px
      )
    `,
    minHeight: '280px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px 20px',
    position: 'relative' as const,
    borderRadius: '8px',
  },
  previewWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    width: '100%',
  },
  previewImage: {
    maxWidth: '60%',
    maxHeight: '160px',
    objectFit: 'contain' as const,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  previewHint: {
    fontSize: '13px',
    color: '#8b4513',
    marginTop: '12px',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
    justifyContent: 'center',
  },
  uploadIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  uploadTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#8b4513',
    marginBottom: '6px',
  },

  // 主站紫色品牌按钮
  brandButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    border: '2px solid #6d28d9',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: 700,
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: 'linear-gradient(135deg, #c45656 0%, #a34545 100%)',
    border: '2px solid #8b3a3a',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(196, 86, 86, 0.3)',
  },

  // 右栏知识中心
  knowledgeCard: {
    background: 'linear-gradient(180deg, #fff9f0 0%, #f5ebe0 100%)',
    borderRadius: '16px',
    border: '3px solid #d4af37',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  knowledgeCardHeader: {
    background: 'linear-gradient(135deg, #8b4513 0%, #6b3410 100%)',
    padding: '14px 18px',
    borderBottom: '3px solid #d4af37',
  },
  knowledgeCardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 700,
  },
  knowledgeCardBody: {
    padding: '16px',
  },
  tabNav: {
    display: 'flex',
    borderBottom: '2px solid #e8e4e0',
    marginBottom: '16px',
  },
  tabButton: {
    flex: 1,
    padding: '10px 8px',
    background: 'transparent',
    border: 'none',
    fontSize: '13px',
    color: '#666',
    cursor: 'pointer',
    transition: 'all 0.2s',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
  },
  tabButtonActive: {
    color: '#c45656',
    fontWeight: 600,
    borderBottomColor: '#c45656',
  },
  tabContent: {
    minHeight: '180px',
  },
  tabContentTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    fontWeight: 700,
    color: '#8b4513',
    marginBottom: '10px',
  },
  tabContentText: {
    fontSize: '13px',
    color: '#555',
    lineHeight: 1.7,
    marginBottom: '12px',
  },
  tabHighlight: {
    background: '#fff8e1',
    border: '1px solid #d4af37',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '12px',
  },
  resetButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
    border: '2px solid #4b5563',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  // 分层展示与整合区
  layersSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '24px',
  },
  functionCard: {
    background: 'linear-gradient(180deg, #fff9f0 0%, #f5ebe0 100%)',
    borderRadius: '16px',
    border: '3px solid #d4af37',
    padding: '20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  functionCardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: 700,
    color: '#8b4513',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '2px solid #e8e4e0',
  },

  // 分层列表样式
  layersContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  layerItem: {
    background: '#fffef8',
    border: '2px solid #d4c4a8',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s',
    cursor: 'grab',
    userSelect: 'none' as const,
  },
  layerItemActive: {
    borderColor: '#c45656',
    background: '#fff5f5',
    cursor: 'grab',
  },
  layerItemDragging: {
    opacity: 0.5,
    cursor: 'grabbing',
  },
  layerItemHint: {
    fontSize: '11px',
    color: '#999',
    textAlign: 'center' as const,
    marginTop: '4px',
  },
  layerNumber: {
    width: '28px',
    height: '28px',
    background: 'linear-gradient(135deg, #c45656 0%, #a34545 100%)',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    flexShrink: 0,
  },
  layerInfo: {
    flex: 1,
  },
  layerName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#333',
  },
  layerType: {
    fontSize: '12px',
    color: '#666',
    marginTop: '2px',
  },
  layerThumb: {
    width: '50px',
    height: '50px',
    objectFit: 'cover' as const,
    borderRadius: '4px',
    border: '1px solid #d4c4a8',
    flexShrink: 0,
  },
  layerClickHint: {
    fontSize: '10px',
    color: '#c45656',
    fontWeight: 600,
  },

  // 整合预览区样式
  previewContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
  },
  previewFrame: {
    flex: 1,
    background: '#fffef8',
    border: '3px solid #d4c4a8',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    position: 'relative' as const,
    overflow: 'hidden',
    transition: 'all 0.2s',
  },
  previewFrameActive: {
    borderColor: '#8b5cf6',
    borderStyle: 'dashed',
    background: '#faf5ff',
  },
  previewCanvas: {
    maxWidth: '100%',
    maxHeight: '200px',
    objectFit: 'contain' as const,
  },
  previewPlaceholder: {
    color: '#999',
    fontSize: '14px',
    textAlign: 'center' as const,
    padding: '20px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
  },
  secondaryButton: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: 'linear-gradient(135deg, #2e8b57 0%, #1e6b47 100%)',
    border: '2px solid #1a5035',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  // 已叠加图层指示器
  stackedLayersIndicator: {
    display: 'flex',
    gap: '6px',
    marginTop: '12px',
    flexWrap: 'wrap' as const,
  },
  stackedLayerDot: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    color: 'white',
  },

  // 处理中状态
  processingBox: {
    background: 'linear-gradient(180deg, #fff9f0 0%, #f5ebe0 100%)',
    borderRadius: '12px',
    border: '2px solid #d4af37',
    padding: '24px',
    textAlign: 'center' as const,
    marginBottom: '24px',
  },
  processingText: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#8b4513',
    marginTop: '10px',
  },
  progressBar: {
    height: '6px',
    background: '#e8e4e0',
    borderRadius: '3px',
    overflow: 'hidden',
    marginTop: '12px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #c45656, #d4af37)',
    transition: 'width 0.3s',
  },
};

// 知识内容数据
const knowledgeContent: Record<string, {
  title: string;
  icon: string;
  description: string;
  highlight?: string;
  details: string[];
}> = {
  separate: {
    title: "色彩分层剥离",
    icon: "1",
    description: "通过先进的图像处理算法，将年画按颜色通道、线条粗细、色块区域自动拆分为多张独立的单色图像，模拟传统雕版分色雕刻的过程。",
    details: [
      "轮廓线稿层：提取图像边缘和主体线条",
      "暗部线条层：分离深色区域的细节层次",
      "主色调层：提取画面主体颜色",
      "辅色调层：补充次要色彩区域",
    ],
  },
  integrate: {
    title: "分层拓印整合",
    icon: "2",
    description: "依次叠加各层色彩，模拟传统拓印上色流程。支持拖拽投放和点击投放两种方式自由组合图层。",
    details: [
      "拖拽投放：将左侧图层拖入右侧整合区",
      "点击投放：直接点击左侧图层自动叠加",
      "自由组合：不受顺序限制，创意试玩",
      "自动整合：一键按标准顺序完成叠加",
    ],
  },
  craft: {
    title: "传统工艺",
    icon: "3",
    description: "木版年画是中国民间传统艺术，承载着深厚的文化底蕴。每一幅精品都需要经过多道工序才能完成。",
    highlight: "一幅精品木版年画最多需刻制12套色版，手工套印上百次才能完成。",
    details: [
      "线稿版先行：先刻制最核心的线条轮廓版",
      "分色刻版：按颜色分区刻制独立色版",
      "手工套印：逐层对齐、反复印制",
      "技艺传承：数百年代代相传的民间智慧",
    ],
  },
};

export default function CarvingImprintPage() {
  // 状态管理
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [displayLayers, setDisplayLayers] = useState<(Layer | null)[]>([]);
  const [integratedImage, setIntegratedImage] = useState<string | null>(null);
  const [stage, setStage] = useState<ProcessStage>('idle');
  const [separatingProgress, setSeparatingProgress] = useState(0);
  const [integratingLayer, setIntegratingLayer] = useState<number | null>(null);
  const [knowledgeTab, setKnowledgeTab] = useState<KnowledgeTab>('separate');
  
  // 新增：图层叠加相关状态
  const [stackedLayerIds, setStackedLayerIds] = useState<number[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggingLayerId, setDraggingLayerId] = useState<number | null>(null);
  const [recentlyAddedLayerId, setRecentlyAddedLayerId] = useState<number | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const integrateCanvasRef = useRef<HTMLCanvasElement>(null);
  const stackedCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // 图层名称配置
  const layerNames = ['轮廓线稿', '暗部线条', '主色调', '辅色调'];
  
  // 加载图片
  const loadImage = async (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };
  
  // 处理文件上传
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const dataUrl = await fileToDataURL(file);
      setOriginalImage(dataUrl);
      setStage('idle');
      setLayers([]);
      setDisplayLayers([]);
      setIntegratedImage(null);
      setStackedLayerIds([]);
    } catch (error) {
      console.error('图片加载失败:', error);
    }
  }, []);
  
  // 开始分层处理
  const handleStartSeparate = useCallback(async () => {
    if (!originalImage) return;
    
    setStage('separating');
    setSeparatingProgress(0);
    setStackedLayerIds([]);
    
    try {
      const img = await loadImage(originalImage);
      
      const progressInterval = setInterval(() => {
        setSeparatingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 200);
      
      const extractedLayers = await extractLayers(img, 4);
      
      clearInterval(progressInterval);
      setSeparatingProgress(100);
      
      const newDisplayLayers: (Layer | null)[] = new Array(extractedLayers.length).fill(null);
      setDisplayLayers(newDisplayLayers);
      setLayers(extractedLayers);
      
      for (let i = 0; i < extractedLayers.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 400));
        newDisplayLayers[i] = extractedLayers[i];
        setDisplayLayers([...newDisplayLayers]);
      }
      
      setTimeout(() => {
        setStage('separated');
      }, 500);
      
    } catch (error) {
      console.error('分层处理失败:', error);
      setStage('idle');
    }
  }, [originalImage]);
  
  // 拖拽开始
  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, layerId: number) => {
    e.dataTransfer.setData('text/plain', String(layerId));
    e.dataTransfer.effectAllowed = 'copy';
    setDraggingLayerId(layerId);
  }, []);
  
  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    setDraggingLayerId(null);
    setIsDragOver(false);
  }, []);
  
  // 拖拽进入目标区域
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);
  
  // 拖拽离开目标区域
  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);
  
  // 投放到整合区
  const addLayerToStack = useCallback((layerId: number) => {
    setStackedLayerIds(prev => {
      // 如果已存在，移除旧的（这样该层会移到最上面）
      const filtered = prev.filter(id => id !== layerId);
      return [...filtered, layerId];
    });
    
    // 设置最近添加的高亮
    setRecentlyAddedLayerId(layerId);
    setTimeout(() => setRecentlyAddedLayerId(null), 500);
    
    // 更新整合预览
    updateStackedPreview();
  }, []);
  
  // 点击投放图层
  const handleLayerClick = useCallback((layerId: number) => {
    if (stage !== 'separated' && stage !== 'integrating') return;
    addLayerToStack(layerId);
  }, [stage, addLayerToStack]);
  
  // 更新叠加预览（真正的图层混合效果）
  const updateStackedPreview = useCallback(async () => {
    if (stackedLayerIds.length === 0 || layers.length === 0) {
      setIntegratedImage(null);
      return;
    }
    
    const canvas = stackedCanvasRef.current;
    if (!canvas) return;
    
    const firstLayer = layers[0];
    canvas.width = firstLayer.imageData.width;
    canvas.height = firstLayer.imageData.height;
    
    const ctx = canvas.getContext('2d')!;
    
    // 填充白色背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 按叠加顺序绘制每一层（使用 drawImage 实现真正的叠加）
    for (const layerId of stackedLayerIds) {
      const layerIdx = layers.findIndex(l => l.id === layerId);
      if (layerIdx === -1) continue;
      
      const layer = layers[layerIdx];
      
      // 创建临时canvas存储图层数据
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = layer.imageData.width;
      tempCanvas.height = layer.imageData.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(layer.imageData, 0, 0);
      
      // 根据图层类型设置不同的透明度，模拟木版套印效果
      let opacity = 0.7;
      if (layer.type === 'outline') opacity = 0.9; // 线稿需要清晰
      if (layer.type === 'highlight') opacity = 0.5; // 高光透明度低
      
      // 真正的叠加：使用 drawImage + globalAlpha 实现图层混合
      ctx.globalAlpha = opacity;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.globalAlpha = 1.0;
    }
    
    setIntegratedImage(canvas.toDataURL('image/png'));
    setStage(stackedLayerIds.length === layers.length ? 'integrated' : 'separated');
  }, [stackedLayerIds, layers]);
  
  // 自动整合（按标准顺序，真实叠加效果）
  const handleStartIntegrate = useCallback(async () => {
    if (layers.length === 0) return;
    
    setStage('integrating');
    setStackedLayerIds([]);
    setIntegratedImage(null);
    
    // 创建临时canvas存储每层的图像
    const tempCanvases: HTMLCanvasElement[] = layers.map(layer => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = layer.imageData.width;
      tempCanvas.height = layer.imageData.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(layer.imageData, 0, 0);
      return tempCanvas;
    });
    
    // 整合预览canvas
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;
    
    previewCanvas.width = layers[0].imageData.width;
    previewCanvas.height = layers[0].imageData.height;
    
    const previewCtx = previewCanvas.getContext('2d')!;
    
    // 填充白色背景
    previewCtx.fillStyle = '#ffffff';
    previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // 先清空叠加显示
    setDisplayLayers([]);
    
    // 按标准顺序叠加：线稿→暗部→主色→辅色
    const standardOrder = [...layers].sort((a, b) => {
      const order = { 'outline': 0, 'detail': 1, 'color-block': 2, 'highlight': 3 };
      return (order[a.type as keyof typeof order] ?? 4) - (order[b.type as keyof typeof order] ?? 4);
    });
    
    const layerCanvases = standardOrder.map(layer => {
      const idx = layers.findIndex(l => l.id === layer.id);
      return tempCanvases[idx];
    });
    
    for (let i = 0; i < standardOrder.length; i++) {
      const layer = standardOrder[i];
      const layerCanvas = layerCanvases[i];
      
      setIntegratingLayer(i);
      
      // 添加到叠加区
      setStackedLayerIds(prev => [...prev, layer.id]);
      
      // 获取该图层的透明度
      let opacity = 0.7;
      if (layer.type === 'outline') opacity = 0.9; // 线稿需要清晰
      if (layer.type === 'highlight') opacity = 0.5; // 高光透明度低
      
      // 真正的叠加：使用 drawImage + globalAlpha 实现图层混合
      previewCtx.globalAlpha = opacity;
      previewCtx.globalCompositeOperation = 'source-over';
      previewCtx.drawImage(layerCanvas, 0, 0);
      previewCtx.globalAlpha = 1.0;
      
      // 更新整合预览（每次叠加后都刷新显示）
      setIntegratedImage(previewCanvas.toDataURL('image/png'));
      
      // 更新分层展示区的显示（每叠加一层就显示一层效果）
      const newDisplayLayers = [...Array(standardOrder.length).fill(null)];
      for (let j = 0; j <= i; j++) {
        const tempC = document.createElement('canvas');
        tempC.width = layers[0].imageData.width;
        tempC.height = layers[0].imageData.height;
        const tempCtx2 = tempC.getContext('2d')!;
        tempCtx2.fillStyle = '#ffffff';
        tempCtx2.fillRect(0, 0, tempC.width, tempC.height);
        
        for (let k = 0; k <= j; k++) {
          const l = standardOrder[k];
          const layerIdx = layers.findIndex(layer => layer.id === l.id);
          let op = 0.7;
          if (l.type === 'outline') op = 0.9;
          if (l.type === 'highlight') op = 0.5;
          tempCtx2.globalAlpha = op;
          tempCtx2.drawImage(tempCanvases[layerIdx], 0, 0);
          tempCtx2.globalAlpha = 1.0;
        }
        newDisplayLayers[j] = tempC.toDataURL('image/png');
      }
      setDisplayLayers(newDisplayLayers);
      
      // 等待动画时间
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    setIntegratingLayer(null);
    setStage('integrated');
  }, [layers]);
  
  // 逐步叠加（每次加一层）
  const handleStepIntegrate = useCallback(async () => {
    if (layers.length === 0) return;
    
    // 找到下一个未叠加的层
    const nextLayer = layers.find(l => !stackedLayerIds.includes(l.id));
    if (!nextLayer) return;
    
    addLayerToStack(nextLayer.id);
  }, [layers, stackedLayerIds, addLayerToStack]);
  
  // 清除叠加
  const handleClearStack = useCallback(() => {
    setStackedLayerIds([]);
    setIntegratedImage(null);
    setStage('separated');
  }, []);
  
  // 重置
  const handleReset = useCallback(() => {
    setOriginalImage(null);
    setLayers([]);
    setDisplayLayers([]);
    setIntegratedImage(null);
    setStage('idle');
    setIntegratingLayer(null);
    setSeparatingProgress(0);
    setStackedLayerIds([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);
  
  // 移除单个图层
  const handleRemoveLayer = useCallback((layerId: number) => {
    setStackedLayerIds(prev => prev.filter(id => id !== layerId));
    setTimeout(() => updateStackedPreview(), 0);
  }, [updateStackedPreview]);
  
  // 获取图层类型标签
  const getLayerTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'outline': '轮廓线稿',
      'detail': '暗部线条',
      'color-block': '色块',
      'highlight': '高光',
    };
    return labels[type] || type;
  };
  
  // 获取图层颜色
  const getLayerColor = (index: number) => {
    const colors = ['#c45656', '#2e8b57', '#8b5cf6', '#d4af37'];
    return colors[index % colors.length];
  };

  // 更新整合预览（当叠加图层变化时）
  useEffect(() => {
    if (stackedLayerIds.length > 0) {
      updateStackedPreview();
    }
  }, [stackedLayerIds, updateStackedPreview]);

  return (
    <div style={styles.pageContainer}>
      <WorkbenchBackButton />
      
      {/* 主标题 */}
      <div style={styles.header}>
        <div style={styles.headerPattern} />
        <div style={styles.headerContent}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '8px', letterSpacing: '2px' }}>
            传统雕版拓印模拟系统
          </h1>
          <p style={{ fontSize: '14px', opacity: 0.9 }}>
            体验木版年画色彩分层剥离与还原的艺术过程
          </p>
        </div>
      </div>
      
      {/* 通栏视频模块 */}
      <div style={styles.videoSection}>
        <div style={styles.videoContainer}>
          <video
            src="/videos/woodblock-nianhua.mp4"
            controls
            style={styles.videoElement}
            playsInline
          >
            您的浏览器不支持视频播放
          </video>
        </div>
      </div>
      
      {/* 主内容区 */}
      <div style={styles.container}>
        <div style={styles.mainContent}>
          
          {/* 核心区：左右双栏 */}
          <div style={styles.coreSection}>
            
            {/* 左栏：上传操作区 */}
            <div style={styles.uploadCard}>
              <div style={styles.uploadFrame}>
                {originalImage ? (
                  <div style={styles.previewWrapper}>
                    <img 
                      src={originalImage} 
                      alt="原始图片" 
                      style={styles.previewImage}
                    />
                    <p style={styles.previewHint}>已加载年画作品</p>
                    <div style={styles.buttonRow}>
                      <button
                        onClick={handleStartSeparate}
                        disabled={stage !== 'idle'}
                        style={{
                          ...styles.primaryButton,
                          opacity: stage !== 'idle' ? 0.6 : 1,
                          cursor: stage !== 'idle' ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <span>🪵</span>
                        <span>开始分离</span>
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={styles.resetButton}
                      >
                        <span>↻</span>
                        <span>重新上传</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={styles.uploadIcon}>🖼️</div>
                    <h3 style={styles.uploadTitle}>上传木版年画作品</h3>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={styles.brandButton}
                    >
                      <span>⬆️</span>
                      <span>选择本地图片</span>
                    </button>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>
              <p style={{ 
                textAlign: 'center', 
                fontSize: '12px', 
                color: '#888', 
                marginTop: '10px' 
              }}>
                支持 JPG、PNG 格式
              </p>
            </div>
            
            {/* 右栏：知识中心 */}
            <div style={styles.knowledgeCard}>
              <div style={styles.knowledgeCardHeader}>
                <div style={styles.knowledgeCardTitle}>
                  <span>📚</span>
                  <span>雕版拓印知识中心</span>
                </div>
              </div>
              
              <div style={styles.knowledgeCardBody}>
                {/* 选项卡导航 */}
                <div style={styles.tabNav}>
                  <button
                    onClick={() => setKnowledgeTab('separate')}
                    style={{
                      ...styles.tabButton,
                      ...(knowledgeTab === 'separate' ? styles.tabButtonActive : {}),
                    }}
                  >
                    色彩分层剥离
                  </button>
                  <button
                    onClick={() => setKnowledgeTab('integrate')}
                    style={{
                      ...styles.tabButton,
                      ...(knowledgeTab === 'integrate' ? styles.tabButtonActive : {}),
                    }}
                  >
                    分层拓印整合
                  </button>
                  <button
                    onClick={() => setKnowledgeTab('craft')}
                    style={{
                      ...styles.tabButton,
                      ...(knowledgeTab === 'craft' ? styles.tabButtonActive : {}),
                    }}
                  >
                    传统工艺
                  </button>
                </div>
                
                {/* 选项卡内容 */}
                <div style={styles.tabContent}>
                  <div style={styles.tabContentTitle}>
                    <span style={{ fontSize: '16px' }}>
                      {knowledgeTab === 'separate' ? '🎨' : knowledgeTab === 'integrate' ? '🖌️' : '🏛️'}
                    </span>
                    <span>{knowledgeContent[knowledgeTab].title}</span>
                  </div>
                  <p style={styles.tabContentText}>
                    {knowledgeContent[knowledgeTab].description}
                  </p>
                  
                  <ul style={{ marginTop: '12px', paddingLeft: '18px' }}>
                    {knowledgeContent[knowledgeTab].details.map((detail, index) => (
                      <li key={index} style={{ fontSize: '13px', color: '#555', marginBottom: '6px', lineHeight: 1.6 }}>
                        {detail}
                      </li>
                    ))}
                  </ul>
                  
                  {knowledgeContent[knowledgeTab].highlight && (
                    <div style={styles.tabHighlight}>
                      <p style={{ fontSize: '13px', color: '#8b4513', fontWeight: 600, margin: 0 }}>
                        💡 {knowledgeContent[knowledgeTab].highlight}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* 处理中状态 */}
          {stage === 'separating' && (
            <div style={styles.processingBox}>
              <div style={{ fontSize: '40px' }}>🪵</div>
              <p style={styles.processingText}>雕版分离处理中...</p>
              <div style={styles.progressBar}>
                <div 
                  style={{
                    ...styles.progressFill,
                    width: `${Math.min(separatingProgress, 100)}%`
                  }} 
                />
              </div>
              <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                {Math.round(separatingProgress)}%
              </p>
            </div>
          )}
          
          {/* 分层展示与整合区 */}
          {(stage === 'separated' || stage === 'integrating' || stage === 'integrated') && (
            <div style={styles.layersSection}>
              
              {/* 左侧：分层展示（可拖拽） */}
              <div style={styles.functionCard}>
                <h3 style={styles.functionCardTitle}>
                  <span>📜</span>
                  <span>色彩分层剥离</span>
                </h3>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                  拖拽或点击图层到右侧整合区
                </p>
                
                <div style={styles.layersContainer}>
                  {layers.map((layer, index) => (
                    <div key={layer.id}>
                      <div 
                        draggable
                        onDragStart={(e) => handleDragStart(e, layer.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleLayerClick(layer.id)}
                        style={{
                          ...styles.layerItem,
                          ...(displayLayers[index] ? styles.layerItemActive : {}),
                          ...(draggingLayerId === layer.id ? styles.layerItemDragging : {}),
                          ...(recentlyAddedLayerId === layer.id ? {
                            transform: 'scale(1.02)',
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                          } : {}),
                        }}
                      >
                        <div style={styles.layerNumber}>{index + 1}</div>
                        <div style={styles.layerInfo}>
                          <div style={styles.layerName}>第{index + 1}层：{layer.name}</div>
                          <div style={styles.layerType}>
                            {getLayerTypeLabel(layer.type)}
                          </div>
                        </div>
                        {displayLayers[index] && (
                          <img 
                            src={layer.thumbnail} 
                            alt={layer.name}
                            style={styles.layerThumb}
                          />
                        )}
                        <div style={styles.layerClickHint}>点击投放</div>
                      </div>
                      <p style={styles.layerItemHint}>↔️ 拖拽到右侧叠加</p>
                    </div>
                  ))}
                </div>
                
                <div style={{ marginTop: '14px' }}>
                  <button
                    onClick={handleReset}
                    style={{
                      ...styles.resetButton,
                      width: '100%',
                    }}
                  >
                    <span>↺</span>
                    <span>重新开始</span>
                  </button>
                </div>
              </div>
              
              {/* 右侧：整合预览（投放目标） */}
              <div 
                style={{
                  ...styles.functionCard,
                  ...(isDragOver ? {
                    borderColor: '#8b5cf6',
                    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.2)',
                  } : {}),
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const layerIdStr = e.dataTransfer.getData('text/plain');
                  const layerId = parseInt(layerIdStr, 10);
                  if (!isNaN(layerId)) {
                    addLayerToStack(layerId);
                  }
                }}
              >
                <h3 style={styles.functionCardTitle}>
                  <span>🎨</span>
                  <span>分层拓印整合</span>
                </h3>
                
                <div style={styles.previewContainer}>
                  <div style={{
                    ...styles.previewFrame,
                    ...(isDragOver ? styles.previewFrameActive : {}),
                  }}>
                    {integratedImage ? (
                      <img 
                        src={integratedImage} 
                        alt="整合结果"
                        style={styles.previewCanvas}
                      />
                    ) : (
                      <>
                        <canvas 
                          ref={previewCanvasRef}
                          style={{ display: 'none' }}
                        />
                        <canvas 
                          ref={stackedCanvasRef}
                          style={{ display: 'none' }}
                        />
                        <div style={styles.previewPlaceholder}>
                          {isDragOver ? (
                            <span style={{ color: '#8b5cf6', fontWeight: 600 }}>
                              ✨ 释放以叠加图层
                            </span>
                          ) : (
                            <>
                              <p>将左侧图层拖拽到此处</p>
                              <p style={{ marginTop: '8px', fontSize: '12px' }}>
                                或直接点击图层缩略图投放
                              </p>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* 已叠加图层指示器 */}
                  {stackedLayerIds.length > 0 && (
                    <div style={styles.stackedLayersIndicator}>
                      {stackedLayerIds.map((layerId, index) => {
                        const layerIndex = layers.findIndex(l => l.id === layerId);
                        const isNew = recentlyAddedLayerId === layerId;
                        return (
                          <div 
                            key={layerId}
                            onClick={() => handleRemoveLayer(layerId)}
                            title={`点击移除第${layerIndex + 1}层`}
                            style={{
                              ...styles.stackedLayerDot,
                              background: getLayerColor(layerIndex),
                              cursor: 'pointer',
                              transform: isNew ? 'scale(1.2)' : 'scale(1)',
                              transition: 'transform 0.3s',
                              boxShadow: isNew ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                            }}
                          >
                            {layerIndex + 1}
                          </div>
                        );
                      })}
                      <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px', alignSelf: 'center' }}>
                        ({stackedLayerIds.length}/{layers.length}层) 点击移除
                      </span>
                    </div>
                  )}
                  
                  <div style={styles.buttonGroup}>
                    <button
                      onClick={handleStartIntegrate}
                      disabled={stage === 'integrating'}
                      style={{
                        ...styles.primaryButton,
                        flex: 1,
                        opacity: stage === 'integrating' ? 0.6 : 1,
                        cursor: stage === 'integrating' ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span>⚡</span>
                      <span>自动整合</span>
                    </button>
                    <button
                      onClick={handleStepIntegrate}
                      disabled={stage === 'integrating' || stackedLayerIds.length >= layers.length}
                      style={{
                        ...styles.secondaryButton,
                        flex: 1,
                        opacity: stage === 'integrating' || stackedLayerIds.length >= layers.length ? 0.6 : 1,
                        cursor: stage === 'integrating' || stackedLayerIds.length >= layers.length ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span>➕</span>
                      <span>分步叠加</span>
                    </button>
                    <button
                      onClick={handleClearStack}
                      disabled={stackedLayerIds.length === 0}
                      style={{
                        ...styles.resetButton,
                        opacity: stackedLayerIds.length === 0 ? 0.6 : 1,
                        cursor: stackedLayerIds.length === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span>🗑️</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}


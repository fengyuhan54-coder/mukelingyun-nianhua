'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import WorkbenchBackButton from '@/components/WorkbenchBackButton';
import TaskContextBar from '@/components/TaskContextBar';
import { addCreativeTaskArtifact, getCreativeTask, putCreativeTaskAsset, setActiveCreativeTaskId, updateCreativeTaskStep } from '@/lib/creative-task-storage';
import { getPatternAssetUrl } from '@/lib/pattern-assets-map';
import {
  getGenerationCache,
  setGenerationCache,
  clearGenerationCache,
  getCacheRemainingTime,
  formatCacheRemainingTime,
  CachedGenerationResult
} from '@/lib/generation-cache';

// 纹样库联动相关接口
interface PatternLibrarySelection {
  patterns: Array<{ id: string; name: string; meaning: string; symbol: string }>;
  colors: Array<{ id: string; name: string; color: string; meaning: string }>;
  combinedText: string;
  timestamp: number;
}

// 检查纹样库选择状态
const checkPatternLibrarySelection = (): PatternLibrarySelection | null => {
  try {
    const data = localStorage.getItem('__pattern_library_selection__');
    if (data) {
      const selection: PatternLibrarySelection = JSON.parse(data);
      // 检查是否在30分钟内
      if (Date.now() - selection.timestamp < 30 * 60 * 1000) {
        return selection;
      }
    }
    // 也检查旧的 pendingColors 格式（向后兼容）
    const pendingColors = localStorage.getItem('pendingColors');
    const pendingPatterns = localStorage.getItem('pendingPatterns');
    if (pendingColors || pendingPatterns) {
      const patterns = pendingPatterns ? JSON.parse(pendingPatterns) : [];
      const colors = pendingColors ? JSON.parse(pendingColors) : [];
      const timestamp = parseInt(localStorage.getItem('pendingTimestamp') || '0');
      if (Date.now() - timestamp < 30 * 60 * 1000) {
        return {
          patterns: patterns.map((p: any) => ({
            id: p.pattern?.id || p.id,
            name: p.pattern?.name || p.name,
            meaning: p.pattern?.meaning || p.meaning,
            symbol: p.pattern?.symbol || '🎨',
          })),
          colors: colors.map((c: any) => ({
            id: c.id,
            name: c.name,
            color: c.color || c.hex || '#c0392b',
            meaning: c.meaning,
          })),
          combinedText: '',
          timestamp,
        };
      }
    }
  } catch (e) {
    console.error('Failed to read pattern library selection:', e);
  }
  return null;
};

// 木版年画流派数据
const ANNUAL_PAINTING_STYLES = [
  { id: 'zhuxian', name: '开封朱仙镇', region: '豫', description: '北方木版年画代表' },
  { id: 'yangliuqing', name: '天津杨柳青', region: '津', description: '精工细作，色彩艳丽' },
  { id: 'taohuawu', name: '苏州桃花坞', region: '苏', description: '南方木版年画发源地' },
  { id: 'yangjiapu', name: '山东杨家埠', region: '鲁', description: '民间艺术瑰宝' },
  { id: 'mianzhu', name: '四川绵竹', region: '川', description: '西南年画重镇' },
];

// 木版年画主题 (ID与后端themeMaterialLibrary一致)
const ANNUAL_PAINTING_THEMES = [
  { id: 'menshen', name: '门神' },
  { id: 'shoushou', name: '福禄寿喜' },
  { id: 'caidan', name: '财神' },
  { id: 'guanyin', name: '观音' },
  { id: 'wawa', name: '娃娃' },
  { id: 'shinv', name: '仕女' },
  { id: 'custom', name: '自定义主题' },
];

// 年画纹样库数据
const PATTERN_CATEGORIES = [
  {
    id: 'auspicious',
    name: '吉祥瑞兽纹',
    patterns: [
      { id: 'lianhua', name: '莲花纹', symbol: '🌸', meaning: '清廉、连生贵子、出淤泥而不染' },
      { id: 'hehua', name: '荷花纹', symbol: '🌺', meaning: '和合美满、夫妻恩爱' },
      { id: 'qilin', name: '麒麟纹', symbol: '🦒', meaning: '吉祥如意、送子神兽' },
      { id: 'long', name: '龙纹', symbol: '🐉', meaning: '尊贵、权威、祥瑞' },
      { id: 'feng', name: '凤凰纹', symbol: '🦅', meaning: '百鸟之王、祥瑞之兆' },
      { id: 'huli', name: '狐狸纹', symbol: '🦊', meaning: '机智聪慧、灵气' },
      { id: 'shizi', name: '狮子纹', symbol: '🦁', meaning: '驱邪避害、威严' },
      { id: 'zhang', name: '獬豸纹', symbol: '🦬', meaning: '正义、光明、驱邪' },
      { id: 'baihe', name: '仙鹤纹', symbol: '🦢', meaning: '延年益寿、君子风骨' },
      { id: 'lu', name: '鹿纹', symbol: '🦌', meaning: '福禄寿喜、俸禄' },
      { id: 'zhuque', name: '朱雀纹', symbol: '🦜', meaning: '南方之神、祥瑞' },
      { id: 'xuanwu', name: '玄武纹', symbol: '🐢', meaning: '北方之神、长寿' },
    ]
  },
  {
    id: 'flower',
    name: '花果草木纹',
    patterns: [
      { id: 'mudan', name: '牡丹纹', symbol: '🌸', meaning: '富贵荣华、繁荣昌盛' },
      { id: 'meihua', name: '梅花纹', symbol: '🌺', meaning: '坚韧不拔、高洁傲骨' },
      { id: 'lanhua', name: '兰花纹', symbol: '🌻', meaning: '品性高洁、典雅' },
      { id: 'zhuhua', name: '竹纹', symbol: '🎋', meaning: '节节高升、清高' },
      { id: 'songhua', name: '松纹', symbol: '🌲', meaning: '长寿坚韧、坚贞' },
      { id: 'taohua', name: '桃花纹', symbol: '🌸', meaning: '爱情甜蜜、桃李满天下' },
      { id: 'jinhua', name: '菊花纹', symbol: '🌼', meaning: '延年益寿、清雅' },
      { id: 'shiliu', name: '石榴纹', symbol: '🍎', meaning: '多子多福、子孙满堂' },
      { id: 'putao', name: '葡萄纹', symbol: '🍇', meaning: '子孙繁多、硕果累累' },
      { id: 'pingguo', name: '苹果纹', symbol: '🍎', meaning: '平安吉祥、健康' },
      { id: 'tao', name: '桃纹', symbol: '🍑', meaning: '福寿安康、仙桃' },
      { id: 'gui', name: '桂花纹', symbol: '🌼', meaning: '金桂飘香、尊贵' },
    ]
  },
  {
    id: 'myth',
    name: '神话传说纹',
    patterns: [
      { id: 'baoxian', name: '八仙纹', symbol: '👥', meaning: '八仙过海、各显神通' },
      { id: 'riyue', name: '日月纹', symbol: '☀️', meaning: '阴阳调和、昼夜交替' },
      { id: 'xingxing', name: '星辰纹', symbol: '⭐', meaning: '光照大地、指引方向' },
      { id: 'xiannv', name: '仙女纹', symbol: '👩', meaning: '天上人间、美丽善良' },
      { id: 'shouxing', name: '寿星纹', symbol: '🧓', meaning: '福寿安康、长命百岁' },
      { id: 'zhushou', name: '祝寿纹', symbol: '🎂', meaning: '福如东海、寿比南山' },
      { id: 'riliu', name: '日晷纹', symbol: '⏰', meaning: '时光流转、岁月' },
      { id: 'yueliang', name: '月亮纹', symbol: '🌙', meaning: '月圆人团圆、美好' },
      { id: 'wanggong', name: '蟠桃纹', symbol: '🍑', meaning: '仙桃献寿、吉祥' },
      { id: 'longmen', name: '龙门纹', symbol: '🚪', meaning: '鱼跃龙门、学业有成' },
      { id: 'fuxou', name: '福寿纹', symbol: '🎊', meaning: '福寿双全、吉祥' },
      { id: 'tianyi', name: '天女散花纹', symbol: '🌸', meaning: '天花乱坠、美好' },
    ]
  },
  {
    id: 'folk',
    name: '民俗生活纹',
    patterns: [
      { id: 'baojin', name: '抱金童', symbol: '👶', meaning: '招财进宝、金玉满堂' },
      { id: 'liannián', name: '莲年有鱼', symbol: '🐟', meaning: '连年有余、富足有余' },
      { id: 'wawacai', name: '娃娃采莲', symbol: '👶', meaning: '活泼可爱、生活美好' },
      { id: 'tiaowu', name: '舞蹈纹', symbol: '💃', meaning: '欢乐祥和、喜庆' },
      { id: 'xiqin', name: '喜庆祝寿', symbol: '🎉', meaning: '喜事临门、福寿' },
      { id: 'genggu', name: '耕织图', symbol: '🌾', meaning: '农耕文明、勤劳' },
      { id: 'shangye', name: '商业繁华', symbol: '🏮', meaning: '生意兴隆、财源广进' },
      { id: 'jieri', name: '节日喜庆', symbol: '🎊', meaning: '节日团圆、欢乐' },
      { id: 'zhongyuan', name: '中元祈福', symbol: '🕯️', meaning: '祭祀先人、祈福' },
      { id: 'tiejiang', name: '铁匠劳作', symbol: '🔨', meaning: '工匠精神、勤劳' },
      { id: 'mianyang', name: '牧羊纹', symbol: '🐑', meaning: '悠闲自在、生活' },
      { id: 'binfeng', name: '宾客盈门', symbol: '🏠', meaning: '人丁兴旺、热情' },
    ]
  },
  {
    id: 'geometric',
    name: '几何装饰纹',
    patterns: [
      { id: 'wan', name: '万字纹', symbol: '✝️', meaning: '万寿无疆、吉祥' },
      { id: 'hui', name: '回纹', symbol: '🔲', meaning: '连绵不断、吉利' },
      { id: 'lian', name: '连钱纹', symbol: '💰', meaning: '财源滚滚、富足' },
      { id: 'chuan', name: '盘长纹', symbol: '🔮', meaning: '连绵不绝、长寿' },
      { id: 'tong', name: '铜钱纹', symbol: '🪙', meaning: '招财进宝、富贵' },
      { id: 'lin', name: '鳞纹', symbol: '🐟', meaning: '鱼鳞层层、富贵' },
      { id: 'yunsi', name: '云丝纹', symbol: '☁️', meaning: '云淡风轻、自由' },
      { id: 'lei', name: '雷纹', symbol: '⚡', meaning: '驱邪避害、力量' },
      { id: 'fang', name: '方胜纹', symbol: '💎', meaning: '胜利吉祥、勇敢' },
      { id: 'su', name: '锁纹', symbol: '🔐', meaning: '平安吉祥、守护' },
      { id: 'bian', name: '编钟纹', symbol: '🔔', meaning: '音乐和谐、美好' },
      { id: 'jia', name: '甲胄纹', symbol: '🛡️', meaning: '驱邪护身、安全' },
    ]
  },
];

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
      // 开封朱仙镇
      { id: 'zhuxianhong', name: '朱仙镇红', pinyin: 'Zhū Xiān Zhèn Hóng', color: '#B22222', meaning: '朱仙镇年画专用色' },
      { id: 'zhuxianhuang', name: '朱仙镇黄', pinyin: 'Zhū Xiān Zhèn Huáng', color: '#DAA520', meaning: '古朴厚重' },
      // 天津杨柳青
      { id: 'yangliuhuang', name: '杨柳青黄', pinyin: 'Yáng Liǔ Qīng Huáng', color: '#F0E68C', meaning: '杨柳青年画仕女色' },
      { id: 'yangliufeng', name: '杨柳青粉', pinyin: 'Yáng Liǔ Qīng Fěn', color: '#FFE4E1', meaning: '细腻娇嫩' },
      // 苏州桃花坞
      { id: 'taohuawuqing', name: '桃花坞青', pinyin: 'Táo Huā Wù Qīng', color: '#4682B4', meaning: '桃花坞年画蓝印花布色' },
      { id: 'taohuawulan', name: '桃花坞蓝', pinyin: 'Táo Huā Wù Lán', color: '#483D8B', meaning: '江南水乡雅致' },
      // 山东杨家埠
      { id: 'yangjiapuhong', name: '杨家埠红', pinyin: 'Yáng Jiā Bù Hóng', color: '#CD5C5C', meaning: '杨家埠年画红' },
      { id: 'yangjiapulu', name: '杨家埠绿', pinyin: 'Yáng Jiā Bù Lǜ', color: '#6B8E23', meaning: '民间质朴' },
      // 四川绵竹
      { id: 'mianzhugreen', name: '绵竹绿', pinyin: 'Mián Zhú Lǜ', color: '#2E8B57', meaning: '绵竹年画竹绿' },
      { id: 'mianzhufeng', name: '绵竹粉', pinyin: 'Mián Zhú Fěn', color: '#FFB7C5', meaning: '柔美秀丽' },
    ]
  },
];

// 图片上传结果类型
interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  extractedElements: string;
}

export default function AnnualPaintingPage() {
  const [taskId, setTaskId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [formData, setFormData] = useState({
    styleId: '',
    themeId: '',
    customTheme: '',
    specificElement: '',
    additionalRequirements: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageResult, setImageResult] = useState<any>(null);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [cultureResult, setCultureResult] = useState<any>(null);
  const [error, setError] = useState('');

  // 上传图片相关状态
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 知识库状态
  const [patternCategory, setPatternCategory] = useState('auspicious');
  const [colorCategory, setColorCategory] = useState('main');
  const [selectedPattern, setSelectedPattern] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  // 纹样库同步状态
  const [patternLibraryPatterns, setPatternLibraryPatterns] = useState<PatternLibrarySelection | null>(null);
  const [showPatternSyncTip, setShowPatternSyncTip] = useState(false);
  const [handoffNotice, setHandoffNotice] = useState('');

  useEffect(() => {
    const linked = new URLSearchParams(window.location.search).get('taskId') || '';
    if (!linked) return;
    setTaskId(linked); setActiveCreativeTaskId(linked);
    void getCreativeTask(linked).then(task => {
      if (!task) return;
      const culture = [...task.cultureSelections.patterns, ...task.cultureSelections.colors, ...task.cultureSelections.meanings].join('、');
      setFormData(previous => ({ ...previous, customTheme: previous.customTheme || task.purpose || task.title, themeId: previous.themeId || 'custom', additionalRequirements: [task.brief, culture].filter(Boolean).join('；') }));
      setHandoffNotice('已接续任务“' + task.title + '”，创作要求和文化素材已自动填入。');
    });
  }, []);

  // 从 AI 对话工作台进入时，恢复本次创作的流派、主题与用户指令。
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('__annual_painting_workbench_handoff__');
      if (!raw) return;
      const handoff = JSON.parse(raw);
      if (!handoff?.timestamp || Date.now() - handoff.timestamp > 30 * 60 * 1000) {
        sessionStorage.removeItem('__annual_painting_workbench_handoff__');
        return;
      }
      setFormData({
        styleId: typeof handoff.styleId === 'string' ? handoff.styleId : '',
        themeId: typeof handoff.themeId === 'string' ? handoff.themeId : '',
        customTheme: typeof handoff.customTheme === 'string' ? handoff.customTheme : '',
        specificElement: typeof handoff.specificElement === 'string' ? handoff.specificElement : '',
        additionalRequirements: typeof handoff.userInstruction === 'string'
          ? handoff.userInstruction
          : (typeof handoff.additionalRequirements === 'string' ? handoff.additionalRequirements : ''),
      });
      setHandoffNotice('已自动带入 AI 对话工作台中的年画流派、主题和创作指令。');
      sessionStorage.removeItem('__annual_painting_workbench_handoff__');
      window.setTimeout(() => document.getElementById('annual-painting-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    } catch {
      sessionStorage.removeItem('__annual_painting_workbench_handoff__');
    }
  }, []);

  // 检查纹样库选择
  useEffect(() => {
    const selection = checkPatternLibrarySelection();
    if (selection && (selection.patterns.length > 0 || (selection.colors && selection.colors.length > 0))) {
      setPatternLibraryPatterns(selection);
      setShowPatternSyncTip(true);
      
      // 构建要同步的描述文本
      let syncText = '';
      
      // 纹样描述
      if (selection.patterns.length > 0) {
        const patternNames = selection.patterns.map((p: any) => p.name).join('、');
        const patternMeaning = selection.patterns.map((p: any) => p.meaning).join('；');
        syncText = `融入${patternNames}纹样（${patternMeaning}）`;
      }
      
      // 色彩描述
      if (selection.colors && selection.colors.length > 0) {
        const colorNames = selection.colors.map((c: any) => c.name).join('、');
        const colorMeaning = selection.colors.map((c: any) => c.meaning).join('；');
        const colorText = `使用${colorNames}（${colorMeaning}）`;
        syncText = syncText ? `${syncText}，${colorText}` : colorText;
      }
      
      // 自动同步到 additionalRequirements
      setFormData(prev => ({
        ...prev,
        additionalRequirements: prev.additionalRequirements
          ? `${prev.additionalRequirements}、${syncText}`
          : syncText
      }));
      
      // 清除标记（防止重复同步）
      localStorage.removeItem('__pattern_library_selection__');
    }
  }, []);

  // 纹样选中后同步到参数框
  const handlePatternSelect = (pattern: any) => {
    setSelectedPattern(pattern.id);
    setFormData(prev => ({
      ...prev,
      additionalRequirements: prev.additionalRequirements 
        ? `${prev.additionalRequirements}、${pattern.name}纹样（${pattern.meaning}）`
        : `融入${pattern.name}纹样（${pattern.meaning}）`
    }));
  };

  // ========== 会话缓存相关 ==========
  const [cacheRemainingTime, setCacheRemainingTime] = useState<string>('');
  const [hasCachedData, setHasCachedData] = useState(false);

  // 读取缓存
  useEffect(() => {
    const cached = getGenerationCache('annual-painting');
    if (cached) {
      setImageResult(cached.images.map(img => ({ imageUrls: [img.url], prompt: img.prompt }))[0] || null);
      setEvaluationResult(cached.evaluation ? {
        scores: cached.evaluation.values,
        labels: cached.evaluation.dimensions.map(d => d.name),
        totalScore: cached.evaluation.totalScore
      } : null);
      setCultureResult(cached.culture);
      setHasCachedData(true);
      // 更新剩余时间显示
      const remaining = getCacheRemainingTime('annual-painting');
      setCacheRemainingTime(formatCacheRemainingTime(remaining));
    }
  }, []);

  // 定时更新剩余时间
  useEffect(() => {
    if (!hasCachedData) return;
    const interval = setInterval(() => {
      const remaining = getCacheRemainingTime('annual-painting');
      setCacheRemainingTime(formatCacheRemainingTime(remaining));
      if (remaining <= 0) {
        setHasCachedData(false);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [hasCachedData]);

  // 清空缓存
  const handleClearCache = () => {
    clearGenerationCache('annual-painting');
    setHasCachedData(false);
    setCacheRemainingTime('');
    // 可选：同时清空当前显示
    // setImageResult(null);
    // setEvaluationResult(null);
    // setCultureResult(null);
  };

  // 色彩选中后同步到参数框
  const handleColorSelect = (color: any) => {
    setSelectedColor(color.id);
    setFormData(prev => ({
      ...prev,
      additionalRequirements: prev.additionalRequirements 
        ? `${prev.additionalRequirements}、使用${color.name}（${color.meaning}）`
        : `使用${color.name}（${color.meaning}）`
    }));
  };

  // 处理图片上传
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 检查最多3张
    const remainingSlots = 3 - uploadedImages.length;
    if (remainingSlots <= 0) {
      setError('最多只能上传3张图片');
      return;
    }

    // 只处理还能添加的文件
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    setIsExtracting(true);
    setError('');

    try {
      for (const file of filesToProcess) {
        // 验证文件类型
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
          setError('仅支持 JPG、PNG 格式图片');
          continue;
        }

        // 创建预览
        const preview = URL.createObjectURL(file);
        const newImageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // 先添加到列表
        const newImage: UploadedImage = {
          id: newImageId,
          file,
          preview,
          extractedElements: '',
        };
        
        setUploadedImages(prev => [...prev, newImage]);

        // 调用 API 提取元素
        const formDataUpload = new FormData();
        formDataUpload.append('image', file);
        formDataUpload.append('type', 'annual-painting');

        const response = await fetch('/annual-painting/api/extract-elements', {
          method: 'POST',
          body: formDataUpload,
        });

        const data = await response.json();
        
        if (data.success && data.elements) {
          // 更新该图片的提取结果
          setUploadedImages(prev => prev.map(img => 
            img.id === newImageId ? { ...img, extractedElements: data.elements } : img
          ));

          // 合并到具体人物/元素输入框
          setFormData(prev => {
            const existing = prev.specificElement;
            const newElements = existing 
              ? `${existing}、${data.elements}`
              : data.elements;
            return { ...prev, specificElement: newElements };
          });
        } else if (data.error) {
          // 处理 API 返回的错误
          setError(data.error || '元素提取失败，请重试');
        }
      }
    } catch (err) {
      setError('图片处理失败，请重试');
    } finally {
      setIsExtracting(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 删除已上传的图片
  const handleRemoveImage = (imageId: string) => {
    const imageToRemove = uploadedImages.find(img => img.id === imageId);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    
    setUploadedImages(prev => {
      const remaining = prev.filter(img => img.id !== imageId);
      
      // 重新合并剩余图片的元素到输入框
      if (remaining.length === 0) {
        setFormData(prev => ({ ...prev, specificElement: '' }));
      } else {
        const mergedElements = remaining
          .map(img => img.extractedElements)
          .filter(Boolean)
          .join('、');
        setFormData(prev => ({ ...prev, specificElement: mergedElements }));
      }
      
      return remaining;
    });
  };

  const handleGenerate = async () => {
    // 流派必须选择
    if (!formData.styleId) {
      setError('请选择年画流派');
      return;
    }
    // 主题校验：固定主题或自定义主题（自定义主题需描述不为空）
    const hasFixedTheme = formData.themeId && formData.themeId !== 'custom';
    const hasCustomTheme = formData.themeId === 'custom' && formData.customTheme.trim();
    if (!hasFixedTheme && !hasCustomTheme) {
      setError('请选择固定主题或输入自定义主题描述');
      return;
    }

    setIsGenerating(true);
    setError('');
    setImageResult(null);
    setEvaluationResult(null);
    setCultureResult(null);
    if (taskId) await updateCreativeTaskStep(taskId, 'annual-painting', 'running');

    try {
      const genResponse = await fetch('/annual-painting/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const genData = await genResponse.json();

      if (genData.success && genData.imageUrls && genData.imageUrls.length > 0) {
        setImageResult(genData);

        // 获取评估数据
        const evalResponse = await fetch('/annual-painting/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const evalData = await evalResponse.json();
        if (evalData.success && evalData.evaluation) {
          const evalResult = evalData.evaluation;
          const scores = evalResult.criteria.map((c: any) => Math.round((c.score / c.maxScore) * 100));
          const labels = evalResult.criteria.map((c: any) => c.name);
          setEvaluationResult({ scores, labels, totalScore: evalResult.totalScore });
        }

        // 获取文化科普数据
        const cultureResponse = await fetch('/annual-painting/api/culture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const cultureData = await cultureResponse.json();
        if (cultureData.success && cultureData.culture) {
          setCultureResult(cultureData.culture);
        }

        // 保存到会话缓存
        const generatedAt = Date.now();
        setGenerationCache('annual-painting', {
          images: genData.imageUrls.map((url: string, idx: number) => ({
            id: `img_${generatedAt}_${idx}`,
            url,
            prompt: genData.prompt
          })),
          evaluation: evalData.success && evalData.evaluation ? {
            dimensions: evalData.evaluation.criteria.map((c: any) => ({ name: c.name, max: 100 })),
            values: evalData.evaluation.criteria.map((c: any) => Math.round((c.score / c.maxScore) * 100)),
            totalScore: evalData.evaluation.totalScore,
            scores: Object.fromEntries(evalData.evaluation.criteria.map((c: any) => [c.name, c.score])),
            analysis: ''
          } : null,
          culture: cultureData.success && cultureData.culture ? cultureData.culture : null,
          formData: { ...formData },
          generatedAt
        });
        setHasCachedData(true);
        setCacheRemainingTime(formatCacheRemainingTime(30 * 60 * 1000));

        if (taskId) {
          for (let idx = 0; idx < genData.imageUrls.length; idx++) {
            const assetId = await putCreativeTaskAsset(genData.imageUrls[idx]);
            await addCreativeTaskArtifact(taskId, { id: taskId + '-annual-' + generatedAt + '-' + idx, type: 'image', title: '木版年画作品', sourceSkill: 'annual-painting', assetId, version: idx + 1, createdAt: generatedAt });
          }
          await updateCreativeTaskStep(taskId, 'annual-painting', 'completed');
        }

        // 自动保存到个人中心
        const userId = localStorage.getItem('userId') || 'default-user';
        for (let idx = 0; idx < genData.imageUrls.length; idx++) {
          const imageUrl = genData.imageUrls[idx];
          const styleName = formData.styleId ? ANNUAL_PAINTING_STYLES.find(s => s.id === formData.styleId)?.name || '' : '';
          const themeName = formData.themeId && formData.themeId !== 'custom'
            ? ANNUAL_PAINTING_THEMES.find(t => t.id === formData.themeId)?.name || ''
            : formData.customTheme || '';
          const title = `${styleName}${themeName ? ' - ' + themeName : ''}年画`;

          try {
            await fetch('/api/artworks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: userId,
                category: 'nianhua',
                title,
                image_url: imageUrl,
                description: `AI生成的木版年画作品`,
                prompt: genData.prompt || '',
                style: styleName,
                dynasty: '',
              }),
            });
          } catch (err) {
            console.error('保存作品失败:', err);
          }
        }
      } else {
        setError(genData.error || '生成失败，请稍后重试');
      }
    } catch (err) {
      setError('网络错误，请检查连接');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={styles.container}>
      <style>{globalStyles}</style>
      
      {/* 顶部横幅 */}
      <div style={styles.banner}>
        <div style={styles.bannerContent}>
          <h1 style={styles.bannerTitle}>木刻灵韵•智绘年画</h1>
          <p style={styles.bannerSubtitle}>基于扣子平台 · 内置古建筑专属Prompt模板 · 支持6维评估与文化科普</p>
        </div>
      </div>

      {/* Navigation Banner */}
      <WorkbenchBackButton />
      <TaskContextBar taskId={taskId || undefined} />

      <div style={styles.mainContent}>
        {/* API Token 配置 */}
        <div style={styles.apiCard}>
          <h3 style={styles.cardTitle}>🔑 API Token 配置</h3>
          <div style={styles.tokenRow}>
            <input
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="请输入您的火山方舟 API Token"
              style={styles.tokenInput}
            />
            <button
              onClick={async () => {
                if (!apiToken.trim()) return;
                const res = await fetch('/api/config', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ apiToken }),
                });
                const data = await res.json();
                if (data.success) {
                  alert('Token 保存成功！');
                }
              }}
              style={styles.tokenButton}
            >
              保存 Token
            </button>
          </div>
          <p style={styles.tokenHint}>请填写您自己的密钥，仅用于当前浏览器会话，不写入项目文件</p>
        </div>

        {/* ========== 纹样库同步提示 ========== */}
        {showPatternSyncTip && patternLibraryPatterns && (
          <div style={{
            background: 'linear-gradient(135deg, #fff9f0 0%, #fff5e6 100%)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
            border: '2px solid #d4af37',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <span style={{ fontSize: '24px' }}>✨</span>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#8b4513', marginBottom: '4px' }}>
                  已从纹样库同步 {patternLibraryPatterns.patterns.length} 个纹样
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  {patternLibraryPatterns.patterns.map(p => p.name).join('、')}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowPatternSyncTip(false)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                color: '#999',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* ========== 纹样库快捷入口 ========== */}
        <div style={{
          background: 'linear-gradient(135deg, #fdf6e3 0%, #fef9f3 100%)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          border: '2px dashed #c0392b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>📚</span>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#8B0000' }}>
                朱仙镇纹样知识库
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>
                基于开封朱仙镇木版年画的完整纹样库
              </div>
            </div>
          </div>
          <Link href="/pattern-library">
            <button style={{
              background: 'linear-gradient(135deg, #c0392b 0%, #8B0000 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(192, 57, 43, 0.3)',
            }}>
              <span>进入知识库</span>
              <span>→</span>
            </button>
          </Link>
        </div>

        {/* ========== 知识库同步信息展示栏 ========== */}
        {patternLibraryPatterns && (
          <div style={{
            background: 'linear-gradient(135deg, #fff8f0 0%, #fff5eb 100%)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
            border: '2px solid #c0392b',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '18px' }}>🔄</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#c0392b' }}>
                已从知识库同步以下素材
              </span>
            </div>

            {/* 已选纹样展示 */}
            {patternLibraryPatterns.patterns && patternLibraryPatterns.patterns.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                  已选纹样 ({patternLibraryPatterns.patterns.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {patternLibraryPatterns.patterns.map((pattern: any) => {
                    const assetUrl = getPatternAssetUrl(pattern.name);
                    return (
                      <div key={pattern.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        background: 'white',
                        borderRadius: '16px',
                        border: '1px solid #e8dcc8',
                      }}>
                        {assetUrl ? (
                          <img 
                            src={assetUrl} 
                            alt={pattern.name} 
                            style={{ 
                              width: '28px', 
                              height: '28px', 
                              objectFit: 'contain',
                              borderRadius: '4px',
                            }} 
                          />
                        ) : (
                          <span style={{ fontSize: '16px' }}>{pattern.symbol || '🎨'}</span>
                        )}
                        <span style={{ fontSize: '13px', color: '#8b4513' }}>{pattern.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 已选色彩展示 */}
            {patternLibraryPatterns.colors && patternLibraryPatterns.colors.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                  已选色彩 ({patternLibraryPatterns.colors.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {patternLibraryPatterns.colors.map((color: any, idx: number) => (
                    <div key={`${color.id}-${idx}`} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: 'white',
                      borderRadius: '16px',
                      border: '1px solid #e8dcc8',
                    }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: color.color,
                        border: '1px solid rgba(0,0,0,0.1)',
                      }} />
                      <span style={{ fontSize: '13px', color: '#8b4513' }}>{color.name}</span>
                      <span style={{ fontSize: '11px', color: '#999' }}>{color.color}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 同步提示 */}
            {showPatternSyncTip && (
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                background: '#fff3e0',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#e65100',
              }}>
                💡 提示：纹样和色彩已自动添加到创作参数中，您也可以手动调整
              </div>
            )}
          </div>
        )}

        {/* ========== 木版年画数字化知识库 ========== */}
        <div style={styles.knowledgeBaseCard}>
          <h2 style={styles.knowledgeTitle}>📚 木版年画数字化知识库</h2>

          {/* 第一区：年画纹样库 */}
          <div style={styles.knowledgeSection}>
            <h3 style={styles.sectionTitle}>🎨 年画纹样库</h3>
            <div style={styles.categorySelect}>
              <select
                value={patternCategory}
                onChange={(e) => setPatternCategory(e.target.value)}
                style={styles.select}
              >
                {PATTERN_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div style={styles.patternGrid}>
              {PATTERN_CATEGORIES.find(c => c.id === patternCategory)?.patterns.map(pattern => (
                <div
                  key={pattern.id}
                  onClick={() => handlePatternSelect(pattern)}
                  style={{
                    ...styles.patternCard,
                    borderColor: selectedPattern === pattern.id ? '#c0392b' : '#ddd',
                    backgroundColor: selectedPattern === pattern.id ? '#fff5f5' : '#fff',
                  }}
                >
                  <div style={styles.patternSymbol}>{pattern.symbol}</div>
                  <div style={styles.patternName}>{pattern.name}</div>
                  <div style={styles.patternMeaning}>{pattern.meaning}</div>
                  {selectedPattern === pattern.id && (
                    <div style={styles.selectedBadge}>已选</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 第二区：传统色彩库 */}
          <div style={styles.knowledgeSection}>
            <h3 style={styles.sectionTitle}>🎨 传统色彩库</h3>
            <div style={styles.categorySelect}>
              <select
                value={colorCategory}
                onChange={(e) => setColorCategory(e.target.value)}
                style={styles.select}
              >
                {COLOR_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div style={styles.colorGrid}>
              {COLOR_CATEGORIES.find(c => c.id === colorCategory)?.colors.map(color => (
                <div
                  key={color.id}
                  onClick={() => handleColorSelect(color)}
                  style={{
                    ...styles.colorCard,
                    borderColor: selectedColor === color.id ? '#c0392b' : '#ddd',
                  }}
                >
                  <div style={{...styles.colorPreview, backgroundColor: color.color}} />
                  <div style={styles.colorInfo}>
                    <div style={styles.colorName}>{color.name}</div>
                    <div style={styles.colorPinyin}>{color.pinyin}</div>
                    <div style={styles.colorRgb}>RGB: {color.color}</div>
                    <div style={styles.colorMeaning}>{color.meaning}</div>
                  </div>
                  {selectedColor === color.id && (
                    <div style={styles.selectedBadge}>已选</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========== 选择木版年画参数 ========== */}
        <div id="annual-painting-form" style={styles.formCard}>
          {handoffNotice && (
            <div style={{ marginBottom: '16px', padding: '12px 14px', color: '#6f3a2f', background: '#fff4e8', border: '1px solid #e4c6aa', borderRadius: '9px', fontSize: '13px' }}>
              ✓ {handoffNotice}
            </div>
          )}
          <h2 style={styles.formTitle}>选择木版年画参数</h2>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>选择年画流派</label>
              <select
                value={formData.styleId}
                onChange={(e) => setFormData({...formData, styleId: e.target.value})}
                style={styles.select}
              >
                <option value="">请选择...</option>
                {ANNUAL_PAINTING_STYLES.map(style => (
                  <option key={style.id} value={style.id}>
                    {style.name}（{style.region}）
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>选择年画主题</label>
              <select
                value={formData.themeId}
                onChange={(e) => setFormData({...formData, themeId: e.target.value})}
                style={styles.select}
              >
                <option value="">请选择...</option>
                {ANNUAL_PAINTING_THEMES.map(theme => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 流派+主题组合提示 */}
          {formData.styleId && formData.themeId && formData.themeId !== 'custom' && (
            <div style={{
              ...styles.formGroup,
              background: '#f0f9f0',
              border: '1px solid #4CAF50',
              borderRadius: '8px',
              padding: '10px 14px',
              marginTop: '-8px'
            }}>
              <span style={{ color: '#2e7d32', fontSize: '13px' }}>
                ✓ 已选择组合：<strong>{ANNUAL_PAINTING_STYLES.find(s => s.id === formData.styleId)?.name}</strong> + <strong>{ANNUAL_PAINTING_THEMES.find(t => t.id === formData.themeId)?.name}</strong>，可正常生成
              </span>
            </div>
          )}

          {formData.themeId === 'custom' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>自定义主题描述</label>
              <input
                type="text"
                value={formData.customTheme}
                onChange={(e) => setFormData({...formData, customTheme: e.target.value})}
                placeholder="请输入您想创作的主题，如：福禄寿三星、戏曲人物等"
                style={styles.input}
              />
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>具体人物/元素（可选）</label>
            <input
              type="text"
              value={formData.specificElement}
              onChange={(e) => setFormData({...formData, specificElement: e.target.value})}
              placeholder="如：秦琼、尉迟恭、牡丹花、鲤鱼等；上传本地图片将自动提取元素填入此处"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>额外要求（可选）</label>
            <textarea
              value={formData.additionalRequirements}
              onChange={(e) => setFormData({...formData, additionalRequirements: e.target.value})}
              placeholder="从知识库点选的纹样和色彩会自动同步到这里，您也可以手动添加其他要求"
              style={styles.textarea}
              rows={2}
            />
          </div>

          {/* ========== 上传图片预览区域 ========== */}
          {uploadedImages.length > 0 && (
            <div style={styles.uploadPreviewSection}>
              <label style={styles.label}>已上传图片（{uploadedImages.length}/3）</label>
              <div style={styles.imageGrid}>
                {uploadedImages.map((img) => (
                  <div key={img.id} style={styles.imageItem}>
                    <img 
                      src={img.preview} 
                      alt="上传预览" 
                      style={styles.thumbnailImage}
                    />
                    <button
                      onClick={() => handleRemoveImage(img.id)}
                      style={styles.removeButton}
                    >
                      ✕
                    </button>
                    {img.extractedElements && (
                      <div style={styles.extractedBadge}>
                        <span style={styles.extractedText}>{img.extractedElements}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}

          {/* 按钮区域 */}
          <div style={styles.buttonRow}>
            {/* 生成木版年画按钮 */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{
                ...styles.generateButton,
                opacity: isGenerating ? 0.6 : 1,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
              }}
            >
              {isGenerating ? '生成中...' : '🎨 生成木版年画'}
            </button>

            {/* 上传本地图生成按钮 */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => {
                if (uploadedImages.length >= 3) {
                  setError('最多只能上传3张图片');
                  return;
                }
                fileInputRef.current?.click();
              }}
              disabled={isExtracting || isGenerating}
              style={{
                ...styles.uploadButton,
                opacity: (isExtracting || isGenerating) ? 0.6 : 1,
                cursor: (isExtracting || isGenerating) ? 'not-allowed' : 'pointer',
              }}
            >
              {isExtracting ? '🔍 提取中...' : '📤 上传本地图生成'}
            </button>
          </div>

          {/* 提取中提示 */}
          {isExtracting && (
            <div style={styles.extractingHint}>
              正在通过 AI 提取图片主体元素，请稍候...
            </div>
          )}
        </div>

        {/* 结果区域 */}
        {(imageResult || hasCachedData) && (
          <div style={styles.resultSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={styles.resultTitle}>🎉 生成结果</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {hasCachedData && cacheRemainingTime && (
                  <span style={{ fontSize: '13px', color: '#888', background: '#f5f5f5', padding: '4px 10px', borderRadius: '12px' }}>
                    缓存剩余: {cacheRemainingTime}
                  </span>
                )}
                {hasCachedData && (
                  <button
                    onClick={handleClearCache}
                    style={{
                      fontSize: '13px',
                      padding: '4px 12px',
                      background: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '12px',
                      color: '#666',
                      cursor: 'pointer'
                    }}
                  >
                    清空缓存
                  </button>
                )}
              </div>
            </div>
            
            {/* 图片展示 */}
            {imageResult && imageResult.imageUrls && (
              <div style={styles.resultCard}>
                <h3 style={styles.subTitle}>生成的木版年画</h3>
                <img
                  src={imageResult.imageUrls[0]}
                  alt="生成的木版年画"
                  style={styles.resultImage}
                />
                <p style={styles.promptText}>{imageResult.prompt}</p>
              </div>
            )}

            {/* 6维评估雷达图 */}
            {evaluationResult && (
              <div style={styles.resultCard}>
                <h3 style={styles.subTitle}>📊 6维评估结果</h3>
                <div style={styles.scoreGrid}>
                  {evaluationResult.scores.map((score: number, index: number) => (
                    <div key={index} style={styles.scoreItem}>
                      <div style={styles.scoreLabel}>{evaluationResult.labels[index]}</div>
                      <div style={styles.scoreBar}>
                        <div
                          style={{
                            ...styles.scoreProgress,
                            width: `${score}%`,
                          }}
                        />
                      </div>
                      <div style={styles.scoreValue}>{score}分</div>
                    </div>
                  ))}
                </div>
                <div style={styles.totalScore}>
                  综合评分：{evaluationResult.totalScore}分
                </div>
              </div>
            )}

            {/* 文化科普说明 */}
            {cultureResult && (
              <div style={styles.resultCard}>
                <h3 style={styles.subTitle}>📚 文化科普说明</h3>
                
                {cultureResult.history && (
                  <div style={styles.cultureSection}>
                    <h4 style={styles.cultureTitle}>🏛️ 历史背景</h4>
                    <p style={styles.cultureText}>{cultureResult.history}</p>
                  </div>
                )}

                {cultureResult.features && (
                  <div style={styles.cultureSection}>
                    <h4 style={styles.cultureTitle}>🎨 艺术特色</h4>
                    <p style={styles.cultureText}>{cultureResult.features}</p>
                  </div>
                )}

                {cultureResult.technique && (
                  <div style={styles.cultureSection}>
                    <h4 style={styles.cultureTitle}>🔧 制作工艺</h4>
                    <p style={styles.cultureText}>{cultureResult.technique}</p>
                  </div>
                )}

                {cultureResult.theme && (
                  <div style={styles.cultureSection}>
                    <h4 style={styles.cultureTitle}>📖 文化故事</h4>
                    <p style={styles.cultureText}>{cultureResult.theme}</p>
                  </div>
                )}

                {cultureResult.tips && (
                  <div style={styles.cultureSection}>
                    <h4 style={styles.cultureTitle}>💡 学习建议</h4>
                    <ul style={styles.tipsList}>
                      {cultureResult.tips.map((tip: string, index: number) => (
                        <li key={index} style={styles.tipItem}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 使用说明 */}
        <div style={styles.tipsCard}>
          <h3 style={styles.tipsTitle}>💡 使用说明</h3>
          <ol style={styles.tipsList}>
            <li>先在上方知识库中浏览纹样和色彩，点击可自动添加到创作参数中</li>
            <li>选择年画流派和主题（必填）</li>
            <li>输入具体人物/元素或额外要求；也可上传本地 JPG/PNG 图片自动提取元素</li>
            <li>点击「生成木版年画」按钮开始创作，或点击「上传本地图生成」基于本地图片生成</li>
            <li>生成完成后可查看6维评估结果和文化科普说明</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Noto Serif SC', 'STSong', 'SimSun', serif;
    background: linear-gradient(135deg, #fdf6e3 0%, #fef9f3 100%);
    min-height: 100vh;
  }
  
  input, select, textarea {
    font-family: inherit;
  }
`;

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #fdf6e3 0%, #fef9f3 100%)',
  },
  banner: {
    background: 'linear-gradient(135deg, #8B0000 0%, #c0392b 100%)',
    color: 'white',
    padding: '24px 20px',
    textAlign: 'center' as const,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  bannerContent: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  bannerTitle: {
    fontSize: '24px',
    marginBottom: '8px',
    textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
  },
  bannerSubtitle: {
    fontSize: '14px',
    opacity: 0.9,
  },
  backLink: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '14px',
    marginTop: '12px',
    display: 'inline-block',
    opacity: 0.9,
  },
  mainContent: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px 16px',
  },
  apiCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e0e0e0',
  },
  cardTitle: {
    fontSize: '16px',
    color: '#333',
    marginBottom: '12px',
  },
  tokenRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  tokenInput: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
  },
  tokenButton: {
    padding: '10px 20px',
    background: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  tokenHint: {
    fontSize: '12px',
    color: '#888',
    marginTop: '8px',
  },
  // 知识库样式
  knowledgeBaseCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
    border: '2px solid #c0392b',
  },
  knowledgeTitle: {
    fontSize: '20px',
    color: '#8B0000',
    textAlign: 'center' as const,
    marginBottom: '24px',
    paddingBottom: '12px',
    borderBottom: '2px dashed #ddd',
  },
  knowledgeSection: {
    marginBottom: '28px',
  },
  sectionTitle: {
    fontSize: '16px',
    color: '#333',
    marginBottom: '16px',
  },
  categorySelect: {
    marginBottom: '16px',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'white',
    cursor: 'pointer',
  },
  patternGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '12px',
  },
  patternCard: {
    padding: '16px 12px',
    border: '2px solid #ddd',
    borderRadius: '10px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative' as const,
  },
  patternSymbol: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  patternName: {
    fontSize: '14px',
    fontWeight: 'bold' as const,
    color: '#333',
    marginBottom: '4px',
  },
  patternMeaning: {
    fontSize: '11px',
    color: '#666',
    lineHeight: 1.4,
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
  colorCard: {
    display: 'flex',
    gap: '12px',
    padding: '12px',
    border: '2px solid #ddd',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative' as const,
    alignItems: 'center',
  },
  colorPreview: {
    width: '50px',
    height: '50px',
    borderRadius: '8px',
    flexShrink: 0,
    border: '1px solid rgba(0,0,0,0.1)',
  },
  colorInfo: {
    flex: 1,
    minWidth: 0,
  },
  colorName: {
    fontSize: '14px',
    fontWeight: 'bold' as const,
    color: '#333',
  },
  colorPinyin: {
    fontSize: '11px',
    color: '#888',
  },
  colorRgb: {
    fontSize: '11px',
    color: '#666',
    fontFamily: 'monospace',
  },
  colorMeaning: {
    fontSize: '11px',
    color: '#c0392b',
    marginTop: '2px',
  },
  selectedBadge: {
    position: 'absolute' as const,
    top: '-8px',
    right: '-8px',
    background: '#c0392b',
    color: 'white',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '10px',
  },
  // 表单样式
  formCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e0e0e0',
  },
  formTitle: {
    fontSize: '18px',
    color: '#333',
    marginBottom: '20px',
    textAlign: 'center' as const,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    color: '#555',
    marginBottom: '8px',
    fontWeight: 'bold' as const,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  },
  error: {
    color: '#c0392b',
    fontSize: '14px',
    marginBottom: '16px',
    padding: '10px',
    background: '#fff5f5',
    borderRadius: '8px',
    textAlign: 'center' as const,
  },
  // 按钮样式
  buttonRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  generateButton: {
    flex: '1 1 200px',
    padding: '16px',
    background: 'linear-gradient(135deg, #c0392b 0%, #8B0000 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '18px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(192,57,43,0.3)',
    transition: 'all 0.2s',
  },
  uploadButton: {
    flex: '1 1 200px',
    padding: '16px',
    background: 'linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%)',
    color: '#c0392b',
    border: '2px solid #c0392b',
    borderRadius: '10px',
    fontSize: '18px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(192,57,43,0.15)',
    transition: 'all 0.2s',
  },
  extractingHint: {
    marginTop: '12px',
    padding: '10px',
    background: '#f0f0f0',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#666',
    textAlign: 'center' as const,
  },
  // 上传预览区域样式
  uploadPreviewSection: {
    marginBottom: '16px',
  },
  imageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
  imageItem: {
    position: 'relative' as const,
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#f5f5f5',
    border: '2px solid #e0e0e0',
  },
  thumbnailImage: {
    width: '100%',
    height: 'auto',
    maxHeight: '200px',
    objectFit: 'contain' as const,
    display: 'block',
    background: '#fafafa',
  },
  removeButton: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.6)',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  extractedBadge: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(192,57,43,0.9)',
    padding: '6px 8px',
  },
  extractedText: {
    fontSize: '11px',
    color: 'white',
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  // 结果样式
  resultSection: {
    marginTop: '24px',
  },
  resultTitle: {
    fontSize: '20px',
    color: '#8B0000',
    textAlign: 'center' as const,
    marginBottom: '20px',
  },
  resultCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e0e0e0',
  },
  subTitle: {
    fontSize: '16px',
    color: '#333',
    marginBottom: '16px',
    paddingBottom: '10px',
    borderBottom: '1px solid #eee',
  },
  resultImage: {
    width: '100%',
    maxWidth: '500px',
    display: 'block',
    margin: '0 auto 16px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  promptText: {
    fontSize: '13px',
    color: '#666',
    lineHeight: 1.6,
    padding: '12px',
    background: '#f9f9f9',
    borderRadius: '8px',
  },
  scoreGrid: {
    display: 'grid',
    gap: '12px',
  },
  scoreItem: {
    display: 'grid',
    gridTemplateColumns: '100px 1fr 60px',
    alignItems: 'center',
    gap: '12px',
  },
  scoreLabel: {
    fontSize: '13px',
    color: '#555',
  },
  scoreBar: {
    height: '12px',
    background: '#f0f0f0',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  scoreProgress: {
    height: '100%',
    background: 'linear-gradient(90deg, #c0392b 0%, #e74c3c 100%)',
    borderRadius: '6px',
    transition: 'width 0.3s',
  },
  scoreValue: {
    fontSize: '13px',
    fontWeight: 'bold' as const,
    color: '#c0392b',
    textAlign: 'right' as const,
  },
  totalScore: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '2px solid #eee',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#8B0000',
    textAlign: 'center' as const,
  },
  cultureSection: {
    marginBottom: '16px',
  },
  cultureTitle: {
    fontSize: '14px',
    color: '#c0392b',
    marginBottom: '8px',
  },
  cultureText: {
    fontSize: '14px',
    color: '#555',
    lineHeight: 1.8,
  },
  tipsList: {
    fontSize: '13px',
    color: '#666',
    lineHeight: 2,
    paddingLeft: '20px',
  },
  tipsCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e0e0e0',
  },
  tipsTitle: {
    fontSize: '16px',
    color: '#333',
    marginBottom: '12px',
  },
  tipItem: {
    marginBottom: '4px',
  },
};



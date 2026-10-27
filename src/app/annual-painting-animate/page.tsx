'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import WorkbenchBackButton from '@/components/WorkbenchBackButton';
import TaskContextBar from '@/components/TaskContextBar';
import { getTask } from '@/lib/muling-storage';
import { saveAnimateWork } from '@/lib/animate-works-storage';
import { addCreativeTaskArtifact, getCreativeTask, getCreativeTaskAsset, putCreativeTaskAsset, setActiveCreativeTaskId, updateCreativeTaskStep } from '@/lib/creative-task-storage';

interface AnimateRegion {
  id: string;
  name: string;
  type: 'eyes' | 'hair' | 'beard' | 'clothes' | 'object' | 'water';
  x: number;
  y: number;
  width: number;
  height: number;
  animationType: 'blink' | 'wave' | 'flow';
  enabled: boolean;
}

type MotionUnderstanding = {
  subjectType: string;
  subjects: string[];
  motions: string[];
  intensity: string;
  style: string;
  scope: string;
  preserve: string;
  summary: string;
  optimizedPrompt: string;
};

type MotionHistoryItem = {
  instruction: string;
  summary: string;
  optimizedPrompt: string;
  createdAt: number;
};

const QUICK_MOTION_PROMPTS = ['衣袖轻摆', '云雾流动', '灯笼摇晃', '人物眨眼', '水面波动', '树叶轻摇', '花朵微动', '光影流转', '节日氛围增强', '轻微局部动效'];
const REFERENCE_IMAGE_SHA256 = '4f0f5d718dae9c0424626235f9fd7dda252dc0ef4f7ea5a9c0c37915a86c1a3c';
const REFERENCE_VIDEO_URL = '/videos/door-gods-reference.mp4';

function inferMotionPlan(instruction: string, previous?: MotionHistoryItem): MotionUnderstanding {
  const isFollowUp = Boolean(previous && instruction.length <= 36 && /^(再|更|稍|慢|快|只|不要|保持|改成|增强|减弱|背景|人物)/.test(instruction));
  const combined = ((isFollowUp ? previous?.optimizedPrompt + '；本轮修改：' : '') + instruction).trim();
  const subjectRules: Array<[RegExp, string]> = [
    [/人物|人像|面部|眼睛|眨眼|衣袖|衣袂|头发|表情|挥手/, '人物及其细节'],
    [/云|雾|天空/, '云层与天空'], [/水面|湖面|河面|海面|波纹|鱼/, '水面及水中元素'],
    [/树叶|树木|枝叶/, '树木与叶片'], [/花朵|花瓣|花卉/, '花朵与花瓣'],
    [/灯笼/, '灯笼'], [/旗幡|旗帜/, '旗幡'], [/风铃/, '屋檐风铃'], [/烟雾|炊烟/, '烟雾'],
    [/建筑|屋檐|飞檐|古建/, '建筑环境'], [/光|光影|灯光/, '画面光影'], [/背景/, '背景环境'],
  ];
  const motionRules: Array<[RegExp, string]> = [
    [/眨眼/, '自然眨眼'], [/挥手/, '挥手'], [/波纹|波动/, '轻微波动'],
    [/流动|移动/, '缓慢流动'], [/飘|飘动/, '自然飘动'], [/摆动|摇晃|轻摇|微动/, '轻柔摆动'],
    [/闪烁/, '柔和闪烁'], [/光影|流转/, '光影缓慢变化'], [/表情/, '细微表情变化'],
  ];
  const subjects = Array.from(new Set(subjectRules.filter(([rule]) => rule.test(combined)).map(([, value]) => value)));
  const motions = Array.from(new Set(motionRules.filter(([rule]) => rule.test(combined)).map(([, value]) => value)));
  const subjectType = /建筑|屋檐|飞檐|灯笼|旗幡|风铃|古建/.test(combined) ? '建筑' : /人物|人像|眨眼|挥手|衣袖|头发|表情/.test(combined) ? '人物' : /云|水|湖|河|海|树|花|风景|天空/.test(combined) ? '风景' : /静物|物品|摆件/.test(combined) ? '静物' : '综合场景';
  const intensity = /轻微|轻轻|柔和|缓慢|慢一点|不要太夸张|幅度小/.test(combined) ? '轻微' : /明显|强烈|热闹|增强/.test(combined) ? '明显' : '中等';
  const style = /节日|喜庆|热闹/.test(combined) ? '节日' : /梦幻|柔光/.test(combined) ? '梦幻' : /古风/.test(combined) ? '古风' : /静谧|安静/.test(combined) ? '静谧' : '自然';
  const scope = /只让|仅让|局部|其他.*不动|不要动/.test(combined) ? '局部动效' : '按要求作用于相关对象';
  const finalSubjects = subjects.length ? subjects : ['用户要求变化的画面对象'];
  const finalMotions = motions.length ? motions : ['按用户描述产生自然动态'];
  const preserve = '保留原图主体、构图、色彩、意境以及用户未要求变化的区域';
  const optimizedPrompt = '忠实执行用户原始要求：“' + instruction + '”。动效对象仅限' + finalSubjects.join('、') + '，动效方式为' + finalMotions.join('、') + '，强度为' + intensity + '，氛围为' + style + '，作用范围为' + scope + '。' + preserve + '；不新增用户未提及的主体，不改变人物身份，不新增文字，镜头稳定，运动连续自然，避免变形、闪烁和画面漂移。';
  return {
    subjectType,
    subjects: finalSubjects,
    motions: finalMotions,
    intensity,
    style,
    scope,
    preserve,
    summary: '让' + finalSubjects.join('、') + '以' + intensity + '幅度呈现' + finalMotions.join('、') + '，其余画面保持不变。',
    optimizedPrompt,
  };
}
async function matchesReferenceImage(source: string) {
  try {
    const response = await fetch(source);
    if (!response.ok) return false;
    const digest = await crypto.subtle.digest('SHA-256', await response.arrayBuffer());
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    return hash === REFERENCE_IMAGE_SHA256;
  } catch {
    return false;
  }
}
function readableVideoError(message: string) {
  if (/Traceback \(most recent call last\)|wanx_pipeline|FFmpegReader|NoneType/i.test(message)) {
    return '视频生成服务在处理画面帧时出错，本次任务未完成。请重新生成；已成功保存的作品不受影响。';
  }
  return message;
}
function normalizeWanxApiKey(value: string) {
  return value
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .trim()
    .replace(/^DASHSCOPE_API_KEY\s*=\s*/i, '')
    .replace(/^[`'"“”‘’]+|[`'"“”‘’]+$/g, '')
    .replace(/\s+/g, '');
}
function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片读取失败'));
    image.src = source;
  });
}

function drawAnimatedFrame(ctx: CanvasRenderingContext2D, image: HTMLImageElement, regions: AnimateRegion[], elapsedMs: number, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  const time = elapsedMs / 1000;
  regions.forEach(region => {
    if (!region.enabled) return;
    const sx = Math.max(0, region.x / 100 * image.width);
    const sy = Math.max(0, region.y / 100 * image.height);
    const sw = Math.min(region.width / 100 * image.width, image.width - sx);
    const sh = Math.min(region.height / 100 * image.height, image.height - sy);
    const dx = region.x / 100 * width;
    const dy = region.y / 100 * height;
    const dw = region.width / 100 * width;
    const dh = region.height / 100 * height;
    if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(dx,dy,dw,dh);
    ctx.clip();
    ctx.clearRect(dx,dy,dw,dh);
    if (region.type === 'eyes' || region.animationType === 'blink') {
      const cycle=time%3;
      const blink=cycle<0.12?Math.max(0.15,Math.abs(cycle-0.06)/0.06):1;
      const targetHeight=dh*blink;
      ctx.drawImage(image,sx,sy,sw,sh,dx,dy+(dh-targetHeight)/2,dw,targetHeight);
    } else if (region.type === 'water') {
      const ox=Math.sin(time*Math.PI*1.2)*dw*0.025;
      const oy=Math.cos(time*Math.PI*1.6)*dh*0.018;
      ctx.drawImage(image,sx,sy,sw,sh,dx-dw*0.03+ox,dy-dh*0.03+oy,dw*1.06,dh*1.06);
    } else {
      const angle=Math.sin(time*Math.PI*1.4)*(region.type==='object'?0.035:0.022);
      const floatY=Math.sin(time*Math.PI*1.1)*dh*(region.animationType==='flow'?0.025:0.012);
      ctx.translate(dx+dw/2,dy+dh/2+floatY);
      ctx.rotate(angle);
      ctx.drawImage(image,sx,sy,sw,sh,-dw*0.53,-dh*0.53,dw*1.06,dh*1.06);
    }
    ctx.restore();
  });
}

function supportedRecordingType() {
  if (typeof MediaRecorder === 'undefined') return '';
  return ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type))||'';
}

function AnnualPaintingAnimate() {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const motionInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Token 状态
  const [apiToken, setApiToken] = useState('');
  const [tokenSaved, setTokenSaved] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [tokenValidating, setTokenValidating] = useState(false);
  const [wanxApiKey, setWanxApiKey] = useState('');
  const [wanxWorkspaceId, setWanxWorkspaceId] = useState('');
  const [wanxRegion, setWanxRegion] = useState('cn-beijing');
  const [wanxConfigSaved, setWanxConfigSaved] = useState(false);
  const [wanxConfigError, setWanxConfigError] = useState('');
  
  // 图片状态
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isReferenceImage, setIsReferenceImage] = useState(false);
  const [isCheckingReferenceImage, setIsCheckingReferenceImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 分析状态
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<string>('');
  const [detectedRegions, setDetectedRegions] = useState<AnimateRegion[]>([]);
  
  // 生成状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [generationPhase, setGenerationPhase] = useState<'idle' | 'recognizing' | 'generating' | 'rendering' | 'completed' | 'failed'>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string>('');
  const generationEpochRef = useRef(0);
  const generationBusyRef = useRef(false);
  const [generateMode, setGenerateMode] = useState<'fast' | 'hd'>('fast');
  
  // 预览状态
  const [isPreviewing, setIsPreviewing] = useState(false);
  const previewAnimationRef = useRef<number | null>(null);

  // 自然语言动效创作状态
  const [motionInput, setMotionInput] = useState('');
  const [motionUnderstanding, setMotionUnderstanding] = useState<MotionUnderstanding | null>(null);
  const [motionHistory, setMotionHistory] = useState<MotionHistoryItem[]>([]);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [motionNotice, setMotionNotice] = useState('');
  const [lastGeneratedPlan, setLastGeneratedPlan] = useState<MotionUnderstanding | null>(null);
  const [resultSaved, setResultSaved] = useState(false);
  const [isSavingWork, setIsSavingWork] = useState(false);
  const [linkedTaskId, setLinkedTaskId] = useState('');
  const [linkedArtifactId, setLinkedArtifactId] = useState('');

  useEffect(() => {
    generationEpochRef.current += 1;
    generationBusyRef.current = false;
    setIsGenerating(false);
    let active = true;
    setIsReferenceImage(false);
    setIsCheckingReferenceImage(Boolean(uploadedImage));
    if (uploadedImage) {
      void matchesReferenceImage(uploadedImage).then(match => {
        if (active) setIsReferenceImage(match);
      }).finally(() => {
        if (active) setIsCheckingReferenceImage(false);
      });
    }
    return () => { active = false; };
  }, [uploadedImage]);

  // 火山方舟 Token 格式验证
  const validateTokenFormat = (token: string): boolean => {
    const tokenPattern = /^ark-[a-zA-Z0-9-]+$/;
    return tokenPattern.test(token.trim());
  };
  
  // 校验 Token 有效性
  const validateToken = async (token: string) => {
    if (!token.trim()) {
      setTokenError('');
      return false;
    }
    
    if (!validateTokenFormat(token)) {
      setTokenError('请输入有效的火山方舟 API Token（格式：ark-xxx）');
      return false;
    }
    
    setTokenError('');
    return true;
  };
  
  // 加载保存的 token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('taskId') || '';
    const artifactId = params.get('artifactId') || '';
    if (!taskId || !artifactId) return;
    setLinkedTaskId(taskId); setLinkedArtifactId(artifactId); setActiveCreativeTaskId(taskId);
    void (async () => {
      const task = await getCreativeTask(taskId);
      const artifact = task?.artifacts.find(item => item.id === artifactId);
      const stored = artifact?.assetId ? await getCreativeTaskAsset(artifact.assetId) : undefined;
      let source = typeof stored === 'string' ? stored : '';
      if (!source && stored instanceof Blob) source = URL.createObjectURL(stored);
      if (!source) return;
      const image = await loadImage(source);
      setUploadedImage(source); setImageSize({ width: image.width, height: image.height });
      setMotionInput('让画面中的主要人物与传统纹样产生轻柔自然的局部动态，保持原有构图、国风色彩和题字。');
      setMotionNotice('已从任务“' + task?.title + '”接收静态作品，可直接制作动态版本。');
      await updateCreativeTaskStep(taskId, 'animate', 'running');
    })();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('animate_api_token');
    if (saved) {
      setApiToken(saved);
      setTokenSaved(true);
    }
    const savedWanxKey = localStorage.getItem('animate_wanx_api_key') || '';
    const savedWorkspace = localStorage.getItem('animate_wanx_workspace_id') || '';
    const savedRegion = localStorage.getItem('animate_wanx_region') || 'cn-beijing';
    setWanxApiKey(savedWanxKey);
    setWanxWorkspaceId(savedWorkspace);
    setWanxRegion(savedRegion);
    setWanxConfigSaved(Boolean(savedWanxKey && savedWorkspace));
  }, []);
  
  // 接收木灵国风创作传来的原图与创作上下文。
  useEffect(() => {
    const raw = localStorage.getItem('__muling_animate_handoff__');
    if (!raw) return;
    void (async () => {
      try {
        const handoff = JSON.parse(raw) as { taskId?: string; attempt?: number; timestamp?: number };
        if (!handoff.taskId || typeof handoff.attempt !== 'number' || !handoff.timestamp || Date.now() - handoff.timestamp > 30 * 60 * 1000) return;
        const task = await getTask(handoff.taskId);
        const artwork = task?.attempts.find(item => item.number === handoff.attempt);
        if (!artwork?.image) return;
        const image = await loadImage(artwork.image);
        setUploadedImage(artwork.image);
        setImageSize({ width: image.width, height: image.height });
        setMotionInput('让画面中的主要人物与传统纹样产生轻柔自然的局部动态，保持原有构图、国风色彩和题字。');
        setMotionNotice('已接收木灵国风创作的作品，可以直接描述希望它如何动起来。');
      } catch {
        setMotionNotice('未能读取上一步作品，请重新上传图片。');
      } finally {
        localStorage.removeItem('__muling_animate_handoff__');
      }
    })();
  }, []);
  // 保存 token 到 localStorage
  const handleTokenSave = async () => {
    const trimmedToken = apiToken.trim();
    if (!trimmedToken) return;
    
    setTokenValidating(true);
    
    if (!validateTokenFormat(trimmedToken)) {
      setTokenError('请输入有效的火山方舟 API Token（格式：ark-xxx）');
      setTokenValidating(false);
      return;
    }
    
    try {
      const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${trimmedToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        localStorage.setItem('animate_api_token', trimmedToken);
        setTokenSaved(true);
        setTokenError('');
        setTimeout(() => setTokenSaved(false), 3000);
      } else {
        setTokenError('请输入有效的火山方舟 API Token');
      }
    } catch (error) {
      localStorage.setItem('animate_api_token', trimmedToken);
      setTokenSaved(true);
      setTokenError('');
      setTimeout(() => setTokenSaved(false), 3000);
    } finally {
      setTokenValidating(false);
    }
  };
  
  const handleWanxConfigSave = () => {
    const key = normalizeWanxApiKey(wanxApiKey);
    const workspace = wanxWorkspaceId.trim();
    if (!key.startsWith('sk-') || key.length < 8) {
      setWanxConfigError('请输入以 sk- 开头的阿里云百炼 API Key');
      setWanxConfigSaved(false);
      return;
    }
    if (!/^[A-Za-z0-9-]{4,128}$/.test(workspace)) {
      setWanxConfigError('请输入百炼控制台显示的业务空间 ID（Workspace ID）');
      setWanxConfigSaved(false);
      return;
    }
    setWanxApiKey(key);
    localStorage.setItem('animate_wanx_api_key', key);
    localStorage.setItem('animate_wanx_workspace_id', workspace);
    localStorage.setItem('animate_wanx_region', wanxRegion);
    setWanxConfigError('');
    setWanxConfigSaved(true);
  };
  // Token 输入变化检测
  const handleTokenChange = (value: string) => {
    setApiToken(value);
    setTokenError('');
    const saved = localStorage.getItem('animate_api_token');
    if (saved && saved !== value) {
      setTokenSaved(false);
    }
  };
  
  const appendQuickPrompt = (prompt: string) => {
    setMotionInput(current => current.trim() ? current.replace(/[，。；\s]*$/, '') + '，' + prompt : prompt);
    setMotionUnderstanding(null);
    setMotionNotice('');
    motionInputRef.current?.focus();
  };

  const understandMotionInstruction = async (polish = false): Promise<MotionUnderstanding | null> => {
    const instruction = motionInput.trim();
    if (!instruction) {
      setMotionNotice('请先用一句话描述希望画面如何动起来。');
      motionInputRef.current?.focus();
      return null;
    }
    setIsInterpreting(true);
    setMotionNotice('Agent 正在整理动效对象、动作方式、强度与整体风格。');
    const previous = motionHistory[motionHistory.length - 1];
    let result = inferMotionPlan(instruction, previous);
    const token = localStorage.getItem('animate_api_token') || apiToken.trim();
    if (token) {
      try {
        const response = await fetch('/api/animate/interpret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instruction,
            image: uploadedImage,
            polish,
            apiToken: token,
            history: motionHistory.map(item => item.optimizedPrompt),
          }),
        });
        const data = await response.json();
        if (response.ok && data.success && data.result) result = data.result as MotionUnderstanding;
        else setMotionNotice('在线理解暂时不可用，已使用本地 Agent 规则整理本次要求。');
      } catch {
        setMotionNotice('在线理解暂时不可用，已使用本地 Agent 规则整理本次要求。');
      }
    } else {
      setMotionNotice('未配置火山方舟 Token，已使用本地 Agent 规则整理本次要求。');
    }
    setMotionUnderstanding(result);
    if (polish) {
      setMotionInput(result.optimizedPrompt);
      setMotionNotice('提示词已润色，你可以继续修改或直接生成。');
    } else {
      setMotionNotice('AI 已理解你的要求，请确认后生成动态效果。');
    }
    setIsInterpreting(false);
    return result;
  };

  const continueModify = () => {
    setMotionInput('');
    setMotionUnderstanding(null);
    setMotionNotice('请继续描述修改要求，例如“慢一点”“只让背景动”“人物不要动”。');
    window.setTimeout(() => motionInputRef.current?.focus(), 0);
  };
  // 处理图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setUploadedImage(event.target?.result as string);
        setImageSize({ width: img.width, height: img.height });
        setDetectedRegions([]);
        setAnalyzeResult('');
        setMotionUnderstanding(null);
        setLastGeneratedPlan(null);
        setGenerationStatus('');
        setGenerationError('');
        setVideoUrl(null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };
  
  // 拖放处理
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setUploadedImage(event.target?.result as string);
          setImageSize({ width: img.width, height: img.height });
          setDetectedRegions([]);
          setAnalyzeResult('');
          setMotionUnderstanding(null);
          setLastGeneratedPlan(null);
          setGenerationStatus('');
          setGenerationError('');
          setVideoUrl(null);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };
  
  // 开始智能分析 - 调用视觉模型识别区域
  const handleStartAnalysis = async () => {
    const savedToken = localStorage.getItem('animate_api_token');
    if (!savedToken) {
      alert('请先输入并保存 API Token');
      return;
    }
    if (!uploadedImage) {
      alert('请先上传一张静态图片');
      return;
    }
    
    setIsAnalyzing(true);
    setAnalyzeResult('正在调用火山方舟视觉模型识别可动区域...');
    setDetectedRegions([]);
    
    try {
      // 调用视觉模型识别区域
      const response = await fetch('/api/animate/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: uploadedImage,
          apiToken: savedToken
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || '图片分析失败');
      }
      const regions = Array.isArray(data.regions) ? data.regions as AnimateRegion[] : [];
      setDetectedRegions(regions);
      const sceneLine = `场景识别：${data.sceneType || '综合场景'}`;
      const descriptionLine = data.description ? `\n画面说明：${data.description}` : '';
      if (regions.length > 0) {
        setAnalyzeResult(`✓ AI 画面分析完成\n${sceneLine}${descriptionLine}\n识别到 ${regions.length} 个真实可动区域：\n` +
          regions.map((region) => `${region.name}：${region.animationType === 'blink' ? '眨眼' : region.animationType === 'wave' ? '摆动或波动' : '流动或飘动'}`).join('\n'));
      } else {
        setAnalyzeResult(`✓ AI 画面分析完成\n${sceneLine}${descriptionLine}\n没有发现适合自动预览的局部区域，你仍可以按文字要求直接生成动态效果。`);
      }
    } catch (error) {
      setDetectedRegions([]);
      setAnalyzeResult(`图片分析未完成：${error instanceof Error ? error.message : '暂时无法识别'}。你仍可以直接输入动态要求生成作品。`);    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Canvas 本地动效预览
  const handlePreview = useCallback(() => {
    if (!uploadedImage || !previewCanvasRef.current) return;
    if (previewAnimationRef.current) cancelAnimationFrame(previewAnimationRef.current);
    setVideoUrl(null);
    setIsPreviewing(true);
    const canvas=previewCanvasRef.current;
    const ctx=canvas.getContext('2d');
    if (!ctx) return;
    loadImage(uploadedImage).then(image => {
      const scale=Math.min(1,1280/image.width);
      canvas.width=Math.max(2,Math.round(image.width*scale));
      canvas.height=Math.max(2,Math.round(image.height*scale));
      const startedAt=performance.now();
      const enabled=detectedRegions.filter(region=>region.enabled);
      const animate=(now:number)=>{
        drawAnimatedFrame(ctx,image,enabled,now-startedAt,canvas.width,canvas.height);
        previewAnimationRef.current=requestAnimationFrame(animate);
      };
      previewAnimationRef.current=requestAnimationFrame(animate);
    }).catch(error=>setGenerationError(error instanceof Error?error.message:'预览失败'));
  },[uploadedImage,detectedRegions]);

  // 停止预览
  const handleStopPreview = () => {
    if (previewAnimationRef.current) {
      cancelAnimationFrame(previewAnimationRef.current);
      previewAnimationRef.current = null;
    }
    setIsPreviewing(false);
    
    // 恢复原图
    if (uploadedImage && previewCanvasRef.current) {
      const ctx = previewCanvasRef.current.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, previewCanvasRef.current!.width, previewCanvasRef.current!.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = uploadedImage;
      }
    }
  };
  
  // 调用通义万相 wanx2.1-i2v-turbo 生成真实 MP4 视频。
  const handleGenerateVideo = async () => {
    if (!uploadedImage) { setGenerationError('请先上传图片'); return; }
    if (generationBusyRef.current) return;
    generationBusyRef.current = true;
    const epoch = ++generationEpochRef.current;
    try {
    const referenceMatch = isReferenceImage && await matchesReferenceImage(uploadedImage);
    if (epoch !== generationEpochRef.current) return;
    if (referenceMatch) {
      setIsGenerating(true);
      setGenerationError('');
      setGenerationProgress(20);
      setGenerationStatus('正在载入门神年画动效视频');
      setGenerationPhase('generating');
      setVideoUrl(null);
      try {
        const response = await fetch(REFERENCE_VIDEO_URL, { method: 'HEAD', cache: 'no-store' });
        if (epoch !== generationEpochRef.current) return;
        if (!response.ok) throw new Error('门神年画动效视频暂不可用');
        setVideoUrl(REFERENCE_VIDEO_URL);
        setLastGeneratedPlan({
          subjectType: '门神年画',
          subjects: ['祥云', '门神'],
          motions: ['画面自然运动'],
          intensity: '柔和',
          style: '传统年画',
          scope: '整幅年画',
          preserve: '保留原年画的主体、纹样与色彩',
          summary: '已生成这张门神年画对应的动态视频。',
          optimizedPrompt: '使用用户提供的门神年画动效视频。',
        });
        setResultSaved(false);
        setGenerationProgress(100);
        setGenerationStatus('门神年画 MP4 动效视频已载入');
        setGenerationPhase('completed');
        setMotionNotice('已识别指定门神年画，使用对应的动效视频。');
      } catch (error) {
        if (epoch === generationEpochRef.current) {
          setGenerationError(error instanceof Error ? error.message : '动效视频载入失败');
          setGenerationStatus('生成失败');
          setGenerationPhase('failed');
        }
      }
      return;
    }
    const plan = motionUnderstanding || await understandMotionInstruction(false);
    if (epoch !== generationEpochRef.current) return;
    if (!plan) { setGenerationError('请先描述希望画面如何动起来'); return; }
    const enabled = detectedRegions.filter(region => region.enabled);

    const savedKey = normalizeWanxApiKey(localStorage.getItem('animate_wanx_api_key') || wanxApiKey);
    const savedWorkspace = localStorage.getItem('animate_wanx_workspace_id') || wanxWorkspaceId.trim();
    const savedRegion = localStorage.getItem('animate_wanx_region') || wanxRegion;
    if (!savedKey || !savedWorkspace) {
      setGenerationError('请先填写并保存阿里云百炼 API Key 与业务空间 ID');
      return;
    }

    const resolution = generateMode === 'fast' ? '480P' : '720P';
    const duration = generateMode === 'fast' ? 3 : 5;
    const regionPrompt = enabled.length ? '视觉分析补充建议：' + enabled.map(region => {
      if (region.type === 'eyes') return '人物眼部自然眨动';
      if (region.type === 'water') return '水面轻柔流动';
      if (region.type === 'clothes') return '衣袂轻轻摆动';
      if (region.type === 'beard') return '胡须随微风轻摆';
      if (region.type === 'hair') return '发丝和头饰轻微飘动';
      return region.name + '产生克制的细微动态';
    }).join('，') + '。' : '';
    const prompt = (plan.optimizedPrompt + regionPrompt).slice(0, 800);

    setIsGenerating(true);
    setGenerationError('');
    setGenerationProgress(6);
    setGenerationStatus('正在提交通义万相图生视频任务');
    setGenerationPhase('recognizing');
    setVideoUrl(null);

    try {
      const createResponse = await fetch('/api/animate/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: uploadedImage,
          apiKey: savedKey,
          workspaceId: savedWorkspace,
          region: savedRegion,
          prompt,
          resolution,
          duration,
        }),
      });
      const createData = await createResponse.json();
      if (epoch !== generationEpochRef.current) return;
      if (!createResponse.ok || !createData.success || !createData.task_id) {
        throw new Error(createData.error || '通义万相任务创建失败');
      }

      setGenerationPhase('generating');
      setGenerationProgress(14);
      setGenerationStatus('任务已提交，通义万相正在生成视频');

      for (let attempt = 0; attempt < 40; attempt += 1) {
        await new Promise(resolve => window.setTimeout(resolve, 15000));
        if (epoch !== generationEpochRef.current) return;
        const statusResponse = await fetch('/api/animate/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: createData.task_id,
            apiKey: savedKey,
            workspaceId: savedWorkspace,
            region: savedRegion,
          }),
        });
        const statusData = await statusResponse.json();
        if (epoch !== generationEpochRef.current) return;
        if (!statusResponse.ok || !statusData.success) {
          throw new Error(statusData.error || '查询视频生成状态失败');
        }
        if (statusData.status === 'succeed' && statusData.videoUrl) {
          setGenerationError('');
          setVideoUrl(statusData.videoUrl);
          setGenerationProgress(100);
          setGenerationStatus('通义万相 MP4 视频生成完成');
          setGenerationPhase('completed');
          setLastGeneratedPlan(plan);
          setResultSaved(false);
          setMotionHistory(items => {
            const entry = { instruction: motionInput.trim(), summary: plan.summary, optimizedPrompt: plan.optimizedPrompt, createdAt: Date.now() };
            return items[items.length - 1]?.instruction === entry.instruction ? items : [...items, entry].slice(-8);
          });
          return;
        }
        if (statusData.status === 'failed') {
          throw new Error(readableVideoError(String(statusData.message || statusData.code || '通义万相视频生成失败')));
        }
        setGenerationProgress(Math.min(92, 18 + attempt * 2));
        setGenerationStatus(statusData.status === 'pending' ? '任务排队中，请耐心等待' : '通义万相正在生成画面与动作');
      }
      throw new Error('视频生成等待超过 10 分钟。任务可能仍在运行，请稍后重新提交或到百炼控制台查看。');
    } catch (error) {
      if (epoch === generationEpochRef.current) {
        setGenerationError(readableVideoError(error instanceof Error ? error.message : '通义万相视频生成失败'));
        setGenerationStatus('生成失败');
        setGenerationPhase('failed');
      }
    }
    } finally {
      if (epoch === generationEpochRef.current) {
        generationBusyRef.current = false;
        setIsGenerating(false);
      }
    }
  };

  const handleDownloadVideo = () => {
    if (!videoUrl) { alert('请先生成动效视频'); return; }
    const link=document.createElement('a');link.href=videoUrl;link.download='光影新生动态作品_'+Date.now()+'.mp4';
    document.body.appendChild(link);link.click();link.remove();
  };

  const handleDownloadFrame = () => {
    const canvas=previewCanvasRef.current;
    if(!canvas || !canvas.width){alert('请先预览动效');return;}
    const link=document.createElement('a');link.href=canvas.toDataURL('image/png');link.download='光影新生预览帧_'+Date.now()+'.png';
    document.body.appendChild(link);link.click();link.remove();
  };

  const saveDynamicWork = async () => {
    if (!videoUrl || !lastGeneratedPlan) {
      setMotionNotice('请先生成一条动效视频。');
      return;
    }
    setIsSavingWork(true);
    setMotionNotice('正在把视频文件保存到个人中心，请稍候…');
    try {
      const response = videoUrl === REFERENCE_VIDEO_URL
        ? await fetch(REFERENCE_VIDEO_URL, { cache: 'no-store' })
        : await fetch('/api/animate/archive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: videoUrl }),
        });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || '视频文件读取失败');
      }
      const videoBlob = await response.blob();
      const workId = crypto.randomUUID();
      await saveAnimateWork({
        id: workId,
        title: '光影新生动态作品',
        summary: lastGeneratedPlan.summary,
        prompt: lastGeneratedPlan.optimizedPrompt,
        resolution: videoUrl === REFERENCE_VIDEO_URL ? '1440×1440' : generateMode === 'fast' ? '480P' : '720P',
        duration: videoUrl === REFERENCE_VIDEO_URL ? 5 : generateMode === 'fast' ? 3 : 5,
        createdAt: Date.now(),
        videoBlob,
        remoteUrl: videoUrl,
        taskId: linkedTaskId || undefined,
        sourceArtifactId: linkedArtifactId || undefined,
      });
      if (linkedTaskId) {
        const assetId = await putCreativeTaskAsset(videoBlob);
        await addCreativeTaskArtifact(linkedTaskId, { id: linkedTaskId + '-video-' + workId, type: 'video', title: '光影新生动态作品', sourceSkill: 'animate', assetId, externalId: workId, previewUrl: videoUrl, createdAt: Date.now() });
        await updateCreativeTaskStep(linkedTaskId, 'animate', 'completed');
      }
      setResultSaved(true);
      setMotionNotice('视频文件已保存到个人中心的“动态视频作品”，可以直接播放、下载或删除。');
    } catch (error) {
      setMotionNotice(error instanceof Error ? error.message : '视频保存失败，请先下载 MP4 文件留存。');
    } finally {
      setIsSavingWork(false);
    }
  };
  return (
    <div className="mobile-page mobile-animate-page" style={styles.container}>
      {/* 标题栏 */}
      <div className="mobile-page-header" style={styles.header}>
        <WorkbenchBackButton />
        <div><h1 style={styles.title}>光影新生</h1><p style={{ margin: '5px 0 0', color: '#86675a', fontSize: '13px' }}>上传任意静态图片，用自然语言让画面按照你的想法动起来</p></div>
      </div>
      <TaskContextBar taskId={linkedTaskId || undefined} />
      
      {/* 通栏布局 */}
      <div className="mobile-page-content" style={styles.fullWidthContainer}>
        {/* 模型配置 - 通栏 */}
        <details className="mobile-card" style={styles.tokenCard}>
          <summary style={{ cursor: 'pointer', color: '#6a382d', fontWeight: 800, fontSize: '15px' }}>⚙️ 模型与高级设置 <span style={{ color: '#9a8176', fontWeight: 400, fontSize: '12px' }}>需要时展开配置</span></summary>
          <div style={{ marginTop: '18px' }}>
          <h3 style={styles.cardTitle}>🔑 模型配置</h3>
          <p style={styles.cardDesc}>可动区域分析继续使用原火山方舟视觉模型；最终视频由通义万相 wanx2.1-i2v-turbo 生成。</p>
          <div style={{ display: 'grid', gap: '9px' }}>
            <strong style={{ color: '#6d4030', fontSize: '14px' }}>视觉分析：火山方舟</strong>
            <div className="mobile-token-row" style={styles.tokenInputWrapper}>
              <input type="password" value={apiToken} onChange={(e) => handleTokenChange(e.target.value)} placeholder="输入火山方舟 API Token（ark-xxx）" style={{ ...styles.tokenInput, borderColor: tokenError ? '#c41e3a' : '#d4a574' }} />
              <button style={{ ...styles.saveButton, ...(!apiToken.trim() || tokenError ? styles.buttonDisabled : {}) }} onClick={handleTokenSave} disabled={!apiToken.trim() || !!tokenError || tokenValidating}>
                {tokenValidating ? '验证中...' : tokenSaved ? '✓ 已保存' : '保存'}
              </button>
            </div>
            {tokenError && <p style={styles.tokenError}>{tokenError}</p>}
          </div>
          <div style={{ height: 1, background: '#ead8c7', margin: '18px 0' }} />
          <div style={{ display: 'grid', gap: '9px' }}>
            <strong style={{ color: '#6d4030', fontSize: '14px' }}>视频生成：阿里云百炼 · wanx2.1-i2v-turbo</strong>
            <div className="mobile-token-row" style={styles.tokenInputWrapper}>
              <input type="password" value={wanxApiKey} onChange={(e) => { setWanxApiKey(e.target.value); setWanxConfigSaved(false); setWanxConfigError(''); }} placeholder="百炼 API Key（sk-xxx）" style={{ ...styles.tokenInput, borderColor: wanxConfigError ? '#c41e3a' : '#d4a574' }} />
              <input value={wanxWorkspaceId} onChange={(e) => { setWanxWorkspaceId(e.target.value); setWanxConfigSaved(false); setWanxConfigError(''); }} placeholder="业务空间 ID（Workspace ID）" style={{ ...styles.tokenInput, borderColor: wanxConfigError ? '#c41e3a' : '#d4a574' }} />
              <select value={wanxRegion} onChange={(e) => { setWanxRegion(e.target.value); setWanxConfigSaved(false); }} style={{ ...styles.tokenInput, flex: '0 0 155px' }}>
                <option value="cn-beijing">北京</option><option value="ap-southeast-1">新加坡</option><option value="us-east-1">弗吉尼亚</option><option value="eu-central-1">法兰克福</option>
              </select>
              <button style={{ ...styles.saveButton, ...(!wanxApiKey.trim() || !wanxWorkspaceId.trim() ? styles.buttonDisabled : {}) }} onClick={handleWanxConfigSave} disabled={!wanxApiKey.trim() || !wanxWorkspaceId.trim()}>
                {wanxConfigSaved ? '✓ 已保存' : '保存万相配置'}
              </button>
            </div>
            {wanxConfigError && <p style={styles.tokenError}>{wanxConfigError}</p>}
            {wanxConfigSaved && !wanxConfigError ? <p style={styles.tokenSuccess}>✓ 通义万相配置已保存，可生成真实 MP4 视频</p> : <p style={styles.tokenHint}>API Key 仅保存在当前浏览器；业务空间与 API Key 必须属于同一地域。</p>}
          </div>
          </div>
        </details>

        
        {/* 双栏布局区域 */}
        <div className="mobile-two-column" style={styles.twoColumnContainer}>
          {/* 左栏 - 操作区 */}
          <div className="mobile-column" style={styles.leftColumn}>
            {/* 上传图片区 */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>📤 上传创作原图</h3>
              <div 
                style={styles.uploadArea}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadedImage ? (
                  <img src={uploadedImage} alt="预览" style={styles.uploadPreview} />
                ) : (
                  <div style={styles.uploadPlaceholder}>
                    <p style={styles.uploadText}>点击或拖拽上传图片</p>
                    <p style={styles.uploadSubtext}>支持生活照片、风景、古建筑、年画、国风作品、插画与设计图</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>
            
            {/* AI 动效创意输入 */}
            <div style={{ ...styles.card, borderColor: '#b94738', boxShadow: '0 8px 24px rgba(139, 38, 28, 0.12)' }}>
              <div style={styles.creativeHeader}>
                <div>
                  <p style={styles.eyebrow}>AI 动效导演</p>
                  <h3 style={{ ...styles.cardTitle, marginBottom: '6px' }}>告诉我，你想让画面怎么动？</h3>
                  <p style={styles.cardDesc}>任何上传的静态图片都可以提出动态化要求；快捷标签只是示例，你也可以自由描述。</p>
                </div>
                {motionHistory.length > 0 && <span style={styles.memoryBadge}>已记住 {motionHistory.length} 轮修改</span>}
              </div>
              <textarea
                ref={motionInputRef}
                value={motionInput}
                onChange={(event) => {
                  setMotionInput(event.target.value);
                  setMotionUnderstanding(null);
                  setMotionNotice('');
                }}
                placeholder="请输入你希望这张图片如何动起来，例如：让云层缓慢流动、让水面产生轻微波纹、让人物衣袖轻轻摆动、让灯笼随风微晃……"
                rows={5}
                maxLength={800}
                style={styles.motionTextarea}
              />
              <div style={styles.quickPromptRow}>
                {QUICK_MOTION_PROMPTS.map((prompt) => (
                  <button key={prompt} type="button" style={styles.quickPromptButton} onClick={() => appendQuickPrompt(prompt)}>
                    + {prompt}
                  </button>
                ))}
              </div>
              <details style={styles.inlineDetails}>
                <summary style={styles.inlineSummary}>生成规格与预览设置</summary>
                <div style={{ ...styles.modeSelector, marginTop: '12px' }}>
                  <label style={styles.modeLabel}><input type="radio" name="mode" value="fast" checked={generateMode === 'fast'} onChange={() => setGenerateMode('fast')} /><span style={styles.modeText}>快速预览（480P · 3秒）</span></label>
                  <label style={styles.modeLabel}><input type="radio" name="mode" value="hd" checked={generateMode === 'hd'} onChange={() => setGenerateMode('hd')} /><span style={styles.modeText}>标准高清（720P · 5秒）</span></label>
                </div>
              </details>
              <div style={styles.creativeActions}>
                <button type="button" style={{ ...styles.secondaryButton, ...(isInterpreting || !motionInput.trim() ? styles.buttonDisabled : {}) }} onClick={() => void understandMotionInstruction(true)} disabled={isInterpreting || !motionInput.trim()}>
                  {isInterpreting ? '正在理解…' : '帮我润色提示词'}
                </button>
                <button type="button" style={{ ...styles.generateButton, ...(isGenerating || isCheckingReferenceImage || !uploadedImage || (!isReferenceImage && (!motionInput.trim() || !wanxConfigSaved)) ? styles.buttonDisabled : {}) }} onClick={() => void handleGenerateVideo()} disabled={isGenerating || isCheckingReferenceImage || !uploadedImage || (!isReferenceImage && (!motionInput.trim() || !wanxConfigSaved))}>
                  {isCheckingReferenceImage ? '正在识别图片…' : isGenerating ? (isReferenceImage ? '正在载入视频…' : '通义万相生成中…') : isReferenceImage ? '生成这张门神年画动效' : '生成动态效果'}
                </button>
              </div>
              {isReferenceImage && <p style={styles.motionNotice}>已识别你提供的门神年画。点击生成后将播放对应的约 5 秒动效视频，无需配置通义万相；文字描述和生成规格不会改变这段视频。</p>}
              {motionNotice && <p style={styles.motionNotice}>{motionNotice}</p>}
              {motionUnderstanding && (
                <div style={styles.understandingCard}>
                  <div style={styles.understandingHeader}>
                    <strong>木灵已理解你的动态要求</strong>
                    <span>结构化结果</span>
                  </div>
                  <p style={styles.understandingSummary}>{motionUnderstanding.summary}</p>
                  <div style={styles.understandingGrid}>
                    <div><span>主体识别</span><strong>{motionUnderstanding.subjectType}</strong></div>
                    <div><span>动效对象</span><strong>{motionUnderstanding.subjects.join('、')}</strong></div>
                    <div><span>动效方式</span><strong>{motionUnderstanding.motions.join('、')}</strong></div>
                    <div><span>动效强度</span><strong>{motionUnderstanding.intensity}</strong></div>
                    <div><span>风格氛围</span><strong>{motionUnderstanding.style}</strong></div>
                    <div><span>作用范围</span><strong>{motionUnderstanding.scope}</strong></div>
                    <div style={{ gridColumn: '1 / -1' }}><span>保持不变部分</span><strong>{motionUnderstanding.preserve}</strong></div>
                  </div>
                </div>
              )}
              {generationStatus && <div style={styles.progressContainer}><div style={styles.progressBar}><div style={{ ...styles.progressFill, width: String(generationProgress) + '%' }} /></div><div style={styles.progressInfo}><span style={styles.progressText}>{generationStatus}</span><span style={styles.progressPercent}>{Math.round(generationProgress)}%</span></div></div>}
              {generationError && <p style={styles.tokenError}>{generationError}</p>}
            </div>
            {/* 智能区域识别 */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>🔍 AI 画面分析（可选）</h3>
              <p style={styles.cardDesc}>
                辅助识别人物、衣袂、云雾、水面等可动对象；也可以跳过分析，直接按文字要求生成。
              </p>
              <button
                style={{
                  ...styles.analyzeButton,
                  ...(isAnalyzing ? styles.buttonDisabled : {})
                }}
                onClick={handleStartAnalysis}
                disabled={isAnalyzing || !uploadedImage}
              >
                {isAnalyzing ? '🔄 分析中...' : '🚀 开始智能分析'}
              </button>
              {analyzeResult && (
                <div style={styles.analyzeResult}>
                  <pre style={styles.analyzeText}>{analyzeResult}</pre>
                </div>
              )}
            </div>
            
            {/* 识别区域显示 */}
            {detectedRegions.length > 0 && (
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>📋 识别到的可动区域</h3>
                <div style={styles.regionList}>
                  {detectedRegions.map(region => (
                    <div key={region.id} style={styles.regionTag}>
                      <span style={styles.regionTagIcon}>
                        {region.type === 'eyes' ? '👁' : region.type === 'water' ? '💧' : region.type === 'beard' ? '🧔' : region.type === 'hair' ? '🍃' : region.type === 'clothes' ? '👘' : '✨'}
                      </span>
                      <span style={styles.regionTagName}>
                        {region.name.replace(/[\u{1F300}-\u{1F9FF}]/gu, '')}
                      </span>
                      <span style={styles.regionTagType}>
                        {region.animationType === 'blink' ? '眨眼 3秒/次' : 
                         region.animationType === 'wave' ? '波浪 1秒/次' : '飘动 1秒/次'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Canvas 预览 */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>▶️ 局部动效预览</h3>
              <p style={styles.cardDesc}>
                在正式生成前，用本地预览快速检查已识别区域的运动方向，不产生模型费用。
              </p>
              <div style={styles.previewButtons}>
                {!isPreviewing ? (
                  <button
                    style={styles.previewButton}
                    onClick={handlePreview}
                    disabled={detectedRegions.length === 0}
                  >
                    ▶️ 开始预览
                  </button>
                ) : (
                  <button
                    style={styles.stopButton}
                    onClick={handleStopPreview}
                  >
                    ⏹ 停止预览
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* 右栏 - 预览区 */}
          <div className="mobile-column mobile-preview-column" style={styles.rightColumn}>
            {/* 视频预览区 */}
            <div style={styles.previewCard}>
              <h3 style={styles.cardTitle}>🎬 作品预览</h3>
              <div style={styles.previewContainer}>
                {videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={styles.videoPlayer}
                  />
                ) : (
                  <div style={styles.previewPlaceholder}>
                    <canvas ref={previewCanvasRef} style={styles.previewCanvas} />
                    {!uploadedImage && <p style={styles.previewText}>上传图片后可预览</p>}
                    {uploadedImage && !isPreviewing && <p style={styles.previewText}>点击"开始预览"查看动效</p>}
                  </div>
                )}
              </div>
            </div>
            
            {/* 生成结果与后续操作 */}
            {lastGeneratedPlan && videoUrl ? (
              <div style={styles.resultSummaryCard}>
                <div style={styles.resultTitleRow}>
                  <div>
                    <p style={styles.eyebrow}>本次动态要求</p>
                    <h3 style={{ ...styles.cardTitle, marginBottom: '6px' }}>作品已经生成</h3>
                  </div>
                  <span style={styles.completedBadge}>已完成</span>
                </div>
                <p style={styles.resultSummaryText}>{lastGeneratedPlan.summary}</p>
                <div style={styles.resultMetaRow}>
                  <span>{videoUrl === REFERENCE_VIDEO_URL ? '1440×1440 · 5秒' : generateMode === 'fast' ? '480P · 3秒' : '720P · 5秒'}</span>
                  <span>{lastGeneratedPlan.scope}</span>
                  <span>{lastGeneratedPlan.style}</span>
                </div>
                <div style={styles.resultActionGrid}>
                  <button type="button" style={styles.resultPrimaryButton} onClick={() => void handleGenerateVideo()} disabled={isGenerating}>重新生成</button>
                  <button type="button" style={styles.resultSecondaryButton} onClick={continueModify}>继续修改</button>
                  <button type="button" style={styles.resultSecondaryButton} onClick={handleDownloadVideo}>下载作品</button>
                  <button type="button" style={styles.resultSecondaryButton} onClick={() => void saveDynamicWork()} disabled={isSavingWork || resultSaved}>{isSavingWork ? '正在保存视频…' : resultSaved ? '已保存到个人中心' : '保存到个人中心'}</button>

                </div>
              </div>
            ) : (
              <div style={styles.downloadCard}>
                <button style={styles.downloadButton} onClick={handleDownloadVideo} disabled={!videoUrl}>下载生成的 MP4</button>
                <button style={styles.downloadButton} onClick={handleDownloadFrame} disabled={detectedRegions.length === 0}>保存 Canvas 预览帧</button>
              </div>
            )}
            {/* 使用说明 */}
            <div style={styles.helpCard}>
              <h4 style={styles.helpTitle}>📖 使用说明</h4>
              <ul style={styles.helpList}>
                <li>火山方舟 Token 用于视觉 Agent 分析可动区域</li>
                <li>百炼 API Key 与业务空间 ID 用于通义万相视频生成</li>
                <li>上传不超过 10MB 的 JPG、PNG、BMP 或 WEBP 图片</li>
                <li>可以先做 AI 画面分析，也可以直接用自然语言描述动态要求</li>
                <li>Canvas 预览不会产生费用，可先检查动作方案</li>
                <li>{isReferenceImage ? '这张门神年画使用已提供的动效视频，不创建计费任务' : '点击“生成动态效果”后将创建通义万相计费任务'}</li>
                <li>{isReferenceImage ? '对应视频会直接载入，随后可预览并下载 MP4' : '生成通常需要数分钟，完成后可预览并下载 MP4'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 样式
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #fdf6e3 0%, #fef9f3 50%, #fff8dc 100%)',
    padding: '20px',
    fontFamily: 'Georgia, "Songti SC", serif'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '20px',
    padding: '15px 20px',
    background: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '12px',
    border: '1px solid #d4a574'
  },
  backButton: {
    padding: '10px 20px',
    background: 'rgba(139, 90, 43, 0.9)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: 'Georgia, "Songti SC", serif'
  },
  title: {
    margin: 0,
    color: '#5d3a1a',
    fontSize: '24px',
    fontWeight: 'bold'
  },
  fullWidthContainer: {
    maxWidth: '1400px',
    margin: '0 auto'
  },
  tokenCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    border: '2px solid #d4a574',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  cardTitle: {
    margin: '0 0 15px 0',
    color: '#5d3a1a',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  tokenInputWrapper: {
    display: 'flex',
    gap: '10px'
  },
  tokenInput: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '14px',
    border: '2px solid #d4a574',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'Georgia, "Songti SC", serif'
  },
  saveButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    fontFamily: 'Georgia, "Songti SC", serif'
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  tokenError: {
    color: '#c41e3a',
    fontSize: '13px',
    margin: '10px 0 0 0'
  },
  tokenSuccess: {
    color: '#228b22',
    fontSize: '13px',
    margin: '10px 0 0 0'
  },
  tokenHint: {
    color: '#888',
    fontSize: '12px',
    margin: '10px 0 0 0'
  },
  twoColumnContainer: {
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start'
  },
  leftColumn: {
    flex: '0 0 45%',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  rightColumn: {
    flex: '0 0 53%',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    position: 'sticky',
    top: '20px'
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    border: '2px solid #d4a574',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  creativeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px'
  },
  eyebrow: {
    margin: '0 0 6px',
    color: '#a33a2d',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.12em'
  },
  memoryBadge: {
    flexShrink: 0,
    padding: '6px 10px',
    borderRadius: '999px',
    color: '#7a4435',
    background: '#f7e8dc',
    fontSize: '12px',
    fontWeight: 700
  },
  motionTextarea: {
    width: '100%',
    minHeight: '132px',
    boxSizing: 'border-box',
    resize: 'vertical',
    padding: '14px 16px',
    border: '1px solid #d9bda9',
    borderRadius: '12px',
    outline: 'none',
    color: '#4f332b',
    background: '#fffcf8',
    fontSize: '15px',
    lineHeight: 1.7,
    fontFamily: 'Georgia, "Songti SC", serif'
  },
  quickPromptRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px'
  },
  quickPromptButton: {
    padding: '7px 11px',
    border: '1px solid #ead0bd',
    borderRadius: '999px',
    color: '#8b4638',
    background: '#fff5ec',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'Georgia, "Songti SC", serif'
  },
  inlineDetails: {
    marginTop: '14px',
    padding: '11px 13px',
    border: '1px solid #ead8c7',
    borderRadius: '10px',
    background: '#fffaf5'
  },
  inlineSummary: {
    cursor: 'pointer',
    color: '#755044',
    fontSize: '13px',
    fontWeight: 700
  },
  creativeActions: {
    display: 'grid',
    gridTemplateColumns: 'minmax(130px, 0.75fr) minmax(180px, 1.25fr)',
    gap: '10px',
    marginTop: '14px'
  },
  secondaryButton: {
    padding: '13px 16px',
    border: '1px solid #b94738',
    borderRadius: '9px',
    color: '#9a3126',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'Georgia, "Songti SC", serif'
  },
  motionNotice: {
    margin: '12px 0 0',
    padding: '10px 12px',
    borderRadius: '8px',
    color: '#765040',
    background: '#fff5e9',
    fontSize: '13px',
    lineHeight: 1.6
  },
  understandingCard: {
    marginTop: '14px',
    padding: '15px',
    border: '1px solid #e2c8b5',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #fffaf4 0%, #f8eee5 100%)'
  },
  understandingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    color: '#693c31',
    fontSize: '14px'
  },
  understandingSummary: {
    margin: '10px 0 12px',
    color: '#704f44',
    fontSize: '13px',
    lineHeight: 1.7
  },
  understandingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '8px'
  },
  resultSummaryCard: {
    padding: '20px',
    border: '2px solid #c78a68',
    borderRadius: '12px',
    background: 'linear-gradient(145deg, #fffdf9 0%, #fff3e8 100%)',
    boxShadow: '0 8px 24px rgba(112, 58, 37, 0.1)'
  },
  resultTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px'
  },
  completedBadge: {
    padding: '6px 10px',
    borderRadius: '999px',
    color: '#246b48',
    background: '#e2f2e8',
    fontSize: '12px',
    fontWeight: 700
  },
  resultSummaryText: {
    margin: '4px 0 12px',
    color: '#63453b',
    fontSize: '14px',
    lineHeight: 1.75
  },
  resultMetaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '14px',
    color: '#8c5545',
    fontSize: '12px'
  },
  resultActionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '9px'
  },
  resultPrimaryButton: {
    padding: '12px 14px',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    background: 'linear-gradient(135deg, #bd4335 0%, #8c201b 100%)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'Georgia, "Songti SC", serif'
  },
  resultSecondaryButton: {
    padding: '12px 14px',
    border: '1px solid #cf9c7f',
    borderRadius: '8px',
    color: '#824437',
    background: '#fffaf5',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'Georgia, "Songti SC", serif'
  },  cardDesc: {
    color: '#666',
    fontSize: '14px',
    margin: '0 0 15px 0',
    lineHeight: 1.6
  },
  uploadArea: {
    width: '100%',
    height: '180px',
    border: '2px dashed #d4a574',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: '#fff9f0',
    overflow: 'hidden'
  },
  uploadPreview: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain'
  },
  uploadPlaceholder: {
    textAlign: 'center',
    color: '#d4a574'
  },
  uploadText: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold'
  },
  uploadSubtext: {
    margin: '5px 0 0 0',
    fontSize: '13px'
  },
  analyzeButton: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #228b22 0%, #006400 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    fontFamily: 'Georgia, "Songti SC", serif'
  },
  analyzeResult: {
    marginTop: '15px',
    padding: '15px',
    background: '#f0fff0',
    borderRadius: '8px',
    border: '1px solid #228b22'
  },
  analyzeText: {
    margin: 0,
    fontSize: '13px',
    color: '#228b22',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.8
  },
  regionList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px'
  },
  regionTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    background: 'linear-gradient(135deg, #fff9f0 0%, #ffe4c4 100%)',
    borderRadius: '20px',
    border: '1px solid #d4a574',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  },
  regionTagIcon: {
    fontSize: '16px'
  },
  regionTagName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#5d3a1a',
    fontFamily: 'Georgia, "Songti SC", serif'
  },
  regionTagType: {
    fontSize: '12px',
    color: '#8b5a2b',
    background: 'rgba(212, 165, 116, 0.2)',
    padding: '2px 8px',
    borderRadius: '10px'
  },
  regionInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  regionName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#5d3a1a'
  },
  regionType: {
    fontSize: '12px',
    color: '#888'
  },
  switch: {
    position: 'relative',
    display: 'inline-block',
    width: '50px',
    height: '26px'
  },
  slider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ccc',
    transition: '0.3s',
    borderRadius: '26px'
  },
  modeSelector: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '15px'
  },
  modeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer'
  },
  modeText: {
    fontSize: '14px',
    color: '#5d3a1a'
  },
  generateButton: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    fontFamily: 'Georgia, "Songti SC", serif'
  },
  progressContainer: {
    marginTop: '15px'
  },
  progressBar: {
    width: '100%',
    height: '8px',
    background: '#f0f0f0',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #c41e3a 0%, #ff6b6b 100%)',
    transition: 'width 0.3s ease'
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
    fontSize: '12px'
  },
  progressText: {
    color: '#666'
  },
  progressPercent: {
    color: '#c41e3a',
    fontWeight: 'bold'
  },
  errorContainer: {
    marginTop: '15px',
    padding: '15px',
    background: '#fff0f0',
    borderRadius: '8px',
    border: '1px solid #c41e3a'
  },
  errorText: {
    margin: '0 0 10px 0',
    color: '#c41e3a',
    fontSize: '14px'
  },
  retryButton: {
    padding: '8px 20px',
    background: '#c41e3a',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: 'Georgia, "Songti SC", serif'
  },
  successContainer: {
    marginTop: '15px',
    padding: '15px',
    background: '#f0fff0',
    borderRadius: '8px',
    border: '1px solid #228b22'
  },
  successText: {
    margin: 0,
    color: '#228b22',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  previewButtons: {
    display: 'flex',
    gap: '10px'
  },
  previewButton: {
    flex: 1,
    padding: '14px',
    background: 'linear-gradient(135deg, #4a90e2 0%, #1e5799 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
    fontFamily: 'Georgia, "Songti SC", serif'
  },
  stopButton: {
    flex: 1,
    padding: '14px',
    background: 'linear-gradient(135deg, #ff6b6b 0%, #c41e3a 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
    fontFamily: 'Georgia, "Songti SC", serif'
  },
  previewCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    border: '2px solid #d4a574',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  previewContainer: {
    width: '100%',
    aspectRatio: '1 / 1',
    background: '#f5f5f5',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  previewPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  previewCanvas: {
    maxWidth: '100%',
    maxHeight: '100%',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  },
  previewText: {
    color: '#999',
    fontSize: '14px',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  },
  videoPlayer: {
    maxWidth: '100%',
    maxHeight: '100%',
    borderRadius: '8px'
  },
  downloadCard: {
    display: 'flex',
    gap: '15px'
  },
  downloadButton: {
    flex: 1,
    padding: '14px',
    background: 'linear-gradient(135deg, #d4a574 0%, #8b5a2b 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
    fontFamily: 'Georgia, "Songti SC", serif'
  },
  helpCard: {
    background: '#fff9f0',
    borderRadius: '12px',
    padding: '20px',
    border: '2px solid #d4a574'
  },
  helpTitle: {
    margin: '0 0 15px 0',
    color: '#5d3a1a',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  helpList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#666',
    fontSize: '13px',
    lineHeight: 2
  }
};

export default AnnualPaintingAnimate;


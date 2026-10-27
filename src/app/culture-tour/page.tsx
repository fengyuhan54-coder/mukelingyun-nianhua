'use client';

import { useRouter } from 'next/navigation';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import WorkbenchBackButton from '@/components/WorkbenchBackButton';
import TaskContextBar from '@/components/TaskContextBar';
import { saveHandoffReference } from '@/lib/muling-storage';
import { addCreativeTaskMaterial, createCreativeTask, getCreativeTask, putCreativeTaskAsset, removeCreativeTaskMaterial, setActiveCreativeTaskId, updateCreativeTask, updateCreativeTaskStep } from '@/lib/creative-task-storage';
import RealMapExplorer, { type CultureMapPoint } from './RealMapExplorer';
import styles from './page.module.css';

type PointStatus = 'planned' | 'done' | 'deferred';
type TripPhase = 'active' | 'return' | 'completed';
type TriggerType = '任务延续' | '时间节点' | '现场识别';

type RoutePoint = CultureMapPoint & {
  id: string;
  time: string;
  title: string;
  kind: string;
  duration: number;
  distance: number;
  indoor: boolean;
  observe: string;
  collect: string;
  culture: string;
  status: PointStatus;
};

type TripMaterial = {
  id: string;
  title: string;
  source: string;
  elements: string[];
  culture: string;
  createdAt: number;
};

type TripTask = {
  id: string;
  title: string;
  goal: string;
  destination: string;
  tripDate: string;
  days: number;
  availableHours: number;
  preferences: string[];
  explanationLength: '简短' | '适中' | '详细';
  phase: TripPhase;
  route: RoutePoint[];
  materials: TripMaterial[];
  adjustmentLog: string[];
  createdAt: number;
  updatedAt: number;
};

type Recognition = {
  title: string;
  elements: string[];
  culture: string;
  overview: string;
  observations: string[];
  interpretations: string[];
  uncertainty: string;
  questionSuggestions: string[];
  source: '视觉模型' | '演示模式';
};

const STORAGE_KEY = '__culture_tour_agent_task_v1__';
const DEFAULT_GOAL = '国庆去开封玩两天，我喜欢古建筑和朱仙镇年画，希望讲解简短一点。';

const BASE_ROUTE: RoutePoint[] = [
  { id: 'iron-pagoda', time: '09:00', title: '开封铁塔', kind: '古建筑观察', duration: 60, distance: 0, indoor: false, observe: '琉璃砖塔、仿木构斗拱、门窗纹样', collect: '拍摄塔身色彩、斗拱与砖雕细节', culture: '北宋建筑审美与琉璃烧造工艺', source: 'agent', status: 'planned' },
  { id: 'xiangguo', time: '11:00', title: '大相国寺', kind: '建筑与历史', duration: 70, distance: 0, indoor: true, observe: '山门、殿宇轴线、彩绘与造像', collect: '记录门饰、屋顶和殿内装饰元素', culture: '宋都寺院空间与民间信仰文化', source: 'agent', status: 'planned' },
  { id: 'kaifengfu', time: '14:00', title: '开封府', kind: '宋文化探索', duration: 80, distance: 0, indoor: true, observe: '府衙格局、仪门、脊兽和匾额', collect: '拍摄建筑构件与宋文化视觉符号', culture: '府衙制度与包公文化的当代表达', source: 'agent', status: 'planned' },
  { id: 'zhuxian', time: '次日 10:00', title: '朱仙镇木版年画', kind: '非遗专题', duration: 120, distance: 0, indoor: true, observe: '门神造型、刀法、套色和传统纸张', collect: '收藏门神线稿、朱红石绿配色与纹样', culture: '中国木版年画重要流派及其吉祥观念', source: 'agent', status: 'planned' },
];

function dateAfter(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

function parseDays(text: string) {
  const match = text.match(/(\d+)\s*天/);
  return match ? Math.max(1, Math.min(7, Number(match[1]))) : 2;
}

function inferPreferences(text: string) {
  const candidates = ['古建筑', '朱仙镇年画', '传统纹样', '宋文化', '雕版拓印'];
  const selected = candidates.filter(item => text.includes(item.replace('文化', '')) || text.includes(item));
  return selected.length ? selected : ['古建筑', '朱仙镇年画'];
}

function cultureFor(elements: string[]) {
  const text = elements.join('');
  if (/斗拱|飞檐|屋顶|塔|琉璃/.test(text)) return '这些元素体现中国木构建筑的结构智慧与礼制秩序，可继续观察斗拱层次、屋顶曲线和装饰构件。';
  if (/祥云|回纹|莲|牡丹|纹样/.test(text)) return '识别结果与传统吉祥纹样有关，可从连续结构、寓意和年画中的使用位置继续理解。';
  if (/门神|年画|套色|木版/.test(text)) return '识别结果与木版年画有关，可重点观察人物造型、刻线力度和朱红、石绿等传统套色。';
  return '这张图片可以作为旅行文化素材，木灵会结合建筑、纹样和非遗知识继续整理其文化价值。';
}

function buildTask(goal: string, tripDate: string): TripTask {
  const preferences = inferPreferences(goal);
  const short = /简短|不要太长|一分钟/.test(goal);
  return {
    id: crypto.randomUUID(),
    title: '开封文化探索',
    goal,
    destination: '开封',
    tripDate,
    days: parseDays(goal),
    availableHours: parseDays(goal) * 7,
    preferences,
    explanationLength: short ? '简短' : '适中',
    phase: 'active',
    route: BASE_ROUTE.map(point => ({ ...point })),
    materials: [],
    adjustmentLog: [`已根据“${preferences.join('、')}”偏好建立文化探索路线。`],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function readTask(): TripTask | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TripTask;
    return {
      ...parsed,
      route: parsed.route.map(point => ({
        ...point,
        source: point.source || (BASE_ROUTE.some(base => base.id === point.id) ? 'agent' : 'user'),
      })),
    };
  } catch { return null; }
}

export default function CultureTourPage() {
  const router = useRouter();
  const [task, setTask] = useState<TripTask | null>(null);
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [tripDate, setTripDate] = useState(dateAfter(1));
  const [ready, setReady] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [notice, setNotice] = useState('');
  const [recognition, setRecognition] = useState<Recognition | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [recognizing, setRecognizing] = useState(false);
  const [recognitionError, setRecognitionError] = useState('');
  const recognitionRequest = useRef(0);
  useEffect(() => () => { recognitionRequest.current += 1; }, []);
  const [currentPoint, setCurrentPoint] = useState<RoutePoint | null>(null);
  const [selectedPointId, setSelectedPointId] = useState('iron-pagoda');
  const [dismissed, setDismissed] = useState<TriggerType[]>([]);
  const [unifiedTaskId, setUnifiedTaskId] = useState('');
  const routeRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const linkedId = new URLSearchParams(window.location.search).get('taskId') || '';
    if (linkedId) {
      setUnifiedTaskId(linkedId); setActiveCreativeTaskId(linkedId);
      void getCreativeTask(linkedId).then(linked => {
        if (!linked) return;
        setGoal(linked.brief); if (linked.eventDate) setTripDate(linked.eventDate);
        setTask(current => current || { ...buildTask(linked.brief, linked.eventDate || dateAfter(1)), id: linked.id, title: linked.title });
      });
    }
    const stored = readTask();
    if (stored && (!linkedId || stored.id === linkedId)) setTask(stored);
    try {
      const raw = sessionStorage.getItem('__culture_tour_handoff__');
      if (raw && !stored) {
        const handoff = JSON.parse(raw) as { goal?: unknown; timestamp?: unknown };
        if (typeof handoff.timestamp === 'number' && Date.now() - handoff.timestamp < 30 * 60 * 1000 && typeof handoff.goal === 'string') setGoal(handoff.goal);
      }
      sessionStorage.removeItem('__culture_tour_handoff__');
    } catch { sessionStorage.removeItem('__culture_tour_handoff__'); }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (task) localStorage.setItem(STORAGE_KEY, JSON.stringify(task));
    else localStorage.removeItem(STORAGE_KEY);
  }, [task, ready]);

  const triggers = useMemo(() => {
    if (!task) return [] as Array<{ type: TriggerType; reason: string; text: string; target: 'route' | 'recognition' }>;
    const result: Array<{ type: TriggerType; reason: string; text: string; target: 'route' | 'recognition' }> = [];
    const remaining = task.route.filter(point => point.status === 'planned').length;
    if (remaining) result.push({ type: '任务延续', reason: `你还有 ${remaining} 个文化观察点未完成`, text: '继续上次的开封文化探索，并从当前进度接着走。', target: 'route' });
    const days = Math.ceil((new Date(task.tripDate).getTime() - Date.now()) / 86400000);
    if (days >= 0 && days <= 2) result.push({ type: '时间节点', reason: days === 0 ? '旅行日期是今天' : `距离出发还有 ${days} 天`, text: '检查路线、讲解偏好和素材采集清单。', target: 'route' });
    if (recognition) result.push({ type: '现场识别', reason: `刚识别到：${recognition.elements.slice(0, 3).join('、')}`, text: '查看文化讲解、收藏素材或进入返程创作。', target: 'recognition' });
    return result.filter(item => !dismissed.includes(item.type));
  }, [task, recognition, dismissed]);

  const selectedPoint = task?.route.find(point => point.id === selectedPointId) || task?.route[0];

  function updateTask(updater: (current: TripTask) => TripTask) {
    setTask(current => current ? { ...updater(current), updatedAt: Date.now() } : current);
  }

  function hydrateMapPoint(pointId: string, patch: Partial<RoutePoint>) {
    updateTask(current => ({ ...current, route: current.route.map(point => point.id === pointId ? { ...point, ...patch } : point) }));
  }

  function addMapPoint(point: CultureMapPoint) {
    updateTask(current => {
      const exists = current.route.some(item =>
        (point.poiId && item.poiId === point.poiId) ||
        (item.title === point.title && item.lng === point.lng && item.lat === point.lat));
      if (exists) return current;
      const routePoint: RoutePoint = { ...point, source: 'user', status: 'planned', time: '待安排' };
      return {
        ...current,
        route: [...current.route, routePoint],
        adjustmentLog: ['用户从真实地图加入“' + point.title + '”，等待 Agent 重新组织路线。', ...current.adjustmentLog].slice(0, 8),
      };
    });
    setSelectedPointId(point.id);
    setNotice('已把“' + point.title + '”加入我的行程。你可以继续搜索地点，或让 Agent 重新排序。');
  }

  function removeMapPoint(pointId: string) {
    if (selectedPointId === pointId) {
      setSelectedPointId(task?.route.find(point => point.id !== pointId)?.id || '');
    }
    updateTask(current => {
      const removed = current.route.find(point => point.id === pointId);
      return {
        ...current,
        route: current.route.filter(point => point.id !== pointId),
        adjustmentLog: [removed ? '用户从行程移除“' + removed.title + '”。' : '用户调整了行程地点。', ...current.adjustmentLog].slice(0, 8),
      };
    });
    setNotice('地点已从我的行程移除，其他地点和旅行素材不受影响。');
  }

  function moveMapPoint(pointId: string, direction: -1 | 1) {
    updateTask(current => {
      const route = [...current.route];
      const index = route.findIndex(point => point.id === pointId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= route.length) return current;
      [route[index], route[target]] = [route[target], route[index]];
      return { ...current, route, adjustmentLog: ['用户手动调整了行程顺序，真实路线将重新计算。', ...current.adjustmentLog].slice(0, 8) };
    });
  }

  function agentReorderMapPoints() {
    updateTask(current => {
      const withLocation = current.route.filter(point => typeof point.lng === 'number' && typeof point.lat === 'number');
      if (withLocation.length < 2) return { ...current, adjustmentLog: ['地点坐标仍在从地图服务获取，暂时无法重排。', ...current.adjustmentLog].slice(0, 8) };
      const pending = [...withLocation];
      const ordered: RoutePoint[] = [pending.shift()!];
      while (pending.length) {
        const last = ordered[ordered.length - 1];
        let bestIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        pending.forEach((point, index) => {
          const distance = Math.pow((point.lng || 0) - (last.lng || 0), 2) + Math.pow((point.lat || 0) - (last.lat || 0), 2);
          if (distance < bestDistance) { bestDistance = distance; bestIndex = index; }
        });
        ordered.push(pending.splice(bestIndex, 1)[0]);
      }
      const unresolved = current.route.filter(point => typeof point.lng !== 'number' || typeof point.lat !== 'number');
      const route = [...ordered, ...unresolved].map((point, index) => ({
        ...point,
        time: index === 0 ? '09:00' : index === 1 ? '11:00' : index === 2 ? '14:00' : index === 3 ? '16:00' : '次日 ' + String(9 + (index - 4) * 2).padStart(2, '0') + ':00',
      }));
      return { ...current, route, adjustmentLog: ['Agent 根据用户最终选择与地点分布重排行程；高德地图将重新计算真实驾车距离与耗时。', ...current.adjustmentLog].slice(0, 8) };
    });
    setNotice('Agent 已按照地点分布重新排序，高德地图正在重新计算真实路线。');
  }

  function explainMapPoint(point: CultureMapPoint) {
    sessionStorage.setItem('__heritage_culture_tour_handoff__', JSON.stringify({
      title: point.title,
      elements: [point.kind, point.title],
      overview: point.culture,
      observations: [point.observe],
      interpretations: ['该地点由高德地图真实 POI 数据选中，文化知识将结合地点名称、类别和用户问题继续讲解。'],
      uncertainty: '地址、坐标和地点类别来自地图服务；具体历史沿革与开放信息仍需结合官方场馆资料核实。',
      questionSuggestions: ['这里最值得观察哪些建筑细节？', '这个地点与开封历史有什么关系？', '哪些元素适合用于国风创作？'],
      source: '高德地图 POI',
      timestamp: Date.now(),
    }));
    router.push('/intangible-heritage?source=culture-tour' + (unifiedTaskId ? '&taskId=' + encodeURIComponent(unifiedTaskId) : ''));
  }

  function photographMapPoint(point: CultureMapPoint) {
    setSelectedPointId(point.id);
    setCurrentPoint(point as RoutePoint);
    recognitionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setNotice('已选择“' + point.title + '”。请上传现场照片，木灵会结合当前地点进行详细分析。');
  }

  function collectMapPoint(point: CultureMapPoint) {
    updateTask(current => {
      if (current.materials.some(item => item.id === 'poi-' + point.id)) return current;
      const material: TripMaterial = {
        id: 'poi-' + point.id,
        title: point.title,
        source: point.source === 'agent' ? 'Agent 推荐地点' : '用户地图选点',
        elements: [point.kind, point.title],
        culture: point.culture + ' 地址：' + (point.address || '等待地图服务返回'),
        createdAt: Date.now(),
      };
      return { ...current, materials: [material, ...current.materials] };
    });
    if (unifiedTaskId) void addCreativeTaskMaterial(unifiedTaskId, { id: 'poi-' + point.id, title: point.title, source: point.source === 'agent' ? 'Agent 推荐地点' : '用户地图选点', elements: [point.kind, point.title], culture: point.culture, createdAt: Date.now() });
    setNotice('已把“' + point.title + '”保存到本次旅行素材。');
  }
  async function createTask() {
    if (!goal.trim()) { setNotice('请先说说想去哪里、什么时候去，以及感兴趣的文化内容。'); return; }
    const next = buildTask(goal.trim(), tripDate);
    let id = unifiedTaskId;
    if (!id) {
      const unified = await createCreativeTask({ type: 'culture-tour', title: next.title, brief: next.goal, eventDate: next.tripDate, purpose: '文化探索与返程创作', emotion: '发现、记录与纪念', nextSkillId: 'culture-tour', steps: [{ label: '确认行程与兴趣', skillId: 'culture-tour' }, { label: '生成文化路线', skillId: 'culture-tour' }, { label: '现场识别与文化问答', skillId: 'heritage' }, { label: '整理旅行素材', skillId: 'culture-tour' }, { label: '生成旅行纪念作品', skillId: 'muling' }] });
      id = unified.id; setUnifiedTaskId(id);
    }
    setTask({ ...next, id }); await updateCreativeTaskStep(id, 'culture-tour', 'completed');
    setNotice('文化探索任务已建立。路线重点是观察、理解和素材采集，不包含实时交通与开放时间。'); setDismissed([]);
  }

  function replan(kind: 'two-hours' | 'rain' | 'nearby') {
    updateTask(current => {
      let route: RoutePoint[] = current.route.map(point => ({ ...point, status: point.status === 'done' ? 'done' : 'planned' }));
      let message = '';
      let availableHours = current.availableHours;
      if (kind === 'two-hours') {
        availableHours = 2;
        let minutes = 0;
        route = route.map(point => {
          if (point.status === 'done') return point;
          if (minutes + point.duration <= 120) { minutes += point.duration; return point; }
          return { ...point, status: 'deferred' as const };
        });
        message = '可用时间调整为两小时，保留距离近且最符合偏好的观察点，其余节点已延期。';
      } else if (kind === 'rain') {
        route = route.map(point => point.status !== 'done' && !point.indoor ? { ...point, status: 'deferred' as const } : point);
        message = '已切换为雨天路线，优先保留室内文化点，露天观察任务延期。';
      } else {
        route = route.map(point => point.status !== 'done' && point.distance > 3 ? { ...point, status: 'deferred' as const } : point);
        message = '已按“不想去太远”调整，保留三公里内点位，远距离节点延期。';
      }
      return { ...current, route, availableHours, adjustmentLog: [message, ...current.adjustmentLog].slice(0, 8) };
    });
    setNotice('木灵已在原任务上重新安排路线，已完成节点和收藏素材没有丢失。');
  }

  function togglePoint(pointId: string) {
    updateTask(current => ({ ...current, route: current.route.map(point => point.id === pointId ? { ...point, status: point.status === 'done' ? 'planned' : 'done' } : point) }));
  }

  function simulateArrival(point: RoutePoint) {
    setCurrentPoint(point);
    setNotice(`演示模式：已模拟到达“${point.title}”。这是比赛演示数据，不代表真实定位。`);
    recognitionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function identifyPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setNotice('现场识别仅支持不超过 5MB 的 JPG 或 PNG 图片。'); return;
    }
    const requestId = ++recognitionRequest.current;
    setRecognition(null);
    setRecognitionError('');
    setPreview('');
    setRecognizing(true);
    setNotice('木灵正在识别这张照片中的文化元素。');
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('照片读取失败，请重新选择。'));
        reader.readAsDataURL(file);
      });
      if (requestId !== recognitionRequest.current) return;
      setPreview(dataUrl);
      const form = new FormData(); form.append('image', file); form.append('type', 'culture-tour');
      const response = await fetch('/api/extract-elements', { method: 'POST', body: form });
      const result = await response.json();
      if (requestId !== recognitionRequest.current) return;
      if (!response.ok || !result.success) throw new Error(result.error || '识别失败');
      const elements = String(result.elements).split(/[、，,；;]/).map(item => item.trim()).filter(Boolean).slice(0, 10);
      const analysis = result.analysis && typeof result.analysis === 'object' ? result.analysis : {};
      const overview = typeof analysis.overview === 'string' && analysis.overview.trim() ? analysis.overview.trim() : cultureFor(elements);
      setRecognition({
        title: typeof analysis.title === 'string' && analysis.title.trim() ? analysis.title.trim() : currentPoint?.title || '现场文化照片',
        elements,
        culture: [overview, ...(Array.isArray(analysis.interpretations) ? analysis.interpretations : [])].join(' '),
        overview,
        observations: Array.isArray(analysis.observations) ? analysis.observations.filter((item: unknown): item is string => typeof item === 'string').slice(0, 6) : [],
        interpretations: Array.isArray(analysis.interpretations) ? analysis.interpretations.filter((item: unknown): item is string => typeof item === 'string').slice(0, 5) : [],
        uncertainty: typeof analysis.uncertainty === 'string' ? analysis.uncertainty : '具体地点、年代和建筑名称仍需结合现场标识确认。',
        questionSuggestions: Array.isArray(analysis.questionSuggestions) ? analysis.questionSuggestions.filter((item: unknown): item is string => typeof item === 'string').slice(0, 3) : [],
        source: '视觉模型',
      });
      setNotice('识别完成。木灵已分别整理可见细节、文化解释与判断边界。');
    } catch (error) {
      if (requestId !== recognitionRequest.current) return;
      const message = error instanceof Error ? error.message : '识别失败，请重试。';
      setRecognition(null);
      setRecognitionError(`这张照片识别失败：${message}。请重新选择照片重试；不会显示上一张照片或景点演示讲解。`);
      setNotice('本次照片未识别成功，请查看识别区域的错误提示。');
    } finally {
      if (requestId === recognitionRequest.current) setRecognizing(false);
    }
  }

  function collectRecognition() {
    if (!recognition) return;
    const collected: TripMaterial = { id: crypto.randomUUID(), title: recognition.title, source: recognition.source, elements: recognition.elements, culture: [recognition.overview, ...recognition.interpretations].filter(Boolean).join(' '), createdAt: Date.now() };
    updateTask(current => {
      if (current.materials.some(item => item.title === recognition.title && item.elements.join() === recognition.elements.join())) return current;
      return { ...current, materials: [collected, ...current.materials] };
    });
    if (unifiedTaskId) void addCreativeTaskMaterial(unifiedTaskId, collected);
    setNotice('已收藏到本次旅行素材库，返程创作会保留识别结果和文化依据。');
  }

  function removeMaterial(materialId: string) {
    if (!window.confirm('确定删除这条旅行素材吗？')) return;
    updateTask(current => ({ ...current, materials: current.materials.filter(item => item.id !== materialId) }));
    if (unifiedTaskId) void removeCreativeTaskMaterial(unifiedTaskId, materialId);
    setNotice('这条旅行素材已删除，不会再用于返程创作。');
  }

  async function continueCultureQuestions() {
    if (!recognition) return;
    let referenceId: string | undefined;
    if (preview) referenceId = await saveHandoffReference(preview);
    sessionStorage.setItem('__heritage_culture_tour_handoff__', JSON.stringify({
      title: recognition.title,
      elements: recognition.elements,
      overview: recognition.overview,
      observations: recognition.observations,
      interpretations: recognition.interpretations,
      uncertainty: recognition.uncertainty,
      questionSuggestions: recognition.questionSuggestions,
      source: recognition.source,
      referenceId,
      timestamp: Date.now(),
    }));
    router.push('/intangible-heritage?source=culture-tour' + (unifiedTaskId ? '&taskId=' + encodeURIComponent(unifiedTaskId) : ''));
  }
  function finishTrip() {
    updateTask(current => ({ ...current, phase: 'return', adjustmentLog: ['旅行阶段已结束，木灵已整理沿途素材并准备返程创作。', ...current.adjustmentLog] }));
    setNotice('已进入返程创作阶段。木灵会根据收藏素材选择需要的创作 Skill。');
    if (unifiedTaskId) void updateCreativeTaskStep(unifiedTaskId, 'culture-tour', 'completed');
  }

  async function createSouvenir() {
    if (!task) return;
    const materialText = task.materials.length
      ? task.materials.slice(0, 4).map(item => item.title + '：' + item.elements.slice(0, 6).join('、')).join('；')
      : '开封铁塔、大相国寺、开封府与朱仙镇木版年画';
    let referenceId: string | undefined;
    if (preview) referenceId = await saveHandoffReference(preview);
    const subject = preview
      ? '以随行上传的旅行照片为主体，保留照片中的主要建筑、人物或景物特征。'
      : '以本次开封文化路线为主题，不虚构真实人物。';
    const brief = '为我自己制作一张用于保存旅途记忆的国风旅行纪念画。' + subject +
      '文化素材包括：' + materialText + '。整体温暖雅致，构图完整，不在画面中添加用户指令文字；允许与画面协调的传统题字。';
    sessionStorage.setItem('__muling_workbench_handoff__', JSON.stringify({
      brief,
      scene: '旅行纪念',
      timestamp: Date.now(),
      referenceId,
    }));
    if (unifiedTaskId) {
      for (const material of task.materials) await addCreativeTaskMaterial(unifiedTaskId, material);
      if (preview) {
        const assetId = await putCreativeTaskAsset(preview);
        await updateCreativeTask(unifiedTaskId, current => ({ ...current, referenceIds: current.referenceIds.includes(assetId) ? current.referenceIds : [assetId, ...current.referenceIds] }));
      }
    }
    router.push('/muling?source=culture-tour' + (unifiedTaskId ? '&taskId=' + encodeURIComponent(unifiedTaskId) : ''));
  }
  function removeTask() {
    if (!window.confirm('确定删除当前文化探索任务及素材记录吗？删除后无法恢复。')) return;
    recognitionRequest.current += 1; setRecognizing(false); setRecognitionError('');
    setTask(null); setRecognition(null); setPreview(''); setCurrentPoint(null); setDismissed([]); setNotice('已删除文化探索任务。');
  }

  if (!ready) return <main className={styles.page}><p className={styles.loading}>正在打开文化伴游任务…</p></main>;

  return <main className={styles.page}>
    <header className={styles.hero}>
      <div><p>木刻灵韵 · 持续任务</p><h1>文化伴游 Agent</h1><span>陪你看懂风景里的传统文化，并把旅途变成自己的国风作品。</span></div>
      <label className={styles.demoSwitch}><input type="checkbox" checked={demoMode} onChange={event => setDemoMode(event.target.checked)} /><span>识别演示兜底</span><small>仅用于视觉识别失败，真实地图不会模拟</small></label>
    </header>
    <WorkbenchBackButton />
    <TaskContextBar taskId={unifiedTaskId || undefined} />

    {!task ? <section className={styles.setup}>
      <div><p className={styles.eyebrow}>行前规划</p><h2>只需要说出旅行目标</h2><p>木灵会根据时间和文化偏好安排观察、讲解与素材采集任务，不提供虚构的实时开放时间。</p></div>
      <label>旅行日期<input type="date" value={tripDate} onChange={event => setTripDate(event.target.value)} /></label>
      <label>告诉木灵目的地、时长和兴趣<textarea value={goal} onChange={event => setGoal(event.target.value)} rows={4} /></label>
      <button className={styles.primary} onClick={createTask}>建立文化探索任务</button>
      {notice && <p className={styles.notice} role="status">{notice}</p>}
    </section> : <div className={styles.workspace}>
      <section className={styles.overview}>
        <div><p className={styles.eyebrow}>当前持续任务</p><h2>{task.title}</h2><p>{task.goal}</p></div>
        <div className={styles.taskStats}><div><strong>{task.route.filter(point => point.status === 'done').length}/{task.route.length}</strong><span>完成节点</span></div><div><strong>{task.materials.length}</strong><span>文化素材</span></div><div><strong>{task.availableHours}h</strong><span>可用时间</span></div></div>
        <div className={styles.preferenceRow}>{task.preferences.map(item => <span key={item}>{item}</span>)}<span>{task.explanationLength}讲解</span></div>
        <button className={styles.ghostDanger} onClick={removeTask}>删除当前任务</button>
      </section>

      {!!triggers.length && <section className={styles.activeService}>
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>主动服务</p><h2>在合适的时刻继续任务</h2></div><small>每条提醒都说明触发原因</small></div>
        <div className={styles.triggerGrid}>{triggers.map(trigger => <article key={trigger.type}>
          <span>{trigger.type}</span><strong>{trigger.text}</strong><p>触发原因：{trigger.reason}</p>
          <div><button onClick={() => (trigger.target === 'route' ? routeRef : recognitionRef).current?.scrollIntoView({ behavior: 'smooth' })}>查看并继续</button><button onClick={() => setDismissed(items => [...items, trigger.type])}>本次忽略</button></div>
        </article>)}</div>
      </section>}

      <div ref={routeRef}>
        <RealMapExplorer
          points={task.route}
          selectedId={selectedPointId}
          onSelect={setSelectedPointId}
          onHydratePoint={hydrateMapPoint}
          onAddPoint={addMapPoint}
          onRemovePoint={removeMapPoint}
          onMovePoint={moveMapPoint}
          onToggleComplete={togglePoint}
          onExplain={explainMapPoint}
          onPhotograph={photographMapPoint}
          onCollect={collectMapPoint}
          onGenerate={() => void createSouvenir()}
          onAgentReplan={agentReorderMapPoints}
          onNotice={setNotice}
        />
      </div>
      <section className={styles.recognitionSection} ref={recognitionRef}>
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>途中理解与采集</p><h2>{currentPoint ? `正在探索：${currentPoint.title}` : '拍照识别文化元素'}</h2></div><small>{demoMode ? '演示模式已开启' : '使用真实视觉模型'}</small></div>
        <div className={styles.recognitionGrid}>
          <div className={styles.uploadCard}>
            {preview ? <img src={preview} alt="现场上传预览" /> : <div><span>▧</span><strong>上传现场照片</strong><small>支持 JPG、PNG，最大 5MB</small></div>}
            <label>{recognizing ? '识别中…' : preview ? '更换照片' : '选择照片'}<input type="file" accept="image/jpeg,image/png" disabled={recognizing} onChange={identifyPhoto} /></label>
          </div>
          <div className={styles.recognitionResult}>
            {!recognition ? <div className={styles.emptyResult}><span>✦</span><p role="status">{recognizing ? '正在分析当前照片，请稍候…' : recognitionError || '上传古建筑、纹样或年画照片后，木灵会分析可见细节、文化含义和无法确认的判断边界。'}</p></div> : <>
              <div className={styles.resultTitle}><div><span>{recognition.source}</span><h3>{recognition.title}</h3></div><b>识别完成</b></div>
              <div className={styles.elementTags}>{recognition.elements.map(item => <span key={item}>{item}</span>)}</div>
              <p className={styles.analysisOverview}>{recognition.overview}</p>
              {!!recognition.observations.length && <div className={styles.analysisBlock}><strong>照片中可以直接看到</strong><ul>{recognition.observations.map(item => <li key={item}>{item}</li>)}</ul></div>}
              {!!recognition.interpretations.length && <div className={styles.analysisBlock}><strong>传统文化讲解</strong><ul>{recognition.interpretations.map(item => <li key={item}>{item}</li>)}</ul></div>}
              <div className={styles.uncertainty}><strong>判断边界</strong><p>{recognition.uncertainty}</p></div>
              {!!recognition.questionSuggestions.length && <div className={styles.questionHints}><strong>可以继续追问</strong>{recognition.questionSuggestions.map(item => <span key={item}>{item}</span>)}</div>}
              <div className={styles.resultActions}><button onClick={collectRecognition}>收藏到旅行素材</button><button onClick={() => void continueCultureQuestions()}>带着照片分析继续文化问答</button></div>
            </>}
          </div>        </div>
      </section>

      <section className={styles.materialSection}>
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>文化证据链</p><h2>本次旅行素材</h2></div><span>{task.materials.length} 项已收藏</span></div>
        {!task.materials.length ? <p className={styles.emptyMaterials}>尚未收藏素材。完成一次现场图片识别后，可以把文化元素保存在这里。</p> : <div className={styles.materialGrid}>{task.materials.map(material => <article key={material.id}>
          <header><span>{material.source}</span><strong>{material.title}</strong><button type="button" aria-label={"删除" + material.title} title="删除这条素材" onClick={() => removeMaterial(material.id)}>×</button></header>
          <div>{material.elements.map(item => <i key={item}>{item}</i>)}</div><p>{material.culture}</p>
          <ol><li>原始现场照片</li><li>视觉识别元素</li><li>文化知识说明</li><li>返程创作依据</li></ol>
        </article>)}</div>}
      </section>

      <section className={styles.returnSection}>
        <div><p className={styles.eyebrow}>返程再创作</p><h2>把整趟旅行变成一件国风作品</h2><p>木灵会把真实收藏的照片、建筑构件、纹样和文化讲解整理为创作依据，再按需调用现有专业 Skill。</p></div>
        {task.phase === 'active'
          ? <button className={styles.primary} onClick={finishTrip}>结束旅行并整理素材</button>
          : <button className={styles.primary} onClick={() => void createSouvenir()}>生成旅行纪念国风作品</button>}
      </section>
      {notice && <p className={styles.floatingNotice} role="status">{notice}</p>}
    </div>}
  </main>;
}

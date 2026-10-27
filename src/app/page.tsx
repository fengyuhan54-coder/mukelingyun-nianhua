'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import styles from './page.module.css';
import { executeWorkbenchSkill, isImplementedWorkbenchSkill, type SkillResultCard } from '@/lib/workbench-skills';
import { createAgentSteps, routeWorkbenchRequest, updateAgentStep, type AgentStep } from '@/lib/workbench-agent';
import { inferMemories, loadMemories, loadWorkbenchTasks, saveMemories, saveWorkbenchTasks, taskFromSkillResult, type MemoryItem, type WorkbenchTask } from '@/lib/workbench-storage';
import { inferCreativeTaskDraft } from '@/lib/creative-task-intent';
import { createCreativeTask, creativeTaskHref, creativeTaskProgress, getActiveCreativeTaskId, getCreativeTask, listCreativeTasks, putCreativeTaskAsset, setActiveCreativeTaskId, setCreativeTaskReminder, snoozeCreativeTask } from '@/lib/creative-task-storage';
import { TASK_UPDATED_EVENT, type CreativeTask, type CreativeTaskDraft } from '@/lib/creative-task-types';

type MessageRole = 'assistant' | 'user';

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  attachmentName?: string;
  skillResult?: SkillResultCard;
  agentSteps?: AgentStep[];
  taskDraft?: CreativeTaskDraft;
  draftReferenceIds?: string[];
}

interface Skill {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  href: string;
  category: string;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
  taskId?: string;
}

const HISTORY_KEY = '__muling_workbench_history_v1__';
const CURRENT_KEY = '__muling_workbench_current_v1__';

const SKILLS: Skill[] = [
  { id: 'muling', name: '墨韵生花', shortName: '国风创作', icon: '🌿', description: '照片转国风、连续创作与多 Agent 协作', href: '/muling', category: '创作' },
  { id: 'annual-painting', name: '木韵新绘', shortName: '年画生成', icon: '🧧', description: '已接入对话 · 五大流派与年画生成', href: '/annual-painting', category: '创作' },
  { id: 'nianhua-dress', name: '年画变装', shortName: '人像变装', icon: '🎭', description: '上传人像 · 保留神韵，融入传统纹样色彩', href: '/nianhua-dress', category: '创作' },
  { id: 'architecture', name: '古筑绘影', shortName: '古建创作', icon: '🏯', description: '古建筑与传统年画风格融合创作', href: '/architecture-workbench', category: '创作' },
  { id: 'heritage', name: '遗韵拾光', shortName: '非遗科普', icon: '📖', description: '已接入对话 · 非遗知识问答与讲解', href: '/intangible-heritage', category: '知识' },
  { id: 'knowledge', name: '文脉藏珍', shortName: '知识库', icon: '📚', description: '已接入对话 · 纹样色彩与流派检索', href: '/pattern-library', category: '知识' },
  { id: 'carving', name: '墨痕留印', shortName: '数字拓印', icon: '🪵', description: '体验勾线、刻版、上墨和套色流程', href: '/carving-imprint', category: '体验' },
  { id: 'animate', name: '光影新生', shortName: '动态年画', icon: '🎬', description: '静态年画动态化与视频预览', href: '/annual-painting-animate', category: '体验' },
  { id: 'culture-tour', name: '寻迹山河', shortName: '文化伴游', icon: '🧭', description: '持续任务 · 开封文化探索与创作', href: '/culture-tour', category: '陪伴' },
  { id: 'copyright', name: '印记长存', shortName: '版权保护', icon: '📜', description: '作品登记、生成记录与版权溯源', href: '/copyright-protection', category: '管理' },
];

const QUICK_PROMPTS = [
  '奶奶快过生日了，我想用她的照片做一份国风祝福作品',
  '把毕业合影做成一张有前程似锦寓意的纪念图',
  '给我家宠物做一个保留原本花色的国风头像',
  '把旅行照片和当地古建筑元素做成国风纪念作品',
];

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '你好，我是木刻灵韵。我可以陪你完成日常问答，也可以调用木版年画、古建筑创作、非遗知识和数字拓印等专业 Skill。你可以直接说出想法，或者先从左侧挂载一个 Skill。',
  createdAt: 0,
};

function makeId(prefix: string) {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

function readStoredConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readImageAttachment(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error('木灵照片交接仅支持不超过 5MB 的 JPG、PNG 或 WebP 图片');
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('上传照片读取失败，请重新选择'));
    reader.readAsDataURL(file);
  });
}
function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function SkillResultView({ result, onContinue }: { result: SkillResultCard; onContinue: (text: string) => void }) {
  const icon = result.type === 'muling' ? '🌿' : result.type === 'annual-painting' ? '🧧' : result.type === 'knowledge' ? '📚' : result.type === 'culture-tour' ? '🧭' : '📖';
  return (
    <section className={styles.skillResultCard}>
      <header>
        <div><span>{icon}</span><div><small>SKILL 执行结果</small><strong>{result.title}</strong></div></div>
        <b>已完成</b>
      </header>
      <p>{result.summary}</p>

      {result.imageUrls && result.imageUrls.length > 0 && (
        <div className={styles.skillImageGrid}>
          {result.imageUrls.map((url, index) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" title="查看生成作品">
              <img src={url} alt={'木版年画生成作品 ' + (index + 1)} />
            </a>
          ))}
        </div>
      )}

      {result.items && result.items.length > 0 && (
        <div className={styles.knowledgeResults}>
          {result.items.map((item) => (
            <article key={item.id}>
              <div className={styles.knowledgeTitle}>
                {item.color ? <i style={{ backgroundColor: item.color }} /> : <span>{item.kind}</span>}
                <strong>{item.title}</strong>
                <em>{item.kind}</em>
              </div>
              <b>{item.description}</b>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      )}

      {result.meta && result.meta.length > 0 && (
        <dl className={styles.skillMeta}>
          {result.meta.map((item) => (
            <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
          ))}
        </dl>
      )}

      {result.prompt && (
        <details className={styles.promptDetails}>
          <summary>查看本次生成指令</summary>
          <p>{result.prompt}</p>
        </details>
      )}

      <footer>
        <div>
          <button type="button" onClick={() => onContinue('基于“' + result.title + '”继续调整：')}>继续修改</button>
          <Link
            href={result.actionHref}
            onClick={() => {
              if (result.handoff) {
                sessionStorage.setItem('__annual_painting_workbench_handoff__', JSON.stringify(result.handoff));
              }
              if (result.mulingHandoff) {
                sessionStorage.setItem('__muling_workbench_handoff__', JSON.stringify(result.mulingHandoff));
              }
              if (result.cultureTourHandoff) {
                sessionStorage.setItem('__culture_tour_handoff__', JSON.stringify(result.cultureTourHandoff));
              }
            }}
          >{result.actionLabel} <span>↗</span></Link>
        </div>
        <span>结果已保留在当前对话</span>
      </footer>
    </section>
  );
}

function TaskConfirmationCard({ draft, onConfirm, onModify, onDismiss }: { draft: CreativeTaskDraft; onConfirm: () => void; onModify: () => void; onDismiss: () => void }) {
  return (
    <section style={{ marginTop: 14, padding: 16, border: '1px solid #e4cbb8', borderRadius: 16, background: '#fffaf4' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div><small style={{ color: '#a94a3c', fontWeight: 800 }}>木灵已理解你的生活需求</small><h3 style={{ margin: '5px 0 0', color: '#5f2d25' }}>确认创建任务</h3></div>
        <span style={{ color: '#8f675a', fontSize: 12 }}>{draft.type === 'culture-tour' ? '文化伴游任务' : '场景化国风创作'}</span>
      </div>
      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8, margin: '14px 0' }}>
        {[
          ['任务名称', draft.title], ['日期', draft.eventDate || '暂未指定'],
          ['对象', draft.recipient || '本人/生活场景'], ['用途', draft.purpose || '国风创作'],
          ['希望氛围', draft.emotion || '温暖、有纪念感'], ['推荐链路', draft.steps.map(item => item.label).join(' → ')],
        ].map(([label, value]) => <div key={label} style={{ padding: 10, borderRadius: 10, background: '#f6ede3' }}><dt style={{ fontSize: 12, color: '#9a7b6c' }}>{label}</dt><dd style={{ margin: '3px 0 0', color: '#563930', fontWeight: 700, lineHeight: 1.5 }}>{value}</dd></div>)}
      </dl>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" onClick={onConfirm} style={{ border: 0, borderRadius: 10, padding: '10px 16px', color: '#fff', background: '#96372c', fontWeight: 800 }}>确认并开始</button>
        <button type="button" onClick={onModify} style={{ border: '1px solid #d9bca8', borderRadius: 10, padding: '10px 16px', color: '#78392f', background: '#fff' }}>修改信息</button>
        <button type="button" onClick={onDismiss} style={{ border: 0, padding: '10px 12px', color: '#8c7165', background: 'transparent' }}>暂不创建</button>
      </div>
    </section>
  );
}

function AgentTrace({ steps }: { steps: AgentStep[] }) {
  return (
    <div className={styles.agentTrace} aria-label="Agent 任务执行过程">
      <div className={styles.traceTitle}><span>✦</span><strong>Agent 执行过程</strong><small>仅展示任务节点</small></div>
      <div className={styles.traceSteps}>
        {steps.map((step) => (
          <div key={step.id} className={styles['trace-' + step.status]}>
            <i>{step.status === 'done' ? '✓' : step.status === 'error' ? '!' : ''}</i>
            <div><strong>{step.label}</strong><small>{step.detail}</small></div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default function AIWorkbenchPage() {
  const router = useRouter();
  const [mountedSkillIds, setMountedSkillIds] = useState<string[]>([]);
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [history, setHistory] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [search, setSearch] = useState('');
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [tasks, setTasks] = useState<WorkbenchTask[]>([]);
  const [memoryDraft, setMemoryDraft] = useState('');
  const [showMemoryInput, setShowMemoryInput] = useState(false);
  const [creativeTasks, setCreativeTasks] = useState<CreativeTask[]>([]);
  const [activeCreativeTask, setActiveCreativeTask] = useState<CreativeTask | null>(null);
  const [pendingCreativeDraft, setPendingCreativeDraft] = useState<CreativeTaskDraft | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const mountedSkills = useMemo(
    () => mountedSkillIds.map((id) => SKILLS.find((skill) => skill.id === id)).filter((skill): skill is Skill => Boolean(skill)),
    [mountedSkillIds],
  );

  const visibleSkills = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return SKILLS;
    return SKILLS.filter((skill) => (skill.name + skill.description + skill.category).toLowerCase().includes(keyword));
  }, [search]);

  useEffect(() => {
    setHistory(readStoredConversations());
    setMemories(loadMemories());
    setTasks(loadWorkbenchTasks());
    const loadUnifiedTasks = async () => {
      const records = await listCreativeTasks();
      setCreativeTasks(records);
      const queryId = new URLSearchParams(window.location.search).get('taskId');
      const activeId = queryId || getActiveCreativeTaskId();
      const active = activeId ? await getCreativeTask(activeId) : undefined;
      setActiveCreativeTask(active || records.find(item => item.status !== 'completed') || records[0] || null);
      if (queryId) setActiveCreativeTaskId(queryId);
    };
    void loadUnifiedTasks();
    const onTaskUpdated = () => void loadUnifiedTasks();
    window.addEventListener(TASK_UPDATED_EVENT, onTaskUpdated);
    try {
      const current = localStorage.getItem(CURRENT_KEY);
      if (current) {
        const parsed = JSON.parse(current);
        if (Array.isArray(parsed.messages) && parsed.messages.length) {
          setMessages(parsed.messages);
          setMountedSkillIds(Array.isArray(parsed.mountedSkillIds) ? parsed.mountedSkillIds : []);
          setActiveSkillId(typeof parsed.activeSkillId === 'string' ? parsed.activeSkillId : null);
          setActiveConversationId(typeof parsed.activeConversationId === 'string' ? parsed.activeConversationId : null);
        }
      }
    } catch {
      // 本地记录不可用时保留欢迎页。
    }
    setHydrated(true);
    return () => window.removeEventListener(TASK_UPDATED_EVENT, onTaskUpdated);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(CURRENT_KEY, JSON.stringify({ messages, mountedSkillIds, activeSkillId, activeConversationId }));
  }, [messages, mountedSkillIds, activeSkillId, activeConversationId, hydrated]);

  useEffect(() => {
    if (hydrated) saveMemories(memories);
  }, [memories, hydrated]);

  useEffect(() => {
    if (hydrated) saveWorkbenchTasks(tasks);
  }, [tasks, hydrated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isReplying]);

  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 180 ? 'auto' : 'hidden';
  }, [input]);

  const saveHistory = (records: Conversation[]) => {
    setHistory(records);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
  };

  const snapshotCurrentConversation = () => {
    const firstUser = messages.find((message) => message.role === 'user');
    if (!firstUser) return;
    const record: Conversation = {
      id: activeConversationId || makeId('conversation'),
      title: firstUser.content.slice(0, 22) || '新的创作对话',
      updatedAt: Date.now(),
      messages,
      taskId: activeCreativeTask?.id,
    };
    saveHistory([record, ...history.filter((item) => item.id !== record.id)].slice(0, 12));
  };

  const startNewConversation = () => {
    snapshotCurrentConversation();
    setMessages([{ ...INITIAL_MESSAGE, id: makeId('welcome') }]);
    setActiveConversationId(null);
    setInput('');
    setAttachment(null);
    setMobileLeftOpen(false);
  };

  const openConversation = (conversation: Conversation) => {
    setMessages(conversation.messages);
    if (conversation.taskId) {
      setActiveCreativeTaskId(conversation.taskId);
      void getCreativeTask(conversation.taskId).then(task => setActiveCreativeTask(task || null));
    }
    setActiveConversationId(conversation.id);
    setMobileRightOpen(false);
  };

  const deleteConversation = (conversation: Conversation) => {
    if (!window.confirm(`确定删除对话“${conversation.title}”吗？删除后无法恢复。`)) return;
    saveHistory(history.filter((item) => item.id !== conversation.id));
    if (activeConversationId === conversation.id) {
      setMessages([{ ...INITIAL_MESSAGE, id: makeId('welcome') }]);
      setActiveConversationId(null);
      setInput('');
      setAttachment(null);
    }
  };

  const mountSkill = (skill: Skill) => {
    setActiveSkillId(skill.id);
    setMountedSkillIds((current) => current.includes(skill.id) ? current : [...current, skill.id]);
    setMobileLeftOpen(false);
  };

  const removeSkill = (skillId: string) => {
    setMountedSkillIds((current) => current.filter((id) => id !== skillId));
    setActiveSkillId((current) => current === skillId ? null : current);
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    setAttachment(event.target.files?.[0] || null);
    event.target.value = '';
  };

  const mergeMemories = (items: MemoryItem[]) => {
    if (!items.length) return;
    setMemories((current) => {
      const existing = new Set(current.map((item) => item.category + ':' + item.content));
      return [...items.filter((item) => !existing.has(item.category + ':' + item.content)), ...current].slice(0, 30);
    });
  };

  const addMemory = () => {
    const content = memoryDraft.trim();
    if (!content) return;
    mergeMemories([{ id: makeId('memory'), category: '兴趣', content, createdAt: Date.now() }]);
    setMemoryDraft('');
    setShowMemoryInput(false);
  };

  const upsertTask = (candidate: WorkbenchTask | null) => {
    if (!candidate) return;
    setTasks((current) => {
      const existing = current.find((task) => task.title === candidate.title && task.status === 'active');
      if (!existing) return [candidate, ...current].slice(0, 12);
      const completedLabels = new Set(existing.steps.filter((step) => step.done).map((step) => step.label));
      const updated: WorkbenchTask = {
        ...candidate,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: Date.now(),
        steps: candidate.steps.map((step) => ({ ...step, done: completedLabels.has(step.label) })),
      };
      return [updated, ...current.filter((task) => task.id !== existing.id)];
    });
  };

  const toggleTaskStep = (taskId: string, stepId: string) => {
    setTasks((current) => current.map((task) => {
      if (task.id !== taskId) return task;
      const steps = task.steps.map((step) => step.id === stepId ? { ...step, done: !step.done } : step);
      return { ...task, steps, status: steps.every((step) => step.done) ? 'completed' : 'active', updatedAt: Date.now() };
    }));
  };

  const confirmCreativeTask = async (message: ChatMessage) => {
    if (!message.taskDraft) return;
    const task = await createCreativeTask(message.taskDraft, message.draftReferenceIds || []);
    setActiveCreativeTask(task);
    setCreativeTasks(current => [task, ...current.filter(item => item.id !== task.id)]);
    setMessages(current => [...current, {
      id: makeId('assistant'), role: 'assistant', createdAt: Date.now(),
      content: '任务“' + task.title + '”已经建立。我会保留照片、文化素材和每次创作版本，现在进入第一步。',
    }]);
    router.push(creativeTaskHref(task));
  };

  const dismissTaskDraft = (messageId: string) => {
    setMessages(current => current.map(item => item.id === messageId ? { ...item, taskDraft: undefined, draftReferenceIds: undefined } : item));
  };

  const refreshCreativeTask = async (task: CreativeTask) => {
    const refreshed = await getCreativeTask(task.id);
    setActiveCreativeTask(refreshed || null);
  };

  const sendMessage = async (providedText?: string, forcedSkillId?: string) => {
    const content = (providedText ?? input).trim();
    if (forcedSkillId) {
      const forcedSkill = SKILLS.find((skill) => skill.id === forcedSkillId);
      if (forcedSkill) mountSkill(forcedSkill);
    }
    if ((!content && !attachment) || isReplying) return;

    const userMessage: ChatMessage = {
      id: makeId('user'),
      role: 'user',
      content: content || '请查看我上传的文件：' + attachment?.name,
      attachmentName: attachment?.name,
      createdAt: Date.now(),
    };
    const submittedAttachment = attachment;
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput('');
    setAttachment(null);
    setIsReplying(true);
    let steps = createAgentSteps();
    setAgentSteps(steps);

    try {
      const inferredDraft = !forcedSkillId ? inferCreativeTaskDraft(userMessage.content) : null;
      const taskDraft = pendingCreativeDraft
        ? { ...pendingCreativeDraft, recipient: userMessage.content.slice(0, 30), title: userMessage.content.slice(0, 12) + '生日' + (pendingCreativeDraft.purpose || '国风作品') }
        : inferredDraft;
      if (taskDraft) {
        if (!pendingCreativeDraft && /生日|祝寿/.test(taskDraft.brief) && !taskDraft.recipient) {
          setPendingCreativeDraft(taskDraft);
          steps = updateAgentStep(steps, 'understand', 'done', '已识别生日创作需求，还缺少一个关键信息');
          setAgentSteps(steps);
          setMessages(current => [...current, { id: makeId('assistant'), role: 'assistant', createdAt: Date.now(), content: '这份生日作品是送给谁的？告诉我人物关系即可，例如“奶奶”或“老师”。', agentSteps: steps }]);
          return;
        }
        setPendingCreativeDraft(null);
        const draftReferenceIds: string[] = [];
        if (submittedAttachment && submittedAttachment.type.startsWith('image/')) {
          draftReferenceIds.push(await putCreativeTaskAsset(await readImageAttachment(submittedAttachment)));
        }
        steps = updateAgentStep(steps, 'understand', 'done', '已识别生活事件、创作对象与用途');
        steps = updateAgentStep(steps, 'route', 'done', '已规划需要调用的专业 Skill');
        steps = updateAgentStep(steps, 'execute', 'done', '等待你确认任务信息');
        steps = updateAgentStep(steps, 'return', 'done', '确认后会带着当前照片和描述继续');
        setAgentSteps(steps);
        setMessages(current => [...current, {
          id: makeId('assistant'), role: 'assistant', createdAt: Date.now(), agentSteps: steps,
          content: '我先把这件生活小事整理成一个可以持续推进的创作任务。请确认关键信息，之后你不需要在各个页面重复上传或描述。',
          taskDraft, draftReferenceIds,
        }]);
        return;
      }
      steps = updateAgentStep(steps, 'understand', 'done', '已识别你的目标与输入内容');
      steps = updateAgentStep(steps, 'route', 'running', '正在选择适合的专业能力');
      setAgentSteps(steps);

      const manualSkillId = forcedSkillId || (activeSkillId && mountedSkillIds.includes(activeSkillId) ? activeSkillId : null);
      const hasCultureTask = tasks.some((task) => task.status === 'active' && task.title.includes('文化探索'));
      const continuesCultureTour = hasCultureTask
        && /(继续|调整|修改|安排)/.test(userMessage.content)
        && /(行程|路线|时间|景点|参观|旅行|旅游|文化探索|文化打卡)/.test(userMessage.content)
        && !/(生日|祝寿|毕业|春节|全家福|宠物|照片|合影|贺卡|头像|纪念图|生成|创作|国风)/.test(userMessage.content);
      const contextSkillId = !manualSkillId && continuesCultureTour ? 'culture-tour' : null;
      const decision = manualSkillId || contextSkillId
        ? { skillId: manualSkillId || contextSkillId }
        : await routeWorkbenchRequest(userMessage.content);
      const selectedSkillId = decision.skillId;
      const selectedSkill = selectedSkillId ? SKILLS.find((skill) => skill.id === selectedSkillId) : null;
      let reply = '';
      let skillResult: SkillResultCard | undefined;

      if (selectedSkill && isImplementedWorkbenchSkill(selectedSkill.id)) {
        setMountedSkillIds((current) => current.includes(selectedSkill.id) ? current : [...current, selectedSkill.id]);
        setActiveSkillId(selectedSkill.id);
        steps = updateAgentStep(steps, 'route', 'done', (manualSkillId ? '按你的选择调用：' : '自动选择：') + selectedSkill.name);
        steps = updateAgentStep(steps, 'execute', 'running', selectedSkill.name + '正在执行');
        setAgentSteps(steps);
        const attachmentDataUrl = selectedSkill.id === 'muling' && submittedAttachment
          ? await readImageAttachment(submittedAttachment)
          : undefined;
        const execution = await executeWorkbenchSkill(
          selectedSkill.id,
          userMessage.content,
          nextMessages.slice(0, -1).map(({ role, content: text }) => ({ role, content: text })),
          attachmentDataUrl,
        );
        reply = execution.reply;
        skillResult = execution.result;
        steps = updateAgentStep(steps, 'execute', 'done', selectedSkill.name + '执行完成');
        mergeMemories(inferMemories(userMessage.content, skillResult));
        upsertTask(taskFromSkillResult(skillResult));
      } else {
        steps = updateAgentStep(steps, 'route', 'done', '无需专业 Skill，使用通用对话');
        steps = updateAgentStep(steps, 'execute', 'running', '正在组织通用回答');
        setAgentSteps(steps);
        const response = await fetch('/api/assistant-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: nextMessages.map(({ role, content: text }) => ({ role, content: text })),
            mountedSkills: mountedSkillIds,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'AI 服务暂时不可用');
        reply = data.reply || '我已经收到你的需求。';
        steps = updateAgentStep(steps, 'execute', 'done', '通用回答已完成');
      }

      steps = updateAgentStep(steps, 'return', 'done', '结果已整理并保留在当前对话');
      setAgentSteps(steps);
      setMessages((current) => [...current, {
        id: makeId('assistant'),
        role: 'assistant',
        content: reply,
        skillResult,
        agentSteps: steps,
        createdAt: Date.now(),
      }]);
    } catch (error) {
      steps = updateAgentStep(steps, 'execute', 'error', error instanceof Error ? error.message : '任务执行失败');
      steps = updateAgentStep(steps, 'return', 'error', '请调整需求后重试');
      setAgentSteps(steps);
      setMessages((current) => [...current, {
        id: makeId('assistant'),
        role: 'assistant',
        content: error instanceof Error
          ? error.message + '。你仍可以先从左侧挂载 Skill，或进入对应专业操作台。'
          : 'AI 服务暂时不可用，你可以先进入对应专业操作台。',
        agentSteps: steps,
        createdAt: Date.now(),
      }]);
    } finally {
      setIsReplying(false);
      setActiveSkillId(null);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <button className={styles.mobileMenuButton} type="button" onClick={() => setMobileLeftOpen(true)} aria-label="打开 Skill 菜单">☰</button>
          <div className={styles.brandMark}>木</div>
          <div><strong>木刻灵韵 · 智绘年画</strong><span>集成式 AI 文化创作工作台</span></div>
        </div>

        <label className={styles.searchBox}>
          <span>⌕</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索 Skill、知识和功能" />
          <kbd>/</kbd>
        </label>

        <div className={styles.headerActions}>
          <button type="button" aria-label="通知">🔔</button>
          <Link href="/profile" className={styles.avatarLink} aria-label="个人中心">
            <img src="/images/assistant/avatar.png" alt="" />
            <span>个人中心</span>
          </Link>
          <button className={styles.mobilePanelButton} type="button" onClick={() => setMobileRightOpen(true)}>当前 Skill</button>
        </div>
      </header>

      <div className={styles.workspace}>
        {mobileLeftOpen && <button type="button" className={styles.drawerBackdrop} onClick={() => setMobileLeftOpen(false)} aria-label="关闭 Skill 菜单" />}

        <aside className={styles.leftSidebar + (mobileLeftOpen ? ' ' + styles.drawerOpen : '')}>
          <div className={styles.sidebarHeading}>
            <div><span>工作空间</span><strong>AI 对话工作台</strong></div>
            <button className={styles.drawerClose} type="button" onClick={() => setMobileLeftOpen(false)} aria-label="关闭">×</button>
          </div>

          <button className={styles.newChatButton} type="button" onClick={startNewConversation}><span>＋</span> 新对话</button>

          <div className={styles.sectionLabel}>
            <span>专业 Skill</span>
            <small>{mountedSkillIds.length} 个已挂载</small>
          </div>
          <p className={styles.sidebarHint}>单击挂载 · 双击或点 ↗ 进入专业操作台</p>

          <nav className={styles.skillList} aria-label="专业 Skill">
            {visibleSkills.map((skill) => {
              const mounted = mountedSkillIds.includes(skill.id);
              const active = activeSkillId === skill.id;
              return (
                <div key={skill.id} className={styles.skillItem + (active ? ' ' + styles.skillItemActive : '')}>
                  <button
                    type="button"
                    onClick={() => mountSkill(skill)}
                    onDoubleClick={() => router.push(skill.href)}
                    title="单击挂载，双击进入专业操作台"
                  >
                    <span className={styles.skillIcon}>{skill.icon}</span>
                    <span className={styles.skillText}><strong>{skill.name}</strong><small>{skill.description}</small></span>
                    {mounted && <span className={styles.mountedDot} title="已挂载" />}
                  </button>
                  <Link href={skill.href} title={'打开' + skill.name + '操作台'}>↗</Link>
                </div>
              );
            })}
          </nav>

          {visibleSkills.length === 0 && <p className={styles.noSearchResult}>没有找到相关 Skill</p>}

          <div className={styles.sidebarUtilities}>
            <div id="muling-pet-controls-slot" className={styles.petControlSlot} aria-label="木灵桌宠控制" />
            <Link href="/h5-game"><span>🎮</span> H5 互动体验</Link>
            <Link href="/profile"><span>👤</span> 作品与个人中心</Link>
          </div>
        </aside>

        <section className={styles.chatPanel}>
          <div className={styles.chatToolbar}>
            <div>
              <span className={styles.onlineDot} />
              <div><strong>木刻灵韵 Agent</strong><small>{isReplying ? '正在处理你的需求…' : '在线 · 可调用专业文化 Skill'}</small></div>
            </div>
            <div className={styles.toolbarSkills}>
              {mountedSkills.length ? mountedSkills.map((skill) => (
                <span key={skill.id}>{skill.icon} {skill.shortName}<button type="button" onClick={() => removeSkill(skill.id)} aria-label={'卸载' + skill.name}>×</button></span>
              )) : <em>尚未挂载 Skill</em>}
            </div>
          </div>

          <div className={styles.messages}>
            <div className={styles.conversationWidth}>
              {messages.length === 1 && (
                <section className={styles.welcome}>
                  <div className={styles.welcomeSymbol}>木</div>
                  <p className={styles.eyebrow}>AI AGENT · CULTURAL CREATION</p>
                  <h1>你好，我是木刻灵韵</h1>
                  <p>和我聊聊你的想法。我可以回答日常问题，也可以挂载专业 Skill，陪你完成从文化检索到国风创作的完整任务。</p>
                  <div className={styles.quickGrid}>
                    {QUICK_PROMPTS.map((prompt, index) => (
                      <button key={prompt} type="button" onClick={() => void sendMessage(prompt)}>
                        <span>{['🎂', '🎓', '🐾', '🧭'][index]}</span>
                        <strong>{prompt}</strong>
                        <small>发送给木刻灵韵 →</small>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <div className={styles.messageList}>
                {messages.map((message) => (
                  <article key={message.id} className={styles.message + ' ' + (message.role === 'user' ? styles.userMessage : styles.assistantMessage)}>
                    <div className={styles.messageAvatar}>{message.role === 'user' ? '我' : '木'}</div>
                    <div className={styles.messageBody}>
                      <div className={styles.messageMeta}>
                        <strong>{message.role === 'user' ? '你' : '木刻灵韵'}</strong>
                        {message.createdAt > 0 && <span>{formatTime(message.createdAt)}</span>}
                      </div>
                      <p>{message.content}</p>
                      {message.attachmentName && <span className={styles.fileChip}>📎 {message.attachmentName}</span>}
                      {message.agentSteps && <AgentTrace steps={message.agentSteps} />}
                      {message.taskDraft && (
                        <TaskConfirmationCard
                          draft={message.taskDraft}
                          onConfirm={() => void confirmCreativeTask(message)}
                          onModify={() => { setInput(message.taskDraft?.brief || ''); dismissTaskDraft(message.id); composerRef.current?.focus(); }}
                          onDismiss={() => dismissTaskDraft(message.id)}
                        />
                      )}
                      {message.skillResult && (
                        <SkillResultView
                          result={message.skillResult}
                          onContinue={(text) => {
                            setInput(text);
                            document.querySelector<HTMLTextAreaElement>('textarea')?.focus();
                          }}
                        />
                      )}
                    </div>
                  </article>
                ))}

                {isReplying && (
                  <article className={styles.message + ' ' + styles.assistantMessage}>
                    <div className={styles.messageAvatar}>木</div>
                    <div className={styles.messageBody}>
                      <div className={styles.messageMeta}><strong>木刻灵韵</strong></div>
                      <AgentTrace steps={agentSteps} />
                    </div>
                  </article>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          <div className={styles.composerArea}>
            <div className={styles.conversationWidth}>
              {attachment && <div className={styles.attachmentPreview}><span>📎 {attachment.name}</span><button type="button" onClick={() => setAttachment(null)}>移除</button></div>}
              <div className={styles.composer}>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" hidden onChange={handleFile} />
                <button className={styles.addButton} type="button" onClick={() => fileInputRef.current?.click()} title="上传图片或文件">＋</button>
                <textarea ref={composerRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleInputKeyDown} placeholder="和木刻灵韵聊聊，或从左侧挂载 Skill…" rows={1} />
                <button className={styles.sendButton} type="button" onClick={() => void sendMessage()} disabled={isReplying || (!input.trim() && !attachment)} aria-label="发送">↑</button>
              </div>
              <p className={styles.composerHint}>Enter 发送 · Shift + Enter 换行 · 复杂任务可进入专业操作台</p>
            </div>
          </div>
        </section>

        {mobileRightOpen && <button type="button" className={styles.drawerBackdrop} onClick={() => setMobileRightOpen(false)} aria-label="关闭辅助面板" />}

        <aside className={styles.rightSidebar + (mobileRightOpen ? ' ' + styles.drawerOpen : '')}>
          <div className={styles.rightHeader}>
            <div><span>工作台状态</span><strong>当前上下文</strong></div>
            <button className={styles.drawerClose} type="button" onClick={() => setMobileRightOpen(false)} aria-label="关闭">×</button>
          </div>

          <section className={styles.sideCard}>
            <div className={styles.sideCardTitle}><strong>当前创作任务</strong><span>{activeCreativeTask ? (activeCreativeTask.status === 'completed' ? '已完成' : '进行中') : '暂无'}</span></div>
            {activeCreativeTask ? (() => {
              const progress = creativeTaskProgress(activeCreativeTask);
              const next = activeCreativeTask.steps.find(step => step.status !== 'completed' && !step.optional && !/^按需/.test(step.label));
              return <div style={{ display: 'grid', gap: 10 }}>
                <strong style={{ color: '#5f3028' }}>{activeCreativeTask.title}</strong>
                <div style={{ height: 7, borderRadius: 99, background: '#eadfd5', overflow: 'hidden' }}><i style={{ display: 'block', height: '100%', width: progress.percent + '%', background: '#a43c31' }} /></div>
                <small style={{ color: '#80695f' }}>{progress.done}/{progress.total} 步 · {next ? '下一步：' + next.label : '满意作品已自动保存，任务已完成'}</small>
                <button type="button" onClick={() => router.push(activeCreativeTask.status === 'completed' ? '/profile?taskId=' + encodeURIComponent(activeCreativeTask.id) : creativeTaskHref(activeCreativeTask))} style={{ border: 0, borderRadius: 9, padding: '9px 12px', color: '#fff', background: '#913429', fontWeight: 700 }}>{activeCreativeTask.status === 'completed' ? '查看任务成果' : '继续任务'}</button>
              </div>;
            })() : <div className={styles.emptySideState}><span>✦</span><p>说出生日、毕业、旅行等生活需求，木灵会先建立任务。</p></div>}
          </section>

          <section className={styles.sideCard}>
            <div className={styles.sideCardTitle}><strong>创作计划与提醒</strong><span>未来 7 天</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 10 }}>
              {Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() + index); return <span key={index} style={{ padding: '6px 2px', borderRadius: 7, textAlign: 'center', fontSize: 11, color: index === 0 ? '#fff' : '#755b50', background: index === 0 ? '#9c3b30' : '#f2e9df' }}>{date.getMonth()+1}/{date.getDate()}</span>; })}
            </div>
            {creativeTasks.filter(task => {
              const days = task.eventDate ? Math.ceil((new Date(task.eventDate + 'T12:00:00').getTime() - Date.now()) / 86400000) : null;
              return task.status !== 'completed';
            }).slice(0, 3).map(task => {
              const days = task.eventDate ? Math.ceil((new Date(task.eventDate + 'T12:00:00').getTime() - Date.now()) / 86400000) : null;
              return <article key={task.id} style={{ padding: 10, marginTop: 8, borderRadius: 10, background: '#fff8f0', border: '1px solid #ead5c2' }}>
                <strong style={{ display: 'block', color: '#63372f' }}>{task.title}</strong>
                <small style={{ display: 'block', margin: '5px 0', color: '#8c7064' }}>{days !== null ? (days >= 0 ? '还有 ' + days + ' 天' : '日期已到') : '仍有步骤未完成'}</small>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => router.push(creativeTaskHref(task))}>继续</button>
                  <button type="button" onClick={() => void snoozeCreativeTask(task.id).then(() => refreshCreativeTask(task))}>稍后提醒</button>
                  <button type="button" onClick={() => void setCreativeTaskReminder(task.id, !task.reminder.enabled).then(() => refreshCreativeTask(task))}>{task.reminder.enabled ? '关闭提醒' : '开启提醒'}</button>
                </div>
              </article>;
            })}
          </section>

          <section className={styles.sideCard}>
            <div className={styles.sideCardTitle}><strong>当前 Skill</strong><span>{mountedSkills.length}</span></div>
            {mountedSkills.length ? (
              <div className={styles.mountedList}>
                {mountedSkills.map((skill) => (
                  <div key={skill.id}>
                    <span className={styles.skillIcon}>{skill.icon}</span>
                    <div><strong>{skill.name}</strong><small>已挂载到当前对话</small></div>
                    <Link href={skill.href} title="打开专业操作台">↗</Link>
                    <button type="button" onClick={() => removeSkill(skill.id)} aria-label="卸载 Skill">×</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptySideState}><span>✦</span><p>从左侧选择 Skill，它会挂载到当前对话中。</p></div>
            )}
          </section>

          <section className={styles.sideCard}>
            <div className={styles.sideCardTitle}>
              <strong>Agent 状态</strong>
              <span className={isReplying ? styles.statusWorking : styles.statusReady}>{isReplying ? '处理中' : '就绪'}</span>
            </div>
            {agentSteps.length ? (
              <AgentTrace steps={agentSteps} />
            ) : (
              <div className={styles.taskState}>
                <i />
                <div><strong>等待下一条指令</strong><small>Agent 会自动选择合适的 Skill</small></div>
              </div>
            )}
          </section>

          <section className={styles.sideCard}>
            <div className={styles.sideCardTitle}>
              <strong>持续任务</strong>
              <span>{tasks.filter((task) => task.status === 'active').length}</span>
            </div>
            {tasks.length ? (
              <div className={styles.persistentTasks}>
                {tasks.map((task) => {
                  const done = task.steps.filter((step) => step.done).length;
                  return (
                    <article key={task.id} className={task.status === 'completed' ? styles.taskCompleted : ''}>
                      <div className={styles.taskHeader}>
                        <div><strong>{task.title}</strong><small>{task.source}</small></div>
                        <button type="button" onClick={() => setTasks((current) => current.filter((item) => item.id !== task.id))} aria-label="删除任务">×</button>
                      </div>
                      <div className={styles.taskProgress}><i style={{ width: (done / task.steps.length * 100) + '%' }} /></div>
                      <small className={styles.taskCount}>{done}/{task.steps.length} 个步骤已完成</small>
                      <div className={styles.taskSteps}>
                        {task.steps.map((step) => (
                          <label key={step.id}>
                            <input type="checkbox" checked={step.done} onChange={() => toggleTaskStep(task.id, step.id)} />
                            <span>{step.label}</span>
                          </label>
                        ))}
                      </div>
                      {task.status === 'active' && (
                        <button className={styles.continueTaskButton} type="button" onClick={() => {
                          setInput('继续调整“' + task.title + '”：');
                          setMobileRightOpen(false);
                        }}>继续调整</button>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptySideState}><span>🧭</span><p>可以说“帮我规划一次开封文化探索”。</p></div>
            )}
          </section>

          <section className={styles.sideCard}>
            <div className={styles.sideCardTitle}>
              <strong>我的记忆</strong>
              <button type="button" onClick={() => setShowMemoryInput((value) => !value)}>＋ 添加</button>
            </div>
            {showMemoryInput && (
              <div className={styles.memoryInput}>
                <input value={memoryDraft} onChange={(event) => setMemoryDraft(event.target.value)} onKeyDown={(event) => {
                  if (event.key === 'Enter') addMemory();
                }} placeholder="例如：喜欢朱仙镇风格" />
                <button type="button" onClick={addMemory}>保存</button>
              </div>
            )}
            {memories.length ? (
              <div className={styles.memoryList}>
                {memories.map((memory) => (
                  <div key={memory.id}>
                    <span>{memory.category}</span>
                    <strong>{memory.content}</strong>
                    <button type="button" onClick={() => setMemories((current) => current.filter((item) => item.id !== memory.id))} aria-label="删除记忆">×</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptySideState}><span>✦</span><p>完成创作后，我会在本机记住你的兴趣和偏好。</p></div>
            )}
            <p className={styles.localOnlyHint}>仅保存在当前浏览器，不发送给外部模型</p>
          </section>

          <section className={styles.sideCard + ' ' + styles.historyCard}>
            <div className={styles.sideCardTitle}>
              <strong>最近对话</strong>
              {history.length > 0 && <button type="button" onClick={() => saveHistory([])}>清空</button>}
            </div>
            {history.length ? (
              <div className={styles.historyList}>
                {history.map((conversation) => (
                  <div key={conversation.id} className={styles.historyRow}>
                    <button type="button" onClick={() => openConversation(conversation)} className={`${styles.historyOpen} ${activeConversationId === conversation.id ? styles.historyActive : ''}`}>
                      <span>◷</span>
                      <div><strong>{conversation.title}</strong><small>{formatTime(conversation.updatedAt)}</small></div>
                    </button>
                    <button className={styles.historyDelete} type="button" onClick={() => deleteConversation(conversation)} aria-label={`删除对话 ${conversation.title}`} title="删除这条对话">×</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptySideState}><span>◷</span><p>结束当前对话并新建后，记录会保存在这里。</p></div>
            )}
          </section>

          <div className={styles.rightFooter}>
            <span>木灵陪伴已就绪</span>
            <Link href="/muling">进入持续创作任务 →</Link>
          </div>
        </aside>
      </div>
    </main>
  );
}











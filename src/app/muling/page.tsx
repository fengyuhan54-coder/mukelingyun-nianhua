'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import WorkbenchBackButton from '@/components/WorkbenchBackButton';
import ApiConfig from '@/components/ApiConfig';
import TaskContextBar from '@/components/TaskContextBar';
import { applyTaskEvent, type CreationTask, type TaskEvent, type Attempt, type CreationScenario } from '@/lib/muling-types';
import { deleteTask, listTasks, saveTask, takeHandoffReference } from '@/lib/muling-storage';
import { notifyMulingPet } from '@/lib/muling-pet-events';
import type { CreativeTask } from '@/lib/creative-task-types';
import { addCreativeTaskArtifact, getCreativeTask, getCreativeTaskAsset, putCreativeTaskAsset, setActiveCreativeTaskId, updateCreativeTaskStep } from '@/lib/creative-task-storage';
import styles from './page.module.css';

const statuses = { running: '创作中', completed: '模型检查通过', needs_revision: '待改进', failed: '任务未完成', cancelled: '已停止' };
const stages = { planning: '需求规划', retrieval: '知识检索', generation: '图像创作', review: '作品检查', done: '本轮结束', error: '需要处理' };
const scenarios: Array<{ id: CreationScenario; icon: string; title: string; description: string; example: string }> = [
  { id: 'life-photo', icon: '📷', title: '生活照片转国风', description: '保留人物、宠物或物体特征，转换为国风视觉。', example: '把这张生活照片转成清雅国风插画，保留主体颜色和轮廓，背景加入水波纹。' },
  { id: 'design-study', icon: '🎓', title: '设计学习与作业', description: '结合纹样库和色彩库，为课程作业、毕设提供依据。', example: '为设计课程制作一张国风海报，使用荷花纹与群青、铅白配色，并说明文化寓意。' },
  { id: 'nianhua-demo', icon: '🧧', title: '木版年画特色示范', description: '保留项目的非遗特色，聚焦传统流派与工艺。', example: '创作一张朱仙镇木版年画风格的节日贺图，构图饱满，使用朱红与石绿。' },
];

const lifeScenes = [
  { icon: '🎂', title: '长辈生日', prompt: '奶奶快过生日了，我想用她的照片做一张温暖的国风生日贺图，表达健康长寿的祝福。' },
  { icon: '🎓', title: '毕业纪念', prompt: '把我们的毕业合影做成国风纪念图，保留同学面貌，表达前程似锦。' },
  { icon: '🧧', title: '新春祝福', prompt: '把全家福做成一张新春电子贺卡，表达团圆平安，整体喜庆但不要太俗艳。' },
  { icon: '🏡', title: '家庭纪念', prompt: '把这张全家福做成温暖雅致的国风家庭纪念画，表达团圆和睦。' },
  { icon: '🐾', title: '宠物国风', prompt: '给我家宠物做一个国风头像，保留它原本的花色、神态和可爱特征。' },
  { icon: '🧭', title: '旅行纪念', prompt: '把旅行照片做成国风纪念作品，保留人物和景点特征，并融入当地古建筑与地域文化元素。' },
];

function clarificationFor(brief: string, reference?: string) {
  const text = brief.trim();
  if (text.length < 8) return '木灵想先确认：这份作品是为谁、为了什么事情制作，希望表达什么心意？';
  if (/(生日|祝寿)/.test(text) && !/(奶奶|爷爷|姥姥|姥爷|爸爸|妈妈|父亲|母亲|长辈|老师|朋友|同学|孩子|宝宝|自己)/.test(text)) {
    return '木灵想先确认：这份生日作品是送给谁的？知道人物关系后，我才能选择更合适的祝福寓意。';
  }
  if (/(照片|合影|全家福|毕业照|旅行照|宠物|头像|保留.*(?:人物|面貌|花色|主体))/.test(text) && !reference) {
    return '这项创作需要保留真实人物、宠物或场景特征。你可以先上传照片；如果暂时没有照片，也可以按文字描述继续创作。';
  }
  if (!/(贺卡|头像|纪念(?:图|画|作品)|海报|插画|作品|图片|年画|壁纸|明信片)/.test(text)) {
    return '木灵想再确认最终用途：你希望做成贺卡、头像、纪念画、海报，还是其他形式？';
  }
  return '';
}

export default function MulingPage() {
  const router = useRouter();
  const [scenario, setScenario] = useState<CreationScenario>('life-photo');
  const [brief, setBrief] = useState('');
  const [reference, setReference] = useState<string>();
  const [source, setSource] = useState<{ task: CreationTask; artwork: Attempt }>();
  const [tasks, setTasks] = useState<CreationTask[]>([]);
  const [current, setCurrent] = useState<CreationTask>();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(2);
  const [token, setToken] = useState('');
  const [savedId, setSavedId] = useState('');
  const [clarificationAccepted, setClarificationAccepted] = useState(false);
  const [linkedTask, setLinkedTask] = useState<CreativeTask | null>(null);
  const clarification = clarificationFor(brief, reference);
  const control = useRef<AbortController>();
  const busyRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const taskId = new URLSearchParams(window.location.search).get('taskId');
    if (!taskId) return;
    setActiveCreativeTaskId(taskId);
    void (async () => {
      const task = await getCreativeTask(taskId);
      if (!task) return;
      setLinkedTask(task);
      setBrief(task.brief);
      setScenario('life-photo');
      const asset = task.referenceIds[0] ? await getCreativeTaskAsset(task.referenceIds[0]) : undefined;
      if (typeof asset === 'string') setReference(asset);
      else if (asset instanceof Blob) {
        const reader = new FileReader(); reader.onload = () => setReference(String(reader.result)); reader.readAsDataURL(asset);
      }
      setNotice('已接续任务“' + task.title + '”，照片、用途与文化选择已带入。');
    })();
  }, []);

  useEffect(() => {
    let live = true;
    listTasks().then(async items => {
      const recovered = items.map(task => task.status === 'running' ? { ...task, status: 'cancelled' as const,
        events: [...task.events, { stage: 'error' as const, message: '页面关闭或刷新使任务中断，已保存版本可继续创作。' }] } : task);
      for (const item of recovered.filter((_, index) => items[index].status === 'running')) await saveTask(item);
      if (live) setTasks(recovered);
    }).catch(error => { if (live) setStorageError(error.message); }).finally(() => { if (live) setReady(true); });
    return () => { live = false; control.current?.abort(); };
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const raw = sessionStorage.getItem('__muling_workbench_handoff__');
        if (!raw) return;
        const handoff = JSON.parse(raw) as { brief?: unknown; scene?: unknown; timestamp?: unknown; referenceId?: unknown };
        sessionStorage.removeItem('__muling_workbench_handoff__');
        if (typeof handoff.timestamp !== 'number' || Date.now() - handoff.timestamp > 30 * 60 * 1000) return;
        const transferredReference = typeof handoff.referenceId === 'string'
          ? await takeHandoffReference(handoff.referenceId)
          : undefined;
        if (transferredReference) setReference(transferredReference);
        if (typeof handoff.brief === 'string' && handoff.brief.trim()) {
          setScenario('life-photo');
          setBrief(handoff.brief.trim().slice(0, 2000));
          setNotice(`已接续主页识别到的${typeof handoff.scene === 'string' ? `“${handoff.scene}”` : '生活场景'}任务${transferredReference ? '，上传照片也已带入' : ''}。木灵会先确认寓意与用途，再安排创作。`);
        }
      } catch {
        sessionStorage.removeItem('__muling_workbench_handoff__');
      }
    })();
  }, []);
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy]);

  async function upload(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setNotice('请选择不超过 5MB 的 JPG、PNG 或 WebP 图片。'); return;
    }
    setUploading(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('图片读取失败')); reader.readAsDataURL(file);
      });
      await new Promise<void>((resolve, reject) => {
        const image = new Image(); image.onload = () => resolve(); image.onerror = () => reject(new Error('图片无法读取，请重新选择')); image.src = data;
      });
      setReference(data); setSource(undefined); setClarificationAccepted(false); setNotice('');
    } catch (error) { setNotice(error instanceof Error ? error.message : '上传失败'); }
    finally { setUploading(false); }
  }
  function continueFrom(task: CreationTask, artwork: Attempt) {
    setSource({ task, artwork }); setScenario(task.scenario || 'life-photo'); setReference(artwork.image); setBrief(''); setClarificationAccepted(false);
    setNotice('已选中旧作品。告诉木灵想保留什么、修改什么。');
    inputRef.current?.focus(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function startVoiceInput() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNotice('当前浏览器不支持语音输入，请使用文字描述。');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) { setBrief(transcript); setClarificationAccepted(false); setNotice('已识别语音需求，你可以继续修改。'); }
    };
    recognition.onerror = () => setNotice('语音识别没有成功，请重试或使用文字输入。');
    recognition.start();
  }
  async function start(skipClarification = false) {
    if (busyRef.current || uploading || !ready || !brief.trim()) return;
    if (clarification && !clarificationAccepted && !skipClarification) { setNotice(clarification); return; }
    const history = source ? `${source.task.history}\n此前需求：${source.task.brief}\n所选版本检查：${source.artwork.review?.summary || '未完成检查'}`.trim() : '';
    if (history.length > 12000) { setNotice('创作记录较长，请开启新创作并上传作品。'); return; }
    if (reference && reference.length > 8_000_000) { setNotice('作品较大，请下载并压缩到 5MB 以内，再上传继续创作。'); return; }
    busyRef.current = true; setBusy(true); setNotice(''); setStorageError(''); setSavedId('');
    const abort = new AbortController(); control.current = abort;
    let task: CreationTask = { id: linkedTask?.id || source?.task.id || crypto.randomUUID(), createdAt: new Date().toISOString(),
      brief: brief.trim(), scenario, history, reference, status: 'running', events: [], attempts: [] };
    setCurrent(task);
    if (linkedTask) await updateCreativeTaskStep(linkedTask.id, 'muling', 'running');
    notifyMulingPet('acknowledge');
    const thinkingTimer = window.setTimeout(() => notifyMulingPet('thinking'), 1400);
    const persist = async () => {
      try {
        await saveTask(task); setStorageError('');
        if (task.status !== 'running') setSavedId(task.id);
        const snapshot = task;
        setTasks(items => [snapshot, ...items.filter(item => item.id !== snapshot.id)]);
      } catch (error) { setStorageError(error instanceof Error ? error.message : '保存失败'); }
    };
    const accept = async (event: TaskEvent) => {
      task = applyTaskEvent(task, event);
      setCurrent(task);
      if (linkedTask && event.stage === 'generation') {
        const artwork = task.attempts.at(-1);
        if (artwork?.image) {
          const assetId = await putCreativeTaskAsset(artwork.image);
          await addCreativeTaskArtifact(linkedTask.id, { id: linkedTask.id + '-image-' + artwork.number, type: 'image', title: '国风作品第 ' + artwork.number + ' 版', sourceSkill: 'muling', assetId, version: artwork.number, createdAt: Date.now() });
        }
      }
      if (linkedTask && event.stage === 'retrieval') await updateCreativeTaskStep(linkedTask.id, 'knowledge', 'completed');
      if (linkedTask && event.stage === 'review') await updateCreativeTaskStep(linkedTask.id, 'muling', 'completed');
      if (linkedTask && event.stage === 'done') await updateCreativeTaskStep(linkedTask.id, 'muling', event.status === 'completed' ? 'completed' : event.status === 'needs_revision' ? 'failed' : 'running');
      if (linkedTask && event.stage === 'error') await updateCreativeTaskStep(linkedTask.id, 'muling', 'failed');
      if (event.stage === 'done' && event.status === 'completed') notifyMulingPet('present');
      if ((event.stage === 'done' && event.status === 'needs_revision') || event.stage === 'error') notifyMulingPet('sad');
      await persist();
    };
    try {
      await persist();
      const response = await fetch('/api/muling/create', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: task.brief, scenario, reference, history, maxAttempts }), signal: abort.signal });
      if (!response.ok) { const error = await response.json(); throw new Error(error.error || '提交失败'); }
      if (!response.body) throw new Error('无法读取任务进度');
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let pending = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) { pending += decoder.decode(); break; }
        pending += decoder.decode(value, { stream: true });
        let boundary;
        while ((boundary = pending.indexOf('\n')) >= 0) {
          const line = pending.slice(0, boundary); pending = pending.slice(boundary + 1);
          if (line.trim()) await accept(JSON.parse(line));
        }
      }
      if (pending.trim()) await accept(JSON.parse(pending));
      if (task.status === 'running') throw new Error('连接中断，已生成作品仍可回看并继续创作。');
    } catch (error) {
      const cancelled = abort.signal.aborted;
      abort.abort();
      await accept({ stage: 'error', status: cancelled ? 'cancelled' : 'failed', message: cancelled
        ? '已停止等待，已有版本已保留。模型服务已接收的请求可能仍会计费。'
        : error instanceof Error ? error.message : '任务失败' });
    } finally { window.clearTimeout(thinkingTimer); setBusy(false); busyRef.current = false; control.current = undefined; }
  }

  async function removeMemoryTask(task: CreationTask) {
    if (busy || !window.confirm('确定删除这条创作记录及其中保存的全部版本吗？删除后无法恢复。')) return;
    try {
      await deleteTask(task.id);
      setTasks(items => items.filter(item => item.id !== task.id));
      if (current?.id === task.id) { setCurrent(undefined); setSavedId(''); }
      if (source?.task.id === task.id) { setSource(undefined); setReference(undefined); }
      setNotice('已删除选中的创作记录。');
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : '删除失败，请重试。');
    }
  }
  function animate(task: CreationTask, artwork: Attempt) {
    localStorage.setItem('__muling_animate_handoff__', JSON.stringify({ taskId: task.id, attempt: artwork.number, timestamp: Date.now() }));
    const artifactId = linkedTask ? linkedTask.id + '-image-' + artwork.number : '';
    router.push('/annual-painting-animate?source=muling' + (linkedTask ? '&taskId=' + encodeURIComponent(linkedTask.id) + '&artifactId=' + encodeURIComponent(artifactId) : ''));
  }

  return <div className={styles.page}>
    <header className={styles.hero}>
      <h1>木灵 · 国风创作伙伴</h1>
      <p>说出生活里的事 · 自动理解寓意与安排工具 · 持续完成一件有温度的国风作品</p>
    </header>
    <WorkbenchBackButton />
    <TaskContextBar taskId={linkedTask?.id} />
    <main className={styles.shell}>
    <div className={styles.columns}>
      <section className={styles.card}><h2>{source ? '继续这件作品' : '说一件生活里的事'}</h2>
        {!source && <><p className={styles.sectionIntro}>不需要先懂流派或创作参数。告诉木灵正在发生什么、想送给谁，剩下的由 Agent 安排。</p>
        <div className={styles.lifeScenes}>{lifeScenes.map(item => <button key={item.title} disabled={busy} onClick={() => { setScenario('life-photo'); setBrief(item.prompt); setClarificationAccepted(false); setNotice(''); }}><span>{item.icon}</span><strong>{item.title}</strong></button>)}</div>
        <details className={styles.proEntrances}><summary>设计学习或传统年画专业入口</summary><div className={styles.scenarios}>{scenarios.map(item => <button key={item.id} className={scenario === item.id ? styles.scenarioActive : ''} disabled={busy}
          onClick={() => { setScenario(item.id); setBrief(item.example); setClarificationAccepted(false); setNotice(''); }}><span>{item.icon}</span><strong>{item.title}</strong><small>{item.description}</small></button>)}</div></details></>}
        <label htmlFor="brief">直接说清楚这件事、创作对象和想表达的心意</label>
        <textarea ref={inputRef} id="brief" value={brief} maxLength={2000} disabled={busy} onChange={e => { setBrief(e.target.value); setClarificationAccepted(false); }} placeholder="例如：奶奶快过生日了，我想用她的照片做一份温暖的国风祝福作品。" />
        <div className={styles.inputActions}><button type="button" disabled={busy} onClick={startVoiceInput}>🎙 语音输入创作需求</button><span>支持文字或浏览器语音识别</span></div>
        <label>生活照片 / 参考图（可选，最大 5MB）<input className={styles.file} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || uploading} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} /></label>
        {reference && <div className={styles.reference}><img src={reference} alt="本次创作参考图" /><div><p>{source ? `沿用历史作品第 ${source.artwork.number} 版及其创作要求` : '参考图将用于规划、创作和检查。'}</p>
          <button disabled={busy || uploading} onClick={() => { setReference(undefined); setSource(undefined); }}>移除参考 / 开启新创作</button></div></div>}
        {clarification && !clarificationAccepted && <div className={styles.clarification} role="note"><div><strong>木灵想确认一下</strong><p>{clarification}</p></div><div className={styles.clarificationActions}><button type="button" disabled={busy} onClick={() => inputRef.current?.focus()}>继续补充</button><button type="button" disabled={busy || uploading || !ready} onClick={() => { setClarificationAccepted(true); void start(true); }}>按当前信息直接创作</button></div></div>}        <label className={styles.option}><input type="checkbox" checked={maxAttempts === 2} disabled={busy} onChange={e => setMaxAttempts(e.target.checked ? 2 : 1)} />检查未通过时，自动修正一次（最多两版）</label>
        <p className={styles.hint}>创作调用模型会消耗额度，照片会发送给模型分析与生成。</p>
        <div className={styles.actions}><button className={styles.primary} disabled={busy || uploading || !ready || !brief.trim()} onClick={() => void start()}>{uploading ? '读取图片中…' : busy ? '木灵正在创作…' : source ? '按修改意见继续创作' : '让木灵开始创作'}</button>
          {busy && <button onClick={() => control.current?.abort()}>停止本次任务</button>}</div>
        {notice && <p role="status">{notice}</p>}{storageError && <p role="alert" className={styles.error}>{storageError}</p>}
        <details className={styles.settings}><summary>模型服务配置</summary><ApiConfig apiToken={token} onTokenChange={setToken} /></details>
      </section>
      <section className={styles.card}><h2>木灵的创作记录</h2>
        {!current ? <p className={styles.empty}>提交想法后，这里会显示真实进度，以及每一步的创作依据。</p> : <>
          <p className={styles.badge} role="status">{statuses[current.status]}{savedId === current.id && !storageError ? ' · 已存入本机相册' : ''}</p><p className={styles.hint}>{current.brief}</p>
          <ol className={styles.timeline} aria-live="polite">{current.events.map((event, i) => <li key={i}><strong>{stages[event.stage]}{event.attempt ? ` · 第 ${event.attempt} 版` : ''}</strong><p>{event.message}</p>
            {event.plan && <details open><summary>{event.plan.title}</summary>
              {event.plan.context && <div className={styles.planContext}><div><small>生活场景</small><strong>{event.plan.context.scene}</strong></div><div><small>创作对象</small><strong>{event.plan.context.audience}</strong></div><div><small>表达心意</small><strong>{event.plan.context.emotion}</strong></div><div><small>作品用途</small><strong>{event.plan.context.deliverable}</strong></div><div className={styles.planWide}><small>传统寓意</small><strong>{event.plan.context.culturalMeaning}</strong></div><div className={styles.planWide}><small>按需调用</small><ol>{event.plan.context.recommendedSkills.map((skill, index) => <li key={index}>{skill}</li>)}</ol></div></div>}
              <h4>作品验收标准</h4><ul>{event.plan.criteria.map((c, j) => <li key={j}>{c}</li>)}</ul><details><summary>查看模型创作指令</summary><p className={styles.hint}>{event.plan.prompt}</p></details></details>}
            {!!event.materials?.length && <details><summary>纹样依据 · 项目本地知识库</summary>{event.materials.map(m => <p key={m.id}><b>{m.name}</b>：{m.meaning}</p>)}</details>}
            {event.review?.issues.map((issue, j) => <p className={styles.error} key={j}>{issue}</p>)}
          </li>)}</ol></>}
      </section>
    </div>
    {!!current?.attempts.length && <section className={styles.card}><h2>这次创作的每一版</h2><p className={styles.hint}>模型检查仅供参考，请根据实际效果决定是否继续修改。</p>
      <div className={styles.gallery}>{current.attempts.map(artwork => <article className={styles.artwork} key={artwork.number}><img src={artwork.image} alt={`第 ${artwork.number} 版国风作品`} />
        <h3>第 {artwork.number} 版 · {artwork.review ? artwork.review.passed ? '检查通过' : '待改进' : '未完成检查'}</h3><p>{artwork.review?.summary || '检查尚未完成，仍可下载或继续修改。'}</p><p className={styles.hint}>{artwork.review?.tags.join(' · ')}</p>
        <div className={styles.actions}><a href={artwork.image} download={`木灵-${current.id}-${artwork.number}.${artwork.image.startsWith('data:image/png') ? 'png' : 'jpg'}`}>下载作品</a><button disabled={busy || uploading} onClick={() => continueFrom(current, artwork)}>基于这版继续修改</button><button disabled={busy} onClick={() => animate(current, artwork)}>让画面动起来</button></div>
      </article>)}</div></section>}
    <section className={styles.card}><h2>创作记忆相册</h2><p className={styles.hint}>保存在当前浏览器，刷新后可回看；清理网站数据会删除记录。重要作品请下载备份。任务运行时请保持页面打开。</p>
      {!tasks.length && <p className={styles.empty}>{ready ? '还没有创作记录，先和木灵完成第一件作品吧。' : '正在打开相册…'}</p>}
      <div className={styles.gallery}>{tasks.map(task => <article className={`${styles.artwork} ${styles.memoryArtwork}`} key={task.id}><button className={styles.memoryDelete} disabled={busy} onClick={() => void removeMemoryTask(task)} aria-label="删除这条创作记录" title="删除记录">×</button>
        {task.attempts.at(-1)?.image && <img loading="lazy" src={task.attempts.at(-1)!.image} alt={task.brief} />}
        <h3>{task.brief.slice(0, 65)}</h3><p className={styles.hint}>{new Date(task.createdAt).toLocaleString('zh-CN')} · {statuses[task.status]}</p>{task.parentId && <p className={styles.hint}>从历史作品继续创作</p>}
        <div className={styles.memoryActions}><button disabled={busy} onClick={() => { setCurrent(task); setSavedId(task.id); }}>查看版本与检查记录</button></div>
      </article>)}</div>
    </section>
    <section className={styles.card}><h2>多 Agent 协作链路</h2>
      <div className={styles.agentFlow}>
        <div><b>Agent 1 · 需求规划</b><span>视觉理解模型整理主体、用途、风格与验收标准</span></div><i>→</i>
        <div><b>Skill · 知识检索</b><span>调用项目纹样库与传统色彩库，提供可解释依据</span></div><i>→</i>
        <div><b>Agent 2 · 图像创作</b><span>Seedream 根据规划与参考照片生成国风作品</span></div><i>→</i>
        <div><b>Agent 3 · 质量检查</b><span>视觉模型检查主体保留、构图和需求符合度</span></div><i>→</i>
        <div><b>动效工作流</b><span>区域识别后交给 Seedance 生成动效视频</span></div>
      </div>
      <p className={styles.hint}>当前已接入豆包视觉模型、Seedream、Seedance 和本地知识工具；LangChain 与 Kimi 尚未接入，因此不作为当前已实现能力展示。</p>
    </section>
  </main></div>;
}
















'use client';

import Link from 'next/link';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import WorkbenchBackButton from '@/components/WorkbenchBackButton';
import { getHandoffReference, saveHandoffReference } from '@/lib/muling-storage';
import { NIANHUA_DRESS_TEMPLATES, type NianhuaDressTemplate } from '@/lib/nianhua-dress-templates';
import styles from './page.module.css';

type Pattern = { id: string; name: string };
type Color = { id: string; name: string; color: string };
type Selection = { patterns: Pattern[]; colors: Color[]; timestamp: number };
type ReferenceMode = 'template' | 'custom';

function readSelection(): Selection {
  const empty: Selection = { patterns: [], colors: [], timestamp: 0 };
  try {
    for (const key of ['__nianhua_dress_selection__', '__pattern_library_selection__']) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const value = JSON.parse(raw);
      if (Date.now() - Number(value.timestamp) > 30 * 60 * 1000) continue;
      return {
        patterns: Array.isArray(value.patterns) ? value.patterns.filter((item: Pattern) => item && typeof item.name === 'string').slice(0, 10) : [],
        colors: Array.isArray(value.colors) ? value.colors.filter((item: Color) => item && typeof item.name === 'string' && typeof item.color === 'string').slice(0, 8) : [],
        timestamp: Number(value.timestamp),
      };
    }
  } catch { /* 本地选择过期或损坏时使用默认配色 */ }
  return empty;
}

function readFile(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 6 * 1024 * 1024) {
    return Promise.reject(new Error('请选择不超过 6MB 的 JPG、PNG 或 WebP 图片。'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('图片读取失败，请重新选择。'));
    reader.readAsDataURL(file);
  });
}

export default function NianhuaDressPage() {
  const portraitInput = useRef<HTMLInputElement>(null);
  const referenceInput = useRef<HTMLInputElement>(null);
  const uploadStarted = useRef(false);
  const referenceUploadStarted = useRef(false);
  const [portrait, setPortrait] = useState('');
  const [portraitName, setPortraitName] = useState('');
  const [customReference, setCustomReference] = useState('');
  const [customName, setCustomName] = useState('');
  const [referenceMode, setReferenceMode] = useState<ReferenceMode>('template');
  const [templateId, setTemplateId] = useState('');
  const [story, setStory] = useState<NianhuaDressTemplate | null>(null);
  const [selection, setSelection] = useState<Selection>({ patterns: [], colors: [], timestamp: 0 });
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'composing' | 'stylizing'>('composing');
  const [draft, setDraft] = useState('');
  const [draftKey, setDraftKey] = useState('');
  const [error, setError] = useState('');

  const template = NIANHUA_DRESS_TEMPLATES.find(item => item.id === templateId);
  const referencePreview = referenceMode === 'custom' ? customReference : template?.image || '';
  const referenceReady = referenceMode === 'custom' ? Boolean(customReference) : Boolean(template);

  useEffect(() => {
    const sync = () => setSelection(readSelection());
    sync();
    const storedTemplateId = sessionStorage.getItem('nianhua-dress-template-id') || '';
    if (NIANHUA_DRESS_TEMPLATES.some(item => item.id === storedTemplateId)) setTemplateId(storedTemplateId);
    if (sessionStorage.getItem('nianhua-dress-reference-mode') === 'custom') setReferenceMode('custom');
    const portraitId = sessionStorage.getItem('nianhua-dress-source-id');
    if (portraitId) void getHandoffReference(portraitId).then(image => {
      if (image && !uploadStarted.current) {
        setPortrait(image);
        setPortraitName(sessionStorage.getItem('nianhua-dress-source-name') || '已上传的人像');
      }
    }).catch(() => {});
    const referenceId = sessionStorage.getItem('nianhua-dress-reference-id');
    if (referenceId) void getHandoffReference(referenceId).then(image => {
      if (image && !referenceUploadStarted.current) {
        setCustomReference(image);
        setCustomName(sessionStorage.getItem('nianhua-dress-reference-name') || '已上传的年画');
      }
    }).catch(() => {});
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('focus', sync); };
  }, []);

  useEffect(() => {
    if (!story) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setStory(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [story]);

  const onPortrait = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadStarted.current = true;
    setError(''); setResult('');
    try {
      const image = await readFile(file);
      setPortrait(image); setPortraitName(file.name);
      sessionStorage.removeItem('nianhua-dress-source-id');
      void saveHandoffReference(image).then(id => {
        sessionStorage.setItem('nianhua-dress-source-id', id);
        sessionStorage.setItem('nianhua-dress-source-name', file.name);
      }).catch(() => {});
    } catch (cause) { setError(cause instanceof Error ? cause.message : '人像读取失败。'); }
    event.target.value = '';
  };

  const onReference = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    referenceUploadStarted.current = true;
    setError(''); setResult('');
    try {
      const image = await readFile(file);
      setCustomReference(image); setCustomName(file.name);
      setReferenceMode('custom');
      sessionStorage.setItem('nianhua-dress-reference-mode', 'custom');
      sessionStorage.removeItem('nianhua-dress-reference-id');
      void saveHandoffReference(image).then(id => {
        sessionStorage.setItem('nianhua-dress-reference-id', id);
        sessionStorage.setItem('nianhua-dress-reference-name', file.name);
      }).catch(() => {});
    } catch (cause) { setError(cause instanceof Error ? cause.message : '年画参考图读取失败。'); }
    event.target.value = '';
  };

  const chooseTemplate = (id: string) => {
    setTemplateId(id); setReferenceMode('template'); setResult(''); setError('');
    sessionStorage.setItem('nianhua-dress-template-id', id);
    sessionStorage.setItem('nianhua-dress-reference-mode', 'template');
  };

  const generate = async () => {
    if (!portrait) { setError('请先上传一张面部清晰的单人人像。'); return; }
    if (!referenceReady) { setError('请从图库选择一幅年画，或上传自己的年画肖像参考图。'); return; }
    if (busy) return;
    setBusy(true); setResult(''); setError('');
    const key = JSON.stringify([portrait, referenceMode, templateId, customReference, selection.patterns, selection.colors]);
    let composed = draftKey === key ? draft : '';
    try {
      if (!composed) {
      setPhase('composing');
      const response = await fetch('/api/nianhua-dress/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portraitImage: portrait,
          referenceTemplateId: referenceMode === 'template' ? templateId : undefined,
          referenceImage: referenceMode === 'custom' ? customReference : undefined,
          patterns: selection.patterns.map(item => item.name),
          colors: selection.colors.map(item => ({ name: item.name, color: item.color })),
        }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.image !== 'string') throw new Error(data.error || '生成失败，请稍后重试。');
      composed = data.image;
      setDraft(composed); setDraftKey(key);
      }
      setPhase('stylizing');
      const styledResponse = await fetch('/api/nianhua-dress/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'stylize', image: composed }),
      });
      const styled = await styledResponse.json();
      if (!styledResponse.ok || typeof styled.image !== 'string') throw new Error(styled.error || '画风统一失败。');
      setResult(styled.image); setDraft(''); setDraftKey('');
    } catch (cause) { setError((composed ? '画风统一尚未完成，保留了融合稿，可点击生成按钮重试。' : '') + (cause instanceof Error ? cause.message : '生成失败，请稍后重试。')); }
    finally { setBusy(false); }
  };

  return <main className={styles.page}>
    <header className={styles.hero}><div className={styles.heroInner}>
      <WorkbenchBackButton />
      <div className={styles.heroCopy}><span className={styles.eyebrow}>木刻灵韵 · 双图人像创作</span><h1>年画变装</h1><p>以你的面容为形，以年画为衣，绘一幅属于自己的民俗肖像。</p></div>
      <span className={styles.heroSeal} aria-hidden="true">画</span>
    </div></header>
    <div className={styles.shell}>
      <div className={styles.intro}><span>01 上传人物</span><i /><span>02 选择年画</span><i /><span>03 融入文脉</span><i /><span>04 生成作品</span></div>
      <div className={styles.columns}>
        <section className={styles.controls} aria-label="年画变装设置">
          <div className={styles.sectionHead}><div><small>STEP 01 · 身份参考</small><h2>上传人物照片</h2></div><span>保留面容与神韵</span></div>
          <input ref={portraitInput} className={styles.hiddenInput} type="file" disabled={busy} accept="image/jpeg,image/png,image/webp" onChange={onPortrait} aria-label="选择人物照片" />
          <button type="button" className={styles.upload} disabled={busy} onClick={() => portraitInput.current?.click()}>
            {portrait ? <img src={portrait} alt="上传的人物照片" /> : <span className={styles.uploadArt} aria-hidden="true">像</span>}
            <span className={styles.uploadCopy}><strong>{portrait ? '更换人物照片' : '点击上传人物照片'}</strong><small>{portraitName || '证件照或清晰的单人生活照 · JPG / PNG / WebP · 6MB 内'}</small></span>
          </button>
          <p className={styles.note}>请使用本人或已获授权的人像。生成前会检查照片中是否有一位面部清晰的人物。</p>

          <div className={styles.divider} />
          <div className={styles.sectionHead}><div><small>STEP 02 · 造型参考</small><h2>挑选年画肖像</h2></div><span>任选一幅，或上传自己的参考图</span></div>
          <p className={styles.subtle}>年画决定服饰、姿态与构图；人物照片决定最终画像的面容。点击「了解作品」可阅读画作故事。</p>
          <div className={styles.gallery}>
            {NIANHUA_DRESS_TEMPLATES.map(item => <div key={item.id} className={`${styles.templateCard} ${referenceMode === 'template' && templateId === item.id ? styles.templateActive : ''}`}>
              <button className={styles.templatePick} type="button" disabled={busy} onClick={() => chooseTemplate(item.id)} aria-pressed={referenceMode === 'template' && templateId === item.id} aria-label={`选择${item.name}作为年画参考`}>
                <span className={styles.templateImage}><img src={item.image} alt={`${item.name}年画参考图`} /></span>
                <strong>{item.name}</strong><small>{item.origin}</small>
              </button>
              <button className={styles.infoButton} type="button" onClick={() => setStory(item)}>了解作品 ↗</button>
            </div>)}
          </div>
          <div className={styles.orLine}><span>或使用自己的年画肖像</span></div>
          <input ref={referenceInput} className={styles.hiddenInput} type="file" disabled={busy} accept="image/jpeg,image/png,image/webp" onChange={onReference} aria-label="上传年画肖像参考图" />
          <button type="button" className={`${styles.customUpload} ${referenceMode === 'custom' && customReference ? styles.customActive : ''}`} disabled={busy} onClick={() => referenceInput.current?.click()}>
            {customReference ? <img src={customReference} alt="自定义年画参考图" /> : <span aria-hidden="true">＋</span>}
            <span><strong>{customReference ? '更换自定义年画' : '上传喜欢的年画肖像'}</strong><small>{customName || '建议人物主体清晰 · JPG / PNG / WebP · 6MB 内'}</small></span>
          </button>
          {customReference && referenceMode !== 'custom' && <button type="button" className={styles.useCustom} disabled={busy} onClick={() => { setReferenceMode('custom'); sessionStorage.setItem('nianhua-dress-reference-mode', 'custom'); setResult(''); }}>使用已上传的年画参考图</button>}

          <div className={styles.divider} />
          <div className={styles.sectionHead}><div><small>STEP 03 · 文化点缀</small><h2>文脉藏珍 · 纹样色彩</h2></div><Link href="/pattern-library">前往选取 ↗</Link></div>
          <p className={styles.subtle}>在「文脉藏珍」选定的纹样与色彩会融入服饰和配景；人物面部仍以照片为准。</p>
          {selection.patterns.length || selection.colors.length ? <div className={styles.selectionBox}>
            <div><small>已选纹样</small><div className={styles.chips}>{selection.patterns.length ? selection.patterns.map((item, index) => <span key={`${item.id}-${index}`}>{item.name}</span>) : <em>尚未选择</em>}</div></div>
            <div><small>已选色彩</small><div className={styles.chips}>{selection.colors.length ? selection.colors.map((item, index) => <span key={`${item.id}-${index}`}><b style={{ backgroundColor: item.color }} />{item.name}</span>) : <em>尚未选择</em>}</div></div>
          </div> : <Link href="/pattern-library" className={styles.emptySelection}>＋ 从文脉藏珍选取纹样与色彩</Link>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button type="button" className={styles.generate} onClick={generate} disabled={busy || !portrait || !referenceReady}>{busy ? (phase === 'composing' ? '1/2 · 融合面容与年画造型…' : '2/2 · 统一木版刻线与肤色…') : '生成我的年画变装'}<span aria-hidden="true">↗</span></button>
        </section>

        <section className={styles.preview} aria-label="年画作品预览">
          <div className={styles.sectionHead}><div><small>PREVIEW · 双图融合</small><h2>专属年画画像</h2></div><span>一人一画，传承新生</span></div>
          <div className={styles.referenceStrip}>
            <div><small>人物身份</small>{portrait ? <img src={portrait} alt="身份参考" /> : <span aria-hidden="true">像</span>}</div>
            <strong aria-hidden="true">＋</strong>
            <div><small>年画造型</small>{referencePreview ? <img src={referencePreview} alt="年画造型参考" /> : <span aria-hidden="true">画</span>}</div>
            <strong aria-hidden="true">→</strong>
            <div className={styles.mergeLabel}>专属画像</div>
          </div>
          <div className={styles.canvas}>{result ? <img src={result} alt="生成的年画变装画像" /> : <div className={styles.placeholder}><span aria-hidden="true">人</span><strong>{busy ? '画师正在落笔…' : '你的年画肖像将在这里呈现'}</strong><small>{busy ? (phase === 'composing' ? '正在绘制人物与年画造型，随后统一画风' : '正在将面部、头发与衣饰统一为木版套色与暖纸质感') : '上传人物照片，再选择一幅年画肖像'}</small></div>}</div>
          {result ? <a className={styles.download} href={result} download={`年画变装.${result.startsWith('data:image/png') ? 'png' : 'jpg'}`}>下载年画画像 ↓</a> : <p className={styles.previewFoot}>面容取自你 · 造型取自年画 · 纹样色彩取自文脉</p>}
        </section>
      </div>
    </div>
    {story && <div className={styles.modalBackdrop} onClick={() => setStory(null)}><div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="nianhua-story-title" onClick={event => event.stopPropagation()}>
      <button type="button" className={styles.modalClose} aria-label="关闭作品介绍" onClick={() => setStory(null)}>×</button>
      <div className={styles.modalImage}><img src={story.image} alt={`${story.name}年画`} /></div>
      <div className={styles.modalText}><small>{story.origin}</small><h2 id="nianhua-story-title">{story.name}</h2><p className={styles.modalSummary}>{story.summary}</p>{story.story.map((paragraph, index) => <p key={index}>{paragraph}</p>)}<button type="button" className={styles.modalChoose} disabled={busy} onClick={() => { chooseTemplate(story.id); setStory(null); }}>以此年画进行变装 ↗</button></div>
    </div></div>}
  </main>;
}

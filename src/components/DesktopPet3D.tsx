'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import MulingGLB from './MulingGLB';
import type { MulingPetState } from '@/lib/muling-pet-types';
import type { CreativeTask } from '@/lib/creative-task-types';
import { TASK_UPDATED_EVENT } from '@/lib/creative-task-types';
import { creativeTaskHref, getActiveCreativeTaskId, getCreativeTask, setCreativeTaskReminder } from '@/lib/creative-task-storage';
import styles from './DesktopPet3D.module.css';

const VISIBLE_KEY = '__muling_pet_visible__';
const VOICE_KEY = '__muling_pet_voice__';
const EVENT_NAME = 'muling:pet-state';

const lines: Record<MulingPetState, string[]> = {
  idle: [
    '你好，我是木灵！我可以帮你把照片转换成国风作品，有什么创作想法随时和我说。',
    '我在这里陪着你，上传照片，就可以开启国风创作啦。',
  ],
  acknowledge: ['收到你的创作需求！我马上交给智能体处理，请稍等。', '好嘞，正在帮你优化创作指令。'],
  thinking: ['智能体正在构思画面，评估美学效果，耐心等待一下哦。', '正在迭代优化画面，如果效果不达标，我会自动重新生成。'],
  present: ['完成啦！快看这张国风作品，你还可以更换风格继续调整。', '创作结束，要不要试试提取图里的传统纹样？'],
  sad: ['尝试多次优化效果仍不理想，你可以修改描述或者更换图片再试试。'],
  curious: ['有什么需要？你可以上传照片、查看历史创作，或者浏览传统纹样库。'],
  wave: ['带你进入创作平台，我们开始创作吧！'],
  remind: ['节日快要到啦，要不要制作一张国风贺图？'],
};

function pick(state: MulingPetState) {
  const choices = lines[state];
  return choices[Math.floor(Math.random() * choices.length)];
}


function voiceScore(voice: SpeechSynthesisVoice) {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  let score = 0;
  if (lang === 'zh-cn' || lang === 'zh_cn') score += 80;
  else if (lang.startsWith('zh')) score += 45;
  if (/xiaoxiao|晓晓/.test(name)) score += 120;
  else if (/xiaoyi|晓伊/.test(name)) score += 110;
  else if (/yaoyao|瑶瑶/.test(name)) score += 100;
  else if (/huihui|慧慧/.test(name)) score += 90;
  else if (/tingting|婷婷/.test(name)) score += 85;
  else if (/meijia|美佳|google.*普通话|mandarin/.test(name)) score += 75;
  if (/natural|online|自然/.test(name)) score += 30;
  if (/female|woman|女声/.test(name)) score += 18;
  if (/yunjian|yunyang|kangkang|male|男声/.test(name)) score -= 80;
  return score;
}

function preferredChineseVoice(voices: SpeechSynthesisVoice[]) {
  return voices
    .filter(voice => voice.lang.toLowerCase().startsWith('zh'))
    .sort((a, b) => voiceScore(b) - voiceScore(a))[0];
}

function conversationalRate(text: string) {
  const length = text.replace(/[，。！？、\s]/g, '').length;
  let rate = length <= 12 ? 0.9 : length >= 42 ? 0.97 : 0.94;
  if (/完成啦|好嘞|开始创作|快看/.test(text)) rate += 0.03;
  if (/耐心|稍等|正在构思|不理想/.test(text)) rate -= 0.02;
  return Math.max(0.86, Math.min(1, rate));
}

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type HeritageHistoryMessage = { role: 'user' | 'assistant'; content: string };

function cleanHeritageReply(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/[*`#_~]/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .trim();
}
function localHeritageAnswer(question: string) {
  if (/朱仙镇|开封/.test(question)) return '朱仙镇木版年画起源于河南开封一带，以门神题材最具代表性。它线条粗犷有力、构图饱满，常用朱红、槐黄、石绿和墨黑等传统色。';
  if (/阴刻|阳刻|刻版/.test(question)) return '阳刻是保留画面线条，让线条凸起并着墨，印出来通常是黑线白底；阴刻则把线条刻凹，印出来形成白线效果。传统年画主线版通常以阳刻为主。';
  if (/制作|工艺|流程|怎么做/.test(question)) return '木版年画一般经过绘稿、刻版、上墨、套印和彩绘。不同颜色需要分别刻版，再由浅到深逐版套色。';
  if (/门神/.test(question)) return '门神年画寄托镇宅、驱邪和保家平安的愿望。朱仙镇门神多画秦琼和尉迟敬德，人物正面站立、头大身壮，色彩浓烈。';
  if (/缠枝莲|莲花/.test(question)) return '缠枝莲由连续卷曲的枝蔓和莲花组成，寓意生生不息、吉祥绵延，在年画、织物和建筑装饰中都很常见。';
  return '木版年画是把画稿雕刻在木版上，再逐版上墨、套色印制的民间艺术。它常用门神、鱼莲和牡丹等形象表达平安、富足与吉祥。';
}

async function requestHeritageAnswer(question: string, history: HeritageHistoryMessage[]) {
  const response = await fetch('/api/heritage-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: question, history: history.slice(-10) }),
  });
  if (!response.ok || !response.body) throw new Error('非遗科普服务暂时不可用');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    buffer += decoder.decode(part.value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    for (const event of events) {
      const line = event.split('\n').find(item => item.startsWith('data: '));
      if (!line) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.delta?.content) answer += parsed.delta.content;
      } catch {
        // 忽略不完整的单个流式事件。
      }
    }
  }
  return cleanHeritageReply(answer) || localHeritageAnswer(question);
}

export default function DesktopPet3D() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [state, setState] = useState<MulingPetState>('idle');
  const [message, setMessage] = useState(lines.idle[0]);
  const [prototypeReminder, setPrototypeReminder] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceCultureState, setVoiceCultureState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [voiceCultureActive, setVoiceCultureActive] = useState(false);
  const [controlSlot, setControlSlot] = useState<HTMLElement | null>(null);
  const [activeCreativeTask, setActiveCreativeTask] = useState<CreativeTask | null>(null);
  const stateRef = useRef<MulingPetState>('idle');
  const voiceRef = useRef(true);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const voiceCultureActiveRef = useRef(false);
  const heritageHistoryRef = useRef<HeritageHistoryMessage[]>([]);

  const speak = useCallback((text: string, onFinished?: () => void) => {
    if (!voiceRef.current || !('speechSynthesis' in window)) {
      onFinished?.();
      return;
    }
    const synthesis = window.speechSynthesis;
    synthesis.cancel();

    let spoken = false;
    let completed = false;
    let fallbackTimer: number | undefined;
    const finish = () => {
      if (completed) return;
      completed = true;
      onFinished?.();
    };
    const speakWithAvailableVoice = () => {
      if (spoken || !voiceRef.current) {
        if (!voiceRef.current) finish();
        return;
      }
      spoken = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      synthesis.removeEventListener('voiceschanged', speakWithAvailableVoice);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.voice = preferredChineseVoice(synthesis.getVoices()) || null;
      utterance.rate = conversationalRate(text);
      utterance.pitch = 1.02;
      utterance.volume = 0.92;
      utterance.onend = finish;
      utterance.onerror = finish;
      synthesis.speak(utterance);
    };

    if (synthesis.getVoices().length) {
      speakWithAvailableVoice();
    } else {
      synthesis.addEventListener('voiceschanged', speakWithAvailableVoice, { once: true });
      fallbackTimer = window.setTimeout(speakWithAvailableVoice, 700);
    }
  }, []);

  const changeState = useCallback((next: MulingPetState, customMessage?: string, shouldSpeak = true) => {
    const text = customMessage || pick(next);
    stateRef.current = next;
    setState(next);
    setMessage(text);
    setPrototypeReminder(next === 'remind');
    if (shouldSpeak) speak(text);
  }, [speak]);

  useEffect(() => {
    const savedVisible = localStorage.getItem(VISIBLE_KEY) === 'true';
    const savedVoice = localStorage.getItem(VOICE_KEY) !== 'false';
    voiceRef.current = savedVoice;
    setVoiceEnabled(savedVoice);
    setVisible(savedVisible);
    setMounted(true);
    setControlSlot(document.getElementById('muling-pet-controls-slot'));
    if (savedVisible) window.setTimeout(() => changeState('idle'), 700);
  }, [changeState]);

  useEffect(() => {
    const load = async (announce = false) => {
      const id = getActiveCreativeTaskId();
      const task = id ? await getCreativeTask(id) || null : null;
      setActiveCreativeTask(task);
      if (!announce || !task) return;
      const running = task.steps.find(step => step.status === 'running');
      if (task.status === 'failed') changeState('sad', '“' + task.title + '”刚才没有顺利完成，任务和已有作品都还保留着，可以从原进度重试。');
      else if (task.status === 'completed') changeState('present', '“' + task.title + '”已经完成啦，作品、视频和文化素材都归在同一任务里。');
      else if (running) changeState('thinking', '正在推进“' + task.title + '”的“' + running.label + '”，完成后我会提醒你。', false);
    };
    void load();
    const listener = () => void load(true);
    window.addEventListener(TASK_UPDATED_EVENT, listener);
    return () => window.removeEventListener(TASK_UPDATED_EVENT, listener);
  }, [changeState]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setControlSlot(document.getElementById('muling-pet-controls-slot'));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const listener = (rawEvent: Event) => {
      const event = rawEvent as CustomEvent<{ state?: MulingPetState; message?: string }>;
      if (!event.detail?.state) return;
      setVisible(true);
      localStorage.setItem(VISIBLE_KEY, 'true');
      changeState(event.detail.state, event.detail.message);
    };
    window.addEventListener(EVENT_NAME, listener);
    return () => window.removeEventListener(EVENT_NAME, listener);
  }, [changeState]);

  useEffect(() => {
    if (!visible || sessionStorage.getItem('__muling_reminder_shown__')) return;
    const timer = window.setTimeout(async () => {
      if (stateRef.current !== 'idle') return;
      if (activeCreativeTask?.status === 'completed') return;
      if (!activeCreativeTask?.reminder.enabled || (activeCreativeTask.reminder.snoozedUntil || 0) > Date.now()) return;
      const next = activeCreativeTask.steps.find(step => step.status !== 'completed' && !step.optional && !/^按需/.test(step.label));
      if (!next) return;
      let reminder = activeCreativeTask.eventDate
        ? '“' + activeCreativeTask.title + '”快到日期了，要继续完成' + (next?.label || '作品') + '吗？'
        : '“' + activeCreativeTask.title + '”还有未完成步骤，要从上次进度继续吗？';
      sessionStorage.setItem('__muling_reminder_shown__', 'true');
      changeState('remind', reminder);
      window.setTimeout(() => changeState('idle', undefined, false), 6500);
    }, 18000);
    return () => window.clearTimeout(timer);
  }, [visible, changeState, activeCreativeTask]);

  const toggleVisible = () => {
    const next = !visible;
    setVisible(next);
    setPanelOpen(false);
    localStorage.setItem(VISIBLE_KEY, String(next));
    if (next) {
      changeState('idle');
    } else {
      voiceCultureActiveRef.current = false;
      setVoiceCultureActive(false);
      setVoiceCultureState('idle');
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      window.speechSynthesis?.cancel();
    }
  };

  const toggleVoice = () => {
    const next = !voiceEnabled;
    voiceRef.current = next;
    setVoiceEnabled(next);
    localStorage.setItem(VOICE_KEY, String(next));
    if (!next) window.speechSynthesis?.cancel();
    else speak('语音陪伴已开启。');
  };

  const stopVoiceCulture = (message?: string) => {
    voiceCultureActiveRef.current = false;
    setVoiceCultureActive(false);
    setVoiceCultureState('idle');
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    recognition?.abort();
    window.speechSynthesis?.cancel();
    if (message) changeState('curious', message, false);
  };

  const startVoiceCulture = () => {
    if (voiceCultureActiveRef.current) {
      stopVoiceCulture('连续语音科普已结束。下次开启时，我仍记得本次页面里的对话。');
      return;
    }

    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      changeState('sad', '当前浏览器不支持语音识别，请使用最新版 Edge、Chrome 或手机系统浏览器。');
      return;
    }

    if (!voiceEnabled) {
      voiceRef.current = true;
      setVoiceEnabled(true);
      localStorage.setItem(VOICE_KEY, 'true');
    }

    voiceCultureActiveRef.current = true;
    setVoiceCultureActive(true);

    const listenForNextQuestion = () => {
      if (!voiceCultureActiveRef.current) return;

      const recognition = new Recognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;
      let received = false;
      let handledError = false;

      recognition.onresult = event => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (!transcript || !voiceCultureActiveRef.current) return;
        received = true;
        setVoiceCultureState('thinking');
        changeState('thinking', '我听到你问：“' + transcript + '”。正在结合前面的对话查询。', false);

        const previousHistory = heritageHistoryRef.current;
        void requestHeritageAnswer(transcript, previousHistory)
          .catch(() => localHeritageAnswer(transcript))
          .then(answer => {
            if (!voiceCultureActiveRef.current) return;
            heritageHistoryRef.current = [
              ...previousHistory,
              { role: 'user' as const, content: transcript },
              { role: 'assistant' as const, content: answer },
            ].slice(-10);

            setVoiceCultureState('speaking');
            changeState('present', answer, false);
            speak(answer, () => {
              if (!voiceCultureActiveRef.current) return;
              setVoiceCultureState('listening');
              changeState('curious', '你可以继续追问，我还在听。点击“结束连续问答”即可退出。', false);
              window.setTimeout(listenForNextQuestion, 350);
            });
          });
      };

      recognition.onerror = event => {
        handledError = true;
        if (recognitionRef.current === recognition) recognitionRef.current = null;
        if (!voiceCultureActiveRef.current || event.error === 'aborted') return;

        if (event.error === 'not-allowed') {
          stopVoiceCulture();
          changeState('sad', '没有获得麦克风权限，请允许浏览器使用麦克风后再试。');
          return;
        }

        setVoiceCultureState('listening');
        changeState('curious', '这次没有听清，我会继续听，你可以再说一遍。', false);
        window.setTimeout(listenForNextQuestion, 600);
      };

      recognition.onend = () => {
        if (recognitionRef.current === recognition) recognitionRef.current = null;
        if (!received && !handledError && voiceCultureActiveRef.current) {
          setVoiceCultureState('listening');
          changeState('curious', '我还在听，你可以直接说出下一个问题。', false);
          window.setTimeout(listenForNextQuestion, 450);
        }
      };

      setVoiceCultureState('listening');
      changeState('curious', heritageHistoryRef.current.length
        ? '我记得刚才的对话，请继续提问。'
        : '我在听，请说出你想了解的年画问题。', false);
      try {
        recognition.start();
      } catch {
        stopVoiceCulture();
        changeState('sad', '麦克风启动失败，请稍后再试。');
      }
    };

    listenForNextQuestion();
  };
  const startNewHeritageTopic = () => {
    stopVoiceCulture();
    heritageHistoryRef.current = [];
    changeState('curious', '上一段科普对话已经结束，记忆已清除。点击“语音文化科普”就可以开始新话题。');
  };
  const handlePetClick = () => {
    setPanelOpen(open => !open);
    changeState('curious');
  };

  const handlePetDoubleClick = () => {
    setPanelOpen(false);
    changeState('wave');
    window.setTimeout(() => router.push('/muling'), 900);
  };

  if (!mounted) return null;

  const settingsPanel = settingsOpen && (
    <div className={styles.settingsPanel} aria-label="木灵设置">
      <strong>木灵设置</strong>
      <div className={styles.settingRow}>
        <span>显示宠物</span>
        <button type="button" role="switch" aria-checked={visible} onClick={toggleVisible}>{visible ? '已开启' : '已关闭'}</button>
      </div>
      <div className={styles.settingRow}>
        <span>语音播报</span>
        <button type="button" role="switch" aria-checked={voiceEnabled} onClick={toggleVoice}>{voiceEnabled ? '已开启' : '已关闭'}</button>
      </div>
      {activeCreativeTask && <div className={styles.settingRow}>
        <span>任务提醒</span>
        <button type="button" role="switch" aria-checked={activeCreativeTask.reminder.enabled} onClick={() => void setCreativeTaskReminder(activeCreativeTask.id, !activeCreativeTask.reminder.enabled)}>{activeCreativeTask.reminder.enabled ? '已开启' : '已关闭'}</button>
      </div>}
    </div>
  );

  const controlDock = (
    <div className={styles.controlDock + (controlSlot ? ' ' + styles.portalDock : '')}>
      {settingsPanel}
      <div className={styles.controls}>
        {visible && <button type="button" className={styles.voiceButton} onClick={toggleVoice} aria-label={voiceEnabled ? '关闭木灵语音' : '开启木灵语音'}>{voiceEnabled ? '🔊' : '🔇'}</button>}
        <button type="button" className={styles.settingsButton} onClick={() => setSettingsOpen(open => !open)} aria-expanded={settingsOpen} aria-label="木灵设置">⚙️</button>
        <button type="button" className={styles.toggleButton} aria-expanded={visible} aria-controls="muling-pet-stage" onClick={toggleVisible}>
          <span aria-hidden="true">🌿</span>灵伴相随
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className={`${styles.desktopPet}${controlSlot ? ` ${styles.portalPet}` : ''}`} aria-label="三维木灵桌宠">
        {visible && (
          <div id="muling-pet-stage" className={styles.petStage}>
            <div className={styles.speech} role="status" aria-live="polite">
              {prototypeReminder && <span className={styles.prototype}>主动服务原型</span>}
              {message}
            </div>
            {panelOpen && (
              <div className={styles.panel} aria-label="木灵交互面板">
                <strong>木灵能为你做什么？</strong>
                {activeCreativeTask && <button onClick={() => router.push(creativeTaskHref(activeCreativeTask))}>▶ 继续“{activeCreativeTask.title}”</button>}
                <button onClick={() => router.push('/muling')}>📷 上传照片并创作</button>
                <button onClick={() => router.push('/muling#creation-album')}>🖼 查看历史创作</button>
                <button onClick={() => router.push('/pattern-library')}>🌸 浏览传统纹样库</button>
                <button type="button" onClick={startVoiceCulture}>🎙 {voiceCultureActive ? '结束连续问答' : '语音文化科普'}</button>
                <button type="button" onClick={startNewHeritageTopic}>🧹 换个话题（清除记忆）</button>
              </div>
            )}
            <div className={styles.canvasWrap} title="拖动旋转；单击打开面板；双击进入创作平台">
              <MulingGLB state={state} onClick={handlePetClick} onDoubleClick={handlePetDoubleClick} />
            </div>
            <div className={styles.modelHint}>拖动旋转 · 单击互动 · 双击去创作</div>
          </div>
        )}
        {!controlSlot && controlDock}
      </aside>
      {controlSlot && createPortal(controlDock, controlSlot)}
    </>
  );
}

export { EVENT_NAME as MULING_PET_EVENT };












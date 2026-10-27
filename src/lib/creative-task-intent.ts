import type { CreativeTaskDraft } from './creative-task-types';

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function parseEventDate(text: string): string | undefined {
  const now = new Date();
  const direct = text.match(/(20\d{2})[-年/.](\d{1,2})[-月/.](\d{1,2})日?/);
  if (direct) return `${direct[1]}-${direct[2].padStart(2, '0')}-${direct[3].padStart(2, '0')}`;
  const monthDay = text.match(/(\d{1,2})月(\d{1,2})日/);
  if (monthDay) {
    const candidate = new Date(now.getFullYear(), Number(monthDay[1]) - 1, Number(monthDay[2]), 12);
    if (candidate.getTime() < now.getTime() - 86400000) candidate.setFullYear(candidate.getFullYear() + 1);
    return iso(candidate);
  }
  if (/今天/.test(text)) return iso(now);
  if (/明天/.test(text)) { const d = new Date(now); d.setDate(d.getDate() + 1); return iso(d); }
  if (/后天/.test(text)) { const d = new Date(now); d.setDate(d.getDate() + 2); return iso(d); }
  const days = text.match(/(\d+)天后/);
  if (days) { const d = new Date(now); d.setDate(d.getDate() + Number(days[1])); return iso(d); }
  const weekdayNames: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
  const weekday = text.match(/下周([一二三四五六日天])/);
  if (weekday) {
    const target = weekdayNames[weekday[1]];
    const current = now.getDay();
    let delta = 7 + ((target - current + 7) % 7);
    if (delta >= 14) delta -= 7;
    const d = new Date(now); d.setDate(d.getDate() + delta); return iso(d);
  }
  if (/下周/.test(text)) { const d = new Date(now); d.setDate(d.getDate() + 7); return iso(d); }
  return undefined;
}

export function inferCreativeTaskDraft(text: string): CreativeTaskDraft | null {
  const isTravel = /(旅行|旅游|行程|路线|去开封|文化伴游|文化探索)/.test(text);
  const isCreation = /(生日|祝寿|毕业|春节|新春|全家福|家庭|宠物|猫|狗|旅行照片|贺卡|头像|纪念(?:图|画|作品)|国风|年画|生成|创作)/.test(text);
  if (!isTravel && !isCreation) return null;

  if (isTravel && !/(贺卡|头像|生日|毕业|全家福|生成.*作品)/.test(text)) {
    return {
      type: 'culture-tour',
      title: /开封/.test(text) ? '开封文化探索' : '文化伴游任务',
      brief: text,
      eventDate: parseEventDate(text),
      purpose: '文化探索与返程创作',
      emotion: '发现、记录与纪念',
      nextSkillId: 'culture-tour',
      steps: [
        { label: '确认行程与兴趣', skillId: 'culture-tour' },
        { label: '生成文化路线', skillId: 'culture-tour' },
        { label: '现场识别与文化问答', skillId: 'heritage' },
        { label: '整理旅行素材', skillId: 'culture-tour' },
        { label: '生成旅行纪念作品', skillId: 'muling' },
      ],
    };
  }

  const recipient =
    /奶奶/.test(text) ? '奶奶' : /爷爷/.test(text) ? '爷爷' : /妈妈|母亲/.test(text) ? '妈妈' :
    /爸爸|父亲/.test(text) ? '爸爸' : /老师/.test(text) ? '老师' : /同学/.test(text) ? '同学' :
    /宠物|猫|狗/.test(text) ? '宠物' : undefined;
  const purpose =
    /贺卡/.test(text) ? '电子贺卡' : /头像/.test(text) ? '国风头像' : /海报/.test(text) ? '国风海报' :
    /毕业/.test(text) ? '毕业纪念图' : /纪念/.test(text) ? '国风纪念作品' : '国风作品';
  const scene = /生日|祝寿/.test(text) ? '生日' : /毕业/.test(text) ? '毕业' : /春节|新春/.test(text) ? '新春' :
    /宠物|猫|狗/.test(text) ? '宠物' : /旅行/.test(text) ? '旅行' : '生活';
  const emotion = /雅致/.test(text) ? '温暖、雅致' : /喜庆/.test(text) ? '温暖、喜庆' : /静谧/.test(text) ? '静谧、雅致' : '温暖、有纪念感';
  return {
    type: 'life-creation',
    title: `${recipient || scene}${scene === '生日' ? '生日' : ''}${purpose}`.replace(/生日生日/, '生日'),
    brief: text,
    eventDate: parseEventDate(text),
    recipient,
    purpose,
    emotion,
    nextSkillId: 'muling',
    steps: [
      { label: '确认生活事件与创作目标', skillId: 'muling' },
      { label: '选择文化纹样与配色', skillId: 'knowledge' },
      { label: '生成国风作品', skillId: 'muling' },
      { label: '视觉质量校验', skillId: 'muling' },
      { label: '保存满意版本', skillId: 'profile' },
      { label: '按需制作动态效果', skillId: 'animate', optional: true },
    ],
  };
}

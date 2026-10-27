import { saveHandoffReference } from './muling-storage';
export interface SkillResultItem {
  id: string;
  kind: string;
  title: string;
  description: string;
  detail: string;
  color?: string;
}

export interface SkillResultCard {
  type: 'heritage' | 'knowledge' | 'annual-painting' | 'culture-tour' | 'muling';
  skillId: string;
  title: string;
  summary: string;
  items?: SkillResultItem[];
  imageUrls?: string[];
  meta?: Array<{ label: string; value: string }>;
  prompt?: string;
  actionHref: string;
  actionLabel: string;
  task?: { title: string; steps: string[] };
  handoff?: {
    styleId: string;
    themeId: string;
    customTheme: string;
    specificElement: string;
    additionalRequirements: string;
    userInstruction: string;
    timestamp: number;
  };
  mulingHandoff?: {
    brief: string;
    scene: string;
    timestamp: number;
    referenceId?: string;
  };
  cultureTourHandoff?: {
    goal: string;
    timestamp: number;
  };
}

export interface SkillExecution {
  reply: string;
  result: SkillResultCard;
}

interface HistoryMessage {
  role: 'assistant' | 'user';
  content: string;
}

const IMPLEMENTED_SKILLS = new Set(['heritage', 'knowledge', 'annual-painting', 'culture-tour', 'muling']);

export function isImplementedWorkbenchSkill(skillId: string | null): skillId is string {
  return Boolean(skillId && IMPLEMENTED_SKILLS.has(skillId));
}

async function errorFromResponse(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return data.error || data.message || fallback;
  } catch {
    return fallback;
  }
}


function localHeritageReply(message: string) {
  if (/朱仙镇|开封/.test(message)) {
    return '朱仙镇木版年画起源于河南开封一带，以门神题材最具代表性。它的线条粗犷有力，构图饱满，常用朱红、槐黄、石绿和墨黑等传统色，整体气质古朴厚重。';
  }
  if (/阴刻|阳刻|刻版/.test(message)) {
    return '阳刻是保留画面线条，让线条凸起并着墨，印出来通常是黑线白底；阴刻则把线条刻凹，印出来形成白线或留白效果。木版年画的主线版通常以阳刻为主。';
  }
  if (/制作|工艺|怎么做|流程/.test(message)) {
    return '传统木版年画通常经过绘稿、刻版、上墨、套印和彩绘。画师先确定线稿，再把不同颜色分别刻版，印制时由浅到深逐版套色，最后根据流派补充手工彩绘。';
  }
  if (/祥云/.test(message)) {
    return '祥云纹表现流动的云气，寓意祥瑞降临、吉祥如意和福运绵延。年画中常把它放在门神、神像或吉庆人物周围，用来营造神圣和喜庆的氛围。';
  }
  if (/门神/.test(message)) {
    return '门神年画寄托镇宅、驱邪和保家平安的愿望。朱仙镇门神多画秦琼、尉迟恭，人物正面站立、头大身壮，线条粗犷，色彩浓烈。';
  }
  return '木版年画是将画稿雕刻在木版上，再逐版上墨、套色印制的民间艺术。它既记录节庆生活，也通过门神、鱼莲、牡丹等形象表达平安、富足和吉祥愿望。';
}

function heritageResult(reply: string, source: string): SkillExecution {
  return {
    reply,
    result: {
      type: 'heritage',
      skillId: 'heritage',
      title: '非遗科普回答',
      summary: '回答基于木版年画历史、流派、工艺、民俗与吉祥寓意知识。',
      meta: [
        { label: '知识领域', value: '木版年画非遗' },
        { label: '重点流派', value: '朱仙镇' },
        { label: '回答来源', value: source },
      ],
      actionHref: '/intangible-heritage',
      actionLabel: '进入非遗科普课堂',
    },
  };
}
async function executeHeritage(message: string, history: HistoryMessage[]): Promise<SkillExecution> {
  const response = await fetch('/api/heritage-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history: history.slice(-8) }),
  });

  if (!response.ok) {
    return heritageResult(localHeritageReply(message), '本地非遗知识库');
  }

  const reader = response.body?.getReader();
  if (!reader) return heritageResult(localHeritageReply(message), '本地非遗知识库');

  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';

  while (true) {
    const part = await reader.read();
    if (part.done) break;
    buffer += decoder.decode(part.value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';

    for (const block of blocks) {
      const line = block.split('\n').find((item) => item.startsWith('data: '));
      if (!line) continue;
      const data = line.slice(6).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        if (parsed.delta?.content) fullContent += parsed.delta.content;
      } catch {
        // 忽略单个不完整事件，继续接收后续内容。
      }
    }
  }

  if (!fullContent.trim()) return heritageResult(localHeritageReply(message), '本地非遗知识库');

  return {
    reply: fullContent.trim(),
    result: {
      type: 'heritage',
      skillId: 'heritage',
      title: '非遗科普回答',
      summary: '回答基于木版年画历史、流派、工艺、民俗与吉祥寓意知识。',
      meta: [
        { label: '知识领域', value: '木版年画非遗' },
        { label: '重点流派', value: '朱仙镇' },
      ],
      actionHref: '/intangible-heritage',
      actionLabel: '进入非遗科普课堂',
    },
  };
}

async function executeKnowledge(message: string): Promise<SkillExecution> {
  const response = await fetch('/api/workbench/knowledge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) throw new Error(await errorFromResponse(response, '数字知识库 Skill 暂时不可用'));
  const data = await response.json();
  return { reply: data.reply, result: data.result };
}

function resolveStyle(message: string) {
  const styles = [
    { id: 'yangliuqing', name: '天津杨柳青', keys: ['杨柳青', '天津'] },
    { id: 'taohuawu', name: '苏州桃花坞', keys: ['桃花坞', '苏州'] },
    { id: 'yangjiapu', name: '山东杨家埠', keys: ['杨家埠', '潍坊', '山东'] },
    { id: 'mianzhu', name: '四川绵竹', keys: ['绵竹', '四川'] },
    { id: 'zhuxian', name: '开封朱仙镇', keys: ['朱仙镇', '开封', '河南'] },
  ];
  return styles.find((style) => style.keys.some((key) => message.includes(key))) || styles[4];
}

function resolveTheme(message: string) {
  const themes = [
    { id: 'menshen', name: '门神', keys: ['门神', '秦琼', '尉迟恭'] },
    { id: 'shoushou', name: '福禄寿喜', keys: ['福禄寿', '寿星', '祝寿', '福星'] },
    { id: 'caidan', name: '财神', keys: ['财神', '招财', '财运'] },
    { id: 'guanyin', name: '观音', keys: ['观音', '送子'] },
    { id: 'wawa', name: '娃娃', keys: ['娃娃', '儿童', '孩子', '童子'] },
    { id: 'shinv', name: '仕女', keys: ['仕女', '美人', '女子'] },
    { id: 'opera', name: '戏曲', keys: ['戏曲', '京剧', '豫剧', '脸谱'] },
    { id: 'flower', name: '花鸟鱼虫', keys: ['花鸟', '牡丹', '鲤鱼', '莲花', '喜鹊', '松鹤'] },
  ];
  return themes.find((theme) => theme.keys.some((key) => message.includes(key))) || null;
}

async function executeAnnualPainting(message: string): Promise<SkillExecution> {
  const style = resolveStyle(message);
  const theme = resolveTheme(message);
  const payload = theme
    ? {
        styleId: style.id,
        themeId: theme.id,
        customTheme: '',
        specificElement: message,
        additionalRequirements: message,
      }
    : {
        styleId: style.id,
        themeId: 'custom',
        customTheme: message,
        specificElement: message,
        additionalRequirements: message,
      };

  const response = await fetch('/annual-painting/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(await errorFromResponse(response, '木版年画 AIGC Skill 生成失败'));
  const data = await response.json();
  if (!data.success || !Array.isArray(data.imageUrls) || !data.imageUrls.length) {
    throw new Error(data.error || '木版年画 AIGC Skill 未返回作品');
  }

  const themeName = data.theme || theme?.name || message.slice(0, 16);
  const styleName = data.style || style.name;
  return {
    reply: '已调用木版年画 AIGC Skill，按照“' + styleName + ' · ' + themeName + '”完成作品生成。',
    result: {
      type: 'annual-painting',
      skillId: 'annual-painting',
      title: '木版年画 AIGC 生成结果',
      summary: 'Agent 已将自然语言需求转换为流派、题材和画面要求，并调用现有年画生成能力。',
      imageUrls: data.imageUrls,
      meta: [
        { label: '年画流派', value: styleName },
        { label: '创作主题', value: themeName },
        { label: '生成次数', value: String(data.attempts || 1) },
      ],
      prompt: data.prompt,
      handoff: {
        ...payload,
        userInstruction: message,
        timestamp: Date.now(),
      },
      actionHref: '/annual-painting?source=workbench',
      actionLabel: '进入年画专业操作台',
    },
  };
}


async function executeMuling(message: string, reference?: string): Promise<SkillExecution> {
  const scenes = [
    { name: '长辈生日', pattern: /生日|祝寿|寿宴|长辈|奶奶|爷爷|姥姥|姥爷/, meaning: '健康长寿、福寿绵长', motifs: '寿桃、松鹤、祥云' },
    { name: '毕业纪念', pattern: /毕业|学位|校园|同学|青春/, meaning: '前程似锦、一路生花', motifs: '锦纹、祥云、折枝花卉' },
    { name: '新春祝福', pattern: /春节|新春|过年|拜年|除夕/, meaning: '迎福纳祥、阖家平安', motifs: '门神、福纹、灯笼' },
    { name: '家庭纪念', pattern: /全家福|家庭|团圆|家人|纪念日/, meaning: '团圆和睦、家宅安康', motifs: '团花、如意、连枝纹' },
    { name: '宠物国风', pattern: /宠物|猫|狗|鱼|鸟|兔/, meaning: '灵动相伴、平安喜乐', motifs: '如意云纹、花草、水波纹' },
    { name: '旅行纪念', pattern: /旅行|旅游|旅途|景点|打卡|古建筑/, meaning: '山河留念、一路顺遂', motifs: '地域纹样、山水纹、建筑装饰' },
  ];
  const scene = scenes.find((item) => item.pattern.test(message)) || {
    name: '自定义生活纪念', meaning: '珍藏当下、传递心意', motifs: '由知识库根据内容匹配',
  };
  const referenceId = reference ? await saveHandoffReference(reference) : undefined;
  const hasPhoto = /照片|合影|全家福|头像|保留.*(人|脸|宠物|主体)/.test(message);
  const wantsNianhua = /年画|门神|朱仙镇|杨柳青|桃花坞|杨家埠|绵竹|传统/.test(message);
  const wantsMotion = /动起来|动态|动画|视频/.test(message);
  const steps = [
    '理解生活场景与情感寓意',
    '从纹样与色彩库检索文化素材',
    hasPhoto ? '上传照片并保留主体特征' : '确定画面主体与构图',
    wantsNianhua ? '调用木版年画风格创作' : '调用木灵国风创作',
    '检查人物、寓意与画面完整性',
    ...(wantsMotion ? ['调用年画动效能力'] : []),
    '保存作品与创作记录',
  ];
  const items: SkillResultItem[] = steps.map((step, index) => ({
    id: `muling-${index + 1}`,
    kind: index === 0 ? '理解' : index === 1 ? '检索' : index === steps.length - 1 ? '留存' : '创作',
    title: step,
    description: index === 0 ? scene.name : index === 1 ? scene.motifs : '木灵按当前需求选择必要能力',
    detail: index === 0 ? `希望表达：${scene.meaning}` : '进入木灵后可继续补充照片、对象和用途，任务不会强制调用无关工具。',
  }));
  return Promise.resolve({
    reply: `我理解这是一次“${scene.name}”创作。你不需要选择流派或参数，我已经先提炼出“${scene.meaning}”的表达方向，并按需要安排了创作链路。进入木灵后可以补充照片，木灵会检索合适纹样、生成作品并检查结果。`,
    result: {
      type: 'muling',
      skillId: 'muling',
      title: `${scene.name}创作任务`,
      summary: `场景寓意：${scene.meaning}。推荐文化元素：${scene.motifs}。以下只安排完成本次目标需要的能力。`,
      items,
      meta: [
        { label: '生活场景', value: scene.name },
        { label: '情感寓意', value: scene.meaning },
        { label: '建议纹样', value: scene.motifs },
      ],
      actionHref: '/muling?source=workbench',
      actionLabel: '让木灵继续完成创作',
      task: { title: `${scene.name}创作`, steps },
      mulingHandoff: { brief: message, scene: scene.name, timestamp: Date.now(), referenceId },
    },
  });
}
function executeCultureTour(message: string): Promise<SkillExecution> {
  const hourMatch = message.match(/(\d+(?:\.\d+)?)\s*个?小时/);
  const hours = hourMatch ? Number(hourMatch[1]) : null;
  const shortPlan = hours !== null && hours <= 2;

  const items: SkillResultItem[] = shortPlan
    ? [
        { id: 'tour-context', kind: '准备', title: '确定文化主题', description: '聚焦朱仙镇木版年画与开封文化', detail: '先用非遗科普 Skill 了解门神、传统配色和制作工艺。' },
        { id: 'tour-observe', kind: '观察', title: '完成一次文化观察', description: '记录建筑、门饰或传统纹样', detail: '拍摄或记录一处有代表性的色彩、门窗、屋顶或吉祥图案。' },
        { id: 'tour-create', kind: '创作', title: '生成文化纪念作品', description: '把观察结果转换为国风作品', detail: '返回木刻灵韵后，用照片或文字生成一张个人文化纪念年画。' },
      ]
    : [
        { id: 'tour-learn', kind: '学习', title: '认识开封文化脉络', description: '建立宋文化、古建筑与年画的联系', detail: '先了解开封城市文化与朱仙镇木版年画的关系。' },
        { id: 'tour-nianhua', kind: '非遗', title: '朱仙镇年画专题', description: '观察门神、刀法与传统套色', detail: '重点记录门神形象、朱红与石绿配色以及粗犷线条。' },
        { id: 'tour-architecture', kind: '观察', title: '古建筑元素采集', description: '寻找屋顶、门窗和装饰纹样', detail: '拍照记录一组可用于国风再创作的建筑细节。' },
        { id: 'tour-pattern', kind: '整理', title: '纹样与色彩归档', description: '用知识库解释观察到的元素', detail: '检索祥云、回纹、莲花等纹样的寓意和推荐配色。' },
        { id: 'tour-create', kind: '创作', title: '生成文化纪念年画', description: '将照片和知识转化为作品', detail: '调用木版年画或木灵国风创作 Skill 完成纪念作品。' },
      ];

  const duration = shortPlan ? '约 2 小时以内' : hours ? '约 ' + hours + ' 小时' : '可按半天或一天调整';
  const steps = items.map((item) => item.title);

  return Promise.resolve({
    reply: shortPlan
      ? '我已把文化探索任务压缩为两小时以内，保留了解、观察、创作三个关键环节。'
      : '我已为你建立一个可持续推进的开封文化探索任务，之后可以继续通过对话调整时间和步骤。',
    result: {
      type: 'culture-tour',
      skillId: 'culture-tour',
      title: '开封文化探索任务',
      summary: '这是文化伴游原型任务，不提供实时开放时间；出发前请确认场馆和交通信息。',
      items,
      meta: [
        { label: '任务时长', value: duration },
        { label: '任务形式', value: '文化学习 + 现场观察 + AI 创作' },
        { label: '保存位置', value: '本机持续任务' },
      ],
      actionHref: '/culture-tour',
      actionLabel: '进入文化伴游任务',
      task: { title: '开封文化探索', steps },
      cultureTourHandoff: { goal: message, timestamp: Date.now() },
    },
  });
}
export async function executeWorkbenchSkill(
  skillId: string,
  message: string,
  history: HistoryMessage[],
  attachmentDataUrl?: string,
): Promise<SkillExecution> {
  if (skillId === 'heritage') return executeHeritage(message, history);
  if (skillId === 'knowledge') return executeKnowledge(message);
  if (skillId === 'annual-painting') return executeAnnualPainting(message);
  if (skillId === 'muling') return executeMuling(message, attachmentDataUrl);
  if (skillId === 'culture-tour') return executeCultureTour(message);
  throw new Error('该 Skill 尚未接入对话调用');
}





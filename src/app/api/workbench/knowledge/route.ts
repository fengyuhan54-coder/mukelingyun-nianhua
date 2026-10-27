import { NextRequest, NextResponse } from 'next/server';
import { annualPaintingStyles, annualPaintingThemes } from '@/lib/annual-painting-prompts';

interface KnowledgeEntry {
  id: string;
  kind: '流派' | '题材' | '纹样' | '色彩';
  title: string;
  description: string;
  detail: string;
  keywords: string[];
  color?: string;
}

const PATTERNS: KnowledgeEntry[] = [
  { id: 'xiangyun', kind: '纹样', title: '祥云纹', description: '吉祥如意、福运绵延', detail: '常用于门神、神像和吉庆题材的背景或边饰，以流动云气表现祥瑞降临。', keywords: ['祥云', '云纹', '吉祥', '如意'] },
  { id: 'lianhua', kind: '纹样', title: '莲花纹', description: '清廉高洁、连生贵子', detail: '莲花出淤泥而不染，也借“莲”与“连”的谐音表达连年、连生的祝愿。', keywords: ['莲花', '荷花', '清廉', '连生贵子'] },
  { id: 'mudan', kind: '纹样', title: '牡丹纹', description: '富贵荣华、繁荣昌盛', detail: '牡丹是年画中常见的富贵象征，经常与凤凰、花瓶和儿童形象组合。', keywords: ['牡丹', '富贵', '花开富贵'] },
  { id: 'bianfu', kind: '纹样', title: '蝙蝠纹', description: '福气临门、五福齐聚', detail: '“蝠”与“福”谐音，五只蝙蝠组合常表示五福临门。', keywords: ['蝙蝠', '五福', '福气'] },
  { id: 'huiwen', kind: '纹样', title: '回纹', description: '绵延不断、富贵长久', detail: '回环连续的几何纹样，常作为年画服饰、建筑和画面边框的装饰底纹。', keywords: ['回纹', '几何', '边框', '绵延'] },
  { id: 'songhe', kind: '纹样', title: '松鹤纹', description: '延年益寿、品格高洁', detail: '松树长青、仙鹤长寿，两者组合是祝寿题材中的经典图案。', keywords: ['松鹤', '长寿', '祝寿', '仙鹤'] },
  { id: 'yulian', kind: '纹样', title: '鱼莲纹', description: '连年有余、生活富足', detail: '莲花与鲤鱼组合，借“莲年有鱼”的谐音表达丰收和富足。', keywords: ['鱼莲', '鲤鱼', '连年有余', '鱼'] },
];

const COLORS: KnowledgeEntry[] = [
  { id: 'zhuhong', kind: '色彩', title: '朱红', description: '喜庆、热烈、驱邪', detail: '木版年画常用主色，适合门神、节庆和吉祥主题。', keywords: ['朱红', '红色', '喜庆', '门神'], color: '#D9381E' },
  { id: 'jinse', kind: '色彩', title: '金色', description: '尊贵、财富、光辉', detail: '常用于财神、甲胄和器物细节，增强庄重与富贵感。', keywords: ['金色', '财富', '财神', '尊贵'], color: '#D4AF37' },
  { id: 'shilv', kind: '色彩', title: '石绿', description: '生机、自然、和谐', detail: '传统矿物色，常与朱红、槐黄组合形成鲜明的民间色彩关系。', keywords: ['石绿', '绿色', '矿物色', '自然'], color: '#4A7C59' },
  { id: 'qunqing', kind: '色彩', title: '群青', description: '深邃、宁静、雅致', detail: '适合古建筑、山水和较沉稳的国风画面，也可平衡大面积暖色。', keywords: ['群青', '蓝色', '宁静', '沉稳'], color: '#4169E1' },
  { id: 'zhuxianhong', kind: '色彩', title: '朱仙镇红', description: '古朴浓烈、驱邪纳福', detail: '朱仙镇年画代表性色彩，通常与槐黄、石绿和墨黑搭配。', keywords: ['朱仙镇红', '朱仙镇', '红色', '古朴'], color: '#B22222' },
];


const PATTERN_COLOR_LINKS: Record<string, string[]> = {
  xiangyun: ['jinse', 'zhuhong', 'qunqing'],
  lianhua: ['zhuhong', 'shilv', 'qunqing'],
  mudan: ['zhuhong', 'jinse', 'shilv'],
  bianfu: ['zhuhong', 'jinse'],
  huiwen: ['zhuxianhong', 'jinse'],
  songhe: ['shilv', 'qunqing', 'zhuhong'],
  yulian: ['zhuhong', 'shilv', 'qunqing'],
};
function buildEntries(): KnowledgeEntry[] {
  const styles: KnowledgeEntry[] = annualPaintingStyles.map((style) => ({
    id: 'style-' + style.id,
    kind: '流派',
    title: style.name,
    description: style.description,
    detail: style.features.join('、') + '。代表配色：' + style.colors.join('、') + '。',
    keywords: [style.name, style.region, ...style.features, ...style.colors],
  }));

  const themes: KnowledgeEntry[] = annualPaintingThemes.map((theme) => ({
    id: 'theme-' + theme.id,
    kind: '题材',
    title: theme.name,
    description: theme.description,
    detail: '常见元素：' + theme.elements.join('、') + '。',
    keywords: [theme.name, theme.category, theme.description, ...theme.elements],
  }));

  return [...PATTERNS, ...COLORS, ...styles, ...themes];
}

function scoreEntry(entry: KnowledgeEntry, query: string) {
  const compact = query.replace(/\s+/g, '');
  let score = 0;
  if (compact.includes(entry.title) || entry.title.includes(compact)) score += 12;
  for (const keyword of entry.keywords) {
    if (compact.includes(keyword) || keyword.includes(compact)) score += keyword.length > 1 ? 4 : 1;
  }
  if (compact.includes(entry.kind)) score += 2;
  return score;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return NextResponse.json({ success: false, error: '请输入要检索的内容' }, { status: 400 });
    }

    const entries = buildEntries();
    const ranked = entries
      .map((entry) => ({ entry, score: scoreEntry(entry, message) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => item.entry);

    let results = ranked.length ? ranked : entries.filter((entry) => entry.kind === '纹样').slice(0, 5);

    if (/颜色|色彩|配色|搭配/.test(message)) {
      const matchedPattern = results.find((entry) => entry.kind === '纹样' && PATTERN_COLOR_LINKS[entry.id]);
      const relatedColorIds = matchedPattern ? PATTERN_COLOR_LINKS[matchedPattern.id] : ['zhuhong', 'jinse', 'shilv'];
      const relatedColors = relatedColorIds
        .map((id) => COLORS.find((color) => color.id === id))
        .filter((entry): entry is KnowledgeEntry => Boolean(entry));
      results = [...results.filter((entry) => entry.kind !== '色彩'), ...relatedColors].slice(0, 5);
    }

    const names = results.map((entry) => entry.title).join('、');

    return NextResponse.json({
      success: true,
      reply: ranked.length
        ? '我从数字知识库中检索到与“' + message.slice(0, 28) + '”相关的资料：' + names + '。'
        : '暂时没有完全匹配的条目，我先为你推荐几种常用传统纹样。',
      result: {
        type: 'knowledge',
        skillId: 'knowledge',
        title: '数字知识库检索结果',
        summary: '检索范围包括年画流派、题材、传统纹样和色彩资料。',
        items: results,
        actionHref: '/pattern-library',
        actionLabel: '打开完整知识库',
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: '知识库检索失败，请稍后重试' }, { status: 500 });
  }
}
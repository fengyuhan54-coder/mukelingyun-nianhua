import { NextRequest, NextResponse } from 'next/server';

type DecisionMode = 'skill' | 'general' | 'culture-tour';

interface Decision {
  mode: DecisionMode;
  skillId: string | null;
  intent: string;
  confidence: number;
  reason: string;
}

function countMatches(text: string, patterns: RegExp[]) {
  return patterns.reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0);
}

function decide(message: string): Decision {
  const text = message.replace(/\s+/g, '');

  if (/^(你好|您好|嗨|在吗|谢谢|好的|明白了)[！!。.？?]*$/.test(text)) {
    return { mode: 'general', skillId: null, intent: '日常对话', confidence: 0.99, reason: '普通寒暄无需调用专业 Skill' };
  }

  const candidates = [
    {
      skillId: 'muling',
      mode: 'skill' as const,
      intent: '生活场景国风创作',
      patterns: [/(生日|祝寿|毕业|春节|新春|全家福|家庭纪念|宠物|旅行纪念|纪念日|贺卡|头像)/, /(照片|合影|全家福|宠物照|旅行照|毕业照|生活照)/, /(做一张|制作|创作|生成|变成|转成|国风|纪念|祝福)/],
      reason: '识别到日常纪念、祝福或生活照片国风创作需求',
    },    {
      skillId: 'culture-tour',
      mode: 'culture-tour' as const,
      intent: '文化探索与持续任务',
      patterns: [/(旅行|旅游|行程|路线|伴游|游览)/, /(开封|朱仙镇|文化探索|文化打卡)/, /(半天|一天|两天|小时|周末|国庆)/],
      reason: '识别到文化旅行、时间安排或持续探索需求',
    },
    {
      skillId: 'annual-painting',
      mode: 'skill' as const,
      intent: '木版年画创作',
      patterns: [/(生成|画一张|做一张|创作|设计|制作|出图)/, /(年画|门神|财神|朱仙镇|杨柳青|桃花坞|杨家埠|绵竹)/, /(风格|构图|画面|颜色|人物)/],
      reason: '识别到木版年画创作与出图需求',
    },
    {
      skillId: 'knowledge',
      mode: 'skill' as const,
      intent: '传统纹样与色彩检索',
      patterns: [/(查找|检索|推荐|搭配|配色|色彩|资料|素材)/, /(纹样|祥云|回纹|莲花纹|缠枝|颜色|流派|题材|知识库)/, /(适合|有哪些|参考|设计)/],
      reason: '识别到设计资料、纹样或色彩检索需求',
    },
    {
      skillId: 'heritage',
      mode: 'skill' as const,
      intent: '木版年画非遗问答',
      patterns: [/(什么是|为什么|介绍|历史|工艺|寓意|特点|起源|怎么|如何)/, /(年画|朱仙镇|门神|纹样|木版|非遗|套印|雕版)/, /(故事|文化|传承|制作)/],
      reason: '识别到非遗文化知识问答需求',
    },
  ];

  const ranked = candidates
    .map((candidate) => ({ candidate, score: countMatches(text, candidate.patterns) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (best.score >= 2) {
    return {
      mode: best.candidate.mode,
      skillId: best.candidate.skillId,
      intent: best.candidate.intent,
      confidence: Math.min(0.98, 0.68 + best.score * 0.1),
      reason: best.candidate.reason,
    };
  }

  if (best.score === 1 && /(年画|非遗|纹样|开封|朱仙镇|文化)/.test(text)) {
    return {
      mode: best.candidate.mode,
      skillId: best.candidate.skillId,
      intent: best.candidate.intent,
      confidence: 0.64,
      reason: best.candidate.reason,
    };
  }

  return { mode: 'general', skillId: null, intent: '通用对话', confidence: 0.82, reason: '没有发现必须调用专业 Skill 的明确意图' };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) return NextResponse.json({ error: '消息内容不能为空' }, { status: 400 });
    return NextResponse.json({ success: true, decision: decide(message), source: 'local-router' });
  } catch {
    return NextResponse.json({ error: '意图识别失败' }, { status: 400 });
  }
}



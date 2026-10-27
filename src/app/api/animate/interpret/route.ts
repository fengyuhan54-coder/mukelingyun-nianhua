import { NextRequest, NextResponse } from 'next/server';

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

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('模型没有返回结构化结果');
  return JSON.parse(match[0]);
}

function normalize(value: any, instruction: string): MotionUnderstanding {
  const subjects = Array.isArray(value?.subjects) ? value.subjects.filter((item: unknown) => typeof item === 'string').slice(0, 8) : [];
  const motions = Array.isArray(value?.motions) ? value.motions.filter((item: unknown) => typeof item === 'string').slice(0, 8) : [];
  const preserve = typeof value?.preserve === 'string' && value.preserve.trim()
    ? value.preserve.trim()
    : '保留原图主体、构图、色彩、意境以及用户未要求变化的区域';
  const generatedPrompt = typeof value?.optimizedPrompt === 'string' ? value.optimizedPrompt.trim().slice(0, 680) : '';
  return {
    subjectType: typeof value?.subjectType === 'string' ? value.subjectType : '综合场景',
    subjects: subjects.length ? subjects : ['用户明确要求变化的画面对象'],
    motions: motions.length ? motions : ['按用户描述产生自然动态'],
    intensity: typeof value?.intensity === 'string' ? value.intensity : '中等',
    style: typeof value?.style === 'string' ? value.style : '自然',
    scope: typeof value?.scope === 'string' ? value.scope : '按要求作用于相关对象',
    preserve,
    summary: typeof value?.summary === 'string' ? value.summary : '严格按照用户要求生成动态，其余画面保持不变。',
    optimizedPrompt: `忠实执行用户原始要求：“${instruction}”。${generatedPrompt}。${preserve}；不新增用户未提及且画面中不存在的主体，不改变人物身份，不新增文字。`.slice(0, 800),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const instruction = typeof body.instruction === 'string' ? body.instruction.trim().slice(0, 800) : '';
    const image = typeof body.image === 'string' && body.image.startsWith('data:image/') ? body.image : '';
    const polish = body.polish === true;
    const apiToken = typeof body.apiToken === 'string' ? body.apiToken.trim() : '';
    const history = Array.isArray(body.history)
      ? body.history.filter((item: unknown) => typeof item === 'string').slice(-4)
      : [];

    if (!instruction) return NextResponse.json({ error: '请先描述希望画面如何动起来。' }, { status: 400 });
    if (!apiToken) return NextResponse.json({ error: '未配置火山方舟 Token。' }, { status: 400 });

    const systemPrompt = `你是“光影新生”的图片动效理解 Agent。你必须同时查看用户上传的图片和本轮文字要求，将任意静态图片整理为忠实、可执行的图生视频方案。

核心原则：润色 = 忠实保留用户原意 + 细化表达 + 提高生成可执行性。
1. 严禁改变用户要求的对象、动作方向、速度、幅度和范围。用户说轻微，就不能改成强烈；用户说风景，就不能加入人物动作。
2. 只能使用图片中真实存在且用户明确要求变化的对象。用户没有提到的元素不得擅自加入新主体。
3. 先识别图片属于人物、风景、建筑、静物或综合场景，再结合本轮要求提取动效对象。
4. 保留原图主体、构图、色彩、意境、人物身份和用户未要求变化的区域，不新增文字，不做无关变形。
5. 历史仅用于理解“慢一点、只让背景动”等明确的连续修改；当本轮是一条完整新要求时，以本轮为准。
6. ${polish ? '本次是提示词润色，必须保留本轮原句含义，只补足速度、幅度、稳定性等执行细节。' : '本次是任务理解，结构化结果必须与图片内容及本轮指令真实匹配。'}

只输出 JSON，不展示推理过程。字段必须为：subjectType（人物/风景/建筑/静物/综合场景）、subjects（动效对象数组）、motions（动效方式数组）、intensity（轻微/柔和/中等/明显）、style（古风/静谧/节日/梦幻/自然等）、scope（作用范围）、preserve（保持不变部分）、summary（一句话摘要）、optimizedPrompt（专业中文图生视频提示词，不超过680字）。`;

    const requestText = `${history.length ? `此前任务（只在本轮为连续修改时参考）：${history.join('；')}\n` : ''}本轮用户原始要求：${instruction}`;
    const userContent: Array<Record<string, unknown>> = [{ type: 'text', text: requestText }];
    if (image) userContent.unshift({ type: 'image_url', image_url: { url: image } });

    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiToken },
      body: JSON.stringify({
        model: 'doubao-seed-2-0-lite-260428',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.15,
        max_tokens: 1400,
      }),
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: data?.error?.message || data?.message || '动效需求理解失败' }, { status: response.status });
    }
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return NextResponse.json({ error: '模型未返回动效理解结果。' }, { status: 502 });

    const result = normalize(extractJson(content), instruction);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '动效需求理解失败' }, { status: 500 });
  }
}
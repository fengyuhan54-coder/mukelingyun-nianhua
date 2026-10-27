import { NextRequest, NextResponse } from 'next/server';

type RawRegion = {
  name?: unknown;
  type?: unknown;
  x?: unknown;
  y?: unknown;
  width?: unknown;
  height?: unknown;
  animation?: unknown;
};

function numberPercent(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed <= 1 ? parsed * 100 : parsed));
}

function normalizeRegion(region: RawRegion, index: number) {
  const allowedTypes = ['eyes', 'hair', 'beard', 'clothes', 'object', 'water'] as const;
  const rawType = typeof region.type === 'string' ? region.type : 'object';
  const type = allowedTypes.includes(rawType as typeof allowedTypes[number]) ? rawType : 'object';
  const rawAnimation = typeof region.animation === 'string' ? region.animation : 'flow';
  const animationType = rawAnimation === 'blink' ? 'blink' : rawAnimation === 'wave' ? 'wave' : 'flow';
  return {
    id: `region-${index + 1}`,
    name: typeof region.name === 'string' ? region.name : `可动区域 ${index + 1}`,
    type,
    x: numberPercent(region.x),
    y: numberPercent(region.y),
    width: numberPercent(region.width),
    height: numberPercent(region.height),
    animationType,
    enabled: true,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image = typeof body.image === 'string' ? body.image : '';
    const apiToken = typeof body.apiToken === 'string' ? body.apiToken.trim() : '';
    if (!image || !apiToken) return NextResponse.json({ error: '缺少图片或 API Token' }, { status: 400 });

    const imageUrl = image.startsWith('data:image/') ? image : `data:image/jpeg;base64,${image}`;
    const systemPrompt = `你是通用图片动效分析专家。分析用户上传的真实图片，图片可能是生活照片、人物、风景、古建筑、年画、插画、海报或设计图。

识别图片场景类型，并找出适合轻微动态化的真实可见区域。严禁默认图片中有人物，严禁添加图片中不存在的对象。
- 人物图可识别眼睛、头发、衣袖等；
- 风景图可识别云层、水面、树叶、花朵、烟雾、光影等；
- 建筑图可识别灯笼、旗幡、风铃、烟雾、光影等；
- 静物或设计图只识别真实存在且适合动态化的部分。

坐标 x、y、width、height 使用 0 到 1 的相对比例。type 只能是 eyes、hair、beard、clothes、object、water；animation 只能是 blink、wave、flow。
只输出 JSON：{"sceneType":"人物/风景/建筑/静物/综合场景","description":"对图片真实内容的简短说明","regions":[{"name":"区域名称","type":"object","x":0.1,"y":0.1,"width":0.3,"height":0.2,"animation":"flow"}]}。如果没有适合动态化的区域，regions 返回空数组，不要编造人物区域。`;

    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify({
        model: 'doubao-seed-2-0-lite-260428',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: '请按图片真实内容识别场景与可动区域，不要添加画面中不存在的对象。' },
          ] },
        ],
        temperature: 0.1,
        max_tokens: 1800,
      }),
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: data?.error?.message || data?.message || '图片分析失败' }, { status: response.status });
    }
    const content = data?.choices?.[0]?.message?.content;
    const match = typeof content === 'string' ? content.match(/\{[\s\S]*\}/) : null;
    if (!match) return NextResponse.json({ error: '视觉模型未返回可解析的图片分析结果' }, { status: 502 });

    const parsed = JSON.parse(match[0]);
    const rawRegions: RawRegion[] = Array.isArray(parsed.regions) ? parsed.regions : [];
    const regions = rawRegions.map(normalizeRegion).filter(region => region.width > 0 && region.height > 0).slice(0, 8);
    return NextResponse.json({
      success: true,
      sceneType: typeof parsed.sceneType === 'string' ? parsed.sceneType : '综合场景',
      description: typeof parsed.description === 'string' ? parsed.description : '已根据图片真实内容完成分析。',
      regions,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '图片分析失败' }, { status: 500 });
  }
}
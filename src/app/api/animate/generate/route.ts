import { NextRequest, NextResponse } from 'next/server';

const MODEL = 'wanx2.1-i2v-turbo';
const REGION_HOSTS = {
  'cn-beijing': 'cn-beijing',
  'ap-southeast-1': 'ap-southeast-1',
  'us-east-1': 'us-east-1',
  'eu-central-1': 'eu-central-1',
} as const;

type Region = keyof typeof REGION_HOSTS;

function apiEndpoint(workspaceId: string, region: Region) {
  return 'https://' + workspaceId + '.' + REGION_HOSTS[region] + '.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis';
}

function normalizeApiKey(value: string) {
  return value
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .trim()
    .replace(/^DASHSCOPE_API_KEY\s*=\s*/i, '')
    .replace(/^[`'"“”‘’]+|[`'"“”‘’]+$/g, '')
    .replace(/\s+/g, '');
}
function errorMessage(data: any, fallback: string) {
  return data?.message || data?.code || data?.error?.message || fallback;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image = typeof body.image === 'string' ? body.image : '';
    const apiKey = typeof body.apiKey === 'string' ? normalizeApiKey(body.apiKey) : '';
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId.trim() : '';
    const region = (typeof body.region === 'string' ? body.region : 'cn-beijing') as Region;
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 800) : '';
    const resolution = body.resolution === '480P' ? '480P' : '720P';
    const duration = [3, 4, 5].includes(Number(body.duration)) ? Number(body.duration) : 5;

    if (!apiKey || !workspaceId || !image) {
      return NextResponse.json({ error: '缺少阿里云百炼 API Key、业务空间 ID 或首帧图片。' }, { status: 400 });
    }
    if (!apiKey.startsWith('sk-') || apiKey.length < 8) {
      return NextResponse.json({ error: '阿里云百炼 API Key 格式不正确，应以 sk- 开头。' }, { status: 400 });
    }
    if (!/^[A-Za-z0-9-]{4,128}$/.test(workspaceId) || workspaceId.startsWith('-') || workspaceId.endsWith('-')) {
      return NextResponse.json({ error: '业务空间 ID 格式不正确。' }, { status: 400 });
    }
    if (!(region in REGION_HOSTS)) {
      return NextResponse.json({ error: '不支持的百炼服务地域。' }, { status: 400 });
    }
    if (!/^data:image\/(jpeg|jpg|png|bmp|webp);base64,/i.test(image)) {
      return NextResponse.json({ error: '通义万相仅接受 JPG、PNG、BMP 或 WEBP 图片。' }, { status: 400 });
    }
    const base64 = image.slice(image.indexOf(',') + 1);
    if (Buffer.byteLength(base64, 'base64') > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'wanx2.1-i2v-turbo 要求图片不超过 10MB。' }, { status: 400 });
    }

    const response = await fetch(apiEndpoint(workspaceId, region), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model: MODEL,
        input: {
          prompt: prompt || '保留原木版年画的构图、人物身份、色彩与传统题字，让画面产生自然、克制的细微动态，镜头稳定。',
          negative_prompt: '画面变形，人物换脸，新增人物，新增文字，题字乱码，镜头剧烈晃动，闪烁，低清晰度，肢体畸变，色彩突变',
          img_url: image,
        },
        parameters: {
          resolution,
          duration,
          prompt_extend: true,
          watermark: false,
        },
      }),
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({
        error: errorMessage(data, '通义万相任务创建失败（HTTP ' + response.status + '）'),
        code: data?.code,
        requestId: data?.request_id,
      }, { status: response.status });
    }

    const taskId = data?.output?.task_id;
    if (!taskId) {
      return NextResponse.json({ error: '通义万相未返回任务 ID。', requestId: data?.request_id }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      task_id: taskId,
      status: 'pending',
      model: MODEL,
      requestId: data?.request_id,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '视频生成请求失败。' }, { status: 500 });
  }
}

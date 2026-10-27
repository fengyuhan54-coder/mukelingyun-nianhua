import { NextRequest, NextResponse } from 'next/server';

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

function isAllowedVideoHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host.endsWith('.aliyuncs.com') || host.endsWith('.aliyun.com');
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json() as { url?: string };
    if (!url) return NextResponse.json({ error: '缺少视频地址' }, { status: 400 });

    const source = new URL(url);
    if (source.protocol !== 'https:' || !isAllowedVideoHost(source.hostname)) {
      return NextResponse.json({ error: '不支持保存该视频来源' }, { status: 400 });
    }

    const response = await fetch(source, { cache: 'no-store', redirect: 'follow' });
    if (!response.ok) {
      return NextResponse.json({ error: '读取生成视频失败，请重新生成后再保存' }, { status: 502 });
    }
    const finalUrl = new URL(response.url);
    if (finalUrl.protocol !== 'https:' || !isAllowedVideoHost(finalUrl.hostname)) {
      return NextResponse.json({ error: '视频下载地址校验失败' }, { status: 400 });
    }

    const declaredSize = Number(response.headers.get('content-length') || 0);
    if (declaredSize > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: '视频超过 100MB，建议直接下载到本机保存' }, { status: 413 });
    }

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: '视频超过 100MB，建议直接下载到本机保存' }, { status: 413 });
    }

    return new NextResponse(bytes, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'video/mp4',
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '视频保存失败' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getApiToken, saveConfig } from '@/lib/api-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = getApiToken();
  return NextResponse.json({ success: true, hasToken: !!token, tokenLength: token?.length || 0 }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ success: false, error: '不允许跨站修改密钥配置' }, { status: 403 });
    }
    const body = await request.json();
    if (typeof body.apiToken !== 'string') {
      return NextResponse.json({ success: false, error: '请输入您自己的 API Token' }, { status: 400 });
    }
    const token = body.apiToken.trim();
    if (token && (token.length < 20 || token.length > 2048 || /[^\x21-\x7e]/.test(token))) {
      return NextResponse.json({ success: false, error: 'Token 格式不正确，请检查您自己的密钥' }, { status: 400 });
    }
    saveConfig({ apiToken: token }, request.nextUrl.protocol === 'https:');
    return NextResponse.json({ success: true, hasToken: !!token, tokenLength: token.length }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ success: false, error: '配置失败，请重新填写您自己的密钥' }, { status: 400 });
  }
}

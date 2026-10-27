import { NextRequest, NextResponse } from 'next/server';
import { loadConfig, saveConfig } from '@/lib/api-config';

// GET: 获取当前配置状态
export async function GET() {
  const config = loadConfig();
  const hasEnvToken = !!(process.env.DOUBAO_API_TOKEN || process.env.ARK_API_TOKEN);
  return NextResponse.json({
    success: true,
    hasToken: hasEnvToken || !!config.apiToken,
    tokenLength: (config.apiToken || process.env.DOUBAO_API_TOKEN || process.env.ARK_API_TOKEN || '').length
  });
}

// POST: 保存配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiToken } = body;

    if (apiToken && apiToken.length < 20) {
      return NextResponse.json(
        { success: false, error: 'Token 长度不足' },
        { status: 400 }
      );
    }

    const config = loadConfig();
    config.apiToken = apiToken;
    saveConfig(config);

    return NextResponse.json({
      success: true,
      hasToken: !!apiToken,
      tokenLength: apiToken?.length || 0
    });
  } catch (err) {
    console.error('保存配置错误:', err);
    return NextResponse.json(
      { success: false, error: '保存失败' },
      { status: 500 }
    );
  }
}

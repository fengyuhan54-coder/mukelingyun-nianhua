import { NextRequest, NextResponse } from 'next/server';
import { generateArchitecturePrompt } from '@/lib/prompt-templates';
import { getApiToken } from '@/lib/api-config';
import { saveArtworkRecord } from '@/lib/artwork-storage';

export const dynamic = 'force-dynamic';

// 豆包生图 API - 火山方舟图像生成端点
const IMAGE_GEN_URL = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dynasty, architectureType, specificBuilding, newYearPrintStyle, additionalRequirements, size } = body;

    // 验证必填参数
    if (!architectureType) {
      return NextResponse.json({ error: '请指定建筑类型' }, { status: 400 });
    }

    // 生成专业 Prompt
    const prompt = generateArchitecturePrompt({
      dynasty,
      architectureType,
      specificBuilding,
      newYearPrintStyle,
      additionalRequirements
    });

    // 获取 API Token（环境变量或配置文件）
    const apiToken = getApiToken();

    if (!apiToken) {
      return NextResponse.json({
        success: false,
        error: '请先在页面顶部配置 API Token',
        needConfig: true
      }, { status: 401 });
    }

    // 调用豆包生图 API
    const response = await fetch(IMAGE_GEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify({
        model: 'doubao-seedream-4-5-251128',
        prompt: prompt,
        size: '1920x1920',
        n: 1,
        response_format: 'url'
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Image generation API error:', errorData);
      return NextResponse.json({
        success: false,
        error: 'AI 模型服务暂时不可用，请稍后重试'
      }, { status: 500 });
    }

    const data = await response.json();

    if (data.data && data.data.length > 0) {
      const imageUrl = data.data[0].url;

      // 保存到历史记录
      const record = saveArtworkRecord({
        type: 'architecture',
        imageUrl,
        prompt,
        dynasty,
        architectureType,
        style: newYearPrintStyle,
        styleName: newYearPrintStyle,
      });

      return NextResponse.json({
        success: true,
        imageUrls: [imageUrl],
        prompt,
        request: body,
        recordId: record.id,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '生图结果为空'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '生图失败'
    }, { status: 500 });
  }
}

import { getApiToken } from '@/lib/api-config';
import { NextRequest, NextResponse } from 'next/server';
import { generateCulturePrompt, DYNASTY_STYLES, ARCHITECTURE_TYPES, NEW_YEAR_PRINT_STYLES } from '@/lib/prompt-templates';

export const dynamic = 'force-dynamic';

// 豆包 LLM API - 使用原生 fetch 避免 SDK 打包问题
const LLM_URL = 'https://ark.cn-beijing.volces.com/api/v3/beta/chat/completions';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { dynasty, architectureType, specificBuilding, newYearPrintStyle } = body;

  try {
    // 构建提示词
    const prompt = generateCulturePrompt({
      dynasty,
      architectureType,
      specificBuilding,
      newYearPrintStyle
    });

    // 获取 API Token
    const apiToken = getApiToken();

    if (!apiToken) {
      // 如果没有 API Token，返回本地知识库内容
      return NextResponse.json({
        success: true,
        data: generateLocalCultureInfo(body)
      });
    }

    // 调用豆包 LLM API
    const response = await fetch(LLM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify({
        model: 'doubao-seed-2.0-pro',
        messages: [
          {
            role: 'system',
            content: `你是一位中国古建筑文化专家，请用生动易懂的语言介绍古建筑的历史与文化。回复请控制在200字以内，突出重点，使用简洁的段落格式。`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('LLM API error:', errorData);
      return NextResponse.json({
        success: true,
        data: generateLocalCultureInfo(body)
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // 构建文化信息对象
    const cultureInfo = {
      dynasty: dynasty && DYNASTY_STYLES[dynasty] ? {
        ...DYNASTY_STYLES[dynasty],
        name: dynasty
      } : null,
      architecture: architectureType && ARCHITECTURE_TYPES[architectureType] ? {
        ...ARCHITECTURE_TYPES[architectureType],
        type: architectureType
      } : null,
      printStyle: newYearPrintStyle && NEW_YEAR_PRINT_STYLES[newYearPrintStyle] ? {
        ...NEW_YEAR_PRINT_STYLES[newYearPrintStyle],
        name: newYearPrintStyle
      } : null,
      description: content,
      tips: generateCulturalTips(dynasty, architectureType, newYearPrintStyle)
    };

    return NextResponse.json({
      success: true,
      data: cultureInfo
    });
  } catch (error) {
    console.error('Culture generation error:', error);
    // 发生错误时返回本地内容
    return NextResponse.json({
      success: true,
      data: generateLocalCultureInfo(body)
    });
  }
}

function generateLocalCultureInfo(body: { dynasty?: string; architectureType?: string; specificBuilding?: string; newYearPrintStyle?: string }): {
  dynasty: any;
  architecture: any;
  printStyle: any;
  description: string;
  tips: string[];
} {
  const { dynasty, architectureType, specificBuilding, newYearPrintStyle } = body;

  return {
    dynasty: dynasty && DYNASTY_STYLES[dynasty] ? {
      ...DYNASTY_STYLES[dynasty],
      name: dynasty
    } : null,
    architecture: architectureType && ARCHITECTURE_TYPES[architectureType] ? {
      ...ARCHITECTURE_TYPES[architectureType],
      type: architectureType
    } : null,
    printStyle: newYearPrintStyle && NEW_YEAR_PRINT_STYLES[newYearPrintStyle] ? {
      ...NEW_YEAR_PRINT_STYLES[newYearPrintStyle],
      name: newYearPrintStyle
    } : null,
    description: generateLocalDescription(dynasty, architectureType, specificBuilding, newYearPrintStyle),
    tips: generateCulturalTips(dynasty, architectureType, newYearPrintStyle)
  };
}

function generateLocalDescription(dynasty?: string, architectureType?: string, specificBuilding?: string, printStyle?: string): string {
  const parts: string[] = [];

  if (dynasty && DYNASTY_STYLES[dynasty]) {
    parts.push(DYNASTY_STYLES[dynasty].culturalContext);
  }
  if (architectureType && ARCHITECTURE_TYPES[architectureType]) {
    parts.push(ARCHITECTURE_TYPES[architectureType].description);
  }
  if (specificBuilding) {
    parts.push(`「${specificBuilding}」是经典的古建筑代表，展现了高超的建筑艺术。`);
  }
  if (printStyle && NEW_YEAR_PRINT_STYLES[printStyle]) {
    parts.push(NEW_YEAR_PRINT_STYLES[printStyle].culturalSignificance);
  }

  return parts.length > 0 ? parts.join(' ') : '请选择建筑参数以获取详细的古建筑文化介绍。';
}

function generateCulturalTips(dynasty?: string, architectureType?: string, printStyle?: string): string[] {
  const tips: string[] = [];

  if (dynasty && DYNASTY_STYLES[dynasty]) {
    tips.push(`${DYNASTY_STYLES[dynasty].name}建筑讲究${DYNASTY_STYLES[dynasty].features.join('、')}，体现了${DYNASTY_STYLES[dynasty].culturalContext}`);
  }
  if (architectureType && ARCHITECTURE_TYPES[architectureType]) {
    tips.push(`${ARCHITECTURE_TYPES[architectureType].name}是${ARCHITECTURE_TYPES[architectureType].description}的典型代表`);
  }
  if (printStyle && NEW_YEAR_PRINT_STYLES[printStyle]) {
    tips.push(`${NEW_YEAR_PRINT_STYLES[printStyle].name}是中国${NEW_YEAR_PRINT_STYLES[printStyle].culturalSignificance}`);
  }

  tips.push('建议阅读《中国古建筑史》《营造法式》等专业书籍深入了解');
  tips.push('可参观故宫、应县木塔、佛光寺等著名古建筑实例');

  return tips;
}

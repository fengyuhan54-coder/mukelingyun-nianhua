import { getApiToken } from '@/lib/api-config';
import { NextRequest, NextResponse } from 'next/server';
import { 
  generateEnhancedPrompt, 
  getStyleById, 
  getThemeById,
  generateValidationPrompts,
  getStyleThemeMaterial 
} from '@/lib/annual-painting-prompts';
import { saveArtworkRecord } from '@/lib/artwork-storage';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


// 最大重生成次数
const MAX_REGENERATION_ATTEMPTS = 3;

const VISUAL_ONLY_POLICY = [
  '【画面文字硬性限制】只输出纯木版年画视觉内容。',
  '严禁把用户输入、提问、命令、提示词、说明文字、界面文字、字幕、标签、水印或任何无关汉字、字母、数字画进画面。',
  '不要在人物衣服、背景、边框或留白处复写用户原句。',
  '只有符合传统年画构图且属于作品本身的简短传统题字或画题（如“福”“寿”“钟馗”“吉祥如意”）可以保留；无法确定时宁可完全不出现文字。',
  '画面不得出现乱码、伪文字和仿文字笔画。'
].join('\n');

function withVisualOnlyPolicy(prompt: string) {
  return prompt.trim() + '\n' + VISUAL_ONLY_POLICY;
}

function cleanVisualDescription(value: unknown, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const cleaned = value
    .replace(/[“”"'‘’]/g, '')
    .replace(/(我想要?|我要|请|麻烦|你能不能|能不能|可以|帮我|帮忙|给我)/g, '')
    .replace(/(生成|创作|制作|画)(一幅|一张|一个|幅|张|个)?/g, '')
    .replace(/(纯)?木版年画/g, '')
    .replace(/(你能帮我|帮我生成|可以吗|能吗|好吗|谢谢)/g, '')
    .replace(/(生成|创作|制作|木版年画|年画|可以|能|吗|呢|呀|吧)/g, '')
    .replace(/[？?！!。]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length >= 2 ? cleaned : fallback;
}

const COMMON_TRADITIONAL_INSCRIPTIONS = new Set([
  '福', '禄', '寿', '喜', '春', '吉', '钟馗', '门神', '财神',
  '吉祥如意', '年年有余', '连年有余', '五谷丰登', '招财进宝',
  '迎春接福', '平安富贵', '富贵有余', '喜上眉梢', '花开富贵',
  '阖家欢乐', '四季平安', '福寿双全', '麒麟送子', '天官赐福'
]);

function isAllowedArtworkText(value: string) {
  const normalized = value
    .replace(/\s+/g, '')
    .replace(/[“”"'‘’《》【】\[\]()（）:：,，。！!？?·•]/g, '');

  if (normalized.toUpperCase() === 'AI生成') return true;
  if (COMMON_TRADITIONAL_INSCRIPTIONS.has(normalized)) return true;

  // 传统年画题字通常是简短汉字；带有操作或提问语义的短句仍然禁止。
  const instructionWords = /(帮我|给我|我要|我想|生成|制作|创作|请|你能|能否|是否|可以|上传|点击|选择|输入|输出|提示词|模型|智能体|怎么|为什么|AGENT)/i;
  return /^[\u3400-\u9fff]{1,8}$/.test(normalized) && !instructionWords.test(normalized);
}
function loadApiToken(): string | undefined {
  return getApiToken();
}

// 调用火山方舟 API 生成图片
async function generateImage(token: string, prompt: string): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        model: 'doubao-seedream-4-5-251128',
        prompt: withVisualOnlyPolicy(prompt),
        size: '1920x1920',
        n: 1,
        response_format: 'url'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || 'API 调用失败';
      console.error('豆包API错误:', errorMsg, '状态码:', response.status);
      // 如果是模型相关错误，返回更友好的提示
      if (errorMsg.includes('模型') || errorMsg.includes('model')) {
        return { success: false, error: 'AI 模型服务暂时不可用，请稍后重试' };
      }
      return { success: false, error: errorMsg };
    }

    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) {
      return { success: false, error: '未获取到生成的图片' };
    }

    return { success: true, imageUrl };
  } catch (error: any) {
    return { success: false, error: error.message || '生成失败' };
  }
}

// 调用视觉模型进行校验
async function validateWithVision(
  token: string,
  validationPrompt: string,
  imageUrl: string
): Promise<{ passed: boolean; details: any }> {
  try {
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        model: "doubao-seed-2-0-lite-260428",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: validationPrompt },
              { type: "image_url", image_url: { url: imageUrl, detail: "high" } }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Vision API Error:', data);
      // 文字安全校验不可用时拒绝返回未验证图片
      return { passed: false, details: { error: '文字安全校验服务不可用' } };
    }

    const content = data.choices?.[0]?.message?.content || '';
    
    // 解析 JSON 响应
    try {
      // 尝试提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return { 
          passed: result.passed !== false && result.styleMatchScore >= 60, 
          details: result 
        };
      }
    } catch (parseError) {
      console.error('JSON 解析失败:', parseError);
    }

    // 响应无法解析时按不通过处理
    return { passed: false, details: { raw: content } };
  } catch (error: any) {
    console.error('校验失败:', error);
    // 校验异常时按不通过处理
    return { passed: false, details: { error: error.message } };
  }
}

// 带校验的生成流程
async function generateWithValidation(
  token: string,
  styleId: string,
  effectiveTheme: { id: string; name: string; elements: string[] },
  specificElement?: string,
  additionalRequirements?: string
): Promise<{ success: boolean; imageUrl?: string; prompt?: string; error?: string; attempts?: number }> {
  
  const style = getStyleById(styleId);
  
  if (!style) {
    return { success: false, error: '未找到对应的流派' };
  }

  // 从额外要求中分离纹样和色彩
  let additionalPatterns = '';
  let additionalColors = '';
  if (additionalRequirements) {
    // 简单分离：包含"纹样"的是纹样，包含"色彩"或颜色名的是色彩
    const patterns = additionalRequirements.match(/[\u4e00-\u9fa5]+纹样/g);
    const colors = additionalRequirements.match(/[\u4e00-\u9fa5]+（[^）]+）/g);
    additionalPatterns = patterns?.join('、') || '';
    additionalColors = colors?.join('、') || '';
  }

  let lastError = '';
  
  for (let attempt = 1; attempt <= MAX_REGENERATION_ATTEMPTS; attempt++) {
    console.log(`生成尝试 ${attempt}/${MAX_REGENERATION_ATTEMPTS}`);
    
    // 生成增强版 Prompt
    const prompt = generateEnhancedPrompt(
      style, 
      effectiveTheme,
      specificElement,
      additionalPatterns,
      additionalColors
    );

    // 生成图片
    const genResult = await generateImage(token, prompt);
    if (!genResult.success || !genResult.imageUrl) {
      lastError = genResult.error || '生成失败';
      continue;
    }

    // 只执行文字安全校验：传统吉祥题字可以保留，用户指令与无关文字必须拦截。
    const textSafetyPrompt = [
      '请检查这张木版年画里是否出现了不应存在的文字。',
      '允许：①平台固定标识“AI生成”；②作品自身符合传统年画语境的简短题字或画题，例如“福”“寿”“钟馗”“吉祥如意”“年年有余”。',
      '禁止：用户提问句、命令句、创作提示词、界面文案、说明文字、字幕、无关标签或水印、乱码、伪文字、无关汉字、字母或数字；但平台固定标识“AI生成”不属于禁止内容。',
      '传统题字、传统画题和“AI生成”不得列入 detectedText；只有出现真正的禁止文字才判定不通过。不要评价画风和构图。',
      '严格返回 JSON：{"passed":true或false,"styleMatchScore":安全时100否则0,"detectedText":["识别出的禁止文字"],"reason":"判断理由"}。'
    ].join('\n');
    const textSafety = await validateWithVision(token, textSafetyPrompt, genResult.imageUrl);
    const detectedText: string[] = Array.isArray(textSafety.details?.detectedText)
      ? (textSafety.details.detectedText as unknown[]).filter((item: unknown): item is string => typeof item === 'string')
      : [];
    const forbiddenText = detectedText.filter(text => !isAllowedArtworkText(text));
    const passedAfterAllowedTextFilter = textSafety.passed || (detectedText.length > 0 && forbiddenText.length === 0);

    if (!passedAfterAllowedTextFilter) {
      const detected = forbiddenText.join('、');
      lastError = detected
        ? '检测到画面含有不允许的文字：' + detected
        : '画面文字安全校验未通过';
      console.warn('第 ' + attempt + ' 次生成未通过文字安全校验：' + lastError);
      continue;
    }

    console.log('图片生成成功并通过文字安全校验: ' + genResult.imageUrl);
    return {
      success: true,
      imageUrl: genResult.imageUrl,
      prompt: withVisualOnlyPolicy(prompt),
      attempts: attempt
    };
  }

  return { success: false, error: `生成失败，已重试${MAX_REGENERATION_ATTEMPTS}次：${lastError}` };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { styleId, themeId, customTheme, specificElement, customPrompt, additionalRequirements } = body;

    // 获取 API Token
    const token = loadApiToken();
    if (!token) {
      return NextResponse.json({
        success: false,
        error: '请先在页面顶部配置 API Token'
      }, { status: 401 });
    }

    // 参数校验：流派必须选择
    if (!styleId) {
      return NextResponse.json({
        success: false,
        error: '请选择年画流派'
      }, { status: 400 });
    }

    const style = getStyleById(styleId);
    if (!style) {
      return NextResponse.json({
        success: false,
        error: '未选择有效的年画流派'
      }, { status: 400 });
    }

    // 主题校验：固定主题或自定义主题（自定义主题需描述不为空）
    const hasFixedTheme = themeId && themeId !== 'custom';
    const hasCustomTheme = themeId === 'custom' && customTheme && customTheme.trim();
    
    if (!hasFixedTheme && !hasCustomTheme) {
      return NextResponse.json({
        success: false,
        error: '请选择固定主题或输入自定义主题描述'
      }, { status: 400 });
    }

    // 确定使用的主题信息
    let effectiveThemeId = themeId;
    let effectiveThemeName = cleanVisualDescription(customTheme, '吉祥民俗主题');
    let effectiveTheme: { id: string; name: string; elements: string[] };

    if (hasFixedTheme) {
      // 固定主题：使用标准素材库
      const theme = getThemeById(themeId);
      if (!theme) {
        return NextResponse.json({
          success: false,
          error: '未找到对应的主题'
        }, { status: 400 });
      }
      effectiveTheme = { id: theme.id, name: theme.name, elements: theme.elements };
    } else {
      // 自定义主题：创建主题对象
      effectiveTheme = {
        id: 'custom',
        name: effectiveThemeName,
        elements: effectiveThemeName.split(/[,，、]/).filter(Boolean)
      };
    }

    // 使用自定义 Prompt 或带校验的生成流程
    let imageUrl: string;
    let finalPrompt: string;
    let attempts = 1;

    if (customPrompt) {
      // 自定义 Prompt 直接生成
      const genResult = await generateImage(token, customPrompt);
      if (!genResult.success) {
        return NextResponse.json({
          success: false,
          error: genResult.error
        }, { status: 500 });
      }
      imageUrl = genResult.imageUrl!;
      finalPrompt = customPrompt;
    } else {
      // 使用增强版 Prompt + 双重校验
      const result = await generateWithValidation(
        token,
        styleId,
        effectiveTheme,
        cleanVisualDescription(specificElement) || undefined,
        additionalRequirements
      );

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error
        }, { status: 500 });
      }

      imageUrl = result.imageUrl!;
      finalPrompt = result.prompt!;
      attempts = result.attempts || 1;
    }

    // 保存到历史记录
    const record = saveArtworkRecord({
      type: 'annual-painting',
      imageUrl,
      prompt: finalPrompt,
      style: styleId,
      styleName: style.name,
      theme: effectiveTheme.id,
      themeName: effectiveTheme.name,
    });

    return NextResponse.json({
      success: true,
      imageUrls: [imageUrl],
      prompt: finalPrompt,
      style: style.name,
      theme: effectiveTheme.name,
      attempts: attempts,
      recordId: record.id,
    });

  } catch (error: any) {
    console.error('Generate Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '生成失败，请重试'
    }, { status: 500 });
  }
}









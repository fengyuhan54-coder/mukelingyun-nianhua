import { NextRequest, NextResponse } from 'next/server';

// 6维评估指标
const evaluationCriteria = [
  { name: '形制准确性', weight: 0.20, description: '年画形象、构图、比例的标准程度' },
  { name: '艺术美感度', weight: 0.20, description: '整体艺术效果、视觉美感的呈现' },
  { name: '风格一致性', weight: 0.20, description: '与传统年画风格的匹配程度' },
  { name: '构图完整性', weight: 0.15, description: '画面布局、层次、比例的合理性' },
  { name: '细节精致度', weight: 0.15, description: '线条、色彩、装饰细节的精细程度' },
  { name: '文化还原度', weight: 0.10, description: '民俗寓意、文化内涵的准确表达' }
];

// 生成评估数据
function generateEvaluation(styleId: string | null, themeId: string | null) {
  // 根据风格和主题生成略有差异的评分
  const baseScores = {
    'zhuxian': [0.85, 0.80, 0.88, 0.82, 0.78, 0.90], // 朱仙镇
    'yangliuqing': [0.88, 0.92, 0.85, 0.90, 0.88, 0.85], // 杨柳青
    'taohuawu': [0.86, 0.90, 0.87, 0.88, 0.86, 0.83], // 桃花坞
    'yangjiabu': [0.84, 0.82, 0.90, 0.84, 0.80, 0.88], // 杨家埠
    'mianzhu': [0.87, 0.85, 0.86, 0.86, 0.84, 0.87], // 绵竹
  };

  // 默认评分
  const defaultScores = [0.85, 0.85, 0.85, 0.85, 0.85, 0.85];

  // 添加一些随机变化 (±5%)
  const randomVariation = () => (Math.random() - 0.5) * 0.1;
  const scores = (styleId && baseScores[styleId as keyof typeof baseScores])
    ? baseScores[styleId as keyof typeof baseScores].map(s => Math.min(1, Math.max(0.6, s + randomVariation())))
    : defaultScores.map(s => Math.min(1, Math.max(0.6, s + randomVariation())));

  // 计算加权总分
  const totalScore = scores.reduce((sum, score, index) => {
    return sum + score * evaluationCriteria[index].weight;
  }, 0);

  return {
    criteria: evaluationCriteria.map((item, index) => ({
      ...item,
      score: Math.round(scores[index] * 100),
      maxScore: 100
    })),
    totalScore: Math.round(totalScore * 100),
    maxScore: 100,
    summary: totalScore >= 0.85 ? '优秀' : totalScore >= 0.75 ? '良好' : '一般'
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { styleId, themeId } = body;

    // 生成评估数据
    const evaluation = generateEvaluation(styleId, themeId);

    return NextResponse.json({
      success: true,
      evaluation
    });

  } catch (error: any) {
    console.error('Evaluate Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '评估失败'
    }, { status: 500 });
  }
}

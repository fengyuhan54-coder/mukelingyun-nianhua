import { NextRequest, NextResponse } from 'next/server';
import { generateEvaluationScores, EVALUATION_DIMENSIONS } from '@/lib/prompt-templates';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dynasty, architectureType, newYearPrintStyle } = body;

    // 生成评估数据
    const scores = generateEvaluationScores({ dynasty, architectureType, newYearPrintStyle });

    // 计算综合得分
    let totalScore = 0;
    const dimensionKeys = Object.keys(EVALUATION_DIMENSIONS) as (keyof typeof EVALUATION_DIMENSIONS)[];
    dimensionKeys.forEach(dim => {
      totalScore += scores[dim] * EVALUATION_DIMENSIONS[dim].weight;
    });

    // 构建 ECharts 雷达图数据
    const radarData = {
      dimensions: dimensionKeys.map(dim => ({
        name: dim,
        max: 100,
        description: EVALUATION_DIMENSIONS[dim].description
      })),
      values: dimensionKeys.map(dim => scores[dim]),
      totalScore: Math.round(totalScore * 10) / 10,
      scores,
      analysis: generateAnalysis(scores)
    };

    return NextResponse.json({
      success: true,
      data: radarData
    });
  } catch (error) {
    console.error('Evaluation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '评估失败'
    }, { status: 500 });
  }
}

function generateAnalysis(scores: Record<string, number>): string {
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const highest = entries[0];
  const lowest = entries[entries.length - 1];

  let analysis = `该作品综合得分 ${Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 6)} 分。`;

  if (highest[1] >= 90) {
    analysis += `${highest[0]}表现出色（${highest[1]}分），`;
  }
  if (lowest[1] < 80) {
    analysis += `${lowest[0]}可进一步优化（${lowest[1]}分）。`;
  }

  return analysis;
}

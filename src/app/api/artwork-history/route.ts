import { NextRequest, NextResponse } from 'next/server';
import { getArtworkRecords, getArtworkRecordById } from '@/lib/artwork-storage';

export const dynamic = 'force-dynamic';

/**
 * 获取历史作品列表
 * GET /api/artwork-history?type=annual-painting|architecture
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'annual-painting' | 'architecture' | null;

    const records = getArtworkRecords(type || undefined);

    return NextResponse.json({
      success: true,
      records,
      total: records.length,
    });
  } catch (error) {
    console.error('Get artwork history error:', error);
    return NextResponse.json({
      success: false,
      error: '获取历史作品失败',
      records: [],
      total: 0,
    }, { status: 500 });
  }
}

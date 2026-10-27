import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// 创建数据库连接池
const pool = new Pool({
  connectionString: process.env.PGDATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/neondb',
});

// 获取作品列表
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const user_id = searchParams.get('user_id');

  if (!category || !user_id) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM artworks 
       WHERE category = $1 AND user_id = $2 
       ORDER BY created_at DESC`,
      [category, user_id]
    );

    return NextResponse.json({ data: result.rows });
  } catch (error) {
    console.error('获取作品失败:', error);
    return NextResponse.json({ data: [] });
  }
}

// 创建作品
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, category, title, image_url, description, prompt, style, dynasty, evaluation_data, culture_content } = body;

    if (!user_id || !category || !image_url) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO artworks (user_id, category, title, image_url, description, prompt, style, dynasty, evaluation_data, culture_content)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [user_id, category, title || '', image_url, description || '', prompt || '', style || '', dynasty || '', evaluation_data ? JSON.stringify(evaluation_data) : null, culture_content || '']
    );

    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    console.error('创建作品失败:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

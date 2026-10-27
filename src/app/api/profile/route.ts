import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// 创建数据库连接池
const pool = new Pool({
  connectionString: process.env.PGDATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/neondb',
});

// 获取个人信息
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get('user_id');

  if (!user_id) {
    return NextResponse.json({ error: '缺少user_id参数' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [user_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ data: null });
    }

    const profile = result.rows[0];
    return NextResponse.json({ data: profile });
  } catch (error) {
    console.error('获取个人信息失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// 创建或更新个人信息
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, nickname, real_name, id_card, phone, email, bio } = body;

    if (!user_id) {
      return NextResponse.json({ error: '缺少user_id参数' }, { status: 400 });
    }

    const isVerified = real_name && id_card ? true : false;

    // 检查是否已存在
    const checkResult = await pool.query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [user_id]
    );

    let profile;

    if (checkResult.rows.length > 0) {
      // 更新
      const updateResult = await pool.query(
        `UPDATE user_profiles 
         SET nickname = $1,
             real_name = $2,
             id_card = $3,
             phone = $4,
             email = $5,
             bio = $6,
             is_verified = $7,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $8
         RETURNING *`,
        [nickname || '', real_name || '', id_card || '', phone || '', email || '', bio || '', isVerified, user_id]
      );
      profile = updateResult.rows[0];
    } else {
      // 创建
      const insertResult = await pool.query(
        `INSERT INTO user_profiles (user_id, nickname, real_name, id_card, phone, email, bio, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [user_id, nickname || '', real_name || '', id_card || '', phone || '', email || '', bio || '', isVerified]
      );
      profile = insertResult.rows[0];
    }

    return NextResponse.json({ data: profile });
  } catch (error) {
    console.error('保存个人信息失败:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}

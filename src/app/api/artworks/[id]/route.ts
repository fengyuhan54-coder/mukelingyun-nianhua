import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// 创建数据库连接池
const pool = new Pool({
  connectionString: process.env.PGDATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/neondb',
});

// 更新作品
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { title, description, is_favorite } = body;
    const { id } = params;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (is_favorite !== undefined) {
      updates.push(`is_favorite = $${paramIndex++}`);
      values.push(is_favorite);
    }
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    if (updates.length === 1) {
      return NextResponse.json({ error: '没有要更新的字段' }, { status: 400 });
    }

    const query = `
      UPDATE artworks 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex - 1}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '作品不存在' }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    console.error('更新作品失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// 删除作品
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const result = await pool.query(
      'DELETE FROM artworks WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '作品不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除作品失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}

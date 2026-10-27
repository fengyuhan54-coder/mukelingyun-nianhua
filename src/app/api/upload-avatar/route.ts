import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const pool = new Pool({
  connectionString: process.env.PGDATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File;
    const userId = formData.get('user_id') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: '缺少头像文件或用户ID' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '仅支持 JPG、PNG、GIF、WebP 格式的图片' },
        { status: 400 }
      );
    }

    // 验证文件大小（限制5MB）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '图片大小不能超过5MB' },
        { status: 400 }
      );
    }

    // 创建上传目录
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 生成唯一文件名
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${userId}_${Date.now()}.${fileExtension}`;
    const filePath = join(uploadDir, fileName);

    // 保存文件
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // 更新数据库中的头像URL
    const avatarUrl = `/uploads/avatars/${fileName}`;
    await pool.query(
      'UPDATE user_profiles SET avatar_url = $1 WHERE user_id = $2',
      [avatarUrl, userId]
    );

    return NextResponse.json({
      success: true,
      avatar_url: avatarUrl,
    });
  } catch (error) {
    console.error('头像上传失败:', error);
    return NextResponse.json(
      { error: '头像上传失败' },
      { status: 500 }
    );
  }
}

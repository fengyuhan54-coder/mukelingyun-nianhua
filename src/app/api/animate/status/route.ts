import { NextRequest, NextResponse } from 'next/server';

const REGION_HOSTS = {
  'cn-beijing': 'cn-beijing',
  'ap-southeast-1': 'ap-southeast-1',
  'us-east-1': 'us-east-1',
  'eu-central-1': 'eu-central-1',
} as const;

type Region = keyof typeof REGION_HOSTS;

function taskEndpoint(workspaceId: string, region: Region, taskId: string) {
  return 'https://' + workspaceId + '.' + REGION_HOSTS[region] + '.maas.aliyuncs.com/api/v1/tasks/' + encodeURIComponent(taskId);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : '';
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId.trim() : '';
    const region = (typeof body.region === 'string' ? body.region : 'cn-beijing') as Region;

    if (!taskId || !apiKey || !workspaceId) {
      return NextResponse.json({ error: '缺少任务 ID、阿里云百炼 API Key 或业务空间 ID。' }, { status: 400 });
    }
    if (!/^[A-Za-z0-9-]{4,128}$/.test(workspaceId) || !(region in REGION_HOSTS)) {
      return NextResponse.json({ error: '百炼业务空间或地域配置不正确。' }, { status: 400 });
    }

    const response = await fetch(taskEndpoint(workspaceId, region, taskId), {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + apiKey },
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({
        error: data?.message || data?.code || '查询视频任务失败（HTTP ' + response.status + '）',
        code: data?.code,
        requestId: data?.request_id,
      }, { status: response.status });
    }

    const taskStatus = String(data?.output?.task_status || 'UNKNOWN').toUpperCase();
    const normalized = taskStatus === 'SUCCEEDED'
      ? 'succeed'
      : taskStatus === 'PENDING'
        ? 'pending'
        : taskStatus === 'RUNNING'
          ? 'processing'
          : 'failed';

    return NextResponse.json({
      success: true,
      taskId,
      status: normalized,
      providerStatus: taskStatus,
      videoUrl: data?.output?.video_url,
      message: data?.output?.message || data?.message,
      code: data?.output?.code || data?.code,
      requestId: data?.request_id,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '视频任务查询失败。' }, { status: 500 });
  }
}
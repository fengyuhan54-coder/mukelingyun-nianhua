'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CreativeTask } from '@/lib/creative-task-types';
import { creativeTaskProgress, getCreativeTask, setActiveCreativeTaskId } from '@/lib/creative-task-storage';
import { TASK_UPDATED_EVENT } from '@/lib/creative-task-types';
import styles from './TaskContextBar.module.css';

export default function TaskContextBar({ taskId: providedTaskId }: { taskId?: string }) {
  const router = useRouter();
  const [task, setTask] = useState<CreativeTask | null>(null);

  useEffect(() => {
    const searchId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('taskId') : null;
    const id = providedTaskId || searchId;
    if (!id) return;
    setActiveCreativeTaskId(id);
    const load = () => void getCreativeTask(id).then(value => setTask(value || null));
    load();
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ taskId?: string }>).detail;
      if (!detail?.taskId || detail.taskId === id) load();
    };
    window.addEventListener(TASK_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(TASK_UPDATED_EVENT, onUpdate);
  }, [providedTaskId]);

  if (!task) return null;
  const progress = creativeTaskProgress(task);
  return (
    <aside className={styles.bar} aria-label="当前创作任务">
      <div className={styles.identity}>
        <span>当前任务</span>
        <strong>{task.title}</strong>
        <small>{progress.done}/{progress.total} 步 · {task.status === 'completed' ? '已完成' : '进行中'}</small>
      </div>
      <div className={styles.progress}><i style={{ width: progress.percent + '%' }} /></div>
      <div className={styles.actions}>
        <button type="button" onClick={() => router.push('/?taskId=' + encodeURIComponent(task.id))}>返回主任务</button>
        <button type="button" onClick={() => router.push('/profile?taskId=' + encodeURIComponent(task.id))}>查看归档</button>
      </div>
    </aside>
  );
}

import type { SkillResultCard } from './workbench-skills';

export interface MemoryItem {
  id: string;
  category: '兴趣' | '创作偏好' | '长期计划';
  content: string;
  createdAt: number;
}

export interface TaskStep {
  id: string;
  label: string;
  done: boolean;
}

export interface WorkbenchTask {
  id: string;
  title: string;
  source: string;
  steps: TaskStep[];
  status: 'active' | 'completed';
  createdAt: number;
  updatedAt: number;
}

const MEMORY_KEY = '__muling_long_term_memory_v1__';
const TASK_KEY = '__muling_persistent_tasks_v1__';

function readArray<T>(key: string): T[] {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadMemories() {
  return readArray<MemoryItem>(MEMORY_KEY);
}

export function saveMemories(memories: MemoryItem[]) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(memories.slice(0, 30)));
}

export function loadWorkbenchTasks() {
  return readArray<WorkbenchTask>(TASK_KEY);
}

export function saveWorkbenchTasks(tasks: WorkbenchTask[]) {
  localStorage.setItem(TASK_KEY, JSON.stringify(tasks.slice(0, 12)));
}

function id(prefix: string) {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

export function inferMemories(message: string, result?: SkillResultCard): MemoryItem[] {
  const suggestions: Array<{ category: MemoryItem['category']; content: string }> = [];
  const interests = ['朱仙镇', '古建筑', '宋文化', '传统纹样', '木版年画', '开封文化', '雕版拓印'];
  const styles = ['杨柳青', '桃花坞', '杨家埠', '绵竹', '朱仙镇'];
  const colors = ['红色系', '朱红', '沉稳配色', '雅致配色', '明快配色'];

  interests.forEach((word) => {
    if (message.includes(word.replace('文化', '')) || message.includes(word)) {
      suggestions.push({ category: '兴趣', content: word });
    }
  });
  styles.forEach((word) => {
    if (message.includes(word)) suggestions.push({ category: '创作偏好', content: word + '风格' });
  });
  colors.forEach((word) => {
    if (message.includes(word)) suggestions.push({ category: '创作偏好', content: word });
  });
  if (/(旅行|行程|路线|伴游|去开封|文化探索)/.test(message)) {
    suggestions.push({ category: '长期计划', content: '开封文化探索' });
  }
  if (result?.type === 'annual-painting' && result.meta?.[0]?.value) {
    suggestions.push({ category: '创作偏好', content: result.meta[0].value + '风格' });
  }

  const unique = new Map<string, MemoryItem>();
  suggestions.forEach((item) => {
    const key = item.category + ':' + item.content;
    unique.set(key, { id: id('memory'), category: item.category, content: item.content, createdAt: Date.now() });
  });
  return [...unique.values()];
}

export function taskFromSkillResult(result: SkillResultCard): WorkbenchTask | null {
  if (!result.task) return null;
  return {
    id: id('task'),
    title: result.task.title,
    source: result.title,
    steps: result.task.steps.map((label, index) => ({ id: id('step-' + index), label, done: false })),
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
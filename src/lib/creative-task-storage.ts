import type { CreativeTask, CreativeTaskArtifact, CreativeTaskDraft, CreativeTaskMaterial, CreativeTaskStepStatus } from './creative-task-types';
import { TASK_UPDATED_EVENT } from './creative-task-types';

const DB_NAME = 'muling-unified-tasks';
const DB_VERSION = 1;
const TASKS = 'tasks';
const ASSETS = 'assets';
const ACTIVE_KEY = '__muling_active_creative_task_id__';

type AssetRecord = { id: string; data: string | Blob; createdAt: number };

function isOptionalStep(step: CreativeTask['steps'][number]) {
  // 兼容升级前已经保存在浏览器里的任务。
  return step.optional === true || /^按需/.test(step.label);
}

function normalizeCreativeTask(task: CreativeTask): CreativeTask {
  const hasSavedArtwork = task.artifacts.length > 0;
  const steps = task.steps.map(step => {
    const isSaveStep = step.skillId === 'profile' || /保存.*(?:版本|作品)/.test(step.label);
    return hasSavedArtwork && isSaveStep && step.status !== 'completed'
      ? { ...step, status: 'completed' as const, updatedAt: task.updatedAt }
      : step;
  });
  const requiredSteps = steps.filter(step => !isOptionalStep(step));
  const next = requiredSteps.find(step => step.status !== 'completed');
  const hasFailedStep = requiredSteps.some(step => step.status === 'failed');
  const completed = requiredSteps.length > 0 && requiredSteps.every(step => step.status === 'completed');
  return {
    ...task,
    steps,
    nextSkillId: next?.skillId,
    status: hasFailedStep ? 'failed' : completed ? 'completed' : task.status === 'draft' ? 'draft' : 'running',
    reminder: completed ? { ...task.reminder, enabled: false, snoozedUntil: undefined } : task.reminder,
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(TASKS)) request.result.createObjectStore(TASKS, { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains(ASSETS)) request.result.createObjectStore(ASSETS, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('无法打开统一任务存储'));
  });
}

async function transact<T>(store: string, mode: IDBTransactionMode, action: (objectStore: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = action(tx.objectStore(store));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onerror = tx.onabort = () => { db.close(); reject(new Error('统一任务保存失败')); };
  });
}

function emit(taskId: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(TASK_UPDATED_EVENT, { detail: { taskId } }));
}

export function setActiveCreativeTaskId(taskId: string | null) {
  if (typeof window === 'undefined') return;
  if (taskId) localStorage.setItem(ACTIVE_KEY, taskId);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function getActiveCreativeTaskId() {
  return typeof window === 'undefined' ? null : localStorage.getItem(ACTIVE_KEY);
}

export async function createCreativeTask(draft: CreativeTaskDraft, referenceIds: string[] = []) {
  const now = Date.now();
  const task: CreativeTask = {
    id: 'task-' + now + '-' + Math.random().toString(36).slice(2, 7),
    type: draft.type,
    title: draft.title,
    brief: draft.brief,
    eventDate: draft.eventDate,
    recipient: draft.recipient,
    purpose: draft.purpose,
    emotion: draft.emotion,
    referenceIds,
    cultureSelections: { patterns: [], colors: [], meanings: [] },
    artifacts: [],
    materials: [],
    steps: draft.steps.map((step, index) => ({ id: 'step-' + index, label: step.label, skillId: step.skillId, optional: step.optional, status: index === 0 ? 'completed' : 'pending', updatedAt: now })),
    status: 'running',
    nextSkillId: draft.nextSkillId,
    reminder: { enabled: Boolean(draft.eventDate) },
    createdAt: now,
    updatedAt: now,
  };
  await saveCreativeTask(task);
  setActiveCreativeTaskId(task.id);
  return task;
}

export async function saveCreativeTask(task: CreativeTask) {
  const saved = { ...task, updatedAt: Date.now() };
  await transact(TASKS, 'readwrite', store => store.put(saved));
  emit(saved.id);
  return saved;
}

export function getCreativeTask(id: string) {
  return transact<CreativeTask | undefined>(TASKS, 'readonly', store => store.get(id))
    .then(task => task ? normalizeCreativeTask(task) : undefined);
}

export async function listCreativeTasks() {
  const tasks = await transact<CreativeTask[]>(TASKS, 'readonly', store => store.getAll());
  return tasks.map(normalizeCreativeTask).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateCreativeTask(id: string, updater: (task: CreativeTask) => CreativeTask) {
  const current = await getCreativeTask(id);
  if (!current) return undefined;
  return saveCreativeTask(updater(current));
}

export async function updateCreativeTaskStep(id: string, skillId: string, status: CreativeTaskStepStatus) {
  return updateCreativeTask(id, task => {
    const targetIndex = task.steps.findIndex(step => step.skillId === skillId && step.status !== 'completed');
    const steps = task.steps.map((step, index) => index === targetIndex ? { ...step, status, updatedAt: Date.now() } : step);
    return normalizeCreativeTask({ ...task, steps, status: status === 'failed' ? 'failed' : 'running' });
  });
}

export async function addCreativeTaskArtifact(id: string, artifact: CreativeTaskArtifact) {
  return updateCreativeTask(id, task => normalizeCreativeTask({
    ...task,
    artifacts: [artifact, ...task.artifacts.filter(item => item.id !== artifact.id)],
  }));
}

export async function addCreativeTaskMaterial(id: string, material: CreativeTaskMaterial) {
  return updateCreativeTask(id, task => ({ ...task, materials: [material, ...task.materials.filter(item => item.id !== material.id)] }));
}

export async function removeCreativeTaskMaterial(id: string, materialId: string) {
  return updateCreativeTask(id, task => ({ ...task, materials: task.materials.filter(item => item.id !== materialId) }));
}

export async function mergeCreativeTaskCulture(id: string, patterns: string[], colors: string[], meanings: string[] = []) {
  const unique = (items: string[]) => [...new Set(items.filter(Boolean))];
  return updateCreativeTask(id, task => ({
    ...task,
    cultureSelections: {
      patterns: unique([...task.cultureSelections.patterns, ...patterns]),
      colors: unique([...task.cultureSelections.colors, ...colors]),
      meanings: unique([...task.cultureSelections.meanings, ...meanings]),
    },
  }));
}

export async function deleteCreativeTask(id: string) {
  await transact(TASKS, 'readwrite', store => store.delete(id));
  if (getActiveCreativeTaskId() === id) setActiveCreativeTaskId(null);
  emit(id);
}

export async function putCreativeTaskAsset(data: string | Blob) {
  const id = 'asset-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  await transact(ASSETS, 'readwrite', store => store.put({ id, data, createdAt: Date.now() }));
  return id;
}

export async function getCreativeTaskAsset(id: string) {
  const record = await transact<AssetRecord | undefined>(ASSETS, 'readonly', store => store.get(id));
  return record?.data;
}

export async function snoozeCreativeTask(id: string, milliseconds = 24 * 60 * 60 * 1000) {
  return updateCreativeTask(id, task => ({ ...task, reminder: { ...task.reminder, enabled: true, snoozedUntil: Date.now() + milliseconds } }));
}

export async function setCreativeTaskReminder(id: string, enabled: boolean) {
  return updateCreativeTask(id, task => ({ ...task, reminder: { ...task.reminder, enabled, snoozedUntil: undefined } }));
}

export function creativeTaskProgress(task: CreativeTask) {
  const requiredSteps = task.steps.filter(step => !isOptionalStep(step));
  const done = requiredSteps.filter(step => step.status === 'completed').length;
  return { done, total: requiredSteps.length, percent: requiredSteps.length ? Math.round(done / requiredSteps.length * 100) : 0 };
}

export function creativeTaskHref(task: CreativeTask) {
  const routes: Record<string, string> = {
    muling: '/muling',
    knowledge: '/pattern-library',
    heritage: '/intangible-heritage',
    animate: '/annual-painting-animate',
    'culture-tour': '/culture-tour',
    profile: '/profile',
    'annual-painting': '/annual-painting',
    architecture: '/architecture-workbench',
  };
  return (routes[task.nextSkillId || 'muling'] || '/muling') + '?taskId=' + encodeURIComponent(task.id);
}

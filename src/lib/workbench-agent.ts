export interface AgentDecision {
  mode: 'skill' | 'general' | 'culture-tour';
  skillId: string | null;
  intent: string;
  confidence: number;
  reason: string;
}

export interface AgentStep {
  id: string;
  label: string;
  detail: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

export async function routeWorkbenchRequest(message: string): Promise<AgentDecision> {
  const response = await fetch('/api/workbench/orchestrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const data = await response.json();
  if (!response.ok || !data.decision) {
    return { mode: 'general', skillId: null, intent: '通用对话', confidence: 0.5, reason: '本地路由不可用，使用通用对话' };
  }
  return data.decision;
}

export function createAgentSteps(): AgentStep[] {
  return [
    { id: 'understand', label: '理解需求', detail: '分析用户目标与当前上下文', status: 'running' },
    { id: 'route', label: '选择能力', detail: '判断是否需要专业 Skill', status: 'pending' },
    { id: 'execute', label: '执行任务', detail: '等待任务路由结果', status: 'pending' },
    { id: 'return', label: '整理结果', detail: '把执行结果返回对话', status: 'pending' },
  ];
}

export function updateAgentStep(
  steps: AgentStep[],
  id: string,
  status: AgentStep['status'],
  detail?: string,
) {
  return steps.map((step) => step.id === id ? { ...step, status, detail: detail || step.detail } : step);
}
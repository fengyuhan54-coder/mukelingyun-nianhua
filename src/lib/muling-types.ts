export type Review = { passed: boolean; summary: string; issues: string[]; tags: string[] };
export type PlanContext = {
  scene: string;
  audience: string;
  emotion: string;
  deliverable: string;
  culturalMeaning: string;
  recommendedSkills: string[];
};
export type Plan = { title: string; prompt: string; keywords: string[]; criteria: string[]; context?: PlanContext };
export type Material = { id: string; name: string; meaning: string; example?: string };
export type CreationScenario = 'life-photo' | 'design-study' | 'nianhua-demo';
export type Attempt = { number: number; image: string; prompt: string; review?: Review };
export type TaskStatus = 'running' | 'completed' | 'needs_revision' | 'failed' | 'cancelled';
export type TaskEvent = {
  stage: 'planning' | 'retrieval' | 'generation' | 'review' | 'done' | 'error';
  message: string;
  attempt?: number;
  plan?: Plan;
  materials?: Material[];
  artwork?: Attempt;
  review?: Review;
  status?: TaskStatus;
};
export type CreationInput = { brief: string; scenario: CreationScenario; reference?: string; history?: string; maxAttempts: number };
export type CreationTask = {
  id: string; parentId?: string; createdAt: string; brief: string; scenario: CreationScenario; history: string;
  reference?: string; status: TaskStatus; events: TaskEvent[]; attempts: Attempt[];
};

export function applyTaskEvent(task: CreationTask, event: TaskEvent): CreationTask {
  const attempts = [...task.attempts];
  if (event.artwork) attempts.push(event.artwork);
  if (event.review) {
    const index = attempts.findIndex(item => item.number === event.attempt);
    if (index >= 0) attempts[index] = { ...attempts[index], review: event.review };
  }
  // Image data lives in attempts only, keeping the event log small.
  const { artwork, ...log } = event;
  return { ...task, attempts, events: [...task.events, log], status: event.status || task.status };
}


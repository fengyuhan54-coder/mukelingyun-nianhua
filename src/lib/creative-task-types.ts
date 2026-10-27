export type CreativeTaskType = 'life-creation' | 'culture-tour';
export type CreativeTaskStatus = 'draft' | 'running' | 'needs_input' | 'needs_revision' | 'completed' | 'failed';
export type CreativeTaskStepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface CreativeTaskStep {
  id: string;
  label: string;
  skillId?: string;
  optional?: boolean;
  status: CreativeTaskStepStatus;
  updatedAt?: number;
}

export interface CreativeTaskArtifact {
  id: string;
  type: 'image' | 'video';
  title: string;
  sourceSkill: string;
  assetId?: string;
  externalId?: string;
  previewUrl?: string;
  version?: number;
  createdAt: number;
  meta?: Record<string, string | number | boolean>;
}

export interface CreativeTaskMaterial {
  id: string;
  title: string;
  source: string;
  elements: string[];
  culture: string;
  assetId?: string;
  createdAt: number;
}

export interface CreativeTaskReminder {
  enabled: boolean;
  snoozedUntil?: number;
  lastShownAt?: number;
}

export interface CreativeTask {
  id: string;
  type: CreativeTaskType;
  title: string;
  brief: string;
  eventDate?: string;
  recipient?: string;
  purpose?: string;
  emotion?: string;
  referenceIds: string[];
  cultureSelections: {
    patterns: string[];
    colors: string[];
    meanings: string[];
  };
  artifacts: CreativeTaskArtifact[];
  materials: CreativeTaskMaterial[];
  steps: CreativeTaskStep[];
  status: CreativeTaskStatus;
  nextSkillId?: string;
  reminder: CreativeTaskReminder;
  createdAt: number;
  updatedAt: number;
}

export interface CreativeTaskDraft {
  type: CreativeTaskType;
  title: string;
  brief: string;
  eventDate?: string;
  recipient?: string;
  purpose?: string;
  emotion?: string;
  nextSkillId: string;
  steps: Array<{ label: string; skillId?: string; optional?: boolean }>;
}

export const TASK_UPDATED_EVENT = 'muling:task-updated';

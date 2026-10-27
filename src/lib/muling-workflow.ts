import type { CreationInput, TaskEvent, Plan, Material, Review } from './muling-types';

export interface CreationTools {
  plan(input: CreationInput): Promise<Plan>;
  retrieve(keywords: string[]): Material[];
  generate(prompt: string, reference?: string): Promise<string>;
  review(image: string, input: CreationInput, plan: Plan): Promise<Review>;
}

export async function runCreation(input: CreationInput, tools: CreationTools,
  emit: (event: TaskEvent) => void, signal: AbortSignal) {
  const check = () => signal.throwIfAborted();
  check();
  emit({ stage: 'planning', message: '木灵正在理解用途、主体和需要保留的细节。' });
  const plan = await tools.plan(input);
  check();
  emit({ stage: 'planning', message: '创作方案已整理，接下来检索项目纹样库。', plan });
  const materials = tools.retrieve(plan.keywords);
  emit({ stage: 'retrieval', message: materials.length
    ? `找到 ${materials.length} 条纹样资料，作为创作参考。`
    : '未找到匹配纹样，将按原始需求创作，不额外添加无关纹样。', materials });
  const scenario = input.scenario === 'life-photo' ? '普通生活照片转国风：优先保留照片主体、颜色和可识别特征，不强制套用木版年画风格。'
    : input.scenario === 'design-study' ? '设计学习：作品用于课程作业或毕业设计，纹样与配色建议需要说明文化依据，并兼顾版式表达。'
    : '木版年画特色示范：突出传统流派、纹样、套色与民俗寓意。';
  const basePrompt = `${plan.prompt}\n场景定位：${scenario}\n用户原始要求（必须遵守）：${input.brief}\n历史要求：${input.history || '无'}\n验收要点：${plan.criteria.join('；')}\n参考资料（仅按需采用）：${materials.map(m => `${m.name}：${m.meaning}；${m.example || ''}`).join('\n')}\n如提供参考图，保留用户指定的主体与特征。本次需求与历史要求冲突时，以本次明确修改为准。`;
  let feedback = '';
  for (let number = 1; number <= input.maxAttempts; number++) {
    check();
    const prompt = basePrompt + feedback;
    emit({ stage: 'generation', attempt: number, message: `正在生成第 ${number} 版作品。` });
    const image = await tools.generate(prompt, input.reference);
    check();
    emit({ stage: 'generation', attempt: number, message: `第 ${number} 版已生成。`, artwork: { number, image, prompt } });
    emit({ stage: 'review', attempt: number, message: '正在检查主体、需求符合度和画面完整性。' });
    // Review errors propagate; an unavailable reviewer must never count as a pass.
    const review = await tools.review(image, input, plan);
    check();
    emit({ stage: 'review', attempt: number, message: review.summary, review });
    if (review.passed) {
      emit({ stage: 'done', status: 'completed', message: '作品已通过模型检查，你可以查看结果或继续提出修改。' });
      return;
    }
    feedback += `\n第 ${number} 版检查发现的问题，下一版必须修正：${review.issues.join('；')}。${review.summary}`;
  }
  emit({ stage: 'done', status: 'needs_revision', message: '已达到本次生成上限，作品仍有待改进之处。请查看检查意见，再决定是否继续。' });
}

export function parseModelJson(text: unknown): Record<string, unknown> {
  if (typeof text !== 'string') throw new Error('模型没有返回可读取的内容');
  const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let value: unknown;
  try {
    value = JSON.parse(clean);
  } catch {
    value = extractFirstJsonObject(clean);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('模型结果格式不正确');
  return value as Record<string, unknown>;
}

function extractFirstJsonObject(text: string): unknown {
  for (let start = text.indexOf('{'); start >= 0; start = text.indexOf('{', start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index++) {
      const char = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(start, index + 1));
          } catch {
            break;
          }
        }
      }
    }
  }
  throw new Error('规划模型返回格式异常，请重新创作');
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 20 && value.every(v => typeof v === 'string' && v.length <= 2000);
}
export function validatePlan(value: Record<string, unknown>): Plan {
  const context = value.context as Record<string, unknown> | undefined;
  const validContext = context === undefined || (
    typeof context === 'object' && context !== null &&
    ['scene', 'audience', 'emotion', 'deliverable', 'culturalMeaning'].every(key =>
      typeof context[key] === 'string' && (context[key] as string).length <= 500) &&
    strings(context.recommendedSkills)
  );
  if (typeof value.title !== 'string' || !value.title.trim() || value.title.length > 200 ||
      typeof value.prompt !== 'string' || !value.prompt.trim() || value.prompt.length > 10000 ||
      !strings(value.keywords) || !strings(value.criteria) || !value.criteria.length || !validContext) {
    throw new Error('规划结果不完整，请重新提交任务');
  }
  return value as Plan;
}
export function validateReview(value: Record<string, unknown>): Review {
  if (typeof value.passed !== 'boolean' || typeof value.summary !== 'string' || !value.summary.trim() ||
      !strings(value.issues) || !strings(value.tags) || (!value.passed && !value.issues.length) ||
      (value.passed && value.issues.length > 0)) throw new Error('检查结果格式不完整，不能判定作品通过');
  return value as Review;
}

export function validateInput(value: unknown): CreationInput {
  const v = value as Partial<CreationInput> | null;
  if (!v || typeof v.brief !== 'string' || !v.brief.trim() || v.brief.length > 2000 ||
      !['life-photo', 'design-study', 'nianhua-demo'].includes(String(v.scenario)) ||
      (v.maxAttempts !== 1 && v.maxAttempts !== 2) ||
      (v.history !== undefined && (typeof v.history !== 'string' || v.history.length > 12000)) ||
      (v.reference !== undefined && (typeof v.reference !== 'string' || v.reference.length > 8_000_000 ||
       !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(v.reference)))) {
    throw new Error('请填写 1–2000 字的创作需求，参考图仅支持不超过 5MB 的 JPG、PNG 或 WebP。');
  }
  return { brief: v.brief.trim(), scenario: v.scenario as CreationInput['scenario'], reference: v.reference, history: v.history, maxAttempts: v.maxAttempts };
}


import { Question } from '../types';

export const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;
export type OptionKey = (typeof OPTION_KEYS)[number];

export function normalizeOptionKey(raw: unknown): OptionKey {
  const str = String(raw ?? '').trim().toUpperCase();
  if (str === 'A' || str === '0' || str === 'MỘT') return 'A';
  if (str === 'B' || str === '1') return 'B';
  if (str === 'C' || str === '2') return 'C';
  if (str === 'D' || str === '3') return 'D';
  const match = str.match(/^([ABCD])\b/);
  if (match) return match[1] as OptionKey;
  return 'A';
}

/**
 * Rebuilds a question's options object in strict A -> B -> C -> D order
 * and normalizes correctAnswer to 'A' | 'B' | 'C' | 'D'.
 */
export function normalizeQuestion(q: Question): Question {
  if (!q) return q;
  const rawOpts = q.options as any;
  const ordered: Record<OptionKey, string> = {
    A: '',
    B: '',
    C: '',
    D: '',
  };

  if (Array.isArray(rawOpts)) {
    OPTION_KEYS.forEach((key, idx) => {
      if (rawOpts[idx] !== undefined && rawOpts[idx] !== null) {
        ordered[key] = String(rawOpts[idx]);
      }
    });
  } else if (rawOpts && typeof rawOpts === 'object') {
    const lookup: Partial<Record<OptionKey, string>> = {};
    for (const [k, v] of Object.entries(rawOpts)) {
      if (v === undefined || v === null) continue;
      const normK = k.trim().toUpperCase();
      if (normK === 'A' || normK === 'B' || normK === 'C' || normK === 'D') {
        lookup[normK] = String(v);
      }
    }
    for (const key of OPTION_KEYS) {
      if (lookup[key] !== undefined) {
        ordered[key] = lookup[key]!;
      }
    }
  }

  // Only keep keys that actually exist (e.g. True/False questions with only A & B)
  const finalOptions: any = {};
  for (const key of OPTION_KEYS) {
    if (Array.isArray(rawOpts)) {
      if (rawOpts[OPTION_KEYS.indexOf(key)] !== undefined && rawOpts[OPTION_KEYS.indexOf(key)] !== null) {
        finalOptions[key] = ordered[key];
      }
    } else if (rawOpts && typeof rawOpts === 'object') {
      const hasKey = Object.keys(rawOpts).some((k) => k.trim().toUpperCase() === key && rawOpts[k] !== undefined && rawOpts[k] !== null);
      if (hasKey) {
        finalOptions[key] = ordered[key];
      }
    }
  }

  return {
    ...q,
    options: Object.keys(finalOptions).length > 0 ? finalOptions : q.options,
    correctAnswer: normalizeOptionKey(q.correctAnswer),
  };
}

export function normalizeQuestions(questions: Question[] | undefined | null): Question[] {
  if (!Array.isArray(questions)) return [];
  return questions.map(normalizeQuestion);
}

export function getOrderedOptionEntries(options: Question['options'] | undefined | null): [OptionKey, string][] {
  if (!options) return [];
  const raw = options as any;
  if (Array.isArray(raw)) {
    return OPTION_KEYS
      .map((key, idx) => [key, raw[idx]] as [OptionKey, any])
      .filter(([, val]) => val !== undefined && val !== null)
      .map(([key, val]) => [key, String(val)]);
  }
  const lookup: Partial<Record<OptionKey, string>> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null) continue;
    const normK = k.trim().toUpperCase();
    if (normK === 'A' || normK === 'B' || normK === 'C' || normK === 'D') {
      lookup[normK] = String(v);
    }
  }
  return OPTION_KEYS
    .filter((key) => lookup[key] !== undefined)
    .map((key) => [key, lookup[key]!]);
}

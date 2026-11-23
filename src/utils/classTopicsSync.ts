import { ClassRoom } from '../types';

export const SOURCE_TOPICS_SCHOOL_YEAR = '2025-2026';
export const TARGET_INHERIT_SCHOOL_YEAR = '2026-2027';

export const hasAnyCustomTopics = (customTopics?: Record<string, string[]>): boolean => {
  if (!customTopics) return false;
  return Object.values(customTopics).some(
    (topics) => Array.isArray(topics) && topics.length > 0
  );
};

export const normalizeClassName = (name: string): string =>
  name.toLowerCase().replace(/\s+/g, ' ').trim();

export const extractGradeDigit = (text: string): string | null => {
  const match = text.match(/([1-9])/);
  return match ? match[1] : null;
};

export const isClassMatchingGrade = (className: string, grade: string): boolean => {
  const g = grade.toLowerCase().trim();
  const c = className.toLowerCase().trim();
  if (!g || !c) return false;
  if (c.includes(g) || g.includes(c)) return true;
  const gDigit = extractGradeDigit(g);
  const cDigit = extractGradeDigit(c);
  return Boolean(gDigit && cDigit && gDigit === cDigit);
};

export const mergeCustomTopicsMaps = (
  maps: Array<Record<string, string[]> | undefined>
): Record<string, string[]> => {
  const merged: Record<string, string[]> = {};
  for (const map of maps) {
    if (!map) continue;
    for (const [subj, topics] of Object.entries(map)) {
      if (!Array.isArray(topics) || topics.length === 0) continue;
      if (!merged[subj]) {
        merged[subj] = [];
      }
      for (const topic of topics) {
        if (topic && !merged[subj].includes(topic)) {
          merged[subj].push(topic);
        }
      }
    }
  }
  return merged;
};

/**
 * Finds customTopics from the source school year (2025-2026) that correspond
 * to a class in the target school year (2026-2027).
 * Priority:
 *  1) Exact class name match (case/whitespace insensitive)
 *  2) Same grade number match (e.g., Lớp 3A inherits from 2025-2026 grade-3 classes)
 */
export const getInheritedCustomTopicsForClass = (
  className: string,
  allClasses: ClassRoom[],
  sourceYear: string = SOURCE_TOPICS_SCHOOL_YEAR
): Record<string, string[]> => {
  const sourceClasses = allClasses.filter(
    (c) => (c.schoolYear || SOURCE_TOPICS_SCHOOL_YEAR) === sourceYear && hasAnyCustomTopics(c.customTopics)
  );
  if (sourceClasses.length === 0) return {};

  const normTarget = normalizeClassName(className);
  const exactMatches = sourceClasses.filter(
    (c) => normalizeClassName(c.name) === normTarget
  );
  if (exactMatches.length > 0) {
    return mergeCustomTopicsMaps(exactMatches.map((c) => c.customTopics));
  }

  const targetDigit = extractGradeDigit(className);
  if (!targetDigit) return {};

  const gradeMatches = sourceClasses.filter(
    (c) => extractGradeDigit(c.name) === targetDigit
  );
  if (gradeMatches.length > 0) {
    return mergeCustomTopicsMaps(gradeMatches.map((c) => c.customTopics));
  }

  return {};
};

/**
 * Computes effective custom topics per subject for a student in `activeSchoolYear`.
 * For 2026-2027, any grade that does not yet have explicitly configured customTopics
 * in 2026-2027 seamlessly inherits customTopics from 2025-2026.
 */
export const getEffectiveCustomTopicsForStudent = (
  allClasses: ClassRoom[],
  activeSchoolYear: string,
  allowedGradesList: string[],
  userClassId?: string
): Record<string, string[]> => {
  const classesInActiveYear = allClasses.filter(
    (c) => (c.schoolYear || SOURCE_TOPICS_SCHOOL_YEAR) === activeSchoolYear
  );

  const relevantActiveClasses = classesInActiveYear.filter(
    (cls) =>
      cls.id === userClassId ||
      allowedGradesList.some((grade) => isClassMatchingGrade(cls.name || '', grade))
  );

  const mapsToMerge: Array<Record<string, string[]> | undefined> = relevantActiveClasses.map(
    (cls) => cls.customTopics
  );

  if (activeSchoolYear === TARGET_INHERIT_SCHOOL_YEAR) {
    const classesIn2025 = allClasses.filter(
      (c) =>
        (c.schoolYear || SOURCE_TOPICS_SCHOOL_YEAR) === SOURCE_TOPICS_SCHOOL_YEAR &&
        hasAnyCustomTopics(c.customTopics)
    );

    // Check which grades already have explicitly configured customTopics in 2026-2027
    const configuredActiveClasses = relevantActiveClasses.filter(
      (cls) => cls.customTopics !== undefined
    );

    const gradesMissingInTarget = allowedGradesList.filter(
      (grade) => !configuredActiveClasses.some((cls) => isClassMatchingGrade(cls.name || '', grade))
    );

    // Also handle the student's direct class if it belongs to 2026-2027 with customTopics === undefined
    const directActiveClass = classesInActiveYear.find((c) => c.id === userClassId);
    if (directActiveClass && directActiveClass.customTopics === undefined) {
      const inheritedForDirect = getInheritedCustomTopicsForClass(
        directActiveClass.name || '',
        allClasses,
        SOURCE_TOPICS_SCHOOL_YEAR
      );
      if (hasAnyCustomTopics(inheritedForDirect)) {
        mapsToMerge.push(inheritedForDirect);
      }
    }

    if (gradesMissingInTarget.length > 0) {
      const fallback2025Classes = classesIn2025.filter((cls) =>
        gradesMissingInTarget.some((grade) => isClassMatchingGrade(cls.name || '', grade))
      );
      mapsToMerge.push(...fallback2025Classes.map((cls) => cls.customTopics));
    }
  }

  return mergeCustomTopicsMaps(mapsToMerge);
};

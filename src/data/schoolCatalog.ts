import phuThoSchoolsData from './phuThoSchools.json';

export type SchoolCatalogMap = Record<string, Record<string, string[]>>;

export const SCHOOL_CATALOG: SchoolCatalogMap = phuThoSchoolsData as SchoolCatalogMap;

export const DEFAULT_PROVINCE = 'Phú Thọ';

export const getProvinces = (): string[] => Object.keys(SCHOOL_CATALOG);

export const getCommunesByProvince = (province: string): string[] => {
  if (!province) return [];
  const matchKey = findMatchingKey(SCHOOL_CATALOG, province);
  if (!matchKey) return [];
  return Object.keys(SCHOOL_CATALOG[matchKey]);
};

export const getSchoolsByCommune = (province: string, commune: string): string[] => {
  if (!province || !commune) return [];
  const provKey = findMatchingKey(SCHOOL_CATALOG, province);
  if (!provKey) return [];
  const commKey = findMatchingKey(SCHOOL_CATALOG[provKey], commune);
  if (!commKey) return [];
  return SCHOOL_CATALOG[provKey][commKey];
};

export const normalizeViSearch = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
};

const findMatchingKey = <T,>(obj: Record<string, T>, target: string): string | undefined => {
  if (obj[target] !== undefined) return target;
  const normalizedTarget = normalizeViSearch(target);
  return Object.keys(obj).find((k) => normalizeViSearch(k) === normalizedTarget);
};

export const CATALOG_STATS = (() => {
  const provinces = getProvinces();
  let communesCount = 0;
  let schoolsCount = 0;
  for (const prov of provinces) {
    const communes = Object.keys(SCHOOL_CATALOG[prov]);
    communesCount += communes.length;
    for (const comm of communes) {
      schoolsCount += SCHOOL_CATALOG[prov][comm].length;
    }
  }
  return {
    provincesCount: provinces.length,
    communesCount,
    schoolsCount,
  };
})();

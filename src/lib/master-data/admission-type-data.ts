/**
 * 入院料マスタデータ（静的定義）
 *
 * 参照: docs/admission_type_master_data_v0.1.md
 * 参照: docs/business_rules_v0_7.md セクション 6-2, 6-3
 */

/* ===== 判定パターン ===== */

export interface JudgmentPattern {
  id: number;
  code: string;   // P1, P2, ...
  label: string;   // 画面表示用の条件説明
}

export const JUDGMENT_PATTERNS: JudgmentPattern[] = [
  { id: 1, code: 'P1', label: 'A≧3 または C≧1' },
  { id: 2, code: 'P2', label: '(A≧2 かつ B≧3) または A≧3 または C≧1' },
  { id: 3, code: 'P3', label: 'A≧1 または C≧1' },
  // P4〜P7 は将来の ICU/HCU/加算対応時に追加
];

/* ===== 入院料カテゴリ ===== */

export type AdmissionCategory = 'general' | 'community_care' | 'icu' | 'hcu' | 'rehabilitation';

export const ADMISSION_CATEGORY_LABELS: Record<AdmissionCategory, string> = {
  general: '一般病棟',
  community_care: '地域包括ケア病棟',
  icu: 'ICU',
  hcu: 'HCU',
  rehabilitation: 'リハビリ',
};

/* ===== 入院料マスタ ===== */

export interface AdmissionType {
  id: number;
  name: string;
  category: AdmissionCategory;
}

export const ADMISSION_TYPES: AdmissionType[] = [
  // 一般病棟入院基本料（急性期一般入院料1は難易度が高い為一旦除外）

  { id: 2, name: '急性期一般入院料2', category: 'general' },
  { id: 3, name: '急性期一般入院料3', category: 'general' },
  { id: 4, name: '急性期一般入院料4', category: 'general' },
  { id: 5, name: '急性期一般入院料5', category: 'general' },
  { id: 6, name: '急性期一般入院料6', category: 'general' },
  { id: 7, name: '地域一般入院料1', category: 'general' },
  // 地域包括ケア病棟入院料
  { id: 8, name: '地域包括ケア病棟入院料1', category: 'community_care' },
  { id: 9, name: '地域包括ケア病棟入院料2', category: 'community_care' },
  { id: 10, name: '地域包括ケア病棟入院料3', category: 'community_care' },
  { id: 11, name: '地域包括ケア病棟入院料4', category: 'community_care' },
];

/* ===== 入院料 × 判定基準 ===== */

export interface AdmissionTypeCriteria {
  id: number;
  admissionTypeId: number;
  judgmentPatternId: number;
  criteriaNo: string;         // "基準①", "基準②"
  thresholdRate: number | null; // 閾値（%）— 将来用
}

export const ADMISSION_TYPE_CRITERIA: AdmissionTypeCriteria[] = [

  // 急性期一般入院料2〜5: P2
  { id: 3, admissionTypeId: 2, judgmentPatternId: 2, criteriaNo: '基準①', thresholdRate: null },
  { id: 4, admissionTypeId: 3, judgmentPatternId: 2, criteriaNo: '基準①', thresholdRate: null },
  { id: 5, admissionTypeId: 4, judgmentPatternId: 2, criteriaNo: '基準①', thresholdRate: null },
  { id: 6, admissionTypeId: 5, judgmentPatternId: 2, criteriaNo: '基準①', thresholdRate: null },
  // 急性期一般入院料6: 判定基準なし
  // 地域一般入院料1: 判定基準なし
  // 地域包括ケア病棟入院料1〜4: P3
  { id: 7, admissionTypeId: 8, judgmentPatternId: 3, criteriaNo: '基準①', thresholdRate: null },
  { id: 8, admissionTypeId: 9, judgmentPatternId: 3, criteriaNo: '基準①', thresholdRate: null },
  { id: 9, admissionTypeId: 10, judgmentPatternId: 3, criteriaNo: '基準①', thresholdRate: null },
  { id: 10, admissionTypeId: 11, judgmentPatternId: 3, criteriaNo: '基準①', thresholdRate: null },
];

/* ===== ヘルパー関数 ===== */

/** 入院料IDから判定基準一覧を取得 */
export function getCriteriaByAdmissionType(admissionTypeId: number): AdmissionTypeCriteria[] {
  return ADMISSION_TYPE_CRITERIA.filter((c) => c.admissionTypeId === admissionTypeId);
}

/** 判定パターンIDからパターン情報を取得 */
export function getJudgmentPattern(patternId: number): JudgmentPattern | undefined {
  return JUDGMENT_PATTERNS.find((p) => p.id === patternId);
}

/** 入院料IDから入院料情報を取得 */
export function getAdmissionType(admissionTypeId: number): AdmissionType | undefined {
  return ADMISSION_TYPES.find((a) => a.id === admissionTypeId);
}

/** 入院料の判定パターンラベルを取得（表示用） */
export function getAdmissionTypePatternsLabel(admissionTypeId: number): string {
  const criteria = getCriteriaByAdmissionType(admissionTypeId);
  if (criteria.length === 0) return '判定基準なし';
  return criteria
    .map((c) => {
      const pattern = getJudgmentPattern(c.judgmentPatternId);
      return `${c.criteriaNo}: ${pattern?.code ?? '?'} (${pattern?.label ?? '?'})`;
    })
    .join(' / ');
}

/** カテゴリでグループ化した入院料一覧を取得 */
export function getAdmissionTypesByCategory(): { category: AdmissionCategory; label: string; types: AdmissionType[] }[] {
  const categories = [...new Set(ADMISSION_TYPES.map((a) => a.category))];
  return categories.map((cat) => ({
    category: cat,
    label: ADMISSION_CATEGORY_LABELS[cat],
    types: ADMISSION_TYPES.filter((a) => a.category === cat),
  }));
}

/**
 * H/EFファイルから病棟コードを抽出するユーティリティ
 *
 * Hファイル: TSV形式。ヘッダ部に病棟コードフィールドあり（2列目）
 * EFファイル: TSV形式（Shift-JIS）。EF-28（28列目）に病棟コードあり
 *
 * 参照: docs/business_rules_v0_7.md セクション3-2, 4-2
 */

/**
 * ファイルをShift-JISまたはUTF-8としてテキストに変換する
 * EFファイルはShift-JIS、HファイルもShift-JISの可能性がある
 */
async function readFileAsText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();

  // まずShift-JISとして読み、フォールバックでUTF-8
  try {
    const decoder = new TextDecoder('shift_jis');
    return decoder.decode(buffer);
  } catch {
    return new TextDecoder('utf-8').decode(buffer);
  }
}

/**
 * 病棟コードとして妥当かを検証する
 * - 半角英数字のみ（病院独自コード。10桁以下）
 * - 空文字や制御文字・マルチバイト文字を含まない
 */
function isValidWardCode(code: string): boolean {
  if (!code || code.length === 0 || code.length > 10) return false;
  // 半角英数字とハイフン・アンダースコアのみ許可
  return /^[A-Za-z0-9_-]+$/.test(code);
}

export interface ExtractResult {
  wardCodes: string[];
  minDate: string | null;
  maxDate: string | null;
  hPeriod: { minDate: string | null; maxDate: string | null };
  efPeriod: { minDate: string | null; maxDate: string | null };
}

function parseDateStr(d: string | undefined): string | null {
  if (!d || d.length !== 8) return null;
  const year = d.slice(0, 4);
  const month = d.slice(4, 6);
  const day = d.slice(6, 8);
  if (month === '00' || day === '00') return null;
  return `${year}-${month}-${day}`;
}

function updateMinMaxDates(
  currentMin: string | null,
  currentMax: string | null,
  newDate: string | null
): [string | null, string | null] {
  if (!newDate) return [currentMin, currentMax];
  let min = currentMin;
  let max = currentMax;
  if (!min || newDate < min) min = newDate;
  if (!max || newDate > max) max = newDate;
  return [min, max];
}

/**
 * Hファイルのヘッダ部から病棟コードと日付（実施年月日 index=5）を抽出する
 */
export function extractWardCodesFromHFile(text: string): { codes: Set<string>; minDate: string | null; maxDate: string | null } {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const codes = new Set<string>();
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const line of lines) {
    const fields = line.split('\t');
    if (fields.length >= 6) {
      const code = fields[1]?.trim();
      if (isValidWardCode(code)) {
        codes.add(code);
      }
      const evalDate = parseDateStr(fields[5]?.trim());
      [minDate, maxDate] = updateMinMaxDates(minDate, maxDate, evalDate);
    }
  }

  return { codes, minDate, maxDate };
}

/**
 * EFファイルから病棟コード（EF-28 index=27）と日付（EF-24 index=23）を抽出する
 */
export function extractWardCodesFromEFFile(text: string): { codes: Set<string>; minDate: string | null; maxDate: string | null } {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const codes = new Set<string>();
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const line of lines) {
    const fields = line.split('\t');
    if (fields.length >= 28) {
      const code = fields[27]?.trim();
      if (isValidWardCode(code)) {
        codes.add(code);
      }
    }
    if (fields.length >= 24) {
      const evalDate = parseDateStr(fields[23]?.trim());
      [minDate, maxDate] = updateMinMaxDates(minDate, maxDate, evalDate);
    }
  }

  return { codes, minDate, maxDate };
}

/**
 * HファイルとEFファイルの両方から病棟コードと日付を抽出する
 */
export async function extractWardCodes(
  hFile: File | null,
  efFile: File | null
): Promise<ExtractResult> {
  const allCodes = new Set<string>();
  let overallMinDate: string | null = null;
  let overallMaxDate: string | null = null;
  let hPeriod = { minDate: null as string | null, maxDate: null as string | null };
  let efPeriod = { minDate: null as string | null, maxDate: null as string | null };

  if (hFile) {
    const text = await readFileAsText(hFile);
    const { codes, minDate, maxDate } = extractWardCodesFromHFile(text);
    codes.forEach((c) => allCodes.add(c));
    [overallMinDate, overallMaxDate] = updateMinMaxDates(overallMinDate, overallMaxDate, minDate);
    [overallMinDate, overallMaxDate] = updateMinMaxDates(overallMinDate, overallMaxDate, maxDate);
    hPeriod = { minDate, maxDate };
  }

  if (efFile) {
    const text = await readFileAsText(efFile);
    const { codes, minDate, maxDate } = extractWardCodesFromEFFile(text);
    codes.forEach((c) => allCodes.add(c));
    [overallMinDate, overallMaxDate] = updateMinMaxDates(overallMinDate, overallMaxDate, minDate);
    [overallMinDate, overallMaxDate] = updateMinMaxDates(overallMinDate, overallMaxDate, maxDate);
    efPeriod = { minDate, maxDate };
  }

  return {
    wardCodes: Array.from(allCodes).sort(),
    minDate: overallMinDate,
    maxDate: overallMaxDate,
    hPeriod,
    efPeriod,
  };
}

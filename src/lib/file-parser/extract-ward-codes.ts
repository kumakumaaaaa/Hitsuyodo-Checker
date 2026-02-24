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

/**
 * Hファイルのヘッダ部から病棟コードを抽出する
 * Hファイルはタブ区切りで、病棟コードはヘッダ部の2列目（0始まりindex=1）
 */
export function extractWardCodesFromHFile(text: string): string[] {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const codes = new Set<string>();

  for (const line of lines) {
    const fields = line.split('\t');
    // Hファイル: 施設コード(0), 病棟コード(1), データ識別番号(2), ...
    if (fields.length >= 2) {
      const code = fields[1]?.trim();
      if (isValidWardCode(code)) {
        codes.add(code);
      }
    }
  }

  return Array.from(codes).sort();
}

/**
 * EFファイルから病棟コード（EF-28）を抽出する
 * EFファイルはタブ区切りで、EF-28は28列目（0始まりindex=27）
 */
export function extractWardCodesFromEFFile(text: string): string[] {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const codes = new Set<string>();

  for (const line of lines) {
    const fields = line.split('\t');
    // EF-28: 病棟コード（0始まりindex=27）
    if (fields.length >= 28) {
      const code = fields[27]?.trim();
      if (isValidWardCode(code)) {
        codes.add(code);
      }
    }
  }

  return Array.from(codes).sort();
}

/**
 * HファイルとEFファイルの両方から病棟コードを抽出して
 * ユニークな一覧として返す（和集合）
 */
export async function extractWardCodes(
  hFile: File | null,
  efFile: File | null
): Promise<string[]> {
  const allCodes = new Set<string>();

  if (hFile) {
    const text = await readFileAsText(hFile);
    const codes = extractWardCodesFromHFile(text);
    codes.forEach((c) => allCodes.add(c));
  }

  if (efFile) {
    const text = await readFileAsText(efFile);
    const codes = extractWardCodesFromEFFile(text);
    codes.forEach((c) => allCodes.add(c));
  }

  return Array.from(allCodes).sort();
}

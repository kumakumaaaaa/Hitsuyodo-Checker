import type { EvaluationMethod } from '@/components/records/SetupStep';

export interface EvaluationMethodValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * 選択された評価方式とHファイルの内容（ペイロードコード）が整合しているかを検証する。
 * @param hFile 解析対象のHファイル
 * @param method UIで選択された評価方式
 * @returns 検証結果とエラーメッセージ
 */
export async function validateEvaluationMethod(
  hFile: File,
  method: EvaluationMethod
): Promise<EvaluationMethodValidationResult> {
  // textの取得。ファイル全体をテキストとして読み込む
  const text = await hFile.text();

  // ASS0013 または ASS0062 が含まれているかを簡易的に文字列検索でチェック
  // （TSVのコードとして必ずこれらの文字列ブロックが存在するため、includesで十分判定可能）
  const hasLevel1Codes = text.includes('ASS0013') || text.includes('ASS0062');

  if (method === 'necessity_1') {
    // 看護必要度Ⅰを選択した場合：ASS0013 または ASS0062 が必須
    if (!hasLevel1Codes) {
      return {
        isValid: false,
        error: 'このファイルは看護必要度Ⅰのデータを含んでいません。',
      };
    }
  } else if (method === 'necessity_2') {
    // 看護必要度Ⅱを選択した場合：ASS0013 または ASS0062 は存在してはならない
    if (hasLevel1Codes) {
      return {
        isValid: false,
        error: 'このファイルは看護必要度Ⅰのデータとして作成されています。',
      };
    }
  }

  return { isValid: true };
}

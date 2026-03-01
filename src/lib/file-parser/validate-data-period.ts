/**
 * ファイルのデータ期間を読み取り、対象期間内に含まれているか検証するユーティリティ
 */

export interface DateRange {
  minDate: string;
  maxDate: string;
}

export interface ValidationResult {
  isValid: boolean;
  fileRange?: DateRange;
  error?: string;
}

/**
 * HファイルまたはEFファイルから実施年月日（yyyymmdd）を抽出し、最小日・最大日を判定する。
 * @param file 解析対象のファイル
 * @param type ファイルの種別（'H' または 'EF'）
 * @returns 最小日と最大日の文字列（YYYY-MM-DDフォーマット）
 */
export async function extractDateRangeFromFile(file: File, type: 'H' | 'EF'): Promise<DateRange | null> {
  const text = await file.text();
  const lines = text.split('\n');

  let minDate = '';
  let maxDate = '';

  for (const line of lines) {
    // 空行はスキップ
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const columns = trimmedLine.split('\t');

    let dateStr = '';
    if (type === 'H') {
      // Hファイルの場合、実施年月日はインデックス5（6カラム目）
      if (columns.length > 5) {
        dateStr = columns[5];
      }
    } else {
      // EFファイルの場合、実施年月日はインデックス23（EF-24）
      if (columns.length > 23) {
        dateStr = columns[23];
      }
    }

    // 日付文字列（8桁の数字 yyyymmdd）かチェック
    if (dateStr && /^\d{8}$/.test(dateStr)) {
      if (!minDate || dateStr < minDate) minDate = dateStr;
      if (!maxDate || dateStr > maxDate) maxDate = dateStr;
    }
  }

  if (!minDate || !maxDate) {
    return null;
  }

  // YYYYMMDD -> YYYY-MM-DD
  return {
    minDate: `${minDate.substring(0, 4)}-${minDate.substring(4, 6)}-${minDate.substring(6, 8)}`,
    maxDate: `${maxDate.substring(0, 4)}-${maxDate.substring(4, 6)}-${maxDate.substring(6, 8)}`,
  };
}

/**
 * ファイルのデータ期間が、指定した対象期間内に収まっているかを検証する。
 * @param fileRange ファイルから抽出した日付の範囲（YYYY-MM-DD形式）
 * @param periodFrom 対象期間の開始月（YYYY-MM形式）
 * @param periodTo 対象期間の終了月（YYYY-MM形式）
 * @param fileLabel エラーメッセージ用のファイル名ラベル
 * @returns 検証結果
 */
export function validateDateRangeAgainstPeriod(
  fileRange: DateRange | null,
  periodFrom: string,
  periodTo: string,
  fileLabel: string
): ValidationResult {
  if (!fileRange) {
    return {
      isValid: false,
      error: `${fileLabel}から有効な実施年月日データを読み取れませんでした。データフォーマットを確認してください。`,
    };
  }

  // 対象期間の開始日（YYYY-MM-01）
  const targetStartDate = `${periodFrom}-01`;

  // 対象期間の終了日（月末日）を算出
  const toYear = parseInt(periodTo.split('-')[0], 10);
  const toMonth = parseInt(periodTo.split('-')[1], 10);
  const lastDay = new Date(toYear, toMonth, 0).getDate();
  const targetEndDate = `${periodTo}-${lastDay.toString().padStart(2, '0')}`;

  // 比較
  if (fileRange.minDate < targetStartDate || fileRange.maxDate > targetEndDate) {
    return {
      isValid: false,
      fileRange,
      error: `${fileLabel}のデータ期間（${fileRange.minDate} 〜 ${fileRange.maxDate}）が、指定された対象期間（${targetStartDate} 〜 ${targetEndDate}）に含まれていません。対象期間を修正するか、ファイルを確認してください。`,
    };
  }

  return { isValid: true, fileRange };
}

/**
 * ファイルのヘッダー行を検証し、Hファイル・EFファイルとしての妥当性をチェックする
 */

/**
 * HファイルまたはEFファイルのヘッダー行を検証する
 * @param file 検証対象のファイル
 * @param type 期待されるファイル種別 ('H' | 'EF')
 * @returns 検証結果（valid: true の場合は正常、false の場合はエラーメッセージを返す）
 */
export async function validateFileHeader(file: File, type: 'H' | 'EF'): Promise<{ valid: boolean; error?: string }> {
  try {
    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder('shift_jis');
    const text = decoder.decode(buffer);
    
    // 最初の1行だけを取得（ファイル全体をパースしない）
    const firstLine = text.substring(0, text.indexOf('\n'));
    if (!firstLine) {
      return { valid: false, error: 'ファイルが空か、正しい形式ではありません' };
    }

    const columns = firstLine.split('\t');
    
    // 1列目が「施設コード」であることの確認（ダブルクォート考慮）
    const firstCol = columns[0]?.trim().replace(/^"|"$/g, '');
    if (firstCol !== '施設コード') {
      return { valid: false, error: `正しい${type}ファイルではありません。1列目が「施設コード」から始まる必要があります` };
    }

    // 列数の検証
    // - Hファイル: 「施設コード」で始まるヘッダ行があるが、列数は最低でも9列程度あるはず
    // - EFファイル: 31列あるはず
    if (type === 'H') {
      if (columns.length < 8) {
        return { valid: false, error: 'Hファイルの形式が正しくありません（列数が不足しています）' };
      }
      
      // Hファイル固有のヘッダ列名チェック（例: 2列目「病棟コード」、3列目「データ識別番号」）
      const col1 = columns[1]?.trim().replace(/^"|"$/g, '');
      const col2 = columns[2]?.trim().replace(/^"|"$/g, '');
      if (col1 !== '病棟コード' || col2 !== 'データ識別番号') {
         return { valid: false, error: 'Hファイルではありません（ヘッダの構成が異なります）' };
      }

    } else if (type === 'EF') {
      if (columns.length < 30) {
        return { valid: false, error: 'EFファイルの形式が正しくありません（列数が不足しています: 31列未満）' };
      }

      // EFファイル固有のヘッダ列名チェック（例: 2列目「データ識別番号」、3列目「退院年月日」）
      const col1 = columns[1]?.trim().replace(/^"|"$/g, '');
      const col2 = columns[2]?.trim().replace(/^"|"$/g, '');
      if (col1 !== 'データ識別番号' || col2 !== '退院年月日') {
         return { valid: false, error: 'EFファイルではありません（ヘッダの構成が異なります）' };
      }
    }

    return { valid: true };
  } catch (e) {
    console.error(`header validation error for ${type}:`, e);
    return { valid: false, error: 'ファイルの読み込みに失敗しました。ファイルが破損している可能性があります' };
  }
}

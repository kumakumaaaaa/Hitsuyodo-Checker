/**
 * HFile のパース処理
 * 詳細は docs/calculation_logic_v0.1.md セクション 5-1 を参照
 */

export const H_COL = {
  FACILITY_CODE: 0,
  WARD_CODE: 1,
  PATIENT_NO: 2,
  DISCHARGE_DATE: 3,
  ADMISSION_DATE: 4,
  EVAL_DATE: 5,
  PAYLOAD_TYPE: 6,
  PAYLOAD_VERSION: 7,
  PAYLOAD_SEQ: 8,
  PAYLOAD_START: 9,
} as const;

export type HRecordEntry = {
  columns: string[]; // 全列を文字列として保持（Hファイル特有の"0"開始文字列等を破壊しないため）
};

export async function parseHFile(file: File): Promise<HRecordEntry[]> {
  // Shift-JIS 読み込みの対応
  const buffer = await file.arrayBuffer();
  // ブラウザ環境で TextDecoder が利用可能と想定
  const decoder = new TextDecoder('shift_jis');
  const text = decoder.decode(buffer);
  
  const lines = text.split('\n');
  const records: HRecordEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd(); // 末尾の改行・空白のみ除去、タブは維持
    if (!line) continue;

    const columns = line.split('\t');

    // ヘッダ行の除外（施設コードという文字列で始まる行）
    // Shift-JISデコード漏れ対策として、ダブルクォートで囲まれている場合も考慮
    const firstCol = columns[0].replace(/^"|"$/g, '');
    if (firstCol === '施設コード') {
      continue;
    }

    // 壊れた行の除外（最低限の列数に満たない場合）
    if (columns.length < 8) {
      continue;
    }

    // patientNo (データ識別番号: index 2) が空欄の場合は除外
    if (!columns[H_COL.PATIENT_NO] || columns[H_COL.PATIENT_NO].trim() === '') {
      continue;
    }

    // payloadType (コード: index 6) が空欄の場合は除外
    if (!columns[H_COL.PAYLOAD_TYPE] || columns[H_COL.PAYLOAD_TYPE].trim() === '') {
      continue;
    }

    // 列の先頭・末尾のクォーテーションを除去するクリーニング処理を行う場合はここに追加可能
    const cleanColumns = columns.map(c => c.trim().replace(/^"|"$/g, ''));

    records.push({ columns: cleanColumns });
  }

  return records;
}

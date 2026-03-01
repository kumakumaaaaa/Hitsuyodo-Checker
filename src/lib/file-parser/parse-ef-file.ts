/**
 * EFFile のパース処理
 * 詳細は docs/calculation_logic_v0.1.md セクション 5-2 を参照
 */

export const EF_COL = {
  FACILITY_CODE: 0,
  DATA_ID: 1,
  DISCHARGE_DATE: 2,
  ADMISSION_DATE: 3,
  DATA_CATEGORY: 4,
  SEQ_NO: 5,
  DETAIL_NO: 6,
  HOSPITAL_CODE: 7,
  RECEIPT_CODE: 8,
  INTERPRETATION_NO: 9,
  NAME: 10,
  AMOUNT: 11,
  UNIT: 12,
  POINT_AMOUNT: 13,
  YEN_POINT_FLAG: 14,
  ACTUAL_POINT: 15,
  DETAIL_CATEGORY: 16,
  ACT_POINT: 17,
  ACT_DRUG_YEN: 18,
  ACT_MATERIAL_YEN: 19,
  ACT_COUNT: 20,
  INSURER_NO: 21,
  RECEIPT_TYPE: 22,
  EVAL_DATE: 23,
  RECEIPT_DEPT: 24,
  CLINICAL_DEPT: 25,
  DOCTOR_CODE: 26,
  WARD_CODE: 27,
  WARD_TYPE: 28,
  IN_OUT_FLAG: 29,
  FACILITY_TYPE: 30, // 31番目のフィールド（index 30）
} as const;

export type EfActEntry = {
  patientNo: string;      // EF-2  (index 1)
  dischargeDate: string;  // EF-3  (index 2)
  admissionDate: string;  // EF-4  (index 3)
  dataCategory: number;   // EF-5  (index 4) ※数値
  receiptCode: string;    // EF-9  (index 8)
  detailCategory: string; // EF-17 (index 16)
  evalDate: string;       // EF-24 (index 23)
  wardCode: string;       // EF-28 (index 27)
  wardType: number;       // EF-29 (index 28) ※数値
};

// 看護必要度判定に無関係なデータ区分（11, 13, 14, 24, 27, 97）
const EXCLUDED_DATA_CATEGORIES = new Set([11, 13, 14, 24, 27, 97]);

// Shift-JIS をデコードしてパースするための仕組みが必要だが、ここではブラウザの File API をそのまま使用。
// ※ 注: 実際の EF ファイルは Shift-JIS なので、`file.text()` は UTF-8 前提であり文字化けする可能性があるが、
// receiptCode や patientNo は半角英数なので判定には影響しない。
// 日本語名(NAME)などは今回抽出対象から外しているため実害は少ないが、必要に応じて TextDecoder('shift_jis') を使用する。

export async function parseEfFile(file: File): Promise<EfActEntry[]> {
  // Shift-JIS 読み込みの対応
  const buffer = await file.arrayBuffer();
  // ブラウザ環境で TextDecoder が利用可能と想定
  const decoder = new TextDecoder('shift_jis');
  const text = decoder.decode(buffer);
  
  const lines = text.split('\n');
  const records: EfActEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    if (!line) continue;

    const columns = line.split('\t');

    // 施設コードで始まるヘッダ行を除外
    if (columns[0] === '施設コード' || columns[0].replace(/^"|"$/g, '') === '施設コード') {
      continue;
    }

    // 壊れた行の除外（EF-31はデータ挿入不要で空になることがあるため、入外区分 index 29 まで存在すればOKとするケースもあるが、安全のため30列長を要求、もしくは 29 で妥協）
    // 仕様では全31列、ただし最後のフィールドは空でもタブ区切りは存在するはず
    if (columns.length < 30) {
      continue;
    }

    // Hファイルとの突合に必須のキーが欠損している場合は除外
    const patientNo = columns[EF_COL.DATA_ID]?.trim()?.replace(/^"|"$/g, '');
    const evalDate = columns[EF_COL.EVAL_DATE]?.trim()?.replace(/^"|"$/g, '');
    const receiptCode = columns[EF_COL.RECEIPT_CODE]?.trim()?.replace(/^"|"$/g, '');

    if (!patientNo || !evalDate || !receiptCode) {
      continue;
    }

    // 不要レコードの除外
    const inOutFlag = parseInt(columns[EF_COL.IN_OUT_FLAG], 10);
    if (inOutFlag === 1) { // 1=外来
      continue;
    }

    const dataCategory = parseInt(columns[EF_COL.DATA_CATEGORY], 10);
    if (EXCLUDED_DATA_CATEGORIES.has(dataCategory)) {
      continue; // 特定のデータ区分を除外
    }
    
    // wardType は後でフィルタするため残す (ICU/HCU対応用)
    const wardType = parseInt(columns[EF_COL.WARD_TYPE], 10) || 0;

    records.push({
      patientNo,
      dischargeDate: columns[EF_COL.DISCHARGE_DATE]?.trim()?.replace(/^"|"$/g, ''),
      admissionDate: columns[EF_COL.ADMISSION_DATE]?.trim()?.replace(/^"|"$/g, ''),
      dataCategory,
      receiptCode,
      detailCategory: columns[EF_COL.DETAIL_CATEGORY]?.trim()?.replace(/^"|"$/g, ''),
      evalDate,
      wardCode: columns[EF_COL.WARD_CODE]?.trim()?.replace(/^"|"$/g, ''),
      wardType,
    });
  }

  return records;
}

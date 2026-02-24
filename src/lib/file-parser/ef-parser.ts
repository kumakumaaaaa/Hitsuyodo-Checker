import { parseFileInChunks } from './chunk-parser';
import { rawDataRepository } from '../db/repositories/raw-data-repository';
import { EfMedicalAct } from '@/types';

/**
 * EFファイルをパースし、必要なレコードをDB(ef_medical_act)へバルクインサートする
 * 
 * EFファイル カラム要件 (0-indexed)
 * index 1 : EF-2 (データ識別番号 / patient_no)
 * index 4 : EF-5 (データ区分 / data_class)
 * index 8 : EF-9 (レセプト電算コード / receipt_code)
 * index 23: EF-24 (実施年月日 / eval_date)
 * index 27: EF-28 (病棟コード / ward_code)
 * index 28: EF-29 (病棟区分) ※ 0:一般 など
 * index 29: EF-30 (入外区分) ※ 0:入院
 */
export async function processEfFile(recordId: number, file: File, onProgress?: (rows: number) => void): Promise<number> {
  let totalRows = 0;
  
  await parseFileInChunks<string[]>(
    file,
    async (results) => {
      const acts: Omit<EfMedicalAct, 'id'>[] = [];
      const patients: Parameters<typeof rawDataRepository.bulkUpsertPatients>[0] = [];

      let rowCount = 0;
      for (const row of results.data) {
        rowCount++;
        if (totalRows === 0 && rowCount <= 2) {
          console.log(`[EF-File Debug] Row ${rowCount}:`, row);
        }

        // 最低限必要なカラム数がない行やヘッダー行をスキップ
        if (row.length < 30) continue;
        if (row[0] === '施設コード' || row[1] === 'データ識別番号') continue;

        const patientNo = row[1]?.trim();
        const dischargeDateStr = row[2]?.trim();
        const admissionDateStr = row[3]?.trim();
        const dataClass = row[4]?.trim();
        const receiptCode = row[8]?.trim();
        const evalDateStr = row[23]?.trim();
        const wardCode = row[27]?.trim();
        const wardType = row[28]?.trim(); // EF-29
        const inOutStatus = row[29]?.trim(); // EF-30

        // 入院患者(EF-30 = '0')以外は弾く方針にするか検討の余地ありだが、
        // メモリとDB軽量化のため、原則入院(inOutStatus === '0' || '1')(※仕様により揺れあり)
        // ここでは外来(入外区分='1')を弾く（通常0が入院）
        if (inOutStatus !== '0') continue;
        // 一般病棟や地域包括等の判定対象となる病棟区分('0'等)を絞るか？
        // ひとまず全入院データを対象にし、後段のマスタ突合で病棟設定と掛け合わせる

        // 必須項目チェック
        if (!patientNo || !receiptCode || !evalDateStr) continue;

        // 日付フォーマットの検証と変換
        const parseDateStr = (d: string | undefined): string | null => {
          if (!d || d.length !== 8) return null;
          const year = d.slice(0, 4);
          const month = d.slice(4, 6);
          const day = d.slice(6, 8);
          if (month === '00' || day === '00') return null;
          return `${year}-${month}-${day}`;
        };

        const evalDate = parseDateStr(evalDateStr);
        if (!evalDate) continue; // 必須項目

        const admissionDate = parseDateStr(admissionDateStr);
        const dischargeDate = parseDateStr(dischargeDateStr);

        patients.push({
          record_id: recordId,
          patient_no: patientNo,
          ward_code: wardCode || null,
          admission_date: admissionDate,
          discharge_date: dischargeDate,
        });

        acts.push({
          record_id: recordId,
          patient_no: patientNo,
          ward_code: wardCode || null,
          eval_date: evalDate,
          receipt_code: receiptCode,
          data_class: dataClass || null,
        });
      }

      if (acts.length > 0) {
        await rawDataRepository.bulkInsertEfMedicalActs(acts);
        await rawDataRepository.bulkUpsertPatients(patients);
        
        totalRows += acts.length;
        if (onProgress) onProgress(totalRows);
      }
    },
    {
      delimiter: '\t', // EFファイルはTSV
    }
  );

  return totalRows;
}

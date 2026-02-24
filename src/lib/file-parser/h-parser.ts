import { parseFileInChunks } from './chunk-parser';
import { rawDataRepository } from '../db/repositories/raw-data-repository';
import { HRecord } from '@/types';

/**
 * Hファイルをパースし、DB (h_record) へバルクインサートする
 * 
 * Hファイル カラム要件 (0-indexed)
 * index 1: 病棟コード
 * index 2: データ識別番号 (patient_no)
 * index 5: 実施年月日 (eval_date)
 * index 6: コード (ASS0021等 / payload_type)
 * index 9〜28: ペイロード1〜20 (配列として保存)
 */
export async function processHFile(recordId: number, file: File, onProgress?: (rows: number) => void): Promise<number> {
  let totalRows = 0;

  await parseFileInChunks<string[]>(
    file,
    async (results) => {
      const records: Omit<HRecord, 'id'>[] = [];
      const patients: Parameters<typeof rawDataRepository.bulkUpsertPatients>[0] = [];

      let rowCount = 0;
      for (const row of results.data) {
        rowCount++;
        if (totalRows === 0 && rowCount <= 2) {
          console.log(`[H-File Debug] Row ${rowCount}:`, row);
        }
        
        if (row.length < 10) continue; // 不正な行
        if (row[0] === '施設コード' || row[2] === 'データ識別番号') continue;

        const wardCode = row[1]?.trim();
        const patientNo = row[2]?.trim();
        const dischargeDateStr = row[3]?.trim();
        const admissionDateStr = row[4]?.trim();
        const evalDateStr = row[5]?.trim();
        const payloadType = row[6]?.trim();

        if (!patientNo || !payloadType) continue;

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
        const admissionDate = parseDateStr(admissionDateStr);
        const dischargeDate = parseDateStr(dischargeDateStr);

        patients.push({
          record_id: recordId,
          patient_no: patientNo,
          ward_code: wardCode || null,
          admission_date: admissionDate,
          discharge_date: dischargeDate,
        });

        // ペイロード（index 9～）を配列化
        const payloadData = row.slice(9).map((col) => col.trim());

        records.push({
          record_id: recordId,
          patient_no: patientNo,
          payload_type: payloadType,
          eval_date: evalDate,
          payload_data: payloadData,
        });
      }

      if (records.length > 0) {
        // PGliteでの並行クエリの競合やエラー判明のため、直列で実行する
        await rawDataRepository.bulkInsertHRecords(records);
        await rawDataRepository.bulkUpsertPatients(patients);
        
        totalRows += records.length;
        if (onProgress) onProgress(totalRows);
      }
    },
    {
      delimiter: '\t', // HファイルはTSV
    }
  );

  return totalRows;
}

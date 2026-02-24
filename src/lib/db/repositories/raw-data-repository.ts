import { getDB } from '../index';
import { HRecord, EfMedicalAct } from '@/types';

/**
 * HファイルおよびEFファイルのRAWデータをDBへバルクインサートするリポジトリ
 */

export const rawDataRepository = {
  /**
   * Hファイルのレコードを一括挿入する
   * @param records HRecordの配列
   */
  async bulkInsertHRecords(records: Omit<HRecord, 'id'>[]) {
    if (records.length === 0) return;

    const db = await getDB();
    const chunkSize = 1000;

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);

      const valuesPart = chunk
        .map((_, index) => {
          const offset = index * 5;
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
        })
        .join(', ');

      const params = chunk.flatMap((r) => [
        r.record_id,
        r.patient_no,
        r.payload_type,
        r.eval_date,
        JSON.stringify(r.payload_data),
      ]);

      await db.query(
        `
        INSERT INTO h_record (record_id, patient_no, payload_type, eval_date, payload_data)
        VALUES ${valuesPart}
        `,
        params
      );
    }
  },

  /**
   * EFファイルの診療行為を一括挿入する
   * @param records EfMedicalActの配列
   */
  async bulkInsertEfMedicalActs(records: Omit<EfMedicalAct, 'id'>[]) {
    if (records.length === 0) return;

    const db = await getDB();
    const chunkSize = 1000;

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);

      const valuesPart = chunk
        .map((_, index) => {
          const offset = index * 6;
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
        })
        .join(', ');

      const params = chunk.flatMap((r) => [
        r.record_id,
        r.patient_no,
        r.ward_code,
        r.eval_date,
        r.receipt_code,
        r.data_class,
      ]);

      await db.query(
        `
        INSERT INTO ef_medical_act (record_id, patient_no, ward_code, eval_date, receipt_code, data_class)
        VALUES ${valuesPart}
        `,
        params
      );
    }
  },

  /**
   * 患者マスタを一括保存（Upsert）する
   * patient_no と record_id をキーとして重複を防ぐ
   * @param patients Omit<Patient, 'id'>[]
   */
  async bulkUpsertPatients(
    patients: {
      record_id: number;
      patient_no: string;
      ward_code: string | null;
      admission_date: string | null;
      discharge_date: string | null;
    }[]
  ) {
    if (patients.length === 0) return;

    // patient_no で一意にしてバルクインサート
    const uniqueMap = new Map<string, typeof patients[0]>();
    for (const p of patients) {
      if (!uniqueMap.has(p.patient_no)) {
        uniqueMap.set(p.patient_no, p);
      } else {
        // 既存の要素に対し、より情報があれば上書き(例：日付情報がある方など)
        const exist = uniqueMap.get(p.patient_no)!;
        if (!exist.admission_date && p.admission_date) exist.admission_date = p.admission_date;
        if (!exist.discharge_date && p.discharge_date) exist.discharge_date = p.discharge_date;
        if (!exist.ward_code && p.ward_code) exist.ward_code = p.ward_code;
      }
    }

    const uniquePatients = Array.from(uniqueMap.values());
    const db = await getDB();
    const chunkSize = 1000;

    for (let i = 0; i < uniquePatients.length; i += chunkSize) {
      const chunk = uniquePatients.slice(i, i + chunkSize);

      const valuesPart = chunk
        .map((_, index) => {
          const offset = index * 5;
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
        })
        .join(', ');

      const params = chunk.flatMap((p) => [
        p.record_id,
        p.patient_no,
        p.ward_code,
        p.admission_date,
        p.discharge_date,
      ]);

      await db.query(
        `
        INSERT INTO patient (record_id, patient_no, ward_code, admission_date, discharge_date)
        VALUES ${valuesPart}
        ON CONFLICT (record_id, patient_no) DO UPDATE SET
          ward_code = COALESCE(EXCLUDED.ward_code, patient.ward_code),
          admission_date = COALESCE(EXCLUDED.admission_date, patient.admission_date),
          discharge_date = COALESCE(EXCLUDED.discharge_date, patient.discharge_date)
        `,
        params
      );
    }
  },
};

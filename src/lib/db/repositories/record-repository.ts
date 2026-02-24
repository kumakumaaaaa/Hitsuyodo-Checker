import { getDB } from '../index';
import type { Record as RecordType, RecordListItem, RecordDetail, WardSettingDetail, FulfillmentStatus } from '@/types';

/**
 * レコードリポジトリ
 * record テーブルの CRUD 操作を担当
 */
export const recordRepository = {
  /**
   * レコード一覧をホーム画面表示用の形式で取得
   */
  async findAll(): Promise<RecordListItem[]> {
    const db = await getDB();
    const result = await db.query<{
      id: number;
      title: string;
      period_from: string;
      period_to: string;
      created_at: string;
      ward_count: string;
      status: string;
    }>(`
      SELECT 
        r.id,
        r.title,
        r.period_from::text,
        r.period_to::text,
        r.created_at::text,
        r.status,
        COALESCE(ws.ward_count, 0) as ward_count
      FROM record r
      LEFT JOIN (
        SELECT record_id, COUNT(*) as ward_count
        FROM ward_setting
        GROUP BY record_id
      ) ws ON r.id = ws.record_id
      ORDER BY r.created_at DESC
    `);

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      period_from: row.period_from,
      period_to: row.period_to,
      ward_count: parseInt(String(row.ward_count), 10),
      created_at: row.created_at,
      fulfillment_status: deriveFulfillmentStatus(row.id),
    }));
  },

  /**
   * レコードをIDで取得
   */
  async findById(id: number): Promise<RecordType | null> {
    const db = await getDB();
    const result = await db.query<RecordType>(
      'SELECT *, period_from::text, period_to::text, created_at::text, updated_at::text FROM record WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  },

  /**
   * レコード + 病棟設定を一括取得（詳細画面用）
   */
  async findByIdWithWards(id: number): Promise<RecordDetail | null> {
    const db = await getDB();

    // レコード本体
    const recordResult = await db.query<{
      id: number;
      title: string;
      period_from: string;
      period_to: string;
      evaluation_method: string;
      h_file_name: string | null;
      ef_file_name: string | null;
      status: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, title, period_from::text, period_to::text, evaluation_method,
              h_file_name, ef_file_name, status, created_at::text, updated_at::text
       FROM record WHERE id = $1`,
      [id]
    );
    if (recordResult.rows.length === 0) return null;
    const record = recordResult.rows[0];

    // 病棟設定
    const wardResult = await db.query<{
      id: number;
      ward_code: string;
      ward_name: string;
      admission_type_id: number | null;
    }>(
      `SELECT id, ward_code, ward_name, admission_type_id
       FROM ward_setting WHERE record_id = $1 ORDER BY id`,
      [id]
    );

    // 入院料名はTS静的データから解決
    const { getAdmissionType } = await import('@/lib/master-data/admission-type-data');
    const wards: WardSettingDetail[] = wardResult.rows.map((w) => ({
      id: w.id,
      ward_code: w.ward_code,
      ward_name: w.ward_name,
      admission_type_id: w.admission_type_id,
      admission_type_name: w.admission_type_id ? (getAdmissionType(w.admission_type_id)?.name ?? null) : null,
    }));

    return {
      ...record,
      status: record.status as RecordDetail['status'],
      wards,
    };
  },

  /**
   * レコードを削除
   */
  async delete(id: number): Promise<void> {
    const db = await getDB();
    await db.query('DELETE FROM record WHERE id = $1', [id]);
  },

  /**
   * レコードのタイトルを更新
   */
  async updateTitle(id: number, title: string): Promise<void> {
    const db = await getDB();
    await db.query(
      'UPDATE record SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [title, id]
    );
  },

  /**
   * レコードを新規作成（record + ward_setting を一括INSERT）
   */
  async create(data: {
    title: string;
    periodFrom: string;
    periodTo: string;
    evaluationMethod: string;
    hFileName: string;
    efFileName: string;
    wards: { wardCode: string; wardName: string; admissionTypeId: number | null }[];
  }): Promise<number> {
    const db = await getDB();

    // レコード本体を挿入
    const result = await db.query<{ id: number }>(
      `INSERT INTO record (title, period_from, period_to, evaluation_method, h_file_name, ef_file_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft')
       RETURNING id`,
      [data.title, data.periodFrom, data.periodTo, data.evaluationMethod, data.hFileName, data.efFileName]
    );
    const recordId = result.rows[0].id;

    // 病棟設定を挿入
    for (const ward of data.wards) {
      await db.query(
        `INSERT INTO ward_setting (record_id, ward_code, ward_name, admission_type_id)
         VALUES ($1, $2, $3, $4)`,
        [recordId, ward.wardCode, ward.wardName, ward.admissionTypeId]
      );
    }

    return recordId;
  },
};

/**
 * 充足状況を仮決定する関数（プロトタイプ用）
 * 実際の判定ロジックはフェーズ2以降で実装
 */
function deriveFulfillmentStatus(recordId: number): FulfillmentStatus {
  // デモ用: IDに基づいて周期的にステータスを割り当て
  const statuses: FulfillmentStatus[] = ['fulfilled', 'warning', 'unfulfilled'];
  return statuses[recordId % statuses.length];
}

import { PGlite } from '@electric-sql/pglite';
import { schema } from './schema';

let db: PGlite | null = null;

/**
 * PGliteインスタンスの取得（シングルトン）
 * IndexedDB永続化を使用
 */
export async function getDB(): Promise<PGlite> {
  if (db) return db;

  db = new PGlite('idb://hitsuyodo-checker');
  await db.exec(schema);

  // 初回起動時など、マスタデータが空の場合は自動でシード（挿入）する
  const res = await db.query<{ count: string }>('SELECT count(*) FROM admission_type_master');
  if (parseInt(res.rows[0].count, 10) === 0) {
    const { ADMISSION_TYPES } = await import('../master-data/admission-type-data');
    for (const type of ADMISSION_TYPES) {
      await db.query(
        `INSERT INTO admission_type_master (id, code, name, nursing_need_type, evaluation_method)
         VALUES ($1, $2, $3, $4, $5)`,
        [type.id, type.id.toString(), type.name, 1, 'necessity_1'] // name以外に仮の値(NULL許容でないカラム)を埋める
      );
    }
  }

  return db;
}

/**
 * DB接続のリセット（テスト用）
 */
export async function resetDB(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

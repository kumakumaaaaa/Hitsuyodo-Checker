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

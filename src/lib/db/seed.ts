import { getDB } from './index';
import type { RecordListItem } from '@/types';

/**
 * シードデータの投入（デモ用）
 * すでにデータが存在する場合はスキップ
 */
export async function seedDatabase(): Promise<void> {
  const db = await getDB();

  // 既存レコードがあればスキップ
  const result = await db.query<{ count: string }>('SELECT COUNT(*) as count FROM record');
  if (parseInt(result.rows[0].count, 10) > 0) return;

  // デモ用レコードを3件挿入
  await db.exec(`
    INSERT INTO record (title, period_from, period_to, evaluation_method, h_file_name, ef_file_name, status) VALUES
      ('2025年10月分', '2025-08-01', '2025-10-31', 'necessity_2', 'H_202510.txt', 'EF_202510.txt', 'done'),
      ('2025年11月分', '2025-09-01', '2025-11-30', 'necessity_1', 'H_202511.txt', 'EF_202511.txt', 'done'),
      ('2025年12月分', '2025-10-01', '2025-12-31', 'necessity_2', 'H_202512.txt', 'EF_202512.txt', 'done');
  `);

  // record_id=1にダミー病棟設定 5件
  await db.exec(`
    INSERT INTO ward_setting (record_id, ward_code, ward_name, admission_type_id) VALUES
      (1, 'W001', '3階東病棟', 1),
      (1, 'W002', '3階西病棟', 1),
      (1, 'W003', '4階東病棟', 8),
      (1, 'W004', '4階西病棟', 1),
      (1, 'W005', '5階病棟', 8);
  `);

  // record_id=2にダミー病棟設定 3件
  await db.exec(`
    INSERT INTO ward_setting (record_id, ward_code, ward_name, admission_type_id) VALUES
      (2, 'W001', '3階東病棟', 1),
      (2, 'W002', '3階西病棟', 2),
      (2, 'W003', '4階東病棟', 8);
  `);

  // record_id=3にダミー病棟設定 2件
  await db.exec(`
    INSERT INTO ward_setting (record_id, ward_code, ward_name, admission_type_id) VALUES
      (3, 'W001', '3階東病棟', 1),
      (3, 'W002', '3階西病棟', 9);
  `);
}

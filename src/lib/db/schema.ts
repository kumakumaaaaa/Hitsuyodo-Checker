/**
 * ER図 v0.5 に基づくテーブル定義
 * CREATE IF NOT EXISTS で冪等に実行可能
 */
export const schema = `
  -- ==================
  -- マスタ系
  -- ==================

  CREATE TABLE IF NOT EXISTS admission_type_master (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    nursing_need_type INTEGER NOT NULL CHECK (nursing_need_type IN (1, 2)),
    threshold_rate DECIMAL(5, 2),
    evaluation_method TEXT,
    effective_from DATE,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS kasan_master (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    threshold_rate DECIMAL(5, 2),
    evaluation_method TEXT,
    effective_from DATE,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS kasan_exclusion_rule (
    id SERIAL PRIMARY KEY,
    kasan_id_a INTEGER REFERENCES kasan_master(id),
    kasan_id_b INTEGER REFERENCES kasan_master(id),
    note TEXT
  );

  -- ==================
  -- レコード系
  -- ==================

  CREATE TABLE IF NOT EXISTS record (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    period_from DATE,
    period_to DATE,
    evaluation_method TEXT NOT NULL DEFAULT 'necessity_2' CHECK (evaluation_method IN ('necessity_1', 'necessity_2')),
    h_file_name TEXT,
    ef_file_name TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'processing', 'done', 'error')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ward_setting (
    id SERIAL PRIMARY KEY,
    record_id INTEGER NOT NULL REFERENCES record(id) ON DELETE CASCADE,
    ward_code TEXT NOT NULL,
    ward_name TEXT NOT NULL,
    admission_type_id INTEGER
  );

  ALTER TABLE record ADD COLUMN IF NOT EXISTS h_period_from DATE;
  ALTER TABLE record ADD COLUMN IF NOT EXISTS h_period_to DATE;
  ALTER TABLE record ADD COLUMN IF NOT EXISTS ef_period_from DATE;
  ALTER TABLE record ADD COLUMN IF NOT EXISTS ef_period_to DATE;

  CREATE TABLE IF NOT EXISTS ward_kasan_setting (
    id SERIAL PRIMARY KEY,
    ward_setting_id INTEGER NOT NULL REFERENCES ward_setting(id) ON DELETE CASCADE,
    kasan_id INTEGER NOT NULL REFERENCES kasan_master(id)
  );

  -- ==================
  -- データ系
  -- (データ永続化は廃止されメモリで処理するため、対応するテーブルは削除)
  -- ==================

`;

/**
 * ER図 v0.3 に基づくテーブル定義
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
    h_file_name TEXT,
    ef_file_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ward_setting (
    id SERIAL PRIMARY KEY,
    record_id INTEGER NOT NULL REFERENCES record(id) ON DELETE CASCADE,
    ward_code TEXT NOT NULL,
    ward_name TEXT,
    admission_type_id INTEGER REFERENCES admission_type_master(id),
    nursing_need_type INTEGER CHECK (nursing_need_type IN (1, 2))
  );

  CREATE TABLE IF NOT EXISTS ward_kasan_setting (
    id SERIAL PRIMARY KEY,
    ward_setting_id INTEGER NOT NULL REFERENCES ward_setting(id) ON DELETE CASCADE,
    kasan_id INTEGER NOT NULL REFERENCES kasan_master(id)
  );

  -- ==================
  -- データ系
  -- ==================

  CREATE TABLE IF NOT EXISTS patient (
    id SERIAL PRIMARY KEY,
    record_id INTEGER NOT NULL REFERENCES record(id) ON DELETE CASCADE,
    patient_no TEXT NOT NULL,
    ward_code TEXT,
    admission_date DATE,
    discharge_date DATE
  );

  CREATE TABLE IF NOT EXISTS daily_nursing_evaluation (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
    eval_date DATE NOT NULL,
    a_score_total INTEGER DEFAULT 0,
    a_scores_detail JSONB,
    b_score_total INTEGER DEFAULT 0,
    b_scores_detail JSONB,
    c_score INTEGER DEFAULT 0,
    c_receipt_code TEXT,
    is_severe BOOLEAN DEFAULT FALSE
  );
`;

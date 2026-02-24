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
    target_evaluation_type JSONB,
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
    evaluation_method TEXT NOT NULL DEFAULT 'necessity_1' CHECK (evaluation_method IN ('necessity_1', 'necessity_2')),
    h_file_name TEXT,
    ef_file_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'processing', 'done', 'error')),
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
    discharge_date DATE,
    UNIQUE(record_id, patient_no)
  );

  -- Hファイルのペイロードデータ（B項目など）を格納する raw テーブル
  CREATE TABLE IF NOT EXISTS h_record (
    id SERIAL PRIMARY KEY,
    record_id INTEGER NOT NULL REFERENCES record(id) ON DELETE CASCADE,
    patient_no TEXT NOT NULL,
    payload_type TEXT NOT NULL, -- 例: 'ASS0021'
    eval_date DATE,             -- 評価日（ペイロードに連動）
    payload_data JSONB          -- ペイロードの生データ（B項目の配列など）
  );

  -- EFファイルの診療行為（レセプトコード）を格納する raw テーブル
  CREATE TABLE IF NOT EXISTS ef_medical_act (
    id SERIAL PRIMARY KEY,
    record_id INTEGER NOT NULL REFERENCES record(id) ON DELETE CASCADE,
    patient_no TEXT NOT NULL,
    ward_code TEXT,
    eval_date DATE NOT NULL,
    receipt_code TEXT NOT NULL, -- レセプト電算コード
    data_class TEXT             -- データ区分（31, 32...注射など、A3判定に利用）
  );

  CREATE TABLE IF NOT EXISTS daily_nursing_evaluation (
    id SERIAL PRIMARY KEY,
    record_id INTEGER NOT NULL REFERENCES record(id) ON DELETE CASCADE,
    ward_code TEXT NOT NULL,
    patient_no TEXT NOT NULL,
    eval_date DATE NOT NULL,
    evaluation_type TEXT NOT NULL,
    a_items JSONB,
    b_items JSONB,
    c_items JSONB,
    a_score INTEGER DEFAULT 0,
    b_score INTEGER DEFAULT 0,
    c_score INTEGER DEFAULT 0,
    is_met_criteria BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(record_id, ward_code, patient_no, eval_date)
  );

  -- ==================
  -- インデックス
  -- ==================
  CREATE INDEX IF NOT EXISTS idx_patient_record_id ON patient(record_id);
  CREATE INDEX IF NOT EXISTS idx_h_record_record_id ON h_record(record_id);
  CREATE INDEX IF NOT EXISTS idx_h_record_patient_no ON h_record(patient_no);
  CREATE INDEX IF NOT EXISTS idx_ef_medical_act_record_id ON ef_medical_act(record_id);
  CREATE INDEX IF NOT EXISTS idx_ef_medical_act_patient_no ON ef_medical_act(patient_no);
  CREATE INDEX IF NOT EXISTS idx_ef_medical_act_receipt_code ON ef_medical_act(receipt_code);

  -- ==================
  -- 既存IndexedDB環境向けのマイグレーション (v0.5対応)
  -- ==================
  ALTER TABLE record ADD COLUMN IF NOT EXISTS evaluation_method TEXT NOT NULL DEFAULT 'necessity_2' CHECK (evaluation_method IN ('necessity_1', 'necessity_2'));

  -- statusカラムの制約を一度削除して再作成 ('draft' を許可するため)
  ALTER TABLE record DROP CONSTRAINT IF EXISTS record_status_check;
  ALTER TABLE record ADD CONSTRAINT record_status_check CHECK (status IN ('draft', 'pending', 'processing', 'done', 'error'));

  -- ==================
  -- 既存IndexedDB環境向けのマイグレーション (v0.7対応: 評価票受け皿とマスターの拡張)
  -- ==================
  ALTER TABLE admission_type_master ADD COLUMN IF NOT EXISTS target_evaluation_type JSONB;
  
  ALTER TABLE patient ADD COLUMN IF NOT EXISTS ward_code TEXT;
  ALTER TABLE patient ADD COLUMN IF NOT EXISTS admission_date DATE;
  ALTER TABLE patient ADD COLUMN IF NOT EXISTS discharge_date DATE;
  ALTER TABLE ef_medical_act ADD COLUMN IF NOT EXISTS ward_code TEXT;

  -- 以前のバージョンの daily_nursing_evaluation テーブルがあれば拡張する
  ALTER TABLE daily_nursing_evaluation ADD COLUMN IF NOT EXISTS record_id INTEGER;
  ALTER TABLE daily_nursing_evaluation ADD COLUMN IF NOT EXISTS ward_code TEXT;
  ALTER TABLE daily_nursing_evaluation ADD COLUMN IF NOT EXISTS patient_no TEXT;
  ALTER TABLE daily_nursing_evaluation ADD COLUMN IF NOT EXISTS evaluation_type TEXT;
  ALTER TABLE daily_nursing_evaluation ADD COLUMN IF NOT EXISTS a_items JSONB;
  ALTER TABLE daily_nursing_evaluation ADD COLUMN IF NOT EXISTS b_items JSONB;
  ALTER TABLE daily_nursing_evaluation ADD COLUMN IF NOT EXISTS c_items JSONB;

  -- 古いスキーマ（v0.5以前）で使われていたが現在は不要となったカラムを削除する
  ALTER TABLE daily_nursing_evaluation DROP COLUMN IF EXISTS patient_id;

  -- ON CONFLICT エラーを防ぐため、既存のテーブルに対して UNIQUE 制約を再定義する
  ALTER TABLE patient DROP CONSTRAINT IF EXISTS patient_record_id_patient_no_key;
  ALTER TABLE patient ADD CONSTRAINT patient_record_id_patient_no_key UNIQUE (record_id, patient_no);

  ALTER TABLE daily_nursing_evaluation DROP CONSTRAINT IF EXISTS daily_nursing_evaluation_record_id_ward_code_patient_no_e_key;
  ALTER TABLE daily_nursing_evaluation ADD CONSTRAINT daily_nursing_evaluation_record_id_ward_code_patient_no_e_key UNIQUE (record_id, ward_code, patient_no, eval_date);
`;

# 看護必要度管理システム ER図

**Version:** 0.5  
**作成日:** 2026年2月  
**ステータス:** ドラフト（開発中）

---

## 更新履歴

| バージョン | 更新日 | 内容 |
|-----------|--------|------|
| 0.1 | 2026年2月 | 初版作成 |
| 0.2 | 2026年2月 | `c_item_code_master` を `ac_item_code_master` にリネーム。カラム構成をA・C項目コードマスタTSVの構成に合わせて更新 |
| 0.3 | 2026年2月 | `ac_item_code_master` を `general_ward_ac_item_code_master` にリネーム（一般病棟用マスタであることを明示） |
| 0.4 | 2026年2月 | 入院料マスタを3テーブル構成に再設計（`judgment_pattern_master` + `admission_type_master` + `admission_type_criteria`）。`record` に `evaluation_method` を追加。`ward_setting` から `nursing_need_type` を削除 |
| 0.5 | 2026年2月 | `ward_default_setting` テーブルを追加（localStorage永続化の論理モデル）。`ward_setting.ward_name` を必須に変更 |

---

## ER図

```mermaid
erDiagram

    %% ==============================
    %% Layer 1: マスタ系（判定ロジック）
    %% ==============================

    judgment_pattern_master {
        int id PK
        string code "判定パターンコード（P1〜P7）"
        string label "条件説明（例：A>=3 or C>=1）"
        timestamp created_at
        timestamp updated_at
    }

    admission_type_master {
        int id PK
        string name "入院料名称"
        string category "区分（general/icu/hcu/rehab）"
        jsonb target_evaluation_type "対象評価票種別（I/II）"
        timestamp created_at
        timestamp updated_at
    }

    admission_type_criteria {
        int id PK
        int admission_type_id FK
        int judgment_pattern_id FK
        string criteria_no "基準番号（基準①等）"
        decimal threshold_rate "閾値 %（NULLable）"
    }

    %% リレーション: 判定パターン ↔ 入院料
    admission_type_master ||--o{ admission_type_criteria : "has"
    judgment_pattern_master ||--o{ admission_type_criteria : "used by"

    %% ==============================
    %% Layer 1: マスタ系（デフォルト設定）
    %% ==============================

    ward_default_setting {
        string ward_code PK "病棟コード"
        string ward_name "デフォルト病棟名称"
        int admission_type_id FK "デフォルト入院料（NULLable）"
    }

    %% リレーション: デフォルト設定 → 入院料マスタ
    admission_type_master ||--o{ ward_default_setting : "default for"

    %% ==============================
    %% Layer 1: マスタ系（加算）
    %% ==============================

    kasan_master {
        int id PK
        string code "加算コード"
        string name "加算名称"
        int judgment_pattern_id FK
        decimal threshold_rate "閾値 %"
        date effective_from
        date effective_to
        timestamp created_at
        timestamp updated_at
    }

    kasan_exclusion_rule {
        int id PK
        int kasan_id_a FK
        int kasan_id_b FK
        string note "排他理由"
    }

    %% リレーション: 判定パターン → 加算
    judgment_pattern_master ||--o{ kasan_master : "used by"
    kasan_master ||--o{ kasan_exclusion_rule : "excl A"
    kasan_master ||--o{ kasan_exclusion_rule : "excl B"

    %% ==============================
    %% Layer 1: マスタ系（コードマスタ）
    %% ==============================

    general_ward_ac_item_code_master {
        int id PK
        string category "A or C"
        int item_no "項目番号"
        string sub_item "子項目（NULLable）"
        string item_name "項目名称"
        string receipt_code "レセプト電算コード 9桁"
        string procedure_name "診療行為名称"
        boolean level1_only "Iのみフラグ"
        date effective_from
        date effective_to
    }

    %% ==============================
    %% Layer 2: レコード系
    %% ==============================

    record {
        int id PK
        string title "タイトル"
        date period_from "対象期間 開始"
        date period_to "対象期間 終了"
        string evaluation_method "necessity_1 or necessity_2"
        string h_file_name "Hファイル名"
        string ef_file_name "EFファイル名"
        string status "pending/processing/done/error"
        timestamp created_at
        timestamp updated_at
    }

    ward_setting {
        int id PK
        int record_id FK
        string ward_code "病棟コード（自動抽出）"
        string ward_name "病棟名称（必須）"
        int admission_type_id FK "入院料（必須）"
    }

    ward_kasan_setting {
        int id PK
        int ward_setting_id FK
        int kasan_id FK
    }

    %% リレーション: レコード → 病棟設定
    record ||--o{ ward_setting : "has"
    ward_setting ||--o{ ward_kasan_setting : "has"

    %% リレーション: マスタ → 病棟設定
    admission_type_master ||--o{ ward_setting : "assigned to"
    kasan_master ||--o{ ward_kasan_setting : "applied to"

    %% ==============================
    %% Layer 3: データ系（取込データ）
    %% ==============================

    patient {
        int id PK
        int record_id FK
        string patient_no "患者番号"
        string ward_code "病棟コード"
        date admission_date "入院日"
        date discharge_date "退院日（NULLable）"
    }

    h_record {
        int id PK
        int record_id FK
        string patient_no "患者番号"
        string payload_type "ASS0021等"
        date eval_date "評価日"
        jsonb payload_data "生データ"
    }

    ef_medical_act {
        int id PK
        int record_id FK
        string patient_no "患者番号"
        string ward_code "病棟コード"
        date eval_date "評価日"
        string receipt_code "レセプト電算コード"
        string data_class "データ区分"
    }

    daily_nursing_evaluation {
        int id PK
        int record_id FK
        string ward_code "病棟コード"
        string patient_no "患者番号"
        date eval_date "評価日"
        string evaluation_type "評価票種別"
        jsonb a_items "A項目生データ"
        jsonb b_items "B項目生データ"
        jsonb c_items "C項目生データ"
        int a_score "A項目合計"
        int b_score "B項目合計"
        int c_score "C項目（0 or 1）"
        boolean is_met_criteria "基準クリアフラグ"
        timestamp created_at
        timestamp updated_at
    }

    %% リレーション: レコード → 患者 → 取込データ → 日次評価
    record ||--o{ patient : "has"
    record ||--o{ h_record : "has"
    record ||--o{ ef_medical_act : "has"
    record ||--o{ daily_nursing_evaluation : "has"

    %% ==============================
    %% Layer 4: ユーザー系（将来用）
    %% ==============================

    users {
        int id PK
        string email
        string display_name
        string password_hash
        timestamp created_at
    }
```

---

## テーブル定義補足

### マスタ系

| テーブル名 | 用途 | 備考 |
|-----------|------|------|
| judgment_pattern_master | 重症該当患者の判定ロジックパターン（P1〜P7）を管理 | `code` で計算エンジンが参照、`label` で画面表示 |
| admission_type_master | 入院基本料の種別管理 | `category` で一般/ICU/HCU等を区別 |
| admission_type_criteria | 入院料と判定パターンの中間テーブル | 1つの入院料に複数基準（例：急性期一般1はP1+P2）が紐付く |
| kasan_master | 加算の種別・閾値管理 | 判定パターンを直接参照。`effective_from`/`effective_to` で期間管理 |
| kasan_exclusion_rule | 加算の排他ルール管理 | A↔Bの組み合わせで双方向に定義（順序不問） |
| general_ward_ac_item_code_master | レセプト電算コード↔A・C項目分類の対応 | A項目・C項目の自動判定に使用 |

### レコード系

| テーブル名 | 用途 | 備考 |
|-----------|------|------|
| record | HF・EFファイル1セット＋設定のまとまり | `evaluation_method` でレコード全体の看護必要度区分（Ⅰ/Ⅱ）を管理 |
| ward_setting | レコードごとの病棟コード↔入院料の紐付け | 病棟コードはファイルから自動抽出。名称は任意入力 |
| ward_kasan_setting | 病棟設定と加算の中間テーブル | 1病棟に複数加算が適用される一対多を解消 |

### データ系

| テーブル名 | 用途 | 備考 |
|-----------|------|------|
| patient | Hファイルから取り込んだ患者基本情報 | `record` に紐付く。日付は `YYYY-MM-DD` |
| h_record | Hファイルから取り込んだ明細行データ | ペイロード(B項目等)を JSONB 配列として保持 |
| ef_medical_act | EFファイルから取り込んだ診療行為データ | C項目やA項目の一部判定（注射等）の元データ |
| daily_nursing_evaluation | H/EFデータ統合後の日次評価データ（受け皿） | A/B/C項目の生データを JSONB で、合計・結果を `int`/`boolean` で保持 |

### ユーザー系

| テーブル名 | 用途 | 備考 |
|-----------|------|------|
| users | ログインアカウント管理 | **初版スコープ外**。将来のサービス化時に有効化 |

---

## 設計上の重要な考慮点

**看護必要度区分（Ⅰ/Ⅱ）の配置:** `evaluation_method` は `record` テーブルに配置する。看護必要度区分はレコード作成時に1回選択するものであり、病棟ごとに変わるものではない。

**入院料マスタの判定パターン:** `admission_type_criteria` を中間テーブルとして、1つの入院料に複数の判定基準を紐付けられる。例えば急性期一般入院料1は P1（基準①）と P2（基準②）の両方を満たす必要がある。

**A・B項目スコアの保存方針:** 合計スコア（`a_score_total`）と個別スコア（`a_scores_detail` JSONB）の両方を保持する。合計は集計クエリの高速化のため、個別は項目別ドリルダウンのために必要。

**C項目の保存方針:** 判定結果（0 or 1）のみ保存。判定根拠のレセプト電算コードは `c_receipt_code` として合わせて保存する。

**診療報酬改定への対応:** `kasan_master` には `effective_from` / `effective_to` を設けており、改定前後のデータが混在する期間も正しく閾値を参照できる。

**病棟設定の引き継ぎ:** `ward_setting` テーブルをレコード間で参照し、新規レコード作成時に直前レコードの設定をデフォルト提案する。

---

## 未決事項

| # | 事項 | ステータス |
|---|------|-----------|
| 1 | A・B項目の個別スコアフィールド名（EFファイルのフィールド仕様確認後に確定） | 要確認 |
| 2 | `daily_nursing_evaluation` の `is_severe` フラグの判定基準（入院料ごとに異なる可能性） | 要設計 |
| 3 | PGliteにおけるJSONB型の取り扱い確認 | 要検証 |
| 4 | 判定パターン P1〜P7 の条件式を構造化データとして保持するか（将来の自動判定エンジン用） | 要設計 |

---

*以上*

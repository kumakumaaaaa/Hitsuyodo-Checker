# 看護必要度管理システム ER図

**Version:** 0.3  
**作成日:** 2026年2月  
**ステータス:** ドラフト（開発着手前）

---

## 更新履歴

| バージョン | 更新日 | 内容 |
|-----------|--------|------|
| 0.1 | 2026年2月 | 初版作成 |
| 0.2 | 2026年2月 | `c_item_code_master` を `ac_item_code_master` にリネーム。カラム構成をA・C項目コードマスタTSVの構成に合わせて更新 |
| 0.3 | 2026年2月 | `ac_item_code_master` を `general_ward_ac_item_code_master` にリネーム（一般病棟用マスタであることを明示） |

---

## ER図

```mermaid
erDiagram

    %% ==================
    %% マスタ系
    %% ==================

    admission_type_master {
        int id PK
        string code "入院料コード（例：A100）"
        string name "入院料名称"
        int nursing_need_type "看護必要度区分（1 or 2）"
        decimal threshold_rate "重症該当患者割合の閾値（%）"
        string evaluation_method "評価方式（方式1 / 方式2）"
        date effective_from "適用開始日（診療報酬改定対応）"
        date effective_to "適用終了日（NULL=現行）"
        timestamp created_at
        timestamp updated_at
    }

    kasan_master {
        int id PK
        string code "加算コード"
        string name "加算名称"
        decimal threshold_rate "看護必要度割合の閾値（%）"
        string evaluation_method "評価方式"
        date effective_from
        date effective_to
        timestamp created_at
        timestamp updated_at
    }

    kasan_exclusion_rule {
        int id PK
        int kasan_id_a FK "加算Aのid"
        int kasan_id_b FK "加算Bのid"
        string note "排他理由メモ"
    }

    general_ward_ac_item_code_master {
        int id PK
        string category "A or C"
        int item_no "項目番号（例：A1, C15）"
        string sub_item "子項目識別（A6の①〜⑪等。なければNULL）"
        string item_name "項目名称"
        string receipt_code "レセプト電算コード（9桁）"
        string procedure_name "診療行為名称"
        boolean level1_only "必要度Ⅰのみ適用フラグ"
        date effective_from "適用開始日"
        date effective_to "適用終了日（NULL=現行）"
    }

    %% ==================
    %% レコード系
    %% ==================

    record {
        int id PK
        string title "タイトル（自動生成・編集可）"
        date period_from "対象期間 開始年月"
        date period_to "対象期間 終了年月"
        string h_file_name "アップロードHファイル名"
        string ef_file_name "アップロードEFファイル名"
        string status "処理状態（pending / processing / done / error）"
        timestamp created_at
        timestamp updated_at
    }

    ward_setting {
        int id PK
        int record_id FK
        string ward_code "病棟コード（Hファイルから抽出）"
        string ward_name "病棟名称（ユーザー設定）"
        int admission_type_id FK "紐付ける入院料"
        int nursing_need_type "看護必要度区分（1 or 2）"
    }

    ward_kasan_setting {
        int id PK
        int ward_setting_id FK
        int kasan_id FK "適用する加算"
    }

    %% ==================
    %% データ系（HF・EFから取り込み）
    %% ==================

    patient {
        int id PK
        int record_id FK
        string patient_no "患者番号"
        string ward_code "在籍病棟コード"
        date admission_date "入院日"
        date discharge_date "退院日（NULL=在院中）"
    }

    daily_nursing_evaluation {
        int id PK
        int patient_id FK
        date eval_date "評価日"
        int a_score_total "A項目合計スコア"
        jsonb a_scores_detail "A項目個別スコア（例：{a1:2, a2:1, ...}）"
        int b_score_total "B項目合計スコア"
        jsonb b_scores_detail "B項目個別スコア"
        int c_score "C項目スコア（0 or 1）"
        string c_receipt_code "該当レセプト電算コード（NULLの場合は非該当）"
        boolean is_severe "重症該当フラグ（入院料基準による）"
    }

    %% ==================
    %% ユーザー系（将来用・初版スコープ外）
    %% ==================

    users {
        int id PK
        string email
        string display_name
        string password_hash
        timestamp created_at
    }

    %% ==================
    %% リレーション
    %% ==================

    admission_type_master ||--o{ ward_setting : "1つの入院料は複数の病棟設定に紐付く"
    kasan_master ||--o{ ward_kasan_setting : "1つの加算は複数の病棟に適用される"
    kasan_master ||--o{ kasan_exclusion_rule : "排他ルールの対象加算A"
    kasan_master ||--o{ kasan_exclusion_rule : "排他ルールの対象加算B"
    general_ward_ac_item_code_master ||--o{ daily_nursing_evaluation : "A・C項目コードが評価レコードに紐付く"

    record ||--o{ ward_setting : "1レコードは複数病棟設定を持つ"
    record ||--o{ patient : "1レコードは複数患者を持つ"
    ward_setting ||--o{ ward_kasan_setting : "1病棟設定は複数加算を持つ"

    patient ||--o{ daily_nursing_evaluation : "1患者は複数日の評価を持つ"
```

---

## テーブル定義補足

### マスタ系

| テーブル名 | 用途 | 備考 |
|-----------|------|------|
| admission_type_master | 入院基本料の種別・閾値管理 | 診療報酬改定に対応するため `effective_from` / `effective_to` で期間管理 |
| kasan_master | 加算の種別・閾値管理 | 同上 |
| kasan_exclusion_rule | 加算の排他ルール管理 | A↔Bの組み合わせで双方向に定義（順序不問） |
| general_ward_ac_item_code_master | レセプト電算コード↔A・C項目分類の対応 | A項目・C項目の自動判定に使用。level1_onlyフラグで必要度Ⅰのみ適用コードを管理 |

### レコード系

| テーブル名 | 用途 | 備考 |
|-----------|------|------|
| record | HF・EFファイル1セット＋設定のまとまり | ホーム画面の1行に対応 |
| ward_setting | レコードごとの病棟コード↔入院料の紐付け | 前回レコードの設定を引き継いでデフォルト提案する元データ |
| ward_kasan_setting | 病棟設定と加算の中間テーブル | 1病棟に複数加算が適用される一対多を解消 |

### データ系

| テーブル名 | 用途 | 備考 |
|-----------|------|------|
| patient | Hファイルから取り込んだ患者基本情報 | recordに紐付く |
| daily_nursing_evaluation | EFファイルから取り込んだ日次評価データ | A・B項目は合計スコアと個別スコア（JSONB）を両方保持。C項目は判定結果（0 or 1）のみ保存 |

### ユーザー系

| テーブル名 | 用途 | 備考 |
|-----------|------|------|
| users | ログインアカウント管理 | **初版スコープ外**。将来のサービス化時に有効化 |

---

## 設計上の重要な考慮点

**A・B項目スコアの保存方針**として、合計スコア（`a_score_total`）と個別スコア（`a_scores_detail` JSONB）の両方を保持する。合計は集計クエリの高速化のため、個別は Tab 3（看護必要度詳細）やTab 4（分析）での項目別ドリルダウンのために必要。

**C項目の保存方針**として、判定結果（0 or 1）のみ `daily_nursing_evaluation` に保存する。判定の根拠となるレセプト電算コードは `c_receipt_code` として合わせて保存し、`general_ward_ac_item_code_master` との照合で分類を確認できる。

**診療報酬改定への対応**として、`admission_type_master` と `kasan_master` には `effective_from` / `effective_to` を設けており、改定前後のデータが混在する期間も正しく閾値を参照できる。

**病棟設定の引き継ぎ**は `ward_setting` テーブルをレコード間で参照することで実現する。新規レコード作成時に直前レコードの `ward_setting` を読み取り、デフォルト値として画面に表示する。

---

## 未決事項

| # | 事項 | ステータス |
|---|------|-----------|
| 1 | A・B項目の個別スコアフィールド名（EFファイルのフィールド仕様確認後に確定） | 要確認 |
| 2 | `daily_nursing_evaluation` の `is_severe` フラグの判定基準（入院料ごとに異なる可能性） | 要設計 |
| 3 | PGliteにおけるJSONB型の取り扱い確認 | 要検証 |

---

*以上*

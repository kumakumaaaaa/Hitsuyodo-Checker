# 看護必要度スコア算出ロジック設計書

**Version:** 0.1  
**作成日:** 2026年3月  
**ステータス:** 設計中  
**スコープ:** 一般病棟 × 看護必要度Ⅱ（GENERAL_II）

---

## 更新履歴

| バージョン | 更新日 | 内容 |
|-----------|--------|------|
| 0.1 | 2026年3月 | 初版作成。パイプライン全体構造・評価マップの生成方針・データソース対応を確定 |
| 0.2 | 2026年3月 | Step 1 の HRecordEntry 型定義・列マッピング・パースルールを確定（実データ突合済み） |
| 0.3 | 2026年3月 | Step 1 の EfActEntry 型定義・列マッピング・パースルールを確定（DPC仕様書＋実データ突合済み） |
| 0.4 | 2026年3月 | GenIIDailyScore 型定義を確定。A6サブ項目①〜⑪全てEFから（Ⅱ）。A3有効期間7日・A7有効期間2日を明記。判定パターンP1〜P3のフラグを追加 |
| 0.5 | 2026年3月 | Step 3 applyHFileScores のロジックを確定。B項目（ASS0021）とTAR0010を同一ループで処理。bTotalの掛け算ルールを明記 |

---

## 1. 対象スコープ

| 項目 | 値 |
|------|-----|
| 評価票種別 | 一般病棟用（GENERAL_II） |
| 評価方式 | 看護必要度Ⅱ |
| A項目ソース | EFファイル（レセプト電算コードで自動判定） |
| B項目ソース | Hファイル（ASS0021 ペイロード） |
| C項目ソース | EFファイル（レセプト電算コード＋有効期間展開） |

> 看護必要度Ⅰ（GENERAL_I）および他評価票種別（ICU・HCU等）は将来バージョンで対応する。

---

## 2. パイプライン全体構造

**「空の評価マップを作って、各項目が埋めていく」方式** を採用する。

### 設計方針

- ファイルごとに個別のスコアを計算してからマージするのではなく、  
  **1つの Map（評価マップ）を先に作り、各計算関数が自分の担当フィールドだけを埋める**。
- マージ処理が不要になり、各関数の責務がシンプルになる。
- A→B→C の順序に依存しない（順序を入れ替えても結果は同じ）。

### 処理フロー

```
Step 1: ファイルをパースする
━━━━━━━━━━━━━━━━━━━━━━━━
  parseHFile(hFile)   → HRecordEntry[]
  parseEfFile(efFile) → EfActEntry[]


Step 2: 空の評価マップを作る
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Hファイルの全行から
  「患者番号 × 実施日付 × 病棟コード」のユニーク組み合わせを抽出
  → 各組み合わせに対して、スコアが全部0の空の GenIIDailyScore を作る
  → Map<string, DailyEvaluation> に格納
     キー = "患者番号_実施日付"


Step 3: B項目を埋める（Hファイルから）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  HRecordEntry[] のうち payloadType === "ASS0021" を走査
  → キーで評価マップを引き、b1〜b7, b2_assist〜b5_assist, bTotal を書き込む


Step 4: C項目を埋める（EFファイルから）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  EfActEntry[] を走査し、レセプト電算コード対応表と突合
  → 該当するC項目の実施日（評価日）の評価マップのスコアを 1 にする
  → 実施日を起点として、各項目に定められた有効期間分、同一項目のスコアを 1 に展開する
  → 各日の cTotal（C15〜C23の合計）を算出する


Step 5: A項目を埋める（EFファイルから）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  EfActEntry[] を走査し、レセプト電算コード対応表と突合
  → 該当するA項目（A3以外）の実施日の評価マップのスコアを 1 にする
  → A3については、特定の薬剤を「除いた」注射の薬剤数（データ区分30番台）をカウントし、3剤以上ならば該当日のA3スコアを 1 にする
  → A3およびA7については実施日を起点として、各項目に定められた有効期間分、同一項目のスコアを 1 に展開する（A3=最大7日, A7=2日）
  → 各日の aTotal（A1〜A7の合計）を算出する

  ⚠️ EFにキーが存在するがHに存在しない場合は警告ログを出力する


Step 6: 施設基準等を満たす該当患者の割合判定を行う
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  評価マップの全エントリを走査
  → 判定パターン（P1/P2/P3）で meetsP1, meetsP2, meetsP3 を計算

Step 7: 配列に変換して返す
━━━━━━━━━━━━━━━━━━━━━━
  Map.values() → GenIIDailyScore[]
```

---

## 3. 評価マップ（評価マップ）の生成方針

### 元データ

**Hファイルを正とする。**

DPC標準仕様において、Hファイルは「看護必要度の評価が必要な患者について、在棟日ごとに1レコードを作成する」という位置づけである。  
`TAR0010`（判定対象フラグ）はHファイルにのみ含まれ、集計対象/除外を決定する唯一の情報源であるため、評価マップの生成元としてHファイルが最も適切。

### EFファイルとの不整合への対応

A項目・C項目を埋める際（Step 4・5）、EFファイルに存在するが評価マップ（Hファイル由来）に存在しないキーが見つかった場合は、**警告ログとして記録する**。  
これにより、データ品質の問題を検知できる。

想定される不整合の原因：
- 外来患者のレコード（看護必要度の評価対象外）
- 一般病棟以外の患者のレコード（評価票が異なる）
- データ作成上の不整合（本来あってはならない状態）

---

## 4. データソース対応表（一般病棟Ⅱ）

| 項目 | ソース | 判定方法 |
|------|--------|----------|
| A1 創傷処置 | EFファイル | レセプト電算コード照合 |
| A2 呼吸ケア | EFファイル | レセプト電算コード照合 |
| A3 注射薬剤3種類以上 | EFファイル | データ区分30番台 → 除外薬剤除外 → ユニーク3種以上 |
| A4 シリンジポンプ | EFファイル | レセプト電算コード照合 |
| A5 輸血や血液製剤 | EFファイル | レセプト電算コード照合 |
| A6 専門的な治療・処置 | EFファイル | ①〜⑨のレセプト電算コード照合（⑤⑩⑪はⅡでは対象外） |
| A7 緊急に入院を必要とする状態 | EFファイル | レセプト電算コード照合 ＋ **日数制約あり** |
| B1〜B7 | Hファイル | ASS0021 ペイロード |
| C15〜C23 | EFファイル | レセプト電算コード照合 ＋ **有効期間展開（当日含む）** |

### 日数制約・有効期間

- **C項目**: 手術等の実施日を **当日（Day 1）** として、項目ごとに定められた日数分を「あり」とする
- **A項目の日数制約**: A3（注射薬剤3種類以上）は最大7日間、A7（緊急に入院を必要とする状態）は2日間の有効期間がある

> C項目の有効期間は手術日当日を含む。例：開腹手術（6日間）の場合、手術日 10/5 → 有効期間 10/5〜10/10。

---

## 5. 中間データ型定義

### 5-1. HRecordEntry（Hファイル1行のパース結果）✅ 確定

#### 設計方針

- Hファイルの1行をタブ分割した**全列をそのまま `string[]` で保持**する
- 列の取捨選択はパース段階では行わない（将来どの列が必要になるか不明のため）
- よく使う列にはインデックス定数を定義し、マジックナンバーを排除する
- ペイロードの意味の解釈はパーサーの責務ではなく、後段の各スコア計算関数が行う

#### 列マッピング（実データ突合済み）

以下は実際のHファイルのヘッダ行と突合して確認した列番号の対応表。

| index | ヘッダ名 | 定数名 | 実データ例 | 備考 |
|-------|---------|--------|-----------|------|
| 0 | 施設コード | `FACILITY_CODE` | `987654321` | 9桁 |
| 1 | 病棟コード | `WARD_CODE` | `1906244444` | 10桁以下・左詰め |
| 2 | データ識別番号 | `PATIENT_NO` | `0010334594` | 患者識別キー |
| 3 | 退院年月日 | `DISCHARGE_DATE` | `20240828` | 入院中は `00000000` |
| 4 | 入院年月日 | `ADMISSION_DATE` | `20240823` | A7日数判定に使用 |
| 5 | 実施年月日 | `EVAL_DATE` | `20240823` | 日次キー |
| 6 | コード | `PAYLOAD_TYPE` | `ASS0021` | ペイロード種別 |
| 7 | バージョン | `PAYLOAD_VERSION` | `20200401` | |
| 8 | 連番 | `PAYLOAD_SEQ` | `0` | |
| 9〜28 | ペイロード1〜20 | `PAYLOAD_START` = 9 | `0, 0, 0, ...` | 可変長（種別により異なる） |

> ペイロードの列数はペイロード種別によって異なる（ASS0021 = 11個、TAR0010 = 1個、ASS0013 = 8個）。  
> 未使用のペイロード列は空文字となる。

#### 型定義

```typescript
// H_COL: Hファイルの列インデックス定数
export const H_COL = {
  FACILITY_CODE: 0,
  WARD_CODE: 1,
  PATIENT_NO: 2,
  DISCHARGE_DATE: 3,
  ADMISSION_DATE: 4,
  EVAL_DATE: 5,
  PAYLOAD_TYPE: 6,
  PAYLOAD_VERSION: 7,
  PAYLOAD_SEQ: 8,
  PAYLOAD_START: 9,
} as const;

// HRecordEntry: Hファイル1行のパース結果
export type HRecordEntry = {
  columns: string[];  // 全列をそのまま保持（index 0〜28）
};
```

#### parseHFile のフィルタルール

| 条件 | 処理 |
|------|------|
| `columns[0] === "施設コード"` | **除外**（ヘッダ行） |
| `columns.length < 10` | **除外**（壊れた行） |
| `columns[H_COL.PATIENT_NO]` が空 | **除外** |
| `columns[H_COL.PAYLOAD_TYPE]` が空 | **除外** |
| 上記以外 | **保持**（`HRecordEntry[]` に追加） |

> ペイロード種別（ASS0021 / TAR0010 等）によるフィルタリングはパース段階では行わない。  
> 後段の各スコア計算関数が「自分に必要なペイロード種別だけを拾う」責務を持つ。

---

### 5-2. EfActEntry（EFファイル1行のパース結果）✅ 確定

#### 設計方針

- EFファイルは数万〜数十万行と巨大なため、**パース段階で不要行を除外**しメモリ使用量を抑える
- 全31列のうち **9列のみを名前付きフィールドとして保持** する（HRecordEntryとは異なるアプローチ）
- 名前付きフィールドを採用する理由：31列中9列だけ保持するため、`columns[n]` のindexが元ファイルとズレて混乱するため
- データ区分やレセプトコードの種類による絞り込みはパース段階では行わない（後段の計算関数の責務）
- 病棟区分（EF-29）でのフィルタもパース段階では行わない（将来のICU/HCU対応のため）

#### 列マッピング（DPC仕様書＋実データ突合済み）

以下はDPC標準仕様（第17版）および実際のEFファイルのヘッダ行と突合して確認した列番号の対応表。

| DE番号 | index | ヘッダ名 | フィールド名 | 実データ例 | 保持理由 |
|--------|-------|---------|------------|-----------|----------|
| EF-2 | 1 | データ識別番号 | `patientNo` | `0000001004` | 患者キー。必須 |
| EF-3 | 2 | 退院年月日（西暦） | `dischargeDate` | `20241010` | Hファイルとの整合性チェック用 |
| EF-4 | 3 | 入院年月日（西暦） | `admissionDate` | `20240730` | A7の日数算出、整合性チェック用 |
| EF-5 | 4 | データ区分 | `dataCategory` | `13` | A3判定（注射系=30番台）に必要 |
| EF-9 | 8 | レセプト電算コード | `receiptCode` | `113009470` | A・C項目の判定キー。必須 |
| EF-17 | 16 | 行為明細区分情報 | `detailCategory` | `000000000000` | 将来のルール変更に備えて保持 |
| EF-24 | 23 | 実施年月日 | `evalDate` | `20240815` | 日次キー。必須 |
| EF-28 | 27 | 病棟コード | `wardCode` | `1906255555` | 病棟紐付けキー。必須 |
| EF-29 | 28 | 病棟区分 | `wardType` | `0` | 将来のICU/HCU対応時にフィルタに使用 |

**破棄する列（22列）：** 施設コード(EF-1)、順序番号(EF-6)、行為明細番号(EF-7)、病院点数マスタコード(EF-8)、解釈番号(EF-10)、診療明細名称(EF-11)、使用量(EF-12)、基準単位(EF-13)、明細点数・金額(EF-14)、円・点区分(EF-15)、出来高実績点数(EF-16)、行為点数(EF-18)、行為薬剤料(EF-19)、行為材料料(EF-20)、行為回数(EF-21)、保険者番号(EF-22)、レセプト種別コード(EF-23)、レセプト科区分(EF-25)、診療科区分(EF-26)、医師コード(EF-27)、入外区分(EF-30/フィルタ後は不要)、施設タイプ(EF-31)

#### 型定義

```typescript
// EF_COL: EFファイルの列インデックス定数（パース時の抽出用）
export const EF_COL = {
  FACILITY_CODE: 0,   // ヘッダ検出用
  PATIENT_NO: 1,
  DISCHARGE_DATE: 2,
  ADMISSION_DATE: 3,
  DATA_CATEGORY: 4,
  RECEIPT_CODE: 8,
  DETAIL_CATEGORY: 16,
  EVAL_DATE: 23,
  WARD_CODE: 27,
  WARD_TYPE: 28,
  IN_OUT_FLAG: 29,    // フィルタ用（保持はしない）
} as const;

// EfActEntry: EFファイル1行のパース結果（名前付きフィールド）
export type EfActEntry = {
  patientNo: string;       // EF-2  (index 1)  データ識別番号
  dischargeDate: string;   // EF-3  (index 2)  退院年月日
  admissionDate: string;   // EF-4  (index 3)  入院年月日
  dataCategory: string;    // EF-5  (index 4)  データ区分
  receiptCode: string;     // EF-9  (index 8)  レセプト電算コード
  detailCategory: string;  // EF-17 (index 16) 行為明細区分情報
  evalDate: string;        // EF-24 (index 23) 実施年月日
  wardCode: string;        // EF-28 (index 27) 病棟コード
  wardType: string;        // EF-29 (index 28) 病棟区分
};
```

#### parseEfFile のフィルタルール

| 条件 | 処理 |
|------|------|
| `columns[0] === "施設コード"` | **除外**（ヘッダ行） |
| `columns.length < 30` | **除外**（壊れた行。EF-31は「データ挿入不要」のため30列以上あればOK） |
| `columns[EF_COL.IN_OUT_FLAG] !== "0"` | **除外**（外来データ。看護必要度は入院のみ対象） |
| `columns[EF_COL.DATA_CATEGORY]` が除外対象 | **除外**（下表参照） |
| `columns[EF_COL.PATIENT_NO]` が空 | **除外** |
| `columns[EF_COL.RECEIPT_CODE]` が空 | **除外** |
| `columns[EF_COL.EVAL_DATE]` が空 | **除外** |
| 上記以外 | 9列を抽出して `EfActEntry` に変換し **保持** |

#### データ区分（EF-5）によるフィルタ

EFファイルは巨大なため、**看護必要度A・C項目の判定に明らかに使用されないデータ区分はパース段階で除外**する。

**✅ 保持する区分（15種類）:**

| コード | 名称 | 保持理由 |
|:------:|------|----------|
| 21 | 内服 | A6①抗悪性腫瘍剤（経口薬）の可能性 |
| 22 | 屯服 | 同上（頓服） |
| 23 | 外用 | 同上（外用薬） |
| 26 | 麻毒 | A3の薬剤カウントやA6に関連し得る |
| 31 | 皮下筋肉内 | A3（注射薬剤3種以上）の主要対象 |
| 32 | 静脈内 | 同上 |
| 33 | その他注射 | 同上 |
| 40 | 処置 | A1創傷処置, A2呼吸ケア, A4シリンジポンプ, A5輸血 等 |
| 50 | 手術 | C項目の判定対象、A6の一部 |
| 54 | 麻酔 | C項目に関連する可能性 |
| 60 | 検査・病理 | A5（輸血）関連コードやA6に関連するコードが含まれ得る |
| 70 | 画像診断 | A6（専門的治療）に関連するコードが含まれ得る |
| 80 | その他 | 先進医療。A6に該当する可能性 |
| 90 | 入院基本料 | 評価に関連するコードが含まれ得る |
| 92 | 特定入院料 | 同上 |

**❌ 除外する区分（6種類）:**

| コード | 名称 | 除外理由 |
|:------:|------|----------|
| 11 | 初診 | 初診料。治療行為ではない |
| 13 | 指導 | 薬剤管理指導料等。治療行為ではない |
| 14 | 在宅 | 在宅医療。入院中の看護必要度とは無関係 |
| 24 | 調剤 | 調剤料。薬剤そのものではない |
| 27 | 調基 | 調剤技術基本料。技術料 |
| 97 | 食事療養 | 食事。完全に無関係 |

> 病棟区分（EF-29）によるフィルタはパース段階では行わない（将来のICU/HCU対応のため）。  
> レセプトコードの種類による絞り込みもパース段階では行わない。  
> 後段の各スコア計算関数が「自分に必要なレコードだけを拾う」責務を持つ。

---

### 5-3. GenIIDailyScore（評価マップ：患者×日ごとの統合スコア）✅ 確定

#### 設計方針

- **一般病棟Ⅱ専用**の型。将来 ICU/HCU 用には `IcuDailyScore` / `HcuDailyScore` を別途定義する
- 全フィールドをフラット構造で保持（ネスト不要。A/B/Cは異なるステップで埋めるが、フラットでも問題なし）
- wardName / admissionFeeType は `wardCode` から参照可能なため本型には含めない
- 初期値はすべて `0`（または `false`）。各ステップで該当フィールドのみ上書きする

#### ⚠️ 一般病棟Ⅱにおける A6 サブ項目の注意

`business_rules_v0_7.md` では A6-⑤⑩⑪ を「必要度Ⅰのみ」と記載しているが、これは **Ⅰにおいて Hファイル（ASS0013 ペイロード7）から取得する** という意味であり、**Ⅱでは使わないという意味ではない**。

| サブ項目 | 必要度Ⅰ | 必要度Ⅱ |
|----------|----------|----------|
| ①〜④, ⑥〜⑨ | EFファイル | EFファイル |
| ⑤⑩⑪ | Hファイル（ASS0013） | **EFファイル** |

→ **Ⅱでは①〜⑪の全11サブ項目をEFファイルから評価する。** `level1_only` フラグは「Ⅰにおいてのみ H ファイルから取得する」を示すものであり、Ⅱでの評価対象外を意味しない。

#### ⚠️ A3・A7 の有効期間

C項目と同様に、A3・A7にも有効期間がある。有効期間内はスコア `1` を維持する。

| 項目 | 有効期間 | 備考 |
|------|:--------:|------|
| GEN_A3 | 最大7日間 | 🔲 起算日ルール要確認 |
| GEN_A7 | 2日間 | 🔲 起算日ルール要確認 |

#### 型定義

```typescript
export type GenIIDailyScore = {
  // ========== キー情報 ==========
  patientNo: string;         // データ識別番号
  evalDate: string;          // 実施年月日 (YYYYMMDD)
  wardCode: string;          // 病棟コード
  admissionDate: string;     // 入院年月日
  dischargeDate: string;     // 退院年月日 ("00000000" = 在院中)

  // ========== TAR（判定対象フラグ） ==========
  tarFlag: number;           // TAR0010の値 (0〜5)
  isTargetForEval: boolean;  // 最終的に集計対象か否か
                              // 一般病棟: 0,1が対象 / その他: 0のみ

  // ========== A項目（全てEFファイルから） ==========
  a1: number;   // GEN_A1 創傷処置 (0/1)
  a2: number;   // GEN_A2 呼吸ケア (0/1)
  a3: number;   // GEN_A3 注射薬剤3種類以上 (0/1) ※有効期間: 最大7日間
  a4: number;   // GEN_A4 シリンジポンプ (0/1)
  a5: number;   // GEN_A5 輸血・血液製剤 (0/1)
  a6: number;   // GEN_A6 専門的な治療・処置 (0/1) ← サブ項目のOR
  a7: number;   // GEN_A7 緊急に入院を必要とする状態 (0/1) ※有効期間: 2日間
  aTotal: number;

  // ========== A6サブ項目（①〜⑪全てEFから / Ⅱでは全11項目） ==========
  a6_1: number;    // ① 抗悪性腫瘍剤の使用（注射剤のみ）
  a6_2: number;    // ② 抗悪性腫瘍剤の内服の管理
  a6_3: number;    // ③ 麻薬の使用（注射剤のみ）
  a6_4: number;    // ④ 麻薬の内服・貼付・坐剤の管理
  a6_5: number;    // ⑤ 放射線治療
  a6_6: number;    // ⑥ 免疫抑制剤の管理（注射剤のみ）
  a6_7: number;    // ⑦ 昇圧剤の使用（注射剤のみ）
  a6_8: number;    // ⑧ 抗不整脈剤の使用（注射剤のみ）
  a6_9: number;    // ⑨ 抗血栓塞栓薬の持続点滴の使用
  a6_10: number;   // ⑩ ドレナージの管理
  a6_11: number;   // ⑪ 無菌治療室での治療

  // ========== B項目（Hファイル ASS0021 ペイロード順） ==========
  // --- 患者の状態 (payload 1〜7) ---
  b1: number;   // 寝返り (0/1/2)
  b2: number;   // 移乗（患者の状態） (0/1/2)
  b3: number;   // 口腔清潔（患者の状態） (0/1)
  b4: number;   // 食事摂取（患者の状態） (0/1/2)
  b5: number;   // 衣服の着脱（患者の状態） (0/1/2)
  b6: number;   // 診療・療養上の指示が通じる (0/1)
  b7: number;   // 危険行動 (0/1)
  // --- 介助の実施 (payload 8〜11) ---
  b2_assist: number;  // 移乗の介助 (0/1)
  b3_assist: number;  // 口腔清潔の介助 (0/1)
  b4_assist: number;  // 食事摂取の介助 (0/1)
  b5_assist: number;  // 衣服の着脱の介助 (0/1)
  bTotal: number;     // 🔲 算出マトリクス未確定（介助なし=0点の掛け算ルールあり）

  // ========== C項目（EFファイルから / 有効期間展開後） ==========
  c15: number;    // 開頭手術 (0/1)       有効期間: 11日間
  c16: number;    // 開胸手術 (0/1)       有効期間: 9日間
  c17: number;    // 開腹手術 (0/1)       有効期間: 6日間
  c18: number;    // 骨の手術 (0/1)       有効期間: 10日間
  c19: number;    // 胸腔鏡・腹腔鏡 (0/1) 有効期間: 4日間
  c20: number;    // 全身麻酔・脊椎麻酔 (0/1) 有効期間: 5日間
  c21_1: number;  // 経皮的血管内治療 (0/1)   有効期間: 4日間
  c21_2: number;  // 経皮的心筋焼灼術等 (0/1) 有効期間: 4日間
  c21_3: number;  // 侵襲的な消化評価マップ治療 (0/1) 有効期間: 4日間
  c22: number;    // 別に定める検査 (0/1) 有効期間: 2日間
  c23: number;    // 別に定める手術 (0/1) 有効期間: 5日間
  cTotal: number; // C15〜C23の合計値（複数項目が重複した場合、1以上になり得る）

  // ========== 判定結果（後段で算出） ==========
  meetsP1: boolean;   // A≥3 OR cTotal≥1
  meetsP2: boolean;   // (A≥2 AND B≥3) OR A≥3 OR cTotal≥1
  meetsP3: boolean;   // A≥1 OR cTotal≥1
};
```

#### 初期化

`buildEmptyEvaluationMap` で空の `GenIIDailyScore` を生成する際、全数値フィールドは `0`、全 boolean フィールドは `false` で初期化する。キー情報（patientNo, evalDate, wardCode, admissionDate, dischargeDate）は H ファイルから取得。

#### bTotal の算出について（🔲 未確定）

B2〜B5 は「患者の状態」×「介助の実施」の掛け算構造。介助の実施が `0`（なし）の場合、患者の状態が要介助でも得点は `0` になる。

---

### 5-4. Step 3: applyHFileScores（B項目・TARフラグの書き込み）✅ 確定

#### 設計方針

- HRecordEntry[] を **1回だけ走査**（O(n)  n = Hファイル行数）
- 同一ループ内で `ASS0021`（B項目）と `TAR0010`（判定対象フラグ）を両方処理
- 中間データ構造を作らず、scoreMap に直接書き込み
- 関数名は `applyHFileScores`（B項目とTAR両方を処理するため）

#### シグネチャ

```typescript
function applyHFileScores(
  hRecords: HRecordEntry[],
  scoreMap: Map<string, GenIIDailyScore>
): void
```

#### アルゴリズム

```
for each record in hRecords:
    payloadType = record.columns[H_COL.PAYLOAD_TYPE]   // index 6
    key = record.columns[H_COL.PATIENT_NO]              // index 2
          + "|" 
          + record.columns[H_COL.EVAL_DATE]             // index 5
    score = scoreMap.get(key)
    if score がない → skip

    if payloadType === "ASS0021":
        // ---- B項目（患者の状態） ----
        score.b1 = parseInt(columns[9])  || 0   // payload 1: 寝返り
        score.b2 = parseInt(columns[10]) || 0   // payload 2: 移乗
        score.b3 = parseInt(columns[11]) || 0   // payload 3: 口腔清潔
        score.b4 = parseInt(columns[12]) || 0   // payload 4: 食事摂取
        score.b5 = parseInt(columns[13]) || 0   // payload 5: 衣服の着脱
        score.b6 = parseInt(columns[14]) || 0   // payload 6: 指示が通じる
        score.b7 = parseInt(columns[15]) || 0   // payload 7: 危険行動

        // ---- B項目（介助の実施） ----
        score.b2_assist = parseInt(columns[16]) || 0  // payload 8
        score.b3_assist = parseInt(columns[17]) || 0  // payload 9
        score.b4_assist = parseInt(columns[18]) || 0  // payload 10
        score.b5_assist = parseInt(columns[19]) || 0  // payload 11

        // ---- bTotal（掛け算ルール適用） ----
        score.bTotal = score.b1                        // 介助なし（そのまま）
                     + (score.b2 * score.b2_assist)    // 介助なし=0点
                     + (score.b3 * score.b3_assist)
                     + (score.b4 * score.b4_assist)
                     + (score.b5 * score.b5_assist)
                     + score.b6                        // 介助なし（そのまま）
                     + score.b7                        // 介助なし（そのまま）

    else if payloadType === "TAR0010":
        score.tarFlag = parseInt(columns[9]) || 0
        score.isTargetForEval = (score.tarFlag === 0 || score.tarFlag === 1)
```

#### 列インデックスの対応（ASS0021）

HRecordEntry は `columns: string[]` で全列を保持している。ペイロードは index 9 から始まる。

| ペイロード番号 | columns index | GenIIDailyScore フィールド | 値 |
|:--------:|:--------:|----------|-----|
| 1 | 9 | `b1` | 0/1/2 |
| 2 | 10 | `b2` | 0/1/2 |
| 3 | 11 | `b3` | 0/1 |
| 4 | 12 | `b4` | 0/1/2 |
| 5 | 13 | `b5` | 0/1/2 |
| 6 | 14 | `b6` | 0/1 |
| 7 | 15 | `b7` | 0/1 |
| 8 | 16 | `b2_assist` | 0/1 |
| 9 | 17 | `b3_assist` | 0/1 |
| 10 | 18 | `b4_assist` | 0/1 |
| 11 | 19 | `b5_assist` | 0/1 |

#### bTotal の掛け算ルール

| 項目 | 得点計算 | 備考 |
|------|----------|------|
| B1（寝返り） | そのまま | 介助フィールドなし |
| B2（移乗） | b2 × b2_assist | 介助なし=0点 |
| B3（口腔清潔） | b3 × b3_assist | 介助なし=0点 |
| B4（食事摂取） | b4 × b4_assist | 介助なし=0点 |
| B5（衣服の着脱） | b5 × b5_assist | 介助なし=0点 |
| B6（指示が通じる） | そのまま | 介助フィールドなし |
| B7（危険行動） | そのまま | 介助フィールドなし |

#### 計算量

| 操作 | 計算量 |
|------|--------|
| HRecordEntry[] の走査 | O(n) |
| scoreMap.get() | O(1) / 回 |
| parseInt × 11 + bTotal計算 | O(1) / 回 |
| **合計** | **O(n)** |

---

## 6. コードイメージ（参考）

```typescript
// pipeline.ts

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {

  // Step 1: パース
  const hRecords = parseHFile(input.hFile);
  const efRecords = parseEfFile(input.efFile);

  // Step 2: 空の評価マップを作る
  const scoreMap = buildEmptyScoreMap(hRecords, efRecords, input);
  // → Map<string, GenIIDailyScore>  key = "patientNo|evalDate"

  // Step 3: B項目・TARフラグを埋める（Hファイルから・1パス）
  applyHFileScores(hRecords, scoreMap);

  // Step 4: A項目を埋める（EFファイルから）
  const efGrouped = groupEfByPatientDate(efRecords);
  applyAScores(efGrouped, scoreMap);

  // Step 5: C項目を埋める（EFファイルから / 有効期間展開）
  applyCScores(efGrouped, scoreMap);

  // Step 6: A3・A7の有効期間展開
  applyValidityPeriods(efGrouped, scoreMap);

  // Step 7: 施設基準等を満たす該当患者の割合判定
  applyCriteriaJudgment(scoreMap, input.wards);

  // Step 8: 結果を返す
  return buildPipelineResult(scoreMap, input);
}
```

---

## 7. 未決事項

（特になし）

---

*以上*

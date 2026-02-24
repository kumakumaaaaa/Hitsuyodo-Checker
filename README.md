# 看護必要度アナリシスソフト

DPCデータ（HファイルおよびEFファイル）を取り込み、看護必要度の集計・分析を行い、**入院基本料および各種加算の施設基準（看護必要度割合の閾値）を満たしているかを確認するためのツール**です。

## 概要

手作業による集計・判定業務を自動化し、要件充足状況を視覚的に把握できるようにすることで、適切な診療報酬算定を支援します。

### 対象ユーザー

- 医療事務担当者（診療報酬算定業務）
- 看護管理者（病棟単位の看護必要度管理・モニタリング）

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React / Next.js / TypeScript |
| データベース | PGlite（ブラウザ内PostgreSQL / IndexedDB永続化） |
| スタイリング | Tailwind CSS v4 |
| アイコン | Lucide React |

> **動作方式:** クライアントサイド完結（外部サーバー不要）。データはすべてブラウザのIndexedDBに保存されます。

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

http://localhost:3000 でアプリケーションにアクセスできます。

## 画面構成

```
共通ヘッダー（全画面）
  ├─ ロゴ（クリックでホームへ）
  ├─ 設定アイコン → 設定ポップアップ（デフォルト病棟設定等）
  └─ アカウントアイコン

ホーム画面（レコード一覧）
  ├─ レコードテーブル表示 (タイトル・期間・病棟数・作成日・充足状況)
  ├─ レコード削除・選択機能
  ├─ 新規レコード作成フロー
  │    ├─ Step 1: 基本設定・ファイルアップロード
  │    └─ Step 2: 病棟設定・確認・レコード生成 (プログレスUI)
  └─ レコード詳細画面
       ├─ Tab 1: ファイル取り込み状況
       ├─ Tab 2: 基準割合
       ├─ Tab 3: 看護必要度詳細
       ├─ Tab 4: 分析
       └─ Tab 5: 看護必要度Ⅰ・Ⅱ比較
```

## ディレクトリ構成

```
├── docs/                 # 要件定義・画面遷移・テストケース仕様等
├── master/               # マスタデータ（TSV）
├── demodata/             # テスト・デモ用 EF/Hファイル群
├── src/
│   ├── app/              # Next.js App Router (ページルーティング)
│   │   ├── records/new/  #   新規作成画面
│   │   └── records/[id]/ #   詳細画面
│   ├── components/       # UIコンポーネント群
│   │   ├── layout/       #   共通レイアウト (Header等)
│   │   ├── home/         #   ホーム画面 (RecordList等)
│   │   └── records/      #   レコード作成関連 (Step1/2等)
│   ├── lib/              # コアロジック・ユーティリティ機能
│   │   ├── db/           #   PGlite (IndexedDB) スキーマ・クライアント設定
│   │   ├── file-parser/  #   Hファイル・EFファイル解析処理
│   │   └── settings/     #   localStorage連携設定
│   └── types/            # TypeScript共通型定義
└── public/
```

## 開発者向けトラブルシューティング

本システムは **PGlite（ブラウザ内PostgreSQL）** を利用し、データはすべて **IndexedDB** に永続化（保存）されます。
そのため、開発中にデータベースのスキーマ（テーブル構造）を変更した場合、過去のテーブル構造がブラウザに残存し、エラーを引き起こす罠（罠）があります。

**よくあるエラーの例:**
- `column "xxx" does not exist` (新しく追加したカラムがない)
- `there is no unique or exclusion constraint matching the ON CONFLICT specification` (古いテーブルにUNIQUE制約がない)
- `null value in column "xxx" violates not-null constraint` (使わなくなった古いNOT NULLカラムが残っている)

**対処法（マイグレーション）:**
スキーマ変更を行う場合は、単に `CREATE TABLE` を書き換えるのではなく、`src/lib/db/schema.ts` の末尾に以下のようなマイグレーションクエリ（`ALTER TABLE`）を必ず追記して、既存のクライアントのデータベース構造もアップデートされるようにしてください。

```sql
-- カラムの追加
ALTER TABLE target_table ADD COLUMN IF NOT EXISTS new_column TEXT;

-- 不要なカラムの削除（制約エラー回避のため必須）
ALTER TABLE target_table DROP COLUMN IF EXISTS old_column;

-- UNIQUE制約の再定義（DROPしてからADDする）
ALTER TABLE target_table DROP CONSTRAINT IF EXISTS target_table_col1_col2_key;
ALTER TABLE target_table ADD CONSTRAINT target_table_col1_col2_key UNIQUE (col1, col2);
```

**開発中の初期化（DBリセット）:**
開発中にブラウザのDBを完全にリセットしたい場合は、ブラウザの開発者ツールから `Application` タブ > `Storage` > `Clear site data` を実行するか、専用のリセット関数 (`resetDB()`) を呼び出してください。

## 対応ブラウザ

- Google Chrome（最新版）
- Microsoft Edge（最新版）

## ライセンス

Private

// ============================================
// 看護必要度管理システム - 型定義
// ============================================

/** レコードの処理ステータス */
export type RecordStatus = 'pending' | 'processing' | 'done' | 'error';

/** 充足状況 */
export type FulfillmentStatus = 'fulfilled' | 'warning' | 'unfulfilled';

/** レコード（ホーム画面の1行に対応） */
export interface Record {
  id: number;
  title: string;
  period_from: string; // yyyy-mm-dd
  period_to: string;   // yyyy-mm-dd
  h_file_name: string | null;
  ef_file_name: string | null;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
}

/** ホーム画面のレコード一覧表示用 */
export interface RecordListItem {
  id: number;
  title: string;
  period_from: string;
  period_to: string;
  ward_count: number;
  created_at: string;
  fulfillment_status: FulfillmentStatus;
}

/** 入院料マスタ */
export interface AdmissionTypeMaster {
  id: number;
  code: string;
  name: string;
  nursing_need_type: 1 | 2;
  threshold_rate: number;
  evaluation_method: string;
  effective_from: string;
  effective_to: string | null;
}

/** 加算マスタ */
export interface KasanMaster {
  id: number;
  code: string;
  name: string;
  threshold_rate: number;
  evaluation_method: string;
  effective_from: string;
  effective_to: string | null;
}

/** 病棟設定 */
export interface WardSetting {
  id: number;
  record_id: number;
  ward_code: string;
  ward_name: string;
  admission_type_id: number;
  nursing_need_type: 1 | 2;
}

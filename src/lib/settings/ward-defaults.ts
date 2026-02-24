/**
 * 病棟デフォルト設定の管理
 *
 * localStorage に永続化し、新規レコード作成時にデフォルト値を自動適用する。
 * 設定モーダルの「病棟コードのデフォルト設定」から編集可能。
 */

const STORAGE_KEY = 'hitsuyodo-ward-defaults';

export interface WardDefault {
  wardCode: string;
  wardName: string;
  admissionTypeId: number | null;
}

/** 保存済みのデフォルト設定一覧を取得 */
export function getWardDefaults(): WardDefault[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** デフォルト設定を保存 */
export function saveWardDefaults(defaults: WardDefault[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
}

/** 特定の病棟コードのデフォルト設定を取得 */
export function getWardDefault(wardCode: string): WardDefault | undefined {
  return getWardDefaults().find((d) => d.wardCode === wardCode);
}

/** 1件追加または更新 */
export function upsertWardDefault(wardDefault: WardDefault): void {
  const existing = getWardDefaults();
  const idx = existing.findIndex((d) => d.wardCode === wardDefault.wardCode);
  if (idx >= 0) {
    existing[idx] = wardDefault;
  } else {
    existing.push(wardDefault);
  }
  saveWardDefaults(existing);
}

/** 1件削除 */
export function removeWardDefault(wardCode: string): void {
  const existing = getWardDefaults().filter((d) => d.wardCode !== wardCode);
  saveWardDefaults(existing);
}

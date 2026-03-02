/**
 * 一般病棟評価区分Ⅱ用の患者ごと・日ごとのスコア情報を保持する型
 * 
 * HファイルとEFファイルの中間データとして使用し、各スコアやフラグを
 * フラットな形式で保持する。
 */
export type GenIIDailyScore = {
  // ========== キー情報 ==========
  patientNo: string;         // データ識別番号 (H_COL.PATIENT_NO)
  evalDate: string;          // 実施年月日 (YYYYMMDD) (H_COL.EVAL_DATE)
  wardCode: string;          // 病棟コード (H_COL.WARD_CODE)
  admissionDate: string;     // 入院年月日 (H_COL.ADMISSION_DATE)
  dischargeDate: string;     // 退院年月日 (H_COL.DISCHARGE_DATE)
  daysFromAdmission: number; // 入院日からの経過日数 ((evalDate - admissionDate) + 1)

  // ========== TAR（判定対象フラグ） ==========
  tarFlag: number;           // TAR0010の値 (0〜5)
  isTargetForEval: boolean;  // 最終的に集計対象か否か (一般病棟: 0,1が対象)

  // ========== A項目（全てEFファイルから） ==========
  a1: number;   // GEN_A1 創傷処置 (0/1)
  a2: number;   // GEN_A2 呼吸ケア (0/1)
  a3: number;   // GEN_A3 注射薬剤3種類以上 (0/1) ※有効期間あり
  a4: number;   // GEN_A4 シリンジポンプ (0/1)
  a5: number;   // GEN_A5 輸血・血液製剤 (0/1)
  a6: number;   // GEN_A6 専門的な治療・処置 (0/1) ← サブ項目のOR
  a7: number;   // GEN_A7 緊急に入院を必要とする状態 (0/1) ※有効期間あり
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
  
  bTotal: number;     // 介助なし=0点などのルールを適用したB項目合計

  // ========== C項目（EFファイルから / 有効期間展開後） ==========
  c15: number;    // 開頭手術 (0/1)
  c16: number;    // 開胸手術 (0/1)
  c17: number;    // 開腹手術 (0/1)
  c18: number;    // 骨の手術 (0/1)
  c19: number;    // 胸腔鏡・腹腔鏡 (0/1)
  c20: number;    // 全身麻酔・脊椎麻酔 (0/1)
  c21_1: number;  // 経皮的血管内治療 (0/1)
  c21_2: number;  // 経皮的心筋焼灼術等 (0/1)
  c21_3: number;  // 侵襲的な消化器治療 (0/1)
  c22: number;    // 別に定める検査 (0/1)
  c23: number;    // 別に定める手術 (0/1)
  cTotal: number; // C15〜C23の合計

  // ========== 判定結果（後段で算出） ==========
  meetsP1: boolean;   // A>=3 OR cTotal>=1
  meetsP2: boolean;   // (A>=2 AND B>=3) OR A>=3 OR cTotal>=1
  meetsP3: boolean;   // A>=1 OR cTotal>=1
};

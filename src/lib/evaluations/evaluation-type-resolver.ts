import { getAdmissionType, type EvaluationType } from '../master-data/admission-type-data';

export class EvaluationTypeResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvaluationTypeResolutionError';
  }
}

/**
 * プロジェクト（レコード）全体の評価方式と、病棟に設定された入院料から
 * その病棟に適用すべき「評価票種別（EvaluationType）」を決定して返します。
 *
 * @param recordEvaluationMethod レコード全体の設定 ("necessity_1" | "necessity_2")
 * @param admissionTypeId 病棟に設定された入院料のマスターID
 * @returns 決定された評価票種別 (例: "GENERAL_II")
 * @throws 組み合わせが不正な場合、または入院料が未設定・存在しない場合にエラーをスロー
 */
export function resolveEvaluationType(
  recordEvaluationMethod: 'necessity_1' | 'necessity_2',
  admissionTypeId: number | null
): EvaluationType {
  if (!admissionTypeId) {
    throw new EvaluationTypeResolutionError('病棟に入院料が設定されていません。');
  }

  const admissionType = getAdmissionType(admissionTypeId);
  if (!admissionType) {
    throw new EvaluationTypeResolutionError(`指定された入院料(ID: ${admissionTypeId})はマスタに存在しません。`);
  }

  // 現時点の要件（一般病棟メイン）では、単純に necessity_1 => GENERAL_I をマッピングします。
  // 将来的には、カテゴリ(category)等を見て「ICU」「HCU」「地域包括」などを出し分ける拡張を行います。
  let desiredType: EvaluationType;
  if (recordEvaluationMethod === 'necessity_1') {
    desiredType = 'GENERAL_I';
  } else if (recordEvaluationMethod === 'necessity_2') {
    desiredType = 'GENERAL_II';
  } else {
    throw new EvaluationTypeResolutionError(`不明な評価方式です: ${recordEvaluationMethod}`);
  }

  const isSupported = admissionType.targetEvaluationTypes.includes(desiredType);

  if (!isSupported) {
    const supportedLabels = admissionType.targetEvaluationTypes.join(', ');
    throw new EvaluationTypeResolutionError(
      `入院料「${admissionType.name}」は、指定された評価形式（${desiredType}）に未対応です。（対応形式: ${supportedLabels}）`
    );
  }

  return desiredType;
}

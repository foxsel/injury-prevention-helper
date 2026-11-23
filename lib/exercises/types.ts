// Design Ref: §5 데이터 모델 — 미리 정리해 둔 운동 목록의 한 항목.
import type { BodyPart, Purpose, Sport } from "../constants";

export interface Exercise {
  /** 고유 번호. 가이드 주소(/guide/[id])에도 쓰인다. 예: "ankle-balance-01" */
  id: string;
  /** 운동 이름 */
  name: string;
  /** 부연설명. 이 운동이 무엇이고 어떤 점이 핵심인지 알려주는 한두 문장 */
  description: string;
  /** 이 운동을 추천할 수 있는 종목 */
  sports: Sport[];
  /** 이 운동이 다루는 부위 */
  bodyParts: BodyPart[];
  /** 예방 운동인지 회복 운동인지 */
  purpose: Purpose;
  /** 방법. 3~5단계 */
  steps: string[];
  /** 횟수. 예: "방향마다 10회" */
  reps: string;
  /** 세트. 예: "3세트" */
  sets: string;
  /** 주의사항. 1개 이상 */
  cautions: string[];
  /** 중단 기준. PRD 원문 문구(STOP_CRITERIA_TEXT)를 반드시 포함한다. */
  stopCriteria: string[];
  /** 참고한 자료. 근거를 찾지 못했으면 "일반 지침" */
  source: string;
}

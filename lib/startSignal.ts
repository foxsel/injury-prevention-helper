// Design Ref: §3.1 화면 흐름 — 어느 화면에서든 [처음으로]를 누르면 첫 화면으로 돌아오게 하는 신호.
// 첫 화면(Flow)이 보이는 중이면 이벤트로, 다른 화면(가이드 등)에 가려져 있으면 "요청했다"는 표시로 전한다.
// 입력값은 담지 않고, 처음으로 가자는 신호 하나만 전한다.

export const START_EVENT = "app:go-start";

let pending = false;

/** [처음으로]를 눌렀을 때 부른다. */
export function requestStart(): void {
  pending = true;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(START_EVENT));
}

/** 처음으로 가자는 요청이 있었는지 확인하고, 있었다면 요청을 지운다. */
export function consumeStart(): boolean {
  const was = pending;
  pending = false;
  return was;
}

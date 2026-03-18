# JEMI 2028 — 작업 지침서

---

## 기술 스택

- 순수 **HTML / CSS / Vanilla JS** — 프레임워크 사용 금지

---

## 구현 원칙

**피그마 = 정답**
수치·색상·구조는 피그마와 완전히 동일하게. 근사치를 사용하지 말 것.

**피그마 링크 제공 시 반드시 먼저 확인**
`get_design_context`로 레이어 구조·속성을 읽은 후 구현 시작. 확인 없이 코드 작성 금지.

---

## 애니메이션 규칙

**애니메이션은 피그마와 동일하게 구현**
타이밍(duration), 커브(spring/easing), 값(from/to) 모두 피그마 기준으로 정확히 재현.
피그마 프로토타입에서 확인되지 않은 값을 임의로 설정하지 말 것.

**Custom Spring → JS 전용** ← ⚠️ 반복 실수
피그마에서 Custom Spring(Stiffness / Damping / Mass)으로 정의된 애니메이션은
CSS `transition` / `cubic-bezier`로 **근사치를 사용하지 말 것**.

```js
// ✅
springAnimate({ from: 0, to: 1, stiffness: 100, damping: 50, mass: 2, onUpdate: v => { ... } });

// ❌
el.style.transition = 'opacity 0.5s cubic-bezier(...)';
```

**표준 이징(ease-out 등)은 CSS 허용**
피그마에서 spring이 아닌 일반 커브로 정의된 경우 CSS transition 사용 가능.

---

## CSS / JS 상태 관리 규칙

- 상태 클래스: `.is-active` `.is-hidden` `.is-blur` `.is-sharp` `.is-vivid`
- Spring 진행 중: JS 인라인 스타일로 제어 → 완료 후 인라인 스타일 클리어 + CSS 클래스로 최종 상태 유지
- **opacity snap 버그 방지**: 상태 클래스 제거 전 `el.style.opacity = '1'` 먼저 설정
- border-radius 클리핑 필요한 컨테이너: `overflow: hidden` 필수
- 동시 선택 버그 방지: 상태는 DOM 쿼리 대신 **변수**로 즉시 추적, 진행 중 spring은 새 인터랙션 시 취소

JS는 피그마와 동일하게 하며, 절대로 어렵게 바꿔서 오류 발생 확률을 높이는 바보 같은 짓을 하지 말 것. 사용자는 단순한 애니메이션만 구현했음. 복잡하게 만들었다가 토큰을 낭비하면 안 됨.

---

## 타이포그래피 규칙

- 한글 폰트: Pretendard / `letter-spacing: -0.01em`
- 영문 폰트: Cormorant
- letter-spacing은 em 단위 사용

---

## 작업 진행 원칙

**질문하면 바로 실행하지 말 것**
사용자가 질문하거나 변경을 요청하면, 코드를 수정하기 전에 **계획을 먼저 설명**하고 승인을 받은 후 실행할 것.
단순 수치 변경(숫자 하나 바꾸기 등) 제외.

---

## 디자인 QA 원칙

사용자는 디자이너이며 px 단위로 세세하게 점검한다.
**디자인 QA가 발생하지 않도록 처음부터 정확하게 구현할 것.**

- 구현 전 반드시 피그마에서 수치·색상·간격·정렬을 직접 확인
- 추정값·근사치 사용 금지 — 모르면 피그마에서 측정하거나 사용자에게 물을 것
- 두 번 작업하면 토큰도 두 번 소모됨. 한 번에 정확하게.
- 모르는 것이 있다면 스스로 판단해서 실행하지 않고 질문할 것

---

## 외부 리소스

**Figma Personal Access Token**
경로: `D:\테크레디\JEMI\html\.claude\settings.local.json`
키: `figd_lOyCQ00vWpKIwj52DpxpXR4uePMvkj67xByUVEzP`
파일 키: `jJxHrFNpgmkCBn3of9MQnA`

SVG/PNG export: `GET https://api.figma.com/v1/images/{fileKey}?ids={nodeIds}&format=svg`
헤더: `X-Figma-Token: {token}`

---

## 파일 수정 방법

- **클로드에게 요청** → 직접 수정 (권장)
- **직접 수정** → VS Code / 메모장에서 파일 열고 저장 (터미널 불필요)

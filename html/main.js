// JEMI v1 — main.js

/* =============================================
   SPRING ANIMATE UTILITY
   피그마 Custom spring 파라미터를 그대로 받아
   requestAnimationFrame으로 물리 시뮬레이션
   ============================================= */

/**
 * springAnimate({ from, to, stiffness, damping, mass, onUpdate, onComplete })
 * - from / to      : 시작·끝 숫자값
 * - stiffness      : 스프링 강성 (피그마 Stiffness)
 * - damping        : 감쇠 (피그마 Damping)
 * - mass           : 질량 (피그마 Mass)
 * - onUpdate(v)    : 매 프레임 호출 — 현재 값 전달
 * - onComplete()   : 애니메이션 완료 시 호출
 * returns cancel() : 애니메이션 중단 함수
 */
/**
 * springAnimate({ from, to, stiffness, damping, mass, [duration], onUpdate, onComplete })
 *
 * duration 있음 → 피그마 방식: spring curve를 미리 계산한 뒤 정확히 duration ms에 완료
 *   - 피그마 Custom Spring = "S/D/M으로 곡선 형태 결정" + "duration으로 재생 시간 고정"
 *   - ζ > 1(overdamped)처럼 느린 파라미터도 duration 내에 정확히 완료됨
 *
 * duration 없음 → 실제 물리 시뮬레이션 (기존 방식, ζ < 1 underdamped에 적합)
 */
function springAnimate({ from, to, stiffness, damping, mass, duration, onUpdate, onComplete }) {

  // ── duration 방식: fixed duration + overdamped spring 커브 ─────
  // 피그마 S:20/D:60/M:2 ζ≈4.74 → 지수 ease-out (처음 빠름 → 점점 감속)
  // x(t) ∝ 1 - e^(-γ*t) 형태 — ease-out-quart로 근사
  if (duration) {
    const ease = t => 1 - Math.pow(1 - t, 4); // ease-out-quart
    const startTime = performance.now();
    let raf;
    function tick(now) {
      const t = Math.min((now - startTime) / duration, 1);
      onUpdate(from + (to - from) * ease(t));
      if (t >= 1) { onUpdate(to); onComplete?.(); return; }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }

  // ── 물리 시뮬레이션 방식 (underdamped spring용) ────────────────
  let pos = from;
  let vel = 0;
  let lastTime = null;
  let raf;

  function step(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.016);
    lastTime = timestamp;

    const force = -stiffness * (pos - to) - damping * vel;
    vel += (force / mass) * dt;
    pos += vel * dt;

    onUpdate(pos);

    if (Math.abs(pos - to) < 0.01 && Math.abs(vel) < 0.01) {
      onUpdate(to);
      onComplete?.();
      return;
    }

    raf = requestAnimationFrame(step);
  }

  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/* 색상 보간 헬퍼 — hex → rgb 파싱 후 각 채널을 선형 보간 */
function lerpColor(fromHex, toHex) {
  const parse = hex => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [fr, fg, fb] = parse(fromHex);
  const [tr, tg, tb] = parse(toHex);

  return t => {
    const r = Math.round(fr + (tr - fr) * t);
    const g = Math.round(fg + (tg - fg) * t);
    const b = Math.round(fb + (tb - fb) * t);
    return `rgb(${r},${g},${b})`;
  };
}


/* =============================================
   LANDING PAGE — 진입 애니메이션 시퀀스
   =============================================

   타이밍 (피그마 프로토타입 기준):

   0ms      : 페이지 로드 — 빈 화면, glass 레이어 ON
   800ms    : 텍스트 등장            (200ms ease-out) → glass가 덮어서 블러로 보임
   1000ms   : glass 페이드아웃       (100ms ease-out) → 텍스트 선명하게
              + 색상 beige-200 → beige-300
   1100ms   : 색상 진해짐            (100ms ease-out) → beige-300 → beige-500
   1200ms   : 텍스트 완성
   2000ms   : landing page-5 전환
              Custom spring / Stiffness 100 / Damping 50 / Mass 2
              - 태그라인: 위로 이동 + 20px + beige-50
              - 배경 이미지: 페이드인
              - 둥근 테두리: 페이드인
============================================= */

(function () {
  'use strict';

  const tagline    = document.querySelector('.hero__tagline');
  const glass      = document.querySelector('.hero__glass');
  const border     = document.querySelector('.hero__border');
  const nav        = document.querySelector('.nav');
  const slide      = document.querySelector('.hero__slide');
  const slideItems = Array.from(document.querySelectorAll('.hero__slide-item'));
  const titleWrap  = document.querySelector('.hero__title-wrap');
  const logoSample = document.getElementById('logoSample');
  // island: wrapper가 opacity/filter 담당, A/B img가 crossfade 담당
  const islandWrap  = document.querySelector('.hero__ellipse1-wrap');
  const ellipse1Blur = document.getElementById('ellipse1Blur');
  const islandA    = document.getElementById('islandA');
  const islandB    = document.getElementById('islandB');
  // logo: A/B img가 crossfade 담당 (미래 애니메이션 예약 — 현재 미사용)
  const logoA      = document.getElementById('logoA');
  const logoB      = document.getElementById('logoB');

  if (!tagline || !glass) return;

  // ─────────────────────────────────────────
  // crossfade 헬퍼
  // ─────────────────────────────────────────
  /** A/B 두 img 중 현재 보이는(front) / 숨겨진(back) img 반환 */
  function getCF(a, b) {
    const front = a.classList.contains('is-visible') ? a : b;
    const back  = front === a ? b : a;
    return { front, back };
  }

  /** src로 교체하며 crossfade (front→0, back→1)
   *  springOpts 없으면 CSS transition(60ms) — decode 완료 후 swap
   *  springOpts 있으면 JS spring으로 opacity 직접 제어 (CSS transition 우회)
   *  반환: spring 방식일 때 { cancel, front, back }, 그 외 null */
  function crossfade(a, b, src, visible, springOpts) {
    const { front, back } = getCF(a, b);

    if (!visible) {
      front.classList.remove('is-visible');
      back.classList.remove('is-visible');
      return null;
    }

    // ── Spring 방식 ───────────────────────────────────────────────
    if (springOpts) {
      let cancelFront, cancelBack;

      const doSpringSwap = () => {
        // CSS transition 차단 후 JS가 opacity 독점 제어
        front.style.transition = 'none';
        back.style.transition  = 'none';
        back.style.opacity     = '0';
        back.classList.add('is-visible'); // z-index/레이아웃 확보

        let done = 0;
        const checkDone = () => {
          if (++done < 2) return;
          // inline style 제거 → CSS 클래스 상태로 복귀
          back.style.opacity     = '';
          back.style.transition  = '';
          front.style.opacity    = '';
          front.style.transition = '';
          front.classList.remove('is-visible');
        };

        cancelFront = springAnimate({
          from: 1, to: 0, ...springOpts,
          onUpdate:   v => { front.style.opacity = String(Math.max(0, Math.min(1, v))); },
          onComplete: checkDone,
        });
        cancelBack = springAnimate({
          from: 0, to: 1, ...springOpts,
          onUpdate:   v => { back.style.opacity  = String(Math.max(0, Math.min(1, v))); },
          onComplete: checkDone,
        });
      };

      const result = {
        cancel: () => { cancelFront?.(); cancelBack?.(); },
        front,
        back,
      };

      if (src) {
        back.src = src;
        if (typeof back.decode === 'function') {
          back.decode().then(doSpringSwap).catch(doSpringSwap);
        } else if (back.complete && back.naturalWidth > 0) {
          doSpringSwap();
        } else {
          back.onload  = doSpringSwap;
          back.onerror = doSpringSwap;
        }
      } else {
        doSpringSwap();
      }
      return result;
    }

    // ── CSS transition 방식 (decode 완료 후 swap) ─────────────────
    const doSwap = () => {
      back.classList.add('is-visible');
      front.classList.remove('is-visible');
    };

    if (src) {
      back.src = src;
      if (typeof back.decode === 'function') {
        back.decode().then(doSwap).catch(doSwap);
      } else if (back.complete && back.naturalWidth > 0) {
        doSwap();
      } else {
        back.onload  = doSwap;
        back.onerror = doSwap;
      }
    } else {
      doSwap();
    }
    return null;
  }

  // ─────────────────────────────────────────
  // 타이틀 프레임 애니메이션 이미지 데이터
  // (피그마 371:1078 animation=1 ~ animation11)
  // ─────────────────────────────────────────
  // 로고 SVG 경로 (로컬 에셋 — 피그마 MCP PNG 대체, 벡터라 모든 크기에서 선명)
  const LOGO_MONO  = 'assets/logo-big.svg';        // 389:248  color=false, type=Default
  const LOGO_COLOR = 'assets/logo-big-color.svg';  // 389:249  color=true,  type=Default

  const TITLE_FRAMES = [
    // animation=1 — 글로시 블롭, 로고 숨김
    { island: 'https://www.figma.com/api/mcp/asset/845a041b-b5fb-430a-a7f3-50b94b08d990',
      logo:   LOGO_MONO, logoVisible: false },
    // animation=2 — 변형 시작, 로고 숨김
    { island: 'https://www.figma.com/api/mcp/asset/36ac7e11-5ec0-41ce-a310-8c35c30320f1',
      logo:   LOGO_MONO, logoVisible: false },
    // animation=3 — 등고선 등장, 로고 표시
    { island: 'https://www.figma.com/api/mcp/asset/ac584753-7934-45ce-8e65-788bdb8fb3dc',
      logo:   LOGO_MONO, logoVisible: true },
    // animation=4
    { island: 'https://www.figma.com/api/mcp/asset/739a6d18-7fd2-453a-90cc-19a77c0d59b6',
      logo:   LOGO_MONO, logoVisible: true },
    // animation=6 — 컬러 로고 등장
    { island: 'https://www.figma.com/api/mcp/asset/2fed74af-dfa1-4104-9dbb-60ad53e9a3e6',
      logo:   LOGO_COLOR, logoVisible: true },
    // animation=7
    { island: 'https://www.figma.com/api/mcp/asset/c1d0c207-3f69-4319-a122-aabb94289f11',
      logo:   LOGO_COLOR, logoVisible: true },
    // animation=8
    { island: 'https://www.figma.com/api/mcp/asset/b9c74efb-ba00-420b-a797-ff296f3238f6',
      logo:   LOGO_COLOR, logoVisible: true },
    // animation=9
    { island: 'https://www.figma.com/api/mcp/asset/5a2ea069-9a82-4a27-a169-694be6999062',
      logo:   LOGO_COLOR, logoVisible: true },
    // animation=10 — 등고선 완성
    { island: 'https://www.figma.com/api/mcp/asset/734578c2-60ac-4e14-8ae7-325b9d240a2f',
      logo:   LOGO_COLOR, logoVisible: true },
  ];

  // 최종 상태 이미지 (springTitleToFinal 시점)
  const TITLE_FINAL_ISLAND = 'https://www.figma.com/api/mcp/asset/c14e2c63-9b63-4aa4-815c-bf3a115d091d';
  const TITLE_FINAL_LOGO   = 'assets/logo-small-color.svg'; // 409:447 color=true, type=logo

  // 이미지 프리로드 (프레임 전환 시 깜빡임 방지)
  ;(function preloadTitleAssets() {
    const urls = [TITLE_FINAL_ISLAND, TITLE_FINAL_LOGO];
    TITLE_FRAMES.forEach(f => { urls.push(f.island); if (f.logo) urls.push(f.logo); });
    urls.forEach(src => { const img = new Image(); img.src = src; });
  })();

  // ─────────────────────────────────────────
  // 공통 스프링 파라미터 (피그마 Custom spring)
  // ─────────────────────────────────────────
  const SPRING = { stiffness: 100, damping: 50, mass: 2 };

  // ─────────────────────────────────────────
  // state-1: 텍스트 등장 — 800ms 대기 후
  // ─────────────────────────────────────────
  setTimeout(() => {
    tagline.classList.add('is-blur');
  }, 800);

  // ─────────────────────────────────────────
  // state-2: glass 페이드아웃 → 텍스트 선명
  // ─────────────────────────────────────────
  setTimeout(() => {
    glass.classList.add('is-hidden');
    tagline.classList.remove('is-blur');
    tagline.classList.add('is-sharp');
  }, 800 + 200);

  // ─────────────────────────────────────────
  // state-3: 색상 진해짐
  // ─────────────────────────────────────────
  setTimeout(() => {
    tagline.classList.remove('is-sharp');
    tagline.classList.add('is-vivid');
  }, 800 + 200 + 100);

  // ─────────────────────────────────────────
  // landing page-5 전환 — 2000ms 시점
  // vivid 완료(1200ms) + After delay 800ms
  // ─────────────────────────────────────────
  setTimeout(() => {

    // 1) 태그라인 현재 px 위치 측정 (transform 포함한 실제 위치)
    const fromTop  = tagline.getBoundingClientRect().top;
    const fromSize = 32;  // px

    // 2) is-vivid 제거 후 인라인 스타일로 현재 위치 고정
    //    (transform Y 제거하고 top 픽셀로 고정 — 시각적 변화 없음)
    //    ⚠️ opacity도 반드시 고정: base .hero__tagline이 opacity:0 이라
    //       is-vivid 제거 순간 inline opacity 없으면 즉시 사라짐
    tagline.classList.remove('is-vivid');
    tagline.style.opacity   = '1';
    tagline.style.top       = fromTop + 'px';
    tagline.style.transform = 'translateX(-50%)';
    tagline.style.fontSize  = fromSize + 'px';
    tagline.style.color     = '#B29367'; // beige-500

    // 3) 완료 카운터 (3개 spring이 모두 끝나면 인라인 style 정리)
    let doneCount = 0;
    const onDone = () => {
      if (++doneCount < 3) return;
      // 인라인 style 제거 → is-active CSS 클래스로 최종값 관리
      tagline.style.opacity   = '';
      tagline.style.top       = '';
      tagline.style.transform = '';
      tagline.style.fontSize  = '';
      tagline.style.color     = '';
      tagline.classList.add('is-active'); // is-active: opacity:1 유지
    };

    // ── 태그라인: 위치 (top: fromTop → 60px) ──
    springAnimate({
      from: fromTop, to: 60,
      ...SPRING,
      onUpdate:  v => { tagline.style.top = v + 'px'; },
      onComplete: onDone,
    });

    // ── 태그라인: 폰트 사이즈 (32px → 20px) ──
    springAnimate({
      from: 32, to: 20,
      ...SPRING,
      onUpdate:  v => { tagline.style.fontSize = v + 'px'; },
      onComplete: onDone,
    });

    // ── 태그라인: 색상 (beige-500 → beige-50) — 위치 이동 중반 이후 시작 ──
    const colorLerp = lerpColor('#B29367', '#FBF9F4');
    setTimeout(() => {
      springAnimate({
        from: 0, to: 1,
        ...SPRING,
        onUpdate:  v => { tagline.style.color = colorLerp(Math.min(Math.max(v, 0), 1)); },
        onComplete: onDone,
      });
    }, 300);

    // ── 둥근 테두리: 페이드인 (opacity 0 → 1) ──
    if (border) {
      springAnimate({
        from: 0, to: 1,
        ...SPRING,
        onUpdate: v => { border.style.opacity = Math.min(Math.max(v, 0), 1); },
        onComplete: () => {
          border.style.opacity = '';
          border.classList.add('is-active');
        },
      });
    }

    // ── 네비게이션: 슬라이드업 (아래서 위로) + 페이드인 ──
    if (nav) {
      // nav의 실제 높이 + bottom 오프셋(42px)만큼 아래에서 올라옴
      const navBottom = nav.offsetHeight + 42; // CSS bottom:42px 포함

      // 초기 인라인 스타일
      nav.style.transform = `translateY(${navBottom}px)`;
      nav.style.opacity   = '0';

      let navDone = 0;
      const onNavDone = () => {
        if (++navDone < 2) return;
        nav.style.transform = '';
        nav.style.opacity   = '';
        nav.classList.add('is-active');
      };

      // 위치: +navBottom px → 0 (아래서 위로)
      springAnimate({
        from: navBottom, to: 0,
        ...SPRING,
        onUpdate:   v => { nav.style.transform = `translateY(${v}px)`; },
        onComplete: onNavDone,
      });

      // 투명도: 0 → 1
      springAnimate({
        from: 0, to: 1,
        ...SPRING,
        onUpdate:   v => { nav.style.opacity = String(Math.min(Math.max(v, 0), 1)); },
        onComplete: onNavDone,
      });
    }

    // ── 슬라이드: 초기화 + 컨테이너 페이드인 ──
    // 피그마 371:4 슬라이드 애니메이션
    // - 활성 슬라이드: top:0, blur 없음
    // - 지나간 슬라이드: top:0, blur(50px) — 위에 올라온 슬라이드에 가려짐
    // - 미래 슬라이드: top = 컨테이너높이+100px (화면 밖, blur 화면 침범 방지)
    // - 전환 Spring: S:20 D:60 M:2 / After delay: 1200ms
    if (slide && slideItems.length > 0) {
      // 화면 기준 시작 Y — 컨테이너 top을 빼서 컨테이너 내부 좌표로 변환
      // "화면 아래 100px" = window.innerHeight + 100 - containerTop
      const getFromY = () => {
        const rect = slide.getBoundingClientRect();
        return window.innerHeight + 100 - rect.top;
      };

      // fromY 캐시
      let cachedFromY    = getFromY();
      let animatingSlide = null; // 현재 애니메이션 중인 슬라이드 (resize 시 제외)

      window.addEventListener('resize', () => {
        cachedFromY = getFromY();
        // 대기 중인 슬라이드 위치를 새 fromY로 갱신 — 화면 커질 때 보이는 버그 방지
        slideItems.forEach(item => {
          if (item === animatingSlide) return;        // 현재 애니메이션 중 → 건드리지 않음
          if (item.classList.contains('is-active')) return; // 이미 표시 중
          if (item.style.display === 'none') return;        // 이미 지나감
          item.style.transform = `translateY(${cachedFromY}px)`;
        });
      }, { passive: true });

      // 초기화: 1번째 정상 위치(블러 없음), 나머지는 화면 아래 + 블러 50px 대기
      slideItems.forEach((item, i) => {
        if (i === 0) {
          item.classList.add('is-active');
          item.style.transform = 'translateY(0)';
        } else {
          item.style.transform = `translateY(${cachedFromY}px)`;
          item.style.filter    = 'blur(50px)';
        }
      });

      // 슬라이드 자동 전환 (1→2→…→7, 7번째에서 종료)
      let slideIdx     = 0;
      let isAnimating  = false; // 중복 실행 방지
      let slideTimer   = null;

      function advanceSlide() {
        if (isAnimating) return;
        if (slideIdx >= slideItems.length - 1) return;

        isAnimating = true;
        const current = slideItems[slideIdx];
        const nextIdx = slideIdx + 1;
        const next    = slideItems[nextIdx];
        const fromY   = cachedFromY;

        // 현재 슬라이드: 제자리 유지, 블러 0 → 50px
        current.classList.remove('is-active');
        current.classList.add('is-passed');
        current.style.willChange = 'filter';
        current.style.filter     = 'blur(0px)';

        // 다음 슬라이드: 시작 상태 (화면 아래, 블러 50px)
        animatingSlide        = next;
        next.style.willChange = 'transform, filter';
        next.style.transform  = `translateY(${fromY}px)`;
        next.style.filter     = 'blur(50px)';

        // duration을 이동 거리에 비례해서 조정
        // 피그마 기준: 720px 프레임에서 fromY≈800px, duration=400ms
        const FIGMA_FROM_Y   = 800;
        const FIGMA_DURATION = 1200;
        const scaledDuration = FIGMA_DURATION * (fromY / FIGMA_FROM_Y);

        // 현재 슬라이드: 블러 0 → 50px (다음 슬라이드와 동일한 속도)
        springAnimate({
          from: 0, to: 1,
          stiffness: 20, damping: 60, mass: 2, duration: scaledDuration,
          onUpdate: p => {
            const v = Math.max(0, Math.min(1, p));
            current.style.filter = `blur(${50 * v}px)`;
          },
          onComplete: () => {
            current.style.filter     = '';
            current.style.willChange = '';
            current.style.display    = 'none';
          },
        });

        // 다음 슬라이드: Y 이동 + 블러 50px → 0 (동일한 duration, 동일한 커브)
        springAnimate({
          from: 0, to: 1,
          stiffness: 20, damping: 60, mass: 2, duration: scaledDuration,
          onUpdate: p => {
            const v = Math.max(0, Math.min(1, p));
            next.style.transform = `translateY(${fromY * (1 - v)}px)`;
            next.style.filter    = `blur(${50 * (1 - v)}px)`;
          },
          onComplete: () => {
            next.style.transform  = 'translateY(0)';
            next.style.filter     = '';
            next.style.willChange = '';
            next.classList.add('is-active');
            animatingSlide = null;
            slideIdx    = nextIdx;
            isAnimating = false;
            if (slideIdx < slideItems.length - 1) {
              slideTimer = setTimeout(advanceSlide, 1200);
            }
          },
        });
      }

      // 컨테이너 페이드인 (spring) → 완료 후 자동 전환 시작
      springAnimate({
        from: 0, to: 1, ...SPRING,
        onUpdate:   v => { slide.style.opacity = String(Math.min(Math.max(v, 0), 1)); },
        onComplete: () => {
          slide.style.opacity = '';
          slide.classList.add('is-active');
          slideTimer = setTimeout(advanceSlide, 1200);
        },
      });
    }

    // ── 메인 타이틀: 태그라인 spring과 동시 시작 (2000ms)
    // 로고 텍스트 애니메이션은 추후 스펙 확정 후 추가 예정
    if (titleWrap) {
      titleWrap.style.opacity = '';
      titleWrap.classList.add('is-active');

      if (islandWrap) {
        // 1단계: opacity 0 → 0.5, SPRING (tagline과 동일한 물리 곡선)
        // 완료 후 2단계(blur 해제 + ellipse 전환) 순차 시작
        let blurStarted = false;
        springAnimate({
          from: 0, to: 0.8, stiffness: 200, damping: 60, mass: 1,
          onUpdate:   v => {
            const ov = String(Math.min(Math.max(v, 0), 0.8));
            islandWrap.style.opacity = ov;
            if (ellipse1Blur) ellipse1Blur.style.opacity = ov;
            if (!blurStarted && v >= 0.4) {
              blurStarted = true;
              islandWrap.classList.add('is-sharp');
              // ── 로고 텍스트 등장 (blur 시작 후 200ms)
              if (logoSample) {
                setTimeout(() => {
                  springAnimate({
                    from: 0, to: 1, stiffness: 80, damping: 20, mass: 1,
                    onUpdate:   v2 => { logoSample.style.opacity = String(Math.max(0, Math.min(1, v2))); },
                    onComplete: () => {
                      logoSample.style.opacity = '';
                      logoSample.classList.add('is-visible');
                    },
                  });
                }, 200);
              }
            }
          },
          onComplete: () => {
            islandWrap.style.opacity = '';
            islandWrap.classList.add('is-opaque');
            if (ellipse1Blur) ellipse1Blur.style.opacity = '0.8';

            // ── 로고 텍스트 색상 전환: beige-50 → orange-500 (S:40 D:20 M:2 / 1200ms)
            // fill: J~n 글자만 orange, 2028은 cream 유지
            // stroke: 전체 획 색상 #362A1C → #A83A00 (orange-800)
            const letterMatrix = document.getElementById('letter-color-matrix');
            const logoFlood    = document.getElementById('logo-flood');
            const letterEls    = ['lc-J','lc-j','lc-e','lc-u','lc-M','lc-i1','lc-s1','lc-s2','lc-i2','lc-o','lc-n']
                                   .map(id => document.getElementById(id)).filter(Boolean);
            const strokeLerp   = lerpColor('#362A1C', '#A83A00');

            // 2028 제외 글자에 fill 변환 필터 적용
            letterEls.forEach(el => { el.style.filter = 'url(#letter-to-orange)'; });

            // ellipse 시작(3450ms)과 동시에 시작하도록 650ms 딜레이
            setTimeout(() => {
              springAnimate({
                from: 0, to: 1, stiffness: 40, damping: 20, mass: 2, duration: 2400,
                onUpdate: v => {
                  const cv = Math.max(0, Math.min(1, v));
                  // fill 변환 matrix (크림→오렌지): R*1.016, G*0.317, B*0.082
                  const rr = (1 + 0.016 * cv).toFixed(4);
                  const gg = (1 - 0.683 * cv).toFixed(4);
                  const bb = (1 - 0.918 * cv).toFixed(4);
                  if (letterMatrix) {
                    letterMatrix.setAttribute('values',
                      `${rr} 0 0 0 0  0 ${gg} 0 0 0  0 0 ${bb} 0 0  0 0 0 1 0`);
                  }
                  // 획 색상 보간
                  if (logoFlood) logoFlood.setAttribute('flood-color', strokeLerp(cv));
                },
                onComplete: () => {
                  if (letterMatrix) letterMatrix.setAttribute('values',
                    '1.016 0 0 0 0  0 0.317 0 0 0  0 0 0.082 0 0  0 0 0 1 0');
                  if (logoFlood) logoFlood.setAttribute('flood-color', '#A83A00');
                  logoSample.classList.add('is-orange');
                },
              });
            }, 650);

            // ── Ellipse 1 스타일 전환 (blur 해제 200ms 후)
            const ellipse1  = document.getElementById('ellipse1');
            const ellipse1B = document.getElementById('ellipse1B');
            if (ellipse1 && ellipse1B) {
              setTimeout(() => {
                let done = 0;
                const onDone = () => {
                  if (++done < 2) return;
                  ellipse1.style.opacity = '';
                  ellipse1.style.display = 'none';
                  ellipse1B.style.opacity = '';
                  ellipse1B.classList.add('is-visible');
                };
                springAnimate({
                  from: 1, to: 0, stiffness: 80, damping: 20, mass: 1, duration: 1600,
                  onUpdate: v => {
                    const ov = String(Math.max(0, Math.min(1, v)));
                    ellipse1.style.opacity = ov;
                    if (ellipse1Blur) ellipse1Blur.style.opacity = ov; // 1→0 동시 페이드
                  },
                  onComplete: onDone,
                });
                springAnimate({
                  from: 0, to: 1, stiffness: 80, damping: 20, mass: 1, duration: 1600,
                  onUpdate:   v => { ellipse1B.style.opacity = String(Math.max(0, Math.min(1, v))); },
                  onComplete: onDone,
                });
              }, 650);
            }

            // ── Ellipse 2 등장 (ellipse1→1B 시작 550ms 후: 650-100 → 1200ms)
            const ellipse2 = document.getElementById('ellipse2');
            const ellipse3 = document.getElementById('ellipse3');
            const ellipse4 = document.getElementById('ellipse4');
            if (ellipse2) {
              let ellipse3Started = false;
              setTimeout(() => {
                springAnimate({
                  from: 0, to: 0.8, stiffness: 80, damping: 20, mass: 1,
                  onUpdate: v => {
                    ellipse2.style.opacity = String(Math.max(0, Math.min(0.8, v)));
                    // ── Ellipse 3: ellipse2 70% 도달 시 시작 (약 600ms 겹침)
                    if (!ellipse3Started && v >= 0.56 && ellipse3) {
                      ellipse3Started = true;
                      let ellipse4Started = false;
                      springAnimate({
                        from: 0, to: 0.8, stiffness: 80, damping: 20, mass: 1,
                        onUpdate: v2 => {
                          ellipse3.style.opacity = String(Math.max(0, Math.min(0.8, v2)));
                          // ── Ellipse 4: ellipse3 70% 도달 시 시작 (S:50 D:20 M:2 — 느리게)
                          if (!ellipse4Started && v2 >= 0.40 && ellipse4) {
                            ellipse4Started = true;

                            const E4_DUR = 1700; // ellipse4 duration

                            // ── Landing page-6 전환: ellipse4 시작 기준 고정 타이머
                            // onComplete 대기 없이 ellipse4 시작 시점에서 예약
                            setTimeout(() => {
                              const fromE1 = parseFloat(window.getComputedStyle(islandWrap).opacity) || 0.8;
                              const fromE2 = parseFloat(window.getComputedStyle(ellipse2).opacity)   || 0.8;
                              const fromE3 = parseFloat(window.getComputedStyle(ellipse3).opacity)   || 0.8;
                              const fromE4 = parseFloat(window.getComputedStyle(ellipse4).opacity)   || 0.8;

                              let fadeCount = 0;
                              const onFadeDone = () => {
                                if (++fadeCount < 4) return;
                                islandWrap.style.display = 'none';
                                ellipse2.style.display   = 'none';
                                ellipse3.style.display   = 'none';
                                ellipse4.style.display   = 'none';
                              };

                              const FADE = { stiffness: 20, damping: 20, mass: 1, duration: 600 };
                              springAnimate({ from: fromE1, to: 0, ...FADE,
                                onUpdate: fv => {
                                  const ov = String(Math.max(0, fv));
                                  islandWrap.style.opacity = ov;
                                  if (ellipse1Blur) ellipse1Blur.style.opacity = ov;
                                },
                                onComplete: onFadeDone });
                              springAnimate({ from: fromE2, to: 0, ...FADE,
                                onUpdate: fv => { ellipse2.style.opacity = String(Math.max(0, fv)); },
                                onComplete: onFadeDone });
                              springAnimate({ from: fromE3, to: 0, ...FADE,
                                onUpdate: fv => { ellipse3.style.opacity = String(Math.max(0, fv)); },
                                onComplete: onFadeDone });
                              springAnimate({ from: fromE4, to: 0, ...FADE,
                                onUpdate: fv => { ellipse4.style.opacity = String(Math.max(0, fv)); },
                                onComplete: onFadeDone });

                              // ── Logo 2단계 애니메이션
                              // Phase 1: 제자리 축소 (S:20 D:20 M:1 / 600ms)
                              // Phase 2: 그룹 이동 + 내부 재배치 (S:80 D:100 M:3 / 360ms)
                              if (logoSample) {
                                const heroEl = document.querySelector('.hero');

                                // ── 즉시 body로 이동 (overflow:hidden / transform 조상 탈출)
                                const initR = logoSample.getBoundingClientRect();
                                document.body.appendChild(logoSample);
                                logoSample.style.position = 'fixed';
                                logoSample.style.left     = initR.left   + 'px';
                                logoSample.style.top      = initR.top    + 'px';
                                logoSample.style.width    = initR.width  + 'px';
                                logoSample.style.height   = initR.height + 'px';
                                logoSample.style.overflow = 'visible';
                                logoSample.style.zIndex   = '999';

                                // ── Phase 1: scale 1 → 0.610 (피그마 animation11: 217.72×100)
                                const PHASE1_SCALE = 217.72 / 356.898;
                                logoSample.style.transformOrigin = 'center center';

                                springAnimate({
                                  from: 1, to: PHASE1_SCALE,
                                  stiffness: 70, damping: 37, mass: 1,
                                  onUpdate: s => { logoSample.style.transform = `scale(${s})`; },
                                  onComplete: () => {
                                    // ── Phase 2 준비: scale → 실제 layout으로 전환
                                    const sampleR   = logoSample.getBoundingClientRect();
                                    const heroR     = heroEl.getBoundingClientRect();
                                    const lcEls     = Array.from(logoSample.querySelectorAll('.lc'));
                                    const lcScreenR = lcEls.map(el => el.getBoundingClientRect());

                                    logoSample.style.left            = sampleR.left   + 'px';
                                    logoSample.style.top             = sampleR.top    + 'px';
                                    logoSample.style.width           = sampleR.width  + 'px';
                                    logoSample.style.height          = sampleR.height + 'px';
                                    logoSample.style.transform       = 'none';
                                    logoSample.style.transformOrigin = '';

                                    // 각 글자: 뷰포트 좌표 → 컨테이너 기준 상대 좌표
                                    lcEls.forEach((el, i) => {
                                      const r = lcScreenR[i];
                                      el.style.left   = (r.left - sampleR.left) + 'px';
                                      el.style.top    = (r.top  - sampleR.top)  + 'px';
                                      el.style.width  = r.width  + 'px';
                                      el.style.height = r.height + 'px';
                                    });

                                    // ── Phase 2: 컨테이너 이동 + 내부 재배치
                                    // 피그마 landing page-6 (1280×720): x=92, y=328, w=185.59, h=64
                                    const scale1280 = window.innerWidth / 1280;
                                    const toW  = 185.588; // 고정값 — 뷰포트 무관하게 Figma 스펙 유지
                                    const toH  = 64;      // 고정값
                                    const toCX = heroR.left + 92 * scale1280;
                                    const toCY = heroR.top  + heroR.height * 0.5 - toH / 2;

                                    const fromCX = sampleR.left;
                                    const fromCY = sampleR.top;
                                    const fromCW = sampleR.width;
                                    const fromCH = sampleR.height;

                                    // 피그마 실측 좌표 (node 811:1024, 185.588×64 프레임 기준)
                                    const hScale = toW / 185.588; // = 1.0 (toW 고정값이므로)
                                    const H_POS = {
                                      'lc-J':    { x:   3.99, y:  5.98, w: 62.03, h: 54.03 },
                                      'lc-j':    { x:  33.32, y: 20.44, w: 35.54, h: 36.62 },
                                      'lc-e':    { x:  40.61, y: 32.49, w: 10.72, h: 12.06 },
                                      'lc-u':    { x:  66.49, y: 31.06, w: 14.68, h: 12.12 },
                                      'lc-M':    { x:  87.26, y: 20.47, w: 29.43, h: 22.68 },
                                      'lc-i1':   { x: 113.34, y: 17.26, w: 18.65, h: 25.81 },
                                      'lc-s1':   { x: 127.31, y: 29.82, w:  7.73, h: 12.06 },
                                      'lc-s2':   { x: 137.12, y: 29.82, w:  7.73, h: 12.06 },
                                      'lc-i2':   { x: 146.31, y: 29.84, w:  6.93, h: 11.71 },
                                      'lc-o':    { x: 153.55, y: 29.73, w: 12.59, h: 12.21 },
                                      'lc-n':    { x: 166.61, y: 29.76, w: 14.99, h: 11.79 },
                                      'lc-2028': { x: 137.49, y: 13.57, w: 28.46, h:  8.60 },
                                    };

                                    const lcFrom = lcEls.map((el, i) => {
                                      const r = lcScreenR[i];
                                      return { x: r.left - sampleR.left, y: r.top - sampleR.top, w: r.width, h: r.height };
                                    });
                                    const lcTo = lcEls.map(el => {
                                      const hp = H_POS[el.id];
                                      if (!hp) return null;
                                      return { x: hp.x * hScale, y: hp.y * hScale, w: hp.w * hScale, h: hp.h * hScale };
                                    });

                                    springAnimate({
                                      from: 0, to: 1, stiffness: 280, damping: 100, mass: 2,
                                      onUpdate: p => {
                                        const t = Math.max(0, p); // 상단 클램프 제거 — 미세 오버슈트 시 왼쪽으로 자연 정착
                                        // 컨테이너 전체 이동 + 크기 변화
                                        logoSample.style.left   = (fromCX + (toCX - fromCX) * t) + 'px';
                                        logoSample.style.top    = (fromCY + (toCY - fromCY) * t) + 'px';
                                        logoSample.style.width  = (fromCW + (toW  - fromCW) * t) + 'px';
                                        logoSample.style.height = (fromCH + (toH  - fromCH) * t) + 'px';
                                        // 각 글자 컨테이너 기준 상대 좌표 변화
                                        lcEls.forEach((el, i) => {
                                          const f = lcFrom[i];
                                          const to = lcTo[i];
                                          if (!f || !to) return;
                                          el.style.left   = (f.x + (to.x - f.x) * t) + 'px';
                                          el.style.top    = (f.y + (to.y - f.y) * t) + 'px';
                                          el.style.width  = (f.w + (to.w - f.w) * t) + 'px';
                                          el.style.height = (f.h + (to.h - f.h) * t) + 'px';
                                        });
                                      },
                                      onComplete: () => {
                                        logoSample.style.left   = toCX + 'px';
                                        logoSample.style.top    = toCY + 'px';
                                        logoSample.style.width  = toW  + 'px';
                                        logoSample.style.height = toH  + 'px';
                                        lcEls.forEach((el, i) => {
                                          const to = lcTo[i];
                                          if (!to) return;
                                          el.style.left   = to.x + 'px';
                                          el.style.top    = to.y + 'px';
                                          el.style.width  = to.w + 'px';
                                          el.style.height = to.h + 'px';
                                        });

                                        // 가로형 로고 이미지로 crossfade 교체
                                        const hImg = document.createElement('img');
                                        hImg.src             = 'assets/logo-small-color.svg';
                                        hImg.alt             = '';
                                        hImg.draggable       = false;
                                        hImg.style.position  = 'fixed';
                                        hImg.style.left      = toCX + 'px';
                                        hImg.style.top       = toCY + 'px';
                                        hImg.style.width     = toW  + 'px';
                                        hImg.style.height    = toH  + 'px';
                                        hImg.style.opacity   = '0';
                                        hImg.style.pointerEvents = 'none';
                                        hImg.style.zIndex    = '999';
                                        document.body.appendChild(hImg);

                                        springAnimate({
                                          from: 0, to: 1, stiffness: 80, damping: 40, mass: 1, duration: 400,
                                          onUpdate: v => {
                                            const cv = Math.max(0, Math.min(1, v));
                                            hImg.style.opacity       = String(cv);
                                            logoSample.style.opacity = String(1 - cv);
                                          },
                                          onComplete: () => {
                                            logoSample.remove();
                                            heroEl.appendChild(hImg);
                                            // 반응형 위치 — 리사이즈 시에도 세로 중앙 유지
                                            hImg.style.position  = 'absolute';
                                            hImg.style.left      = (92 * scale1280 / heroR.width * 100).toFixed(4) + '%';
                                            hImg.style.top       = '50%';
                                            hImg.style.transform = 'translateY(-50%)';
                                            hImg.style.opacity   = '';
                                            hImg.style.zIndex    = '';
                                          },
                                        });
                                      },
                                    });

                                    // ── 카드 + 챗봇 fade-in: Phase 2(로고 이동)와 동시 시작
                                    const heroCard    = document.getElementById('heroCard');
                                    const chatbotWrap = document.getElementById('chatbotWrap');
                                    if (heroCard) {
                                      springAnimate({
                                        from: 0, to: 1, stiffness: 80, damping: 100, mass: 3, duration: 600,
                                        onUpdate:   cv => { heroCard.style.opacity = String(Math.max(0, Math.min(1, cv))); },
                                        onComplete: () => {
                                          heroCard.style.opacity = '';
                                          heroCard.classList.add('is-active');
                                        },
                                      });
                                    }
                                    if (chatbotWrap) {
                                      springAnimate({
                                        from: 0, to: 1, stiffness: 80, damping: 100, mass: 3, duration: 600,
                                        onUpdate:   cv => { chatbotWrap.style.opacity = String(Math.max(0, Math.min(1, cv))); },
                                        onComplete: () => { chatbotWrap.style.opacity = ''; chatbotWrap.classList.add('is-active'); },
                                      });
                                    }
                                  },
                                });
                              } // if (logoSample)
                            }, E4_DUR); // ellipse4 시작 후 1700ms (duration 1700, buffer 없음)

                            springAnimate({
                              from: 0, to: 0.8, stiffness: 50, damping: 20, mass: 2, duration: E4_DUR,
                              onUpdate:   v3 => { ellipse4.style.opacity = String(Math.max(0, Math.min(0.8, v3))); },
                              onComplete: () => {
                                ellipse4.style.opacity = '';
                                ellipse4.classList.add('is-visible');
                              },
                            });
                          }
                        },
                        onComplete: () => {
                          ellipse3.style.opacity = '';
                          ellipse3.classList.add('is-visible');
                        },
                      });
                    }
                  },
                  onComplete: () => {
                    ellipse2.style.opacity = '';
                    ellipse2.classList.add('is-visible');
                  },
                });
              }, 1200);
            }
          },
        });
      }
    }

  }, 800 + 200 + 100 + 100 + 300); // = 1500ms

  // ── 메뉴 클릭 — Custom Spring S:200 D:100 M:2 ──
  const NAV_CLICK_SPRING = { stiffness: 200, damping: 100, mass: 2 };

  // 피그마 실측 색상값 (CSS 토큰과 동일)
  const NC = {
    bgActive:  '#FBF9F4',  // beige-50
    koDefault: '#B29367',  // beige-500
    koActive:  '#745C3E',  // beige-700
    enDefault: '#C6AE88',  // beige-400
    enActive:  '#94774F',  // beige-600
  };

  // computed rgb(...) → hex 변환, 투명(alpha=0)이면 null
  function rgbStrToHex(rgb) {
    const m = (rgb || '').match(/[\d.]+/g);
    if (!m || m.length < 3) return null;
    if (m.length >= 4 && parseFloat(m[3]) === 0) return null;
    return '#' + [0,1,2].map(i => Math.round(+m[i]).toString(16).padStart(2,'0')).join('');
  }

  // 투명↔색상 보간 (alpha 채널 사용)
  function lerpBg(fromHex, toHex) {
    const ch = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
    if (!fromHex && !toHex) return () => '';
    if (!fromHex) { const [r,g,b] = ch(toHex); return t => `rgba(${r},${g},${b},${Math.min(Math.max(t,0),1).toFixed(3)})`; }
    if (!toHex)   { const [r,g,b] = ch(fromHex); return t => `rgba(${r},${g},${b},${(1-Math.min(Math.max(t,0),1)).toFixed(3)})`; }
    return lerpColor(fromHex, toHex); // color→color
  }

  // currentActiveLink: 클릭 즉시 업데이트 (spring 완료 전에도 정확히 추적)
  // → DOM 쿼리 대신 변수로 관리해 "동시 선택" 버그 차단
  let currentActiveLink = document.querySelector('.nav__link.is-active');

  // 진행 중인 spring cancel 함수 목록
  const navCancels = [];
  function cancelNavSprings() {
    while (navCancels.length) navCancels.pop()();
  }

  // 헬퍼: 스프링 실행 + cancel 등록
  function runNavSpring(opts) {
    navCancels.push(springAnimate(opts));
  }

  // 선택 애니메이션 (→ active)
  function navActivate(link) {
    const ko = link.querySelector('.nav__link-ko');
    const en = link.querySelector('.nav__link-en');

    // 현재 시각적 상태 읽기 (CSS hover transition 진행 중일 수 있음)
    const fromBg = rgbStrToHex(window.getComputedStyle(link).backgroundColor);
    const fromKo = ko ? (rgbStrToHex(window.getComputedStyle(ko).color) || NC.koDefault) : NC.koDefault;
    const fromEn = en ? (rgbStrToHex(window.getComputedStyle(en).color) || NC.enDefault) : NC.enDefault;
    const fromSz = ko ? parseFloat(window.getComputedStyle(ko).fontSize) : 14;

    link.style.transition = 'none';
    if (ko) ko.style.transition = 'none';
    if (en) en.style.transition = 'none';

    const bgLerp = lerpBg(fromBg, NC.bgActive);
    const koLerp = lerpColor(fromKo, NC.koActive);
    const enLerp = lerpColor(fromEn, NC.enActive);

    let done = 0;
    const onDone = () => {
      if (++done < 4) return;
      // 이 link가 여전히 currentActiveLink인 경우에만 is-active 부여
      // → 빠른 연속 클릭 시 이전 spring이 is-active를 잘못 추가하는 버그 방지
      if (currentActiveLink !== link) return;
      link.style.backgroundColor = '';
      link.style.transition = '';
      if (ko) { ko.style.color = ''; ko.style.fontSize = ''; ko.style.transition = ''; }
      if (en) { en.style.color = ''; en.style.transition = ''; }
      link.classList.add('is-active');
    };

    runNavSpring({ from: 0, to: 1, ...NAV_CLICK_SPRING,
      onUpdate: v => { link.style.backgroundColor = bgLerp(v); }, onComplete: onDone });
    runNavSpring({ from: 0, to: 1, ...NAV_CLICK_SPRING,
      onUpdate: v => { if (ko) ko.style.color = koLerp(Math.min(Math.max(v,0),1)); }, onComplete: onDone });
    runNavSpring({ from: 0, to: 1, ...NAV_CLICK_SPRING,
      onUpdate: v => { if (en) en.style.color = enLerp(Math.min(Math.max(v,0),1)); }, onComplete: onDone });
    runNavSpring({ from: fromSz, to: 16, ...NAV_CLICK_SPRING,
      onUpdate: v => { if (ko) ko.style.fontSize = v + 'px'; }, onComplete: onDone });
  }

  // 해제 애니메이션 (active → default)
  function navDeactivate(link) {
    const ko = link.querySelector('.nav__link-ko');
    const en = link.querySelector('.nav__link-en');

    link.classList.remove('is-active');

    // 현재 시각적 상태를 읽어 시작점으로 (중간 애니메이션 중단 후에도 자연스럽게)
    const fromBg = rgbStrToHex(window.getComputedStyle(link).backgroundColor) || NC.bgActive;
    const fromKo = ko ? (rgbStrToHex(window.getComputedStyle(ko).color) || NC.koActive) : NC.koActive;
    const fromEn = en ? (rgbStrToHex(window.getComputedStyle(en).color) || NC.enActive) : NC.enActive;
    const fromSz = ko ? parseFloat(window.getComputedStyle(ko).fontSize) : 16;

    link.style.transition = 'none';
    if (ko) ko.style.transition = 'none';
    if (en) en.style.transition = 'none';

    const bgLerp = lerpBg(fromBg, null);
    const koLerp = lerpColor(fromKo, NC.koDefault);
    const enLerp = lerpColor(fromEn, NC.enDefault);

    let done = 0;
    const onDone = () => {
      if (++done < 4) return;
      link.style.backgroundColor = '';
      link.style.transition = '';
      if (ko) { ko.style.color = ''; ko.style.fontSize = ''; ko.style.transition = ''; }
      if (en) { en.style.color = ''; en.style.transition = ''; }
    };

    runNavSpring({ from: 0, to: 1, ...NAV_CLICK_SPRING,
      onUpdate: v => { link.style.backgroundColor = bgLerp(v); }, onComplete: onDone });
    runNavSpring({ from: 0, to: 1, ...NAV_CLICK_SPRING,
      onUpdate: v => { if (ko) ko.style.color = koLerp(Math.min(Math.max(v,0),1)); }, onComplete: onDone });
    runNavSpring({ from: 0, to: 1, ...NAV_CLICK_SPRING,
      onUpdate: v => { if (en) en.style.color = enLerp(Math.min(Math.max(v,0),1)); }, onComplete: onDone });
    runNavSpring({ from: fromSz, to: 14, ...NAV_CLICK_SPRING,
      onUpdate: v => { if (ko) ko.style.fontSize = v + 'px'; }, onComplete: onDone });
  }

  // ─────────────────────────────────────────
  // 타이틀 프레임 애니메이션 — crossfade 방식
  // 80ms마다 A/B img를 교차 전환 (60ms ease-out CSS transition)
  // → 피그마 Smart Animate처럼 이미지 간 스르르 전환
  // ─────────────────────────────────────────
  // ── 피그마 animation=6: 로고 mono→color 전환 스프링 (S:40 D:20 M:2) ──
  const COLOR_CHANGE_SPRING = { stiffness: 40, damping: 20, mass: 2 };
  let logoColorSpring = null; // 진행 중인 color 전환 추적 (springTitleToFinal에서 취소용)

  function playTitleFrameAnimation() {
    if (!islandA && !logoA) return;

    const FRAME_MS = 80; // 프레임 간격 (ms)
    let frameIdx = 0;

    function nextFrame() {
      if (frameIdx >= TITLE_FRAMES.length) {
        // 모든 프레임 완료 → 스프링으로 최종 위치 이동
        springTitleToFinal();
        return;
      }

      const f = TITLE_FRAMES[frameIdx];
      const prevLogo = frameIdx > 0 ? TITLE_FRAMES[frameIdx - 1].logo : null;

      // island crossfade — CSS transition 방식
      if (islandA && islandB) crossfade(islandA, islandB, f.island, true);

      // logo crossfade — logo URL이 처음 바뀌는 순간(mono→color)만 spring 적용
      if (logoA && logoB) {
        const useSpring = (f.logoVisible && f.logo !== prevLogo) ? COLOR_CHANGE_SPRING : undefined;
        const result = crossfade(logoA, logoB, f.logo || null, f.logoVisible, useSpring);
        if (result) logoColorSpring = result;
      }

      frameIdx++;
      setTimeout(nextFrame, FRAME_MS);
    }

    nextFrame();
  }

  // ─────────────────────────────────────────
  // 타이틀 최종 상태 전환 (이동 없음 — 위치는 화면 중앙 유지)
  // 이동 애니메이션은 추후 타이밍 확정 후 추가 예정
  // ─────────────────────────────────────────
  function springTitleToFinal() {
    if (!titleWrap) return;

    // logo color spring이 아직 진행 중이면 취소 후 상태 강제 정리
    if (logoColorSpring) {
      logoColorSpring.cancel();
      logoColorSpring.front.style.opacity    = '';
      logoColorSpring.front.style.transition = '';
      logoColorSpring.front.classList.remove('is-visible');
      logoColorSpring.back.style.opacity     = '';
      logoColorSpring.back.style.transition  = '';
      logoColorSpring = null;
    }

    // 로고 최종 이미지로 crossfade 교체 (위치 이동 없음)
    if (logoA && logoB) crossfade(logoA, logoB, TITLE_FINAL_LOGO, true);
  }

  // ─────────────────────────────────────────
  // 메뉴 클릭 — Custom Spring S:200 D:100 M:2
  // ─────────────────────────────────────────

  const navLinks = document.querySelectorAll('.nav__link');
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      if (link === currentActiveLink) return; // 이미 선택된 항목 클릭 무시

      // 진행 중인 모든 spring 취소 (이전 activate/deactivate 동시 차단)
      cancelNavSprings();

      const prev = currentActiveLink;
      currentActiveLink = link; // 클릭 즉시 갱신 (spring 완료 전에도 추적)

      if (prev) navDeactivate(prev);
      navActivate(link);

      // ── 패널 전환
      const panels     = ['about', 'schedule', 'preregister', 'location', 'news'];
      const idx        = Array.from(navLinks).indexOf(link);
      const panelName  = panels[idx];
      if (panelName) {
        document.querySelectorAll('.hero__card-panel').forEach(p => p.classList.remove('is-active'));
        const target = document.querySelector(`.hero__card-panel[data-panel="${panelName}"]`);
        if (target) target.classList.add('is-active');
      }
    });
  });

})();

/* =============================================
   COUNTDOWN — JEMI 2028 카운트다운
   목표: 2028년 7월 3일 00:00:00 KST (UTC+9)
   ============================================= */
(function () {
  'use strict';

  // 목표 시각 — ISO 8601 timezone offset 포함 (KST = +09:00)
  const TARGET = new Date('2028-07-03T00:00:00+09:00');

  const elDays    = document.getElementById('cd-days');
  const elHours   = document.getElementById('cd-hours');
  const elMinutes = document.getElementById('cd-minutes');
  const elSeconds = document.getElementById('cd-seconds');

  if (!elDays || !elHours || !elMinutes || !elSeconds) return;

  function pad2(n) { return String(n).padStart(2, '0'); }

  function updateCountdown() {
    const diff = TARGET - Date.now();

    if (diff <= 0) {
      // 대회 시작! — 0으로 고정
      elDays.textContent    = '0';
      elHours.textContent   = '00';
      elMinutes.textContent = '00';
      elSeconds.textContent = '00';
      return;
    }

    const totalSec = Math.floor(diff / 1000);
    const days    = Math.floor(totalSec / 86400);
    const hours   = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    // DAYS는 패딩 없음 (3자리 가능), 나머지는 2자리 패딩
    elDays.textContent    = String(days);
    elHours.textContent   = pad2(hours);
    elMinutes.textContent = pad2(minutes);
    elSeconds.textContent = pad2(seconds);
  }

  // 즉시 실행 후 1초마다 갱신
  updateCountdown();
  setInterval(updateCountdown, 1000);

})();

/* =============================================
   NEWS SCROLLBAR — 스크롤 시에만 표시 + 썸 위치 갱신
   ============================================= */
(function () {
  'use strict';

  const scrollArea = document.querySelector('.news-scroll-area');
  const barArea    = document.getElementById('newsScrollBar');
  const barThumb   = document.getElementById('newsScrollThumb');

  if (!scrollArea || !barArea || !barThumb) return;

  let hideTimer;

  function updateThumb() {
    const { scrollTop, scrollHeight, clientHeight } = scrollArea;
    const scrollable = scrollHeight - clientHeight;
    if (scrollable <= 0) return;

    // 트랙 범위 = barArea 높이 - 상하 패딩(16×2) - 썸 높이(80)
    const paddingV  = 16;
    const thumbH    = barThumb.offsetHeight;
    const trackH    = barArea.clientHeight - paddingV * 2;
    const maxOffset = Math.max(0, trackH - thumbH);
    const offset    = (scrollTop / scrollable) * maxOffset;

    barThumb.style.transform = `translateY(${offset}px)`;
  }

  function onScroll() {
    updateThumb();

    // 표시
    barArea.classList.add('is-scrolling');

    // 1.2초 뒤 숨김 (스크롤 멈추면)
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      barArea.classList.remove('is-scrolling');
    }, 1200);
  }

  scrollArea.addEventListener('scroll', onScroll, { passive: true });

})();

/* ── 일정 탭 전환 ── */
(function () {
  'use strict';
  const tabs   = document.querySelectorAll('.sched-tab');
  const panels = document.querySelectorAll('.sched-panel');
  if (!tabs.length) return;

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      const day = tab.dataset.day;

      tabs.forEach(function (t) { t.classList.remove('is-active'); });
      tab.classList.add('is-active');

      panels.forEach(function (p) { p.classList.remove('is-active'); });
      const target = document.querySelector('.sched-panel[data-day="' + day + '"]');
      if (target) target.classList.add('is-active');
    });
  });
})();

/* =============================================
   ABOUT SCROLLBAR — 스크롤 시에만 표시 + 썸 위치 갱신
   ============================================= */
(function () {
  'use strict';

  const scrollArea = document.querySelector('.about-scroll-area');
  const barArea    = document.getElementById('aboutScrollBar');
  const barThumb   = document.getElementById('aboutScrollThumb');

  if (!scrollArea || !barArea || !barThumb) return;

  let hideTimer;

  function updateThumb() {
    const { scrollTop, scrollHeight, clientHeight } = scrollArea;
    const scrollable = scrollHeight - clientHeight;
    if (scrollable <= 0) return;

    const paddingV  = 16;
    const thumbH    = barThumb.offsetHeight;
    const trackH    = barArea.clientHeight - paddingV * 2;
    const maxOffset = Math.max(0, trackH - thumbH);
    const offset    = (scrollTop / scrollable) * maxOffset;

    barThumb.style.transform = `translateY(${offset}px)`;
  }

  function onScroll() {
    updateThumb();
    barArea.classList.add('is-scrolling');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      barArea.classList.remove('is-scrolling');
    }, 1200);
  }

  scrollArea.addEventListener('scroll', onScroll, { passive: true });

})();

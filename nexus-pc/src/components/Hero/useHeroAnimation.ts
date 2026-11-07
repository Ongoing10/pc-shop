import { useEffect, useRef, useCallback } from 'react';
import { createFog, FogInstance } from './fog';
import { ANIM } from './heroConfig';
import { smooth, clamp } from './math';

export interface AnimState {
  k: number;
  k2: number;
  from: number;
  target: number;
  start: number;
  animating: boolean;
  swapped: boolean;
  queued: number | null;
  clock: number;
}

export function useHeroAnimation(
  heroRef: React.RefObject<HTMLElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  setShownSet: React.Dispatch<React.SetStateAction<0 | 1>>
) {
  const stateRef = useRef<AnimState>({
    k: 1,
    k2: 1,
    from: 1,
    target: 1,
    start: 0,
    animating: false,
    swapped: true,
    queued: null,
    clock: 0,
  });

  const fogRef = useRef<FogInstance | null>(null);
  const animFrameId = useRef<number>(0);
  const reducedMotionRef = useRef<boolean>(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (canvasRef.current) {
      fogRef.current = createFog(canvasRef.current);
    }

    const handleResize = () => {
      fogRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    let lastTime = performance.now();
    let hidden = false;

    const handleVisibility = () => {
      hidden = document.hidden;
      if (!hidden) {
        lastTime = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const loop = (now: number) => {
      animFrameId.current = requestAnimationFrame(loop);
      if (hidden) return;

      const dt = (now - lastTime) / 1000;
      lastTime = now;
      stateRef.current.clock += dt;

      const st = stateRef.current;
      let y = 0;
      let s = 0;
      let dip = 0;

      if (st.animating) {
        const d = now - st.start;
        const { SINK, RISE, DEPTH } = ANIM;

        if (d < SINK) {
          const x = clamp(d / SINK);
          y = x * x * (3 - 2 * x) * DEPTH;
        } else {
          if (!st.swapped && d >= SINK) {
            st.swapped = true;
            setShownSet(st.target as 0 | 1);
          }
          const x = clamp((d - SINK) / RISE);
          y = Math.pow(1 - x, 3.4) * DEPTH;
        }

        s = smooth(0, SINK * 0.92, d) * (1 - smooth(SINK + 70, SINK + RISE * 0.92, d));
        dip = smooth(30, 190, d) * (1 - smooth(330, 720, d));

        st.k = st.from + (st.target - st.from) * smooth(120, 520, d);
        st.k2 = st.from + (st.target - st.from) * smooth(340, 760, d);

        if (d >= SINK + RISE) {
          st.animating = false;
          st.k = st.target;
          st.k2 = st.target;
          y = 0;
          s = 0;
          dip = 0;

          if (st.queued !== null && st.queued !== st.target) {
            const nextTarget = st.queued;
            st.queued = null;
            startAnim(nextTarget, now);
          }
        }
      }

      if (heroRef.current) {
        const elStyle = heroRef.current.style;
        elStyle.setProperty('--sink', (y * window.innerHeight).toFixed(1) + 'px');
        elStyle.setProperty('--k', st.k.toFixed(4));
        elStyle.setProperty('--k2', st.k2.toFixed(4));
        elStyle.setProperty('--dip', dip.toFixed(4));
      }

      fogRef.current?.render(st.clock, s, st.k);
    };

    animFrameId.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      fogRef.current?.destroy();
    };
  }, []);

  const startAnim = (newTarget: number, now: number) => {
    const st = stateRef.current;
    if (reducedMotionRef.current) {
      st.k = newTarget;
      st.k2 = newTarget;
      st.target = newTarget;
      setShownSet(newTarget as 0 | 1);
      if (heroRef.current) {
        heroRef.current.style.setProperty('--k', String(newTarget));
        heroRef.current.style.setProperty('--k2', String(newTarget));
        heroRef.current.style.setProperty('--sink', '0px');
        heroRef.current.style.setProperty('--dip', '0');
      }
      return;
    }

    st.from = st.k;
    st.target = newTarget;
    st.start = now;
    st.animating = true;
    st.swapped = false;
  };

  const select = useCallback((mode: 0 | 1) => {
    const st = stateRef.current;
    if (mode === st.target && st.queued === null) return;

    const now = performance.now();
    if (st.animating) {
      st.queued = mode;
    } else {
      startAnim(mode, now);
    }
  }, []);

  return { select };
}

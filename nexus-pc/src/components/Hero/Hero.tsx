import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BsArrowRight } from 'react-icons/bs';
import { IMAGES, COPY } from './heroConfig';
import { useHeroAnimation } from './useHeroAnimation';
import './hero.css';

export interface HeroProps {
  className?: string;
}

const AUTO_SWITCH_MS = 12000;

export default function Hero({ className = '' }: HeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<0 | 1>(1); // 0 = Văn phòng, 1 = Gaming
  const [shownSet, setShownSet] = useState<0 | 1>(1);
  // Tự đổi cảnh dừng hẳn khi người dùng đã tự chọn, và tạm dừng khi đang rê chuột/focus vào hero
  const [userPicked, setUserPicked] = useState(false);
  const [paused, setPaused] = useState(false);

  const { select } = useHeroAnimation(heroRef, canvasRef, setShownSet);

  const choose = (next: 0 | 1) => {
    setUserPicked(true);
    setMode(next);
    select(next);
  };

  useEffect(() => {
    if (userPicked || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const interval = setInterval(() => {
      setMode((prev) => {
        const next = prev === 0 ? 1 : 0;
        select(next);
        return next;
      });
    }, AUTO_SWITCH_MS);

    return () => clearInterval(interval);
  }, [select, userPicked, paused]);

  const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  };

  return (
    <section
      className={`hero ${className}`}
      ref={heroRef}
      aria-label="Chọn cấu hình PC theo nhu cầu"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Layer 1: Sky backdrop */}
      <div className="sky" aria-hidden="true">
        <img src={IMAGES.bgOffice} alt="" decoding="async" onError={hideOnError} />
        <img className="bg-gaming" src={IMAGES.bgGaming} alt="" decoding="async" onError={hideOnError} />
      </div>

      {/* Layer 2: Moving desk & PC sets */}
      <div className="home" aria-hidden="true">
        <div className={`set ${shownSet === 0 ? 'is-on' : ''}`}>
          <img className="ground" src={IMAGES.deskOffice} alt="" decoding="async" onError={hideOnError} />
          <img className="pc-cutout" src={IMAGES.pcOffice} alt="" decoding="async" onError={hideOnError} />
        </div>
        <div className={`set ${shownSet === 1 ? 'is-on' : ''}`}>
          <img className="ground" src={IMAGES.deskGaming} alt="" decoding="async" onError={hideOnError} />
          <img className="pc-cutout" src={IMAGES.pcGaming} alt="" decoding="async" onError={hideOnError} />
        </div>
      </div>

      {/* Layer 3: Tilt / depth blur */}
      <div className="tilt" aria-hidden="true" />

      {/* Layer 4: Mist canvas */}
      <canvas className="fog" ref={canvasRef} aria-hidden="true" />

      {/* Layer 5: UI Content */}
      <div className="ui">
        <h1>
          <span className="line-1">{COPY.headline1}</span>
          <i>{COPY.headline2Pre}</i> <span>{COPY.headline2Highlight}</span>
        </h1>

        <div className="hero-ctas">
          <Link to="/builder" className="hero-btn primary">
            {COPY.ctaBuilder} <BsArrowRight aria-hidden="true" />
          </Link>
          <Link to="/products" className="hero-btn ghost">
            {COPY.ctaBrowse}
          </Link>
        </div>

        <div className="dock">
          <div className="toggle-group" role="group" aria-label="Loại cấu hình">
            <button
              type="button"
              className="toggle-btn btn-office"
              aria-pressed={mode === 0}
              onClick={() => choose(0)}
            >
              <b>{COPY.officeLabel}</b>
              <small>{COPY.officeSub}</small>
            </button>
            <button
              type="button"
              className="toggle-btn btn-gaming"
              aria-pressed={mode === 1}
              onClick={() => choose(1)}
            >
              <b>{COPY.gamingLabel}</b>
              <small>{COPY.gamingSub}</small>
            </button>
          </div>
          <p className="caption">{COPY.caption}</p>
        </div>
      </div>
    </section>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BsArrowRight, BsPauseFill, BsPlayFill } from 'react-icons/bs';
import rigImage from '../../assets/images/hero_custom_pc_rig_1793798677183.jpg';
import partsImage from '../../assets/images/builder_showcase_1793798677194.jpg';
import boardImage from '../../assets/images/category_hardware_1793798677156.jpg';
import './hero.css';

export interface HeroProps {
  className?: string;
}

interface Slide {
  title: string;
  lead: string;
  image: string;
  alt: string;
  position: string;
  primary: { to: string; label: string };
  secondary: { to: string; label: string };
}

const SLIDES: Slide[] = [
  {
    title: 'Linh kiện PC chính hãng cho người tự build máy',
    lead: 'CPU, VGA, RAM, mainboard có bảo hành hãng. PC Builder kiểm tra tương thích và cộng tổng tiền sau mỗi lựa chọn.',
    image: rigImage,
    alt: 'Bộ PC tản nhiệt nước trên bàn làm việc cùng màn hình cong',
    position: '70% 50%',
    primary: { to: '/builder', label: 'Mở PC Builder' },
    secondary: { to: '/products', label: 'Xem linh kiện' },
  },
  {
    title: 'Lọc theo hãng, giá, thông số',
    lead: 'Lọc linh kiện theo nhu cầu rồi thêm vào bảng so sánh để thấy khác biệt trước khi mua.',
    image: partsImage,
    alt: 'Card đồ họa, CPU và RAM đặt trên mặt bàn tối',
    position: '60% 50%',
    primary: { to: '/products', label: 'Xem linh kiện' },
    secondary: { to: '/compare', label: 'Mở bảng so sánh' },
  },
  {
    title: 'Mainboard và VGA cho bộ máy gaming',
    lead: 'Chọn bản hợp ngân sách, hoặc xem những sản phẩm đang có khuyến mãi.',
    image: boardImage,
    alt: 'Mainboard Z790 và card đồ họa RTX 4080 đặt cạnh nhau',
    position: '50% 50%',
    primary: { to: '/products?sort=discount', label: 'Xem khuyến mãi' },
    secondary: { to: '/builder', label: 'Mở PC Builder' },
  },
];

const INTERVAL_MS = 7000;

export default function Hero({ className = '' }: HeroProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [hovering, setHovering] = useState(false);

  const go = useCallback((i: number) => setIndex((i + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (paused || hovering) return;
    const timer = setTimeout(() => go(index + 1), INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [index, paused, hovering, go]);

  return (
    <section
      className={`hero ${className}`}
      aria-roledescription="carousel"
      aria-label="Nổi bật"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
    >
      <div className="container hero-grid">
        <div className="hero-text">
          <div className="hero-stack">
            {SLIDES.map((s, i) => {
              const Title = i === 0 ? 'h1' : 'h2';
              const active = i === index;
              return (
                <div
                  key={s.title}
                  className={`hero-slide${active ? ' is-on' : ''}`}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} / ${SLIDES.length}`}
                  aria-hidden={!active}
                  inert={!active}
                >
                  <Title className="hero-title">{s.title}</Title>
                  <p className="hero-lead">{s.lead}</p>
                  <div className="hero-ctas">
                    <Link to={s.primary.to} className="btn btn-primary">
                      {s.primary.label} <BsArrowRight aria-hidden="true" />
                    </Link>
                    <Link to={s.secondary.to} className="btn btn-ghost">
                      {s.secondary.label}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hero-controls">
            <div className="hero-dots">
              {SLIDES.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  className={i === index ? 'is-on' : ''}
                  aria-label={`Chuyển tới slide ${i + 1}`}
                  aria-current={i === index}
                  onClick={() => go(i)}
                />
              ))}
            </div>
            <button
              type="button"
              className="hero-pause"
              aria-label={paused ? 'Tiếp tục tự chuyển slide' : 'Dừng tự chuyển slide'}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? <BsPlayFill aria-hidden="true" /> : <BsPauseFill aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div className="hero-media">
          {SLIDES.map((s, i) => (
            <img
              key={s.image}
              className={`hero-photo${i === index ? ' is-on' : ''}`}
              src={s.image}
              alt={i === index ? s.alt : ''}
              style={{ objectPosition: s.position }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

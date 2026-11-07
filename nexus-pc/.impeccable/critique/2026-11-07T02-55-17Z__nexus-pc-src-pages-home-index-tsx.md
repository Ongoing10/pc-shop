---
target: giao diện nexus-pc
total_score: 14
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
timestamp: 2026-11-07T02-55-17Z
slug: nexus-pc-src-pages-home-index-tsx
---
Method: dual-agent (A: design review · B: detector)

Score 14/40 (Poor). P0: demo login email mismatch + NovaBuild/NEXUS PC split brand; PC Builder promised compatibility checks it did not do. P1: dev leftovers (tech-stack meta, Dev Theme selector, solar-company LumenRoofHero); mobile lost filters; hero had no CTA and auto-rotated. P2: 11px text, one cyan for price/link/CTA, hardcoded Tailwind cyan; contradictory claims (24/7 vs 8:00-21:30, PCI-DSS 256-bit). P3: brown/orange leftovers on cyan theme.
AI tells: cyan-on-navy glow, gradient text logo, glassmorphism, floating bob badge, English eyebrows on every section, glyph icons in rounded squares, stats row, mix-blend-mode screen on product photos.
Detector: 6 warnings (3 real: gradient-text, overused-font Space Grotesk, width transition; 3 false-positive gray-on-color hover pairs).

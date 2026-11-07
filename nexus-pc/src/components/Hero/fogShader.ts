export const VERTEX_SHADER = `#version 300 es
void main() {
  float x = float((uint(gl_VertexID) & 1u) << 2);
  float y = float((uint(gl_VertexID) & 2u) << 1);
  gl_Position = vec4(x - 1.0, y - 1.0, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 R;
uniform float T;
uniform float S;
uniform float K;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 34.45);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 1.6 + vec2(5.3);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / R;
  uv.y = 1.0 - uv.y;
  vec2 p = vec2(uv.x * (R.x / R.y), uv.y);
  float t = T * 0.05;

  vec2 w = vec2(
    fbm(p * 1.3 + vec2(t, -t * 0.6)),
    fbm(p * 1.3 + vec2(-t * 0.8, t) + 7.0)
  );
  float d = fbm(p * 1.9 + w * 1.7 + vec2(t * 1.6, -t * 1.1 + S * 0.5));
  float e = fbm(p * 0.9 - w + vec2(-t, t * 0.5) + 3.0);

  float low = smoothstep(0.70, 1.04, uv.y + (d - 0.5) * 0.34);
  float side = (smoothstep(0.2, 0.0, uv.x + (e - 0.5) * 0.28) + smoothstep(0.8, 1.0, uv.x + (e - 0.5) * 0.28)) * smoothstep(0.25, 0.6, uv.y) * 0.2;
  float wisps = smoothstep(0.5, 0.78, d) * smoothstep(0.22, 0.5, uv.y) * smoothstep(0.86, 0.6, uv.y) * 0.18;
  float rest = clamp(low + side + wisps, 0.0, 1.0);

  float front = 1.02 - S * 0.68;
  float rise = smoothstep(front - 0.02, front + 0.26, uv.y + (d - 0.5) * 0.5);
  float haze = S * (0.3 + 0.46 * d);
  float alpha = clamp(max(rest, max(rise * 0.97, haze)), 0.0, 1.0);

  vec3 colOffice = mix(vec3(0.82, 0.86, 0.92), vec3(0.97, 0.98, 1.0), d * 1.15);
  vec3 colGaming = mix(vec3(0.10, 0.08, 0.20), vec3(0.32, 0.28, 0.52), d * 1.1);
  vec3 baseCol = mix(colOffice, colGaming, K);

  vec2 g1Pos = vec2(0.50 + 0.05 * sin(T * 0.3), 0.62 + 0.03 * cos(T * 0.2));
  vec2 g2Pos = vec2(0.58 + 0.04 * cos(T * 0.25), 0.70 + 0.04 * sin(T * 0.35));
  float g1 = exp(-dot(p - g1Pos, p - g1Pos) * 8.0);
  float g2 = exp(-dot(p - g2Pos, p - g2Pos) * 10.0);
  vec3 glow = g1 * vec3(0.20, 0.85, 0.95) + g2 * vec3(0.85, 0.25, 0.75);
  baseCol += K * glow * 0.40 * (1.0 - S);

  fragColor = vec4(baseCol * alpha, alpha);
}
`;

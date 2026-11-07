import { VERTEX_SHADER, FRAGMENT_SHADER } from './fogShader';

export interface FogInstance {
  resize(): void;
  render(t: number, surge: number, k: number): void;
  destroy(): void;
}

export function createFog(canvas: HTMLCanvasElement): FogInstance | null {
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;

  const createShader = (type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vs = createShader(gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  const locR = gl.getUniformLocation(program, 'R');
  const locT = gl.getUniformLocation(program, 'T');
  const locS = gl.getUniformLocation(program, 'S');
  const locK = gl.getUniformLocation(program, 'K');

  const vao = gl.createVertexArray();

  const resize = () => {
    const displayWidth = Math.min(window.innerWidth, 960);
    const displayHeight = Math.round(displayWidth * (window.innerHeight / Math.max(window.innerWidth, 1)));
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  };

  resize();

  const render = (t: number, surge: number, k: number) => {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindVertexArray(vao);

    gl.uniform2f(locR, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(locT, t);
    gl.uniform1f(locS, surge);
    gl.uniform1f(locK, k);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  };

  const destroy = () => {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    if (program) gl.deleteProgram(program);
    if (vao) gl.deleteVertexArray(vao);
    const loseContext = gl.getExtension('WEBGL_lose_context');
    if (loseContext) loseContext.loseContext();
  };

  return { resize, render, destroy };
}

import { hexToRgb } from "@/lib/color.ts";
import { frameSpan } from "@/lib/frame.ts";
import type { FitMode, GradientStop, MotionMode } from "@/lib/types.ts";

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform sampler2D uTexPrev;
uniform vec2 uSpan;
uniform float uFrameMix;
uniform float uContrast;
uniform float uPhase;
uniform int uMode;
uniform vec3 uA0;
uniform vec3 uA1;
uniform vec3 uA2;
uniform vec3 uA3;
uniform vec3 uB0;
uniform vec3 uB1;
uniform vec3 uB2;
uniform vec3 uB3;
uniform float uAp0;
uniform float uAp1;
uniform float uAp2;
uniform float uAp3;
uniform float uBp0;
uniform float uBp1;
uniform float uBp2;
uniform float uBp3;
uniform int uAc;
uniform int uBc;

vec3 sampleStops(vec3 c0, vec3 c1, vec3 c2, vec3 c3, float p0, float p1, float p2, float p3, int count, float t) {
  t = clamp(t, 0.0, 1.0);
  if (count < 2 || t <= p0) return c0;
  if (count == 2 || t <= p1) {
    float f = clamp((t - p0) / max(p1 - p0, 0.0001), 0.0, 1.0);
    return mix(c0, c1, f);
  }
  if (count == 3 || t <= p2) {
    float f = clamp((t - p1) / max(p2 - p1, 0.0001), 0.0, 1.0);
    return mix(c1, c2, f);
  }
  float f = clamp((t - p2) / max(p3 - p2, 0.0001), 0.0, 1.0);
  return mix(c2, c3, f);
}

void main() {
  vec2 uv = (vUv - 0.5) / uSpan + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec3 srcNow = texture2D(uTex, uv).rgb;
  vec3 srcThen = texture2D(uTexPrev, uv).rgb;
  vec3 src = mix(srcThen, srcNow, uFrameMix);
  float luma = dot(src, vec3(0.2126, 0.7152, 0.0722));
  luma = clamp((luma - 0.5) * uContrast + 0.5, 0.0, 1.0);

  float lookup = luma;
  if (uMode == 1) {
    lookup = mix(luma, 1.0 - luma, uPhase);
  }

  vec3 fromColor = sampleStops(uA0, uA1, uA2, uA3, uAp0, uAp1, uAp2, uAp3, uAc, lookup);
  vec3 toColor = sampleStops(uB0, uB1, uB2, uB3, uBp0, uBp1, uBp2, uBp3, uBc, luma);
  float blend = uMode == 0 ? uPhase : 0.0;
  gl_FragColor = vec4(mix(fromColor, toColor, blend), 1.0);
}
`;

export type DrawFrame = {
  source: TexImageSource;
  sourceWidth: number;
  sourceHeight: number;
  gradeA: GradientStop[];
  gradeB: GradientStop[];
  mode: MotionMode;
  phase: number;
  contrast: number;
  fit: FitMode;
  frameMix: number;
  captureFrame: boolean;
};

type StopUniform = {
  colors: WebGLUniformLocation[];
  positions: WebGLUniformLocation[];
  count: WebGLUniformLocation | null;
};

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create a shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "Shader failed to compile.";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

function mustGetUniform(gl: WebGLRenderingContext, program: WebGLProgram, name: string): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name);
  if (!location) throw new Error(`Missing uniform ${name}.`);
  return location;
}

export class GradientMapRenderer {
  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;
  private readonly buffer: WebGLBuffer;
  private readonly texture: WebGLTexture;
  private readonly previousTexture: WebGLTexture;
  private readonly copyBuffer: WebGLFramebuffer;
  private readonly stopsA: StopUniform;
  private readonly stopsB: StopUniform;
  private readonly spanLocation: WebGLUniformLocation;
  private readonly contrastLocation: WebGLUniformLocation;
  private readonly phaseLocation: WebGLUniformLocation;
  private readonly modeLocation: WebGLUniformLocation;
  private readonly frameMixLocation: WebGLUniformLocation;
  private lastSource: TexImageSource | null = null;
  private uploaded = false;
  private texWidth = 1;
  private texHeight = 1;
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL is not available in this browser.");
    this.gl = gl;

    const vertex = compile(gl, gl.VERTEX_SHADER, VERT);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram();
    if (!program) throw new Error("Could not create a WebGL program.");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, "aPos");
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) ?? "Program failed to link.";
      gl.deleteProgram(program);
      throw new Error(log);
    }
    this.program = program;

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("Could not create a buffer.");
    this.buffer = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    this.texture = this.makeTexture();
    this.previousTexture = this.makeTexture();
    const copyBuffer = gl.createFramebuffer();
    if (!copyBuffer) throw new Error("Could not create a framebuffer.");
    this.copyBuffer = copyBuffer;

    gl.useProgram(program);
    gl.uniform1i(mustGetUniform(gl, program, "uTex"), 0);
    gl.uniform1i(mustGetUniform(gl, program, "uTexPrev"), 1);
    this.spanLocation = mustGetUniform(gl, program, "uSpan");
    this.frameMixLocation = mustGetUniform(gl, program, "uFrameMix");
    this.contrastLocation = mustGetUniform(gl, program, "uContrast");
    this.phaseLocation = mustGetUniform(gl, program, "uPhase");
    this.modeLocation = mustGetUniform(gl, program, "uMode");
    this.stopsA = this.collectStops("A");
    this.stopsB = this.collectStops("B");

    gl.clearColor(0, 0, 0, 1);
  }

  resize(width: number, height: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resizePixels(width * dpr, height * dpr);
  }

  resizePixels(width: number, height: number) {
    const nextWidth = Math.max(2, Math.round(width));
    const nextHeight = Math.max(2, Math.round(height));
    const evenWidth = nextWidth % 2 === 0 ? nextWidth : nextWidth - 1;
    const evenHeight = nextHeight % 2 === 0 ? nextHeight : nextHeight - 1;
    if (this.canvas.width !== evenWidth || this.canvas.height !== evenHeight) {
      this.canvas.width = evenWidth;
      this.canvas.height = evenHeight;
    }
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  clear() {
    const { gl } = this;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  draw(frame: DrawFrame) {
    const { gl } = this;
    gl.useProgram(this.program);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

    this.uploadSource(frame);

    const canvasAspect = this.canvas.width / Math.max(1, this.canvas.height);
    const sourceAspect = frame.sourceWidth / Math.max(1, frame.sourceHeight);
    const [spanX, spanY] = frameSpan(frame.fit, sourceAspect, canvasAspect);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.previousTexture);
    gl.uniform1f(this.frameMixLocation, frame.frameMix);
    gl.uniform2f(this.spanLocation, spanX, spanY);
    gl.uniform1f(this.contrastLocation, frame.contrast);
    gl.uniform1f(this.phaseLocation, frame.phase);
    gl.uniform1i(this.modeLocation, frame.mode === "blend" ? 0 : 1);
    this.writeStops(this.stopsA, frame.gradeA);
    this.writeStops(this.stopsB, frame.gradeB);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  destroy() {
    const { gl } = this;
    gl.deleteBuffer(this.buffer);
    gl.deleteTexture(this.texture);
    gl.deleteTexture(this.previousTexture);
    gl.deleteFramebuffer(this.copyBuffer);
    gl.deleteProgram(this.program);
  }

  private makeTexture(): WebGLTexture {
    const { gl } = this;
    const texture = gl.createTexture();
    if (!texture) throw new Error("Could not create a texture.");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return texture;
  }

  private uploadSource(frame: DrawFrame) {
    const { gl } = this;
    if (frame.source !== this.lastSource) {
      this.lastSource = frame.source;
      this.uploaded = false;
    }

    const video = frame.source instanceof HTMLVideoElement ? frame.source : null;
    if (video) {
      if (video.readyState < 2 || video.videoWidth < 2) return;
      if (this.uploaded && !frame.captureFrame) return;
      if (this.uploaded && frame.frameMix < 0.999) this.copyCurrentToPrevious();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      this.texWidth = video.videoWidth;
      this.texHeight = video.videoHeight;
      this.uploaded = true;
      return;
    }

    if (this.uploaded && !frame.captureFrame) return;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame.source);
    this.texWidth = frame.sourceWidth;
    this.texHeight = frame.sourceHeight;
    this.uploaded = true;
    this.copyCurrentToPrevious();
  }

  private copyCurrentToPrevious() {
    if (this.texWidth < 2 || this.texHeight < 2) return;
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.copyBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
    gl.bindTexture(gl.TEXTURE_2D, this.previousTexture);
    gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, this.texWidth, this.texHeight, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private collectStops(prefix: "A" | "B"): StopUniform {
    const { gl, program } = this;
    return {
      colors: [0, 1, 2, 3].map((index) => mustGetUniform(gl, program, `u${prefix}${index}`)),
      positions: [0, 1, 2, 3].map((index) => mustGetUniform(gl, program, `u${prefix}p${index}`)),
      count: mustGetUniform(gl, program, `u${prefix}c`),
    };
  }

  private writeStops(uniform: StopUniform, stops: GradientStop[]) {
    const { gl } = this;
    const ordered = [...stops].sort((a, b) => a.at - b.at).slice(0, 4);
    const count = Math.max(1, ordered.length);
    for (let index = 0; index < 4; index += 1) {
      const stop = ordered[Math.min(index, ordered.length - 1)] ?? { color: "#000000", at: index === 0 ? 0 : 1 };
      const [red, green, blue] = hexToRgb(stop.color);
      const colorLocation = uniform.colors[index];
      const positionLocation = uniform.positions[index];
      if (colorLocation) gl.uniform3f(colorLocation, red / 255, green / 255, blue / 255);
      if (positionLocation) gl.uniform1f(positionLocation, stop.at);
    }
    if (uniform.count) gl.uniform1i(uniform.count, count);
  }
}

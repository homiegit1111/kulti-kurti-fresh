"use client";

/**
 * useFluidDistortion — raw WebGL2 fluid-distortion engine.
 *
 * This is not a library effect. A hand-written two-pass pipeline:
 *
 *   PASS 1 — a velocity/dye field. The pointer injects a splat of "dye"
 *            into a half-resolution float framebuffer; a simple curl-free
 *            advection shader moves it each frame and lets it decay, so the
 *            disturbance behaves like ink stirred into water.
 *   PASS 2 — the hero image is sampled through that field: UVs are offset by
 *            the field's gradient, so the cloth barely ripples where the
 *            pointer has been. All color channels sample the same displaced
 *            coordinate — the ripple is strictly colorless (no chromatic
 *            aberration, which read as broken RGB fringing). A subtle
 *            constant drift keeps it alive when idle.
 *
 * Runs only when WebGL2 + fine pointer + no reduced-motion. The caller
 * renders a static <Image> as the fallback / LCP layer and cross-fades this
 * canvas over it once the first frame is on screen.
 *
 * §1.6.3: the rAF loop pauses while the canvas is offscreen
 * (IntersectionObserver) and while the document is hidden.
 *
 * `canvasRef` is a callback ref: the caller may mount the <canvas>
 * conditionally (e.g. only once a client-side pointer/motion gate passes) and
 * the pipeline initialises when the element actually appears.
 */

import { useCallback, useEffect, useState } from "react";

const VERT = `#version 300 es
precision highp float;
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// Advect + decay the dye field.
const FIELD_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uField;
uniform vec2 uPointer;      // current pointer uv
uniform vec2 uPrevPointer;  // previous pointer uv
uniform float uMove;        // pointer speed 0..1
uniform float uTime;
uniform float uDecay;
uniform vec2 uTexel;

void main() {
  // sample with a tiny drift so the field never fully freezes
  vec2 drift = vec2(sin(uTime * 0.3), cos(uTime * 0.22)) * 0.0006;
  vec4 field = texture(uField, vUv + drift) * uDecay;

  // splat along the segment from prev->current pointer — halved so the cloth
  // barely breathes under the pointer
  float d = distance(vUv, uPointer);
  float splat = exp(-d * d * 220.0) * uMove;
  vec2 dir = uPointer - uPrevPointer;
  field.rg += dir * splat * 3.0;   // velocity encoded in rg
  field.b  += splat * 0.25;        // dye amount in b (unused by the image pass)

  // gentle ambient swirl
  field.rg += (vec2(sin(vUv.y * 12.0 + uTime * 0.6), cos(vUv.x * 12.0 + uTime * 0.5))) * 0.0002;

  fragColor = field;
}`;

// Render the image distorted by the field's gradient.
const IMAGE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uImage;
uniform sampler2D uField;
uniform vec2 uImageUvScale;  // cover-crop compensation
uniform vec2 uImageUvOffset;
uniform float uAspect;
uniform float uStrength;

void main() {
  vec2 uv = vUv;
  vec4 field = texture(uField, uv);

  // offset uv by velocity — a colorless ripple. All channels sample the SAME
  // displaced coordinate: no chromatic aberration, no dye tint, no lift.
  vec2 disp = field.rg * uStrength;
  disp.x *= uAspect;
  vec2 distorted = uv + disp;

  // cover-crop the image into the plane
  vec2 imgUv = distorted * uImageUvScale + uImageUvOffset;
  vec3 col = texture(uImage, imgUv).rgb;

  fragColor = vec4(col, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, "aPos");
  gl.linkProgram(p);
  return p;
}

export function useFluidDistortion(imageSrc: string) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const canvasRef = useCallback(
    (node: HTMLCanvasElement | null) => setCanvas(node),
    [],
  );
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(false);

  // eslint-disable-next-line react-hooks/immutability -- the canvas node is held in state so a conditionally-mounted <canvas> re-runs this effect; resizing its backing store inside the effect is the point
  useEffect(() => {
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return;
    const floatExt = gl.getExtension("EXT_color_buffer_float");
    if (!floatExt) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- WebGL2 + float-buffer support is only knowable inside the effect (§1.6.2 gate ladder)
    setSupported(true);

    const fieldProg = program(gl, VERT, FIELD_FRAG);
    const imageProg = program(gl, VERT, IMAGE_FRAG);

    // fullscreen triangle
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // ping-pong float framebuffers for the dye field (half res)
    const makeTarget = (w: number, h: number) => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { tex, fb };
    };

    let fieldW = Math.max(2, Math.floor(canvas.clientWidth / 2));
    let fieldH = Math.max(2, Math.floor(canvas.clientHeight / 2));
    let targetA = makeTarget(fieldW, fieldH);
    let targetB = makeTarget(fieldW, fieldH);

    // load image
    const imgTex = gl.createTexture()!;
    let imgAspect = 1;
    let imgReady = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, imgTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      imgAspect = img.width / img.height;
      imgReady = true;
      setReady(true);
    };
    img.src = imageSrc;

    // pointer state
    let pointer = { x: 0.5, y: 0.5 };
    let prevPointer = { x: 0.5, y: 0.5 };
    let move = 0;
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      prevPointer = pointer;
      pointer = {
        x: (e.clientX - r.left) / r.width,
        y: 1 - (e.clientY - r.top) / r.height,
      };
      move = Math.min(1, move + 0.35);
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const resize = () => {
      // eslint-disable-next-line react-hooks/immutability -- DOM canvas backing-store resize, not React state mutation
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = w;
      canvas.height = h;
      fieldW = Math.max(2, Math.floor(w / 2));
      fieldH = Math.max(2, Math.floor(h / 2));
      targetA = makeTarget(fieldW, fieldH);
      targetB = makeTarget(fieldW, fieldH);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    const start = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!imgReady) return;
      const t = (performance.now() - start) / 1000;

      // PASS 1 — field
      gl.bindFramebuffer(gl.FRAMEBUFFER, targetB.fb);
      gl.viewport(0, 0, fieldW, fieldH);
      gl.useProgram(fieldProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, targetA.tex);
      gl.uniform1i(gl.getUniformLocation(fieldProg, "uField"), 0);
      gl.uniform2f(gl.getUniformLocation(fieldProg, "uPointer"), pointer.x, pointer.y);
      gl.uniform2f(gl.getUniformLocation(fieldProg, "uPrevPointer"), prevPointer.x, prevPointer.y);
      gl.uniform1f(gl.getUniformLocation(fieldProg, "uMove"), move);
      gl.uniform1f(gl.getUniformLocation(fieldProg, "uTime"), t);
      gl.uniform1f(gl.getUniformLocation(fieldProg, "uDecay"), 0.975);
      gl.uniform2f(gl.getUniformLocation(fieldProg, "uTexel"), 1 / fieldW, 1 / fieldH);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // swap
      const tmp = targetA; targetA = targetB; targetB = tmp;
      move *= 0.82;
      prevPointer = pointer;

      // PASS 2 — image
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(imageProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imgTex);
      gl.uniform1i(gl.getUniformLocation(imageProg, "uImage"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, targetA.tex);
      gl.uniform1i(gl.getUniformLocation(imageProg, "uField"), 1);

      // cover-crop math: fit image to plane preserving aspect
      const planeAspect = canvas.width / canvas.height;
      let scaleX = 1, scaleY = 1;
      if (planeAspect > imgAspect) {
        scaleY = imgAspect / planeAspect;
      } else {
        scaleX = planeAspect / imgAspect;
      }
      gl.uniform2f(gl.getUniformLocation(imageProg, "uImageUvScale"), scaleX, scaleY);
      gl.uniform2f(gl.getUniformLocation(imageProg, "uImageUvOffset"), (1 - scaleX) / 2, (1 - scaleY) / 2);
      gl.uniform1f(gl.getUniformLocation(imageProg, "uAspect"), planeAspect);
      gl.uniform1f(gl.getUniformLocation(imageProg, "uStrength"), 0.022);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(loop);

    // §1.6.3 — pause the loop offscreen and while the tab is hidden.
    let running = true;
    let inView = true;
    const syncLoop = () => {
      const shouldRun = inView && document.visibilityState === "visible";
      if (shouldRun && !running) {
        running = true;
        raf = requestAnimationFrame(loop);
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };
    const io = new IntersectionObserver((entries) => {
      inView = entries[0]?.isIntersecting ?? true;
      syncLoop();
    });
    io.observe(canvas);
    const onVisibility = () => syncLoop();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      // A remounted canvas must re-earn its crossfade: never show a stale
      // "ready" canvas before its first frame.
      setReady(false);
      setSupported(false);
    };
  }, [canvas, imageSrc]);

  return { canvasRef, ready, supported };
}

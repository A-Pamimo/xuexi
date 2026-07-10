/**
 * Ambient "living ink" backdrop — a single full-screen fragment shader (expo-gl)
 * that drifts a low-contrast aurora behind the app. True WebGL on web and GLES
 * on native from one tiny shader, so it stays within the web cold-load budget
 * (no three.js / CanvasKit weight).
 *
 * Contract, mirroring the app's motion + offline rules:
 *  - `pointerEvents="none"` and absolute-fill BEHIND content — never eats taps.
 *  - Reduced-motion or `paused` => render exactly one static frame, no rAF loop.
 *  - Animated frames are capped to ~30fps and paused when the app is backgrounded.
 *  - Theme-driven: recolors instantly (a uniform update + one frame) on light/dark.
 *  - Graceful fallback: if GL context creation fails or before it's ready, render
 *    a flat themed View and never throw (guarantees a safe first paint on web).
 *
 * Mount ONCE (behind the tab navigator) so all tabs share a single GL context.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useReducedMotion } from '../lib/motion';
import { useTheme } from '../lib/appearance';
import type { ThemeColors } from '../theme';

const now = () => globalThis.performance?.now?.() ?? Date.now();
const FRAME_MS = 1000 / 30; // 30fps cap — ambient motion needs no more.

/** #rrggbb -> [r,g,b] in 0..1. */
function rgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '').match(/../g) ?? ['0', '0', '0'];
  return [parseInt(m[0]!, 16) / 255, parseInt(m[1]!, 16) / 255, parseInt(m[2]!, 16) / 255];
}

/** Base + two aurora tints, kept close to bg so text legibility is untouched. */
function palette(c: ThemeColors): { a: number[]; b: number[]; cc: number[] } {
  return { a: rgb(c.bg), b: rgb(c.primaryDim), cc: rgb(c.accent) };
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec3 uA;   // base (bg)
uniform vec3 uB;   // aurora tint 1
uniform vec3 uC;   // aurora tint 2
uniform float uIntensity;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  vec2 uv = vUv;
  vec2 p = uv * 2.0;
  float t = uTime * 0.05;
  float n1 = noise(p * 1.5 + vec2(t, t * 0.7));
  float n2 = noise(p * 2.3 - vec2(t * 0.6, t * 0.4) + n1);
  float aurora = smoothstep(0.15, 0.95, n1 * 0.6 + n2 * 0.6);
  float g = mix(0.55, 1.0, uv.y);           // gentle top-to-bottom bias
  vec3 tint = mix(uB, uC, n2);
  vec3 col = mix(uA, tint, aurora * uIntensity * g);
  gl_FragColor = vec4(col, 1.0);
}`;

export function AmbientBackground({
  paused = false,
  intensity = 0.55,
}: {
  paused?: boolean;
  intensity?: number;
}) {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);

  // Dynamic inputs read by the render loop via refs (onContextCreate runs once).
  const drawRef = useRef<((tSec: number) => void) | null>(null);
  const rafRef = useRef<number>(0);
  const runningRef = useRef(false);
  const lastDrawRef = useRef(0);
  const startRef = useRef(now());
  const staticRef = useRef(false);
  const colorRef = useRef(palette(colors));
  const intensityRef = useRef(intensity);

  const isStatic = paused || reduced;
  staticRef.current = isStatic;
  // Light surfaces show tints more, so damp the aurora there to protect reading.
  intensityRef.current = scheme === 'light' ? intensity * 0.7 : intensity;

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    try {
      const compile = (type: number, src: string) => {
        const sh = gl.createShader(type)!;
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
          throw new Error(gl.getShaderInfoLog(sh) ?? 'shader compile failed');
        }
        return sh;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(prog) ?? 'program link failed');
      }
      gl.useProgram(prog);

      // Full-screen quad (two triangles).
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const aPos = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      const uTime = gl.getUniformLocation(prog, 'uTime');
      const uA = gl.getUniformLocation(prog, 'uA');
      const uB = gl.getUniformLocation(prog, 'uB');
      const uC = gl.getUniformLocation(prog, 'uC');
      const uIntensity = gl.getUniformLocation(prog, 'uIntensity');

      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

      drawRef.current = (tSec: number) => {
        const p = colorRef.current;
        gl.uniform1f(uTime, tSec);
        gl.uniform3fv(uA, p.a);
        gl.uniform3fv(uB, p.b);
        gl.uniform3fv(uC, p.cc);
        gl.uniform1f(uIntensity, intensityRef.current);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.flush();
        gl.endFrameEXP();
      };

      // Kick: animate, or paint a single static frame.
      if (staticRef.current) drawRef.current(0);
      else startLoop();
    } catch (e) {
      console.warn('AmbientBackground: GL init failed, using flat fallback', e);
      setFailed(true);
    }
  };

  const startLoop = () => {
    if (runningRef.current || !drawRef.current) return;
    runningRef.current = true;
    startRef.current = now();
    lastDrawRef.current = 0;
    const loop = () => {
      if (!runningRef.current) return;
      const elapsed = now() - startRef.current;
      if (elapsed - lastDrawRef.current >= FRAME_MS) {
        lastDrawRef.current = elapsed;
        drawRef.current?.(elapsed / 1000);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const stopLoop = () => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  // Start/stop the loop as static-ness changes; paint one frame when going static.
  useEffect(() => {
    if (failed || !drawRef.current) return;
    if (isStatic) {
      stopLoop();
      drawRef.current(0);
    } else {
      startLoop();
    }
    return stopLoop;
    // drawRef readiness is handled by onContextCreate's own kick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStatic, failed]);

  // Recolor instantly on theme change (uniform update + one frame).
  useEffect(() => {
    colorRef.current = palette(colors);
    if (!failed && drawRef.current && !runningRef.current) drawRef.current(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheme]);

  // Pause the loop when the app is backgrounded (battery), resume when active.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && !staticRef.current && !failed) startLoop();
      else stopLoop();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed]);

  useEffect(() => () => stopLoop(), []);

  // Flat themed fallback — also the first-paint state before the context is live,
  // and the permanent state if GL is unavailable.
  if (failed) {
    return (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}
      />
    );
  }

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
      <GLView
        style={StyleSheet.absoluteFill}
        onContextCreate={onContextCreate}
        // A stable key per scheme is unnecessary (we recolor via uniforms), but on
        // web a lost context is rare; the flat bg underneath covers any gap.
        {...(Platform.OS === 'web' ? {} : {})}
      />
    </View>
  );
}

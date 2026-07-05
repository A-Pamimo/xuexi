/**
 * Minimal WAV utilities for the audio pipeline. espeak-ng emits 16-bit mono PCM
 * at 22050 Hz; since ffmpeg/ogg is unavailable in this build environment we
 * shrink the bundled clips in pure JS by halving the sample rate and trimming
 * leading/trailing silence. This roughly halves file size with no perceptible
 * loss for short speech clips.
 */
import * as fs from 'node:fs';

interface Pcm {
  sampleRate: number;
  samples: Int16Array;
}

export function readWavPcm(path: string): Pcm {
  const buf = fs.readFileSync(path);
  // Locate 'fmt ' and 'data' chunks (espeak writes a canonical 44-byte header,
  // but scan to be safe).
  const sampleRate = buf.readUInt32LE(24);
  let offset = 12;
  let dataStart = 44;
  let dataLen = buf.length - 44;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === 'data') {
      dataStart = offset + 8;
      dataLen = size;
      break;
    }
    offset += 8 + size + (size % 2);
  }
  const count = Math.floor(Math.min(dataLen, buf.length - dataStart) / 2);
  const samples = new Int16Array(count);
  for (let i = 0; i < count; i++) samples[i] = buf.readInt16LE(dataStart + i * 2);
  return { sampleRate, samples };
}

function trimSilence(s: Int16Array, threshold = 250): Int16Array {
  let start = 0;
  let end = s.length - 1;
  while (start < s.length && Math.abs(s[start]!) < threshold) start++;
  while (end > start && Math.abs(s[end]!) < threshold) end--;
  // Keep a little padding so onsets aren't clipped.
  start = Math.max(0, start - 400);
  end = Math.min(s.length - 1, end + 400);
  return s.slice(start, end + 1);
}

function downsampleBy2(s: Int16Array): Int16Array {
  const out = new Int16Array(Math.floor(s.length / 2));
  for (let i = 0; i < out.length; i++) {
    // simple average of adjacent samples (cheap low-pass before decimation)
    out[i] = ((s[i * 2]! + s[i * 2 + 1]!) / 2) | 0;
  }
  return out;
}

/** Synthesize a short UI sound effect from a list of (freqHz, seconds) segments. */
export function writeToneWav(
  destPath: string,
  segments: { freq: number; dur: number; type?: 'sine' | 'square' }[],
  rate = 22050,
): number {
  const total = segments.reduce((n, s) => n + Math.round(s.dur * rate), 0);
  const pcm = new Int16Array(total);
  let i = 0;
  for (const seg of segments) {
    const n = Math.round(seg.dur * rate);
    for (let j = 0; j < n; j++, i++) {
      const t = j / rate;
      const phase = 2 * Math.PI * seg.freq * t;
      const wave =
        seg.type === 'square' ? (Math.sin(phase) >= 0 ? 1 : -1) : Math.sin(phase);
      // short attack/release envelope to avoid clicks
      const env = Math.min(1, j / (rate * 0.01), (n - j) / (rate * 0.03));
      pcm[i] = Math.round(wave * env * 9000);
    }
  }
  return writeInt16Wav(destPath, pcm, rate);
}

function writeInt16Wav(destPath: string, pcm: Int16Array, rate: number): number {
  const byteLen = pcm.length * 2;
  const buf = Buffer.alloc(44 + byteLen);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + byteLen, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(byteLen, 40);
  for (let i = 0; i < pcm.length; i++) buf.writeInt16LE(pcm[i]!, 44 + i * 2);
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

export function writeWavShrunk(srcPath: string, destPath: string): number {
  const { sampleRate, samples } = readWavPcm(srcPath);
  const trimmed = trimSilence(samples);
  const reduced = downsampleBy2(trimmed);
  const outRate = Math.round(sampleRate / 2);
  const byteLen = reduced.length * 2;
  const buf = Buffer.alloc(44 + byteLen);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + byteLen, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16); // fmt chunk size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(outRate, 24);
  buf.writeUInt32LE(outRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(byteLen, 40);
  for (let i = 0; i < reduced.length; i++) buf.writeInt16LE(reduced[i]!, 44 + i * 2);
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

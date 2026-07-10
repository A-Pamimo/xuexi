/**
 * Build-time feature flags. Kept trivial and static so the bundler can tree-shake
 * a disabled feature out entirely.
 */

/**
 * The expo-gl ambient shader backdrop. Safe to disable: the app falls back to
 * flat themed surfaces with zero behavior change. Flip to false to ship without
 * any GL cost (e.g. if a device/perf regression is found).
 */
export const AMBIENT_BACKGROUND = true;

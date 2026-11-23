import { FFmpeg, FFFSType } from '@ffmpeg/ffmpeg'
import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'

export interface Segment { start: number; end: number }

let instance: Promise<FFmpeg> | null = null

function getFFmpeg() {
  instance ??= (async () => {
    const ff = new FFmpeg()
    await ff.load({ coreURL, wasmURL })
    return ff
  })()
  instance.catch(() => { instance = null })
  return instance
}

/** Sort and merge overlapping clip windows so the reel never repeats footage. */
export function mergeSegments(segs: Segment[], duration?: number): Segment[] {
  const sorted = segs
    .map((s) => ({ start: Math.max(0, s.start), end: duration ? Math.min(duration, s.end) : s.end }))
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start - b.start)
  const out: Segment[] = []
  for (const s of sorted) {
    const last = out[out.length - 1]
    if (last && s.start <= last.end + 0.5) last.end = Math.max(last.end, s.end)
    else out.push({ ...s })
  }
  return out
}

/**
 * Cut segments out of the game video and join them into one MP4.
 * The file is mounted read-only (WORKERFS), so multi-GB games are never loaded into memory.
 * Uses stream copy (no re-encode): fast, full quality, but cuts snap to the nearest
 * keyframe before each start, so clips may begin up to ~1–2s early.
 */
export async function buildReel(
  file: File,
  segments: Segment[],
  onProgress: (done: number, total: number, label: string) => void,
): Promise<Blob> {
  onProgress(0, segments.length + 1, 'Loading video engine…')
  const ff = await getFFmpeg()
  const dir = '/input'
  const ext = (file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? '.mp4').toLowerCase()
  const outExt = ext === '.mov' ? '.mov' : '.mp4'

  await ff.createDir(dir).catch(() => {})
  await ff.mount(FFFSType.WORKERFS, { files: [file] }, dir)
  const src = `${dir}/${file.name}`
  const parts: string[] = []
  try {
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i]
      onProgress(i, segments.length + 1, `Cutting clip ${i + 1} of ${segments.length}`)
      const name = `seg${i}${outExt}`
      const code = await ff.exec([
        '-ss', s.start.toFixed(2), '-i', src, '-t', (s.end - s.start).toFixed(2),
        '-map', '0:v:0', '-map', '0:a:0?', '-c', 'copy', '-avoid_negative_ts', 'make_zero', name,
      ])
      if (code !== 0) throw new Error(`Could not cut clip ${i + 1} (ffmpeg exit ${code})`)
      parts.push(name)
    }

    onProgress(segments.length, segments.length + 1, 'Joining clips…')
    const out = `reel${outExt}`
    if (parts.length === 1) {
      const data = await ff.readFile(parts[0])
      return new Blob([data as Uint8Array], { type: outExt === '.mov' ? 'video/quicktime' : 'video/mp4' })
    }
    await ff.writeFile('list.txt', parts.map((p) => `file '${p}'`).join('\n'))
    const code = await ff.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', out])
    if (code !== 0) throw new Error(`Could not join clips (ffmpeg exit ${code})`)
    const data = await ff.readFile(out)
    await ff.deleteFile(out).catch(() => {})
    await ff.deleteFile('list.txt').catch(() => {})
    return new Blob([data as Uint8Array], { type: outExt === '.mov' ? 'video/quicktime' : 'video/mp4' })
  } finally {
    for (const p of parts) await ff.deleteFile(p).catch(() => {})
    await ff.unmount(dir).catch(() => {})
  }
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Utilidades de video compartidas (cliente y servidor). */
export type VideoProvider = 'bunny' | 'mp4' | 'hls' | 'youtube' | 'vimeo';

export function youtubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m?.[1] ?? null;
}
export function vimeoId(url: string) {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m?.[1] ?? null;
}

export function detectProvider(url: string, provider?: VideoProvider): VideoProvider {
  if (provider === 'youtube' || youtubeId(url)) return 'youtube';
  if (provider === 'vimeo' || vimeoId(url)) return 'vimeo';
  if (/\.m3u8(\?|$)/i.test(url)) return 'hls';
  return provider ?? 'mp4';
}

/** URL del iframe para YouTube/Vimeo (o null si es video nativo). */
export function embedUrl(url: string, provider?: VideoProvider, startS = 0) {
  const p = detectProvider(url, provider);
  if (p === 'youtube') {
    const id = youtubeId(url);
    return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1${startS ? `&start=${Math.floor(startS)}` : ''}` : null;
  }
  if (p === 'vimeo') {
    const id = vimeoId(url);
    return id ? `https://player.vimeo.com/video/${id}?dnt=1&title=0&byline=0${startS ? `#t=${Math.floor(startS)}s` : ''}` : null;
  }
  return null;
}

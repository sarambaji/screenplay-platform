type Props = { url: string; provider: string }

export function MusicEmbed({ url, provider }: Props) {
  if (provider === 'youtube') {
    const id = extractYouTubeId(url)
    if (!id) return null
    return (
      <iframe
        className="w-full h-32 rounded border"
        src={`https://www.youtube.com/embed/${id}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        loading="lazy"
      />
    )
  }

  if (provider === 'spotify') {
    const embedUrl = url.replace(
      'open.spotify.com/track',
      'open.spotify.com/embed/track'
    )
    return (
      <iframe
        className="w-full h-80 rounded border"
        src={embedUrl}
        allow="autoplay; clipboard-write; encrypted-media"
        loading="lazy"
      />
    )
  }

  if (provider === 'soundcloud') {
    const encoded = encodeURIComponent(url)
    return (
      <iframe
        className="w-full h-32 rounded border"
        src={`https://w.soundcloud.com/player/?url=${encoded}`}
        loading="lazy"
      />
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-xs text-blue-600 underline"
    >
      Open soundtrack
    </a>
  )
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') return u.pathname.slice(1)
    const v = u.searchParams.get('v')
    return v || null
  } catch {
    return null
  }
}

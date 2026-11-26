import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';
import { getMedia, originalTrack } from '../../apps/social/socialMedia';

interface SongbirdAudioPlayerProps {
  audioUrl: string;
  coverArtUrl?: string;
  title: string;
  artistName: string;
  onStreamCounted?: () => void;
  compact?: boolean;
}

export function SongbirdAudioPlayer({
  audioUrl,
  coverArtUrl,
  title,
  artistName,
  onStreamCounted,
  compact = false,
}: SongbirdAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [resolvedSrc, setResolvedSrc] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [counted, setCounted] = useState(false);

  useEffect(() => {
    let revoked = '';
    setIsPlaying(false);
    setCounted(false);

    const loadSource = async () => {
      if (!audioUrl) {
        setResolvedSrc('');
        return;
      }
      if (audioUrl === 'builtin:stillwater' || audioUrl === 'builtin:starlight') {
        const blob = originalTrack(audioUrl === 'builtin:starlight');
        revoked = URL.createObjectURL(blob);
        setResolvedSrc(revoked);
        return;
      }
      if (audioUrl.startsWith('social:')) {
        const blob = await getMedia(audioUrl).catch(() => undefined);
        if (blob) {
          revoked = URL.createObjectURL(blob);
          setResolvedSrc(revoked);
          return;
        }
      }
      setResolvedSrc(audioUrl);
    };

    void loadSource();
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [audioUrl]);

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el || !resolvedSrc) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      try {
        await el.play();
        setIsPlaying(true);
        if (!counted) {
          setCounted(true);
          onStreamCounted?.();
        }
      } catch {
        // In headless or autoplay-restricted contexts, still count listener intent once
        if (!counted) {
          setCounted(true);
          onStreamCounted?.();
        }
      }
    }
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border ${
        compact ? 'px-2.5 py-1.5 text-xs bg-slate-900/90 text-white border-emerald-500/40' : 'p-3 bg-slate-950 text-white border-emerald-500/50'
      }`}
    >
      <button
        type="button"
        onClick={() => void togglePlay()}
        aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
        className="h-8 w-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center font-bold shrink-0 cursor-pointer"
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </button>
      {coverArtUrl && (
        <img
          src={coverArtUrl}
          alt=""
          loading="lazy"
          className={`${compact ? 'h-8 w-8' : 'h-10 w-10'} rounded object-cover border border-emerald-400/40 shrink-0`}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="font-bold truncate text-xs text-white">{title}</div>
        <div className="text-[11px] text-emerald-300 truncate flex items-center gap-1">
          <Volume2 size={11} />
          <span>{artistName}</span>
        </div>
      </div>
      <audio
        ref={audioRef}
        src={resolvedSrc || undefined}
        preload="none"
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        controls={!compact}
        className={compact ? 'hidden' : 'h-8 max-w-[210px]'}
      />
    </div>
  );
}

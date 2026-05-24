import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Scissors, Search, Music, Clock, Check, X, RotateCcw } from 'lucide-react';
import { ScrollingText } from './ScrollingText';
import defaultCover from '../assets/default-cover.svg';

export const MusicEditor = ({ songs, notify, onUpdate }) => {
  const { t } = useTranslation();
  const [selectedSong, setSelectedSong] = useState(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchQuery] = useState('');
  const [previewInfo, setPreviewInfo] = useState(null); // { path: string, url: string }
  
  const audioRef = useRef(null);

  const editableSongs = songs.filter(s => s.status === 'active' && s.needs_tagging);
  
  const filteredSongs = editableSongs.filter(s => 
    (s.title || s.filename).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.artist || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Auto-cleanup preview when switching or unmounting
  const cleanupOldPreview = async (path) => {
    if (path) {
        try { await api.cleanupPreviews(path); }
        catch (e) { console.error("Cleanup failed", e); }
    }
  };

  const handleSelectSong = (song) => {
    if (previewInfo) cleanupOldPreview(previewInfo.path);
    setSelectedSong(song);
    setPreviewInfo(null);
    setStartTime(0);
    setEndTime(0);
    setCurrentTime(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        if (previewInfo) cleanupOldPreview(previewInfo.path);
    };
  }, [previewInfo]);

  useEffect(() => {
    if (selectedSong && audioRef.current) {
        audioRef.current.load();
    }
  }, [selectedSong, previewInfo]);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      setDuration(dur);
      if (!previewInfo) setEndTime(dur);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }
  };

  const handleGeneratePreview = async () => {
    if (!selectedSong) return;
    if (startTime >= endTime) {
        notify("Start time must be less than end time", "error");
        return;
    }

    if (previewInfo) await cleanupOldPreview(previewInfo.path);

    setIsProcessing(true);
    try {
      const res = await api.trimSong(selectedSong.id, startTime.toFixed(1), endTime.toFixed(1));
      setPreviewInfo({ path: res.preview_path, url: res.stream_url });
      notify("Preview generated! Listen and confirm.");
    } catch (e) {
      notify(t('editor.error'), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmTrim = async () => {
    if (!selectedSong || !previewInfo) return;
    setIsProcessing(true);
    try {
      await api.confirmTrim(selectedSong.id, previewInfo.path);
      notify(t('editor.success'));
      setSelectedSong(null);
      setPreviewInfo(null);
      onUpdate();
    } catch (e) {
      notify("Confirmation failed", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscardPreview = () => {
    cleanupOldPreview(previewInfo.path);
    setPreviewInfo(null);
    notify("Preview discarded.");
  };

  const formatTime = (time) => {
    const m = Math.floor(time / 60);
    const s = (time % 60).toFixed(1);
    return `${m}:${s.padStart(4, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ background: 'var(--surface2)', padding: 20, borderRadius: 8 }}>
        <h3 style={{ margin: 0 }}>{t('editor.title')}</h3>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 8 }}>{t('editor.desc')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 1024 ? '320px 1fr' : '1fr', gap: 24, height: '70vh', minHeight: '600px' }}>
        {/* Sidebar: Song List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--surface)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Search size={14} color="var(--text-dim)" />
            <input 
              type="text" 
              placeholder={t('tagging.search')} 
              value={searchTerm}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, width: '100%', outline: 'none' }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {filteredSongs.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>No untagged songs found.</div>}
            {filteredSongs.map(song => (
              <div 
                key={song.id}
                onClick={() => handleSelectSong(song)}
                style={{ 
                  padding: '10px 12px', 
                  borderRadius: 6, 
                  cursor: 'pointer',
                  background: selectedSong?.id === song.id ? 'var(--surface2)' : 'transparent',
                  border: `1px solid ${selectedSong?.id === song.id ? 'var(--accent)' : 'transparent'}`,
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <img 
                    src={`/api/songs/${song.id}/cover/`} 
                    style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover', background: '#333', flexShrink: 0 }}
                    onError={(e) => { e.target.src = defaultCover; }}
                />
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <ScrollingText text={song.title || song.filename} style={{ fontSize: 13, fontWeight: 600 }} />
                  <ScrollingText text={song.artist || 'Unknown Artist'} style={{ fontSize: 11, color: 'var(--text-dim)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main: Editor Area */}
        <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 32, display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', minWidth: 0 }}>
          {selectedSong ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 40, flex: 1 }}>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                    <img 
                        src={`/api/songs/${selectedSong.id}/cover/`} 
                        style={{ width: 120, height: 120, borderRadius: 8, objectFit: 'cover', background: '#333', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', opacity: previewInfo ? 0.5 : 1 }}
                        onError={(e) => { e.target.src = defaultCover; }}
                    />
                    {previewInfo && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', borderRadius: 8 }}>
                            <div style={{ color: 'var(--accent)', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}>PREVIEW MODE</div>
                        </div>
                    )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2 style={{ margin: 0, fontSize: 24 }}>{selectedSong.title || selectedSong.filename}</h2>
                  <div style={{ color: 'var(--text-dim)', marginTop: 8, fontSize: 16 }}>{selectedSong.artist || 'Unknown Artist'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>
                        <Clock size={14} /> {formatTime(duration)}
                    </div>
                    {previewInfo && (
                        <div style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 800 }}>
                            TRIMMED PREVIEW
                        </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 32, justifyContent: 'center' }}>
                
                {/* Visual Trim Bar */}
                <div style={{ position: 'relative', height: 120, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border)', padding: '0 10px', overflow: 'visible' }}>
                    
                    {/* Background Progress / Seek Bar */}
                    <input 
                        type="range" step="0.1" min="0" max={duration} value={currentTime}
                        onChange={handleSeek}
                        style={{ 
                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                            appearance: 'none', background: 'transparent', zIndex: 12, cursor: 'pointer',
                            padding: '0 10px', boxSizing: 'border-box'
                        }}
                        className="seek-slider"
                    />

                    {/* Playhead line */}
                    <div style={{ 
                        position: 'absolute', 
                        left: `${(currentTime / duration) * 100}%`, 
                        top: 0, bottom: 0, width: 2, background: 'var(--green)', zIndex: 10,
                        pointerEvents: 'none', transition: 'left 0.1s linear'
                    }}>
                        <div style={{ position: 'absolute', top: -6, left: -4, width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 10px var(--green)' }}></div>
                    </div>

                    {!previewInfo && (
                        <>
                            {/* Mask for Trimmed areas */}
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${(startTime / duration) * 100}%`, background: 'rgba(235, 87, 87, 0.2)', zIndex: 1, pointerEvents: 'none' }}></div>
                            <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${100 - (endTime / duration) * 100}%`, background: 'rgba(235, 87, 87, 0.2)', zIndex: 1, pointerEvents: 'none' }}></div>

                            {/* Active area */}
                            <div style={{ 
                                position: 'absolute', top: 30, bottom: 30, 
                                left: `${(startTime / duration) * 100}%`, 
                                width: `${((endTime - startTime) / duration) * 100}%`,
                                background: 'var(--accent)', opacity: 0.2, borderRadius: 6, zIndex: 0, pointerEvents: 'none'
                            }}></div>

                            {/* Trim Sliders (Only in Original Mode) */}
                            <div style={{ position: 'relative', width: '100%', height: '100%', zIndex: 15, pointerEvents: 'none' }}>
                                <input 
                                    type="range" step="0.1" min="0" max={duration} value={startTime}
                                    onChange={e => setStartTime(Math.min(parseFloat(e.target.value), endTime - 0.5))}
                                    style={{ position: 'absolute', top: 0, width: '100%', appearance: 'none', background: 'transparent', height: 60, pointerEvents: 'auto', cursor: 'ew-resize' }}
                                    className="trim-slider start"
                                />
                                <input 
                                    type="range" step="0.1" min="0" max={duration} value={endTime}
                                    onChange={e => setEndTime(Math.max(parseFloat(e.target.value), startTime + 0.5))}
                                    style={{ position: 'absolute', bottom: 0, width: '100%', appearance: 'none', background: 'transparent', height: 60, pointerEvents: 'auto', cursor: 'ew-resize' }}
                                    className="trim-slider end"
                                />
                            </div>
                        </>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, color: 'var(--text-dim)', letterSpacing: 1 }}>
                    {previewInfo ? (
                        <span style={{ color: 'var(--accent)' }}>PREVIEW DURATION: {formatTime(duration)}</span>
                    ) : (
                        <>
                            <span>START: {formatTime(startTime)}</span>
                            <span style={{ color: 'var(--accent)' }}>NEW DURATION: {formatTime(endTime - startTime)}</span>
                            <span>END: {formatTime(endTime)}</span>
                        </>
                    )}
                </div>

                <audio 
                  ref={audioRef}
                  src={previewInfo ? previewInfo.url : `/api/songs/${selectedSong.id}/stream/`}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  style={{ width: '100%', height: 40 }}
                  controls
                />
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                {!previewInfo ? (
                    <>
                        <button 
                        onClick={handleGeneratePreview}
                        disabled={isProcessing}
                        style={{ 
                            flex: 1, padding: '16px', background: 'var(--accent)', color: '#fff', border: 'none', 
                            borderRadius: 12, cursor: 'pointer', fontWeight: 800, fontSize: 16,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12
                        }}
                        >
                        {isProcessing ? t('editor.trimming') : <><Scissors size={20} /> {t('editor.apply_trim')}</>}
                        </button>
                        <button 
                            onClick={() => setSelectedSong(null)}
                            style={{ padding: '16px 24px', background: 'var(--surface2)', color: '#fff', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', fontWeight: 600 }}
                        >
                            Cancel
                        </button>
                    </>
                ) : (
                    <>
                        <button 
                        onClick={handleConfirmTrim}
                        disabled={isProcessing}
                        style={{ 
                            flex: 2, padding: '16px', background: 'var(--green)', color: '#fff', border: 'none', 
                            borderRadius: 12, cursor: 'pointer', fontWeight: 800, fontSize: 16,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12
                        }}
                        >
                        {isProcessing ? 'Saving...' : <><Check size={20} /> {t('editor.confirm_replace')}</>}
                        </button>
                        <button 
                        onClick={handleDiscardPreview}
                        disabled={isProcessing}
                        style={{ 
                            flex: 1, padding: '16px', background: 'transparent', color: '#ff4d4d', border: '1px solid #ff4d4d', 
                            borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                        }}
                        >
                        <X size={18} /> {t('editor.discard_preview')}
                        </button>
                    </>
                )}
              </div>

              <style>{`
                .trim-slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 14px;
                    height: 50px;
                    background: var(--accent);
                    border: 2px solid #fff;
                    cursor: ew-resize;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                    border-radius: 4px;
                }
                .trim-slider.start::-webkit-slider-thumb { border-bottom-right-radius: 0; border-top-right-radius: 0; }
                .trim-slider.end::-webkit-slider-thumb { border-bottom-left-radius: 0; border-top-left-radius: 0; }
                
                .seek-slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 0; height: 0;
                }
                .seek-slider::-webkit-slider-runnable-track {
                    background: transparent;
                }
              `}</style>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', margin: 'auto' }}>
              <div style={{ width: 80, height: 80, background: 'var(--surface2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <Scissors size={40} />
              </div>
              <h2 style={{ color: '#fff' }}>{t('editor.title')}</h2>
              <p style={{ maxWidth: 300, margin: '12px auto 0', lineHeight: 1.5 }}>{t('editor.desc')}</p>
              <div style={{ marginTop: 32, padding: '12px 20px', border: '1px dashed var(--border)', borderRadius: 8, display: 'inline-block', fontSize: 13 }}>
                {t('editor.select_song')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

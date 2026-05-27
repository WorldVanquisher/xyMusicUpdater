import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { ShieldCheck, Trash2, RefreshCw, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ScrollingText } from './ScrollingText';

export const PurgePreview = () => {
  const { t } = useTranslation();
  const [data, setData] = useState({ candidates: [], protected: [], debug_info: null });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getUpcomingPurges();
      setData(res || { candidates: [], protected: [], debug_info: null });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div style={{ padding: 20 }}>{t('purge.analyzing')}</div>;

  return (
    <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 24, 
        width: '100%',
        boxSizing: 'border-box'
    }}>
      {/* 1. Header */}
      <div className="glass" style={{ 
          padding: '20px 24px', 
          borderRadius: 12, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexShrink: 0
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{t('purge.title')}</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t('purge.desc')}
          </p>
        </div>
        <button onClick={load} style={refreshBtnStyle}>
          <RefreshCw size={16} style={{ marginRight: 8 }} /> {t('purge.reanalyze')}
        </button>
      </div>

      {/* 2. System Info (Now at the top) */}
      {data.debug_info && (
        <div className="glass" style={{ 
            padding: '12px 24px', 
            borderRadius: 12, 
            fontSize: 12, 
            color: 'var(--text-dim)', 
            display: 'flex', 
            gap: 32,
            flexShrink: 0,
            alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={14} color="var(--accent)" /> 
            <span style={{ fontWeight: 800, letterSpacing: 1 }}>SYSTEM STATUS:</span>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>{t('purge.monitored')}: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{data.debug_info.monitored_playlists}</span></div>
            <div>{t('purge.tracks_found')}: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{data.debug_info.total_playlist_tracks}</span></div>
          </div>
        </div>
      )}

      {/* 3. Infinite Vertical Scroll Sections (No internal scroll) */}
      <div style={{ 
          display: 'flex', 
          flexDirection: window.innerWidth <= 1024 ? 'column' : 'row', 
          gap: 24, 
          width: '100%'
      }}>
        
        {/* Candidates Section */}
        <div className="glass" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            flex: 1, 
            minWidth: 0, 
            borderRadius: 12, 
            overflow: 'visible' // Allow infinite length
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(235, 87, 87, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px 12px 0 0' }}>
            <div style={{ ...sectionLabel, color: 'var(--red)', marginBottom: 0 }}>
                <Trash2 size={14} /> {t('purge.deletion_candidates')}
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--red)', background: 'rgba(235,87,87,0.1)', padding: '2px 8px', borderRadius: 10 }}>{data.candidates.length}</span>
          </div>
          
          <div style={{ padding: '10px 20px' }}>
            {data.candidates.length === 0 ? (
                <div style={emptyStyle}>{t('purge.no_candidates')}</div>
            ) : (
                data.candidates.map((u, i) => (
                    <div key={i} style={itemStyle}>
                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                            <ScrollingText text={u.filename} style={{ fontSize: 13, fontWeight: 600, color: '#eee' }} />
                            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                                Last modified: {new Date(u.mtime * 1000).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>

        {/* Protected Section */}
        <div className="glass" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            flex: 1, 
            minWidth: 0, 
            borderRadius: 12, 
            overflow: 'visible' // Allow infinite length
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(52, 199, 89, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px 12px 0 0' }}>
            <div style={{ ...sectionLabel, color: 'var(--green)', marginBottom: 0 }}>
                <ShieldCheck size={14} /> {t('purge.protected')}
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--green)', background: 'rgba(52,199,89,0.1)', padding: '2px 8px', borderRadius: 10 }}>{data.protected.length}</span>
          </div>

          <div style={{ padding: '10px 20px' }}>
            {data.protected.length === 0 ? (
                <div style={emptyStyle}>{t('purge.no_protected')}</div>
            ) : (
                data.protected.map((u, i) => (
                    <div key={i} style={itemStyle}>
                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                            <ScrollingText text={u.filename} style={{ fontSize: 13, fontWeight: 600, color: '#eee' }} />
                            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(255,255,255,0.03)', padding: '1px 6px', borderRadius: 4 }}>
                                    {u.match_reason}
                                </span>
                                {u.playlists.map(pl => (
                                    <span key={pl} style={{ fontSize: 10, background: 'var(--accent)', padding: '1px 6px', borderRadius: 4, color: '#fff', fontWeight: 600 }}>
                                        {pl}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

const sectionLabel = { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 };
const itemStyle = { padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center' };
const emptyStyle = { fontSize: 13, color: 'var(--text-dim)', padding: '40px 0', textAlign: 'center' };
const refreshBtnStyle = { background: 'var(--accent)', border: 'none', color: '#fff', borderRadius: 8, padding: '10px 20px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' };

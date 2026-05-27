import React from 'react';
import { useTranslation } from 'react-i18next';

export const LiveLog = ({ entries, isLive }) => {
  const { i18n } = useTranslation();
  
  const formatTime = (ts) => {
    const d = ts ? new Date(ts) : new Date();
    return d.toLocaleString(i18n.language, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      hour12: false 
    });
  };

  return (
    <div style={{ background: '#111', padding: 10, borderRadius: 8, height: 200, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
      {entries.map((log, i) => (
        <div key={i} style={{ color: log.level === 'error' ? 'var(--red)' : log.level === 'warning' ? 'orange' : '#ccc', marginBottom: 2 }}>
          [{formatTime(log.ts)}] {log.message}
        </div>
      ))}
      {entries.length === 0 && <div style={{ color: '#555' }}>No events yet...</div>}
    </div>
  );
};

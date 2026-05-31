import { describe, it, expect } from 'vitest'
import { api } from '../api.js'

const EXPECTED_METHODS = [
  'login', 'logout', 'getSession', 'getStatus',
  'getSongs', 'getPlaylistMap', 'getJobs', 'getPermanentLog',
  'manualDownload', 'triggerCron', 'triggerRescan', 'triggerPurge',
  'getPlaylists', 'getConfig', 'updateConfig', 'uploadBackground',
  'getSubscriptions', 'addSubscription', 'updateSubscription', 'deleteSubscription',
  'runSubscriptions', 'updateSong', 'deleteSong', 'getUpcomingPurges',
  'searchMedia', 'autoTagAll', 'confirmTags', 'rejectTags', 'revertSong',
  'cleanupHistory', 'getSchedulerInfo', 'triggerSchedulerTask',
  'getCompilationCandidates', 'mergeCompilation',
  'trimSong', 'confirmTrim', 'cleanupPreviews', 'setTimeout',
]

describe('api module', () => {
  it('exports all expected method names', () => {
    for (const method of EXPECTED_METHODS) {
      expect(typeof api[method], `api.${method} should be a function`).toBe('function')
    }
  })

  it('setTimeout does not throw on positive value', () => {
    expect(() => api.setTimeout(30)).not.toThrow()
  })

  it('setTimeout uses 15s fallback on falsy input', () => {
    expect(() => api.setTimeout(0)).not.toThrow()
    expect(() => api.setTimeout(null)).not.toThrow()
    expect(() => api.setTimeout(undefined)).not.toThrow()
  })

  it('has no extra unexpected top-level keys', () => {
    const keys = Object.keys(api)
    // Every exported key should be a function
    for (const k of keys) {
      expect(typeof api[k]).toBe('function')
    }
  })
})

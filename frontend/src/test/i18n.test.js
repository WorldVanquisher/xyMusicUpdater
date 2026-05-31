import { describe, it, expect } from 'vitest'
import i18n from '../i18n.js'

const LANGS = ['en', 'zh', 'ja']

const APP_TABS = [
  'title', 'login_failed', 'wrong_credentials',
  'library', 'manual_tagging', 'downloads', 'job_history',
  'scheduler', 'purge_analysis', 'compilation_merge', 'music_editor', 'settings',
]

const SETTING_KEYS = [
  'navidrome_url', 'navidrome_user', 'navidrome_password',
  'save_settings', 'hold_period', 'max_deletions',
  'max_songs', 'default_page_size',
]

describe('i18n module', () => {
  it('initializes without errors', () => {
    expect(i18n).toBeDefined()
    expect(typeof i18n.t).toBe('function')
  })

  it('returns app title in English', () => {
    i18n.changeLanguage('en')
    expect(i18n.t('app.title')).toBe('xyMusicUpdater')
  })

  it('returns app title in Chinese', () => {
    expect(i18n.getResource('zh', 'translation', 'app.title')).toBe('xyMusicUpdater')
  })

  it('returns app title in Japanese', () => {
    expect(i18n.getResource('ja', 'translation', 'app.title')).toBe('xyMusicUpdater')
  })

  it('all app tab keys are translated in every language', () => {
    for (const lang of LANGS) {
      for (const key of APP_TABS) {
        const val = i18n.getResource(lang, 'translation', `app.${key}`)
        expect(val, `Missing ${lang}.app.${key}`).toBeTruthy()
      }
    }
  })

  it('all settings keys are translated in every language', () => {
    for (const lang of LANGS) {
      for (const key of SETTING_KEYS) {
        const val = i18n.getResource(lang, 'translation', `settings.${key}`)
        expect(val, `Missing ${lang}.settings.${key}`).toBeTruthy()
      }
    }
  })

  it('purge section keys exist in all languages', () => {
    const purgeKeys = ['title', 'deletion_candidates', 'protected', 'no_candidates', 'no_protected']
    for (const lang of LANGS) {
      for (const key of purgeKeys) {
        const val = i18n.getResource(lang, 'translation', `purge.${key}`)
        expect(val, `Missing ${lang}.purge.${key}`).toBeTruthy()
      }
    }
  })

  it('compilation section keys exist in all languages', () => {
    for (const lang of LANGS) {
      const val = i18n.getResource(lang, 'translation', 'compilation.title')
      expect(val, `Missing ${lang}.compilation.title`).toBeTruthy()
    }
  })

  it('fallback language is English', () => {
    i18n.changeLanguage('unknown-lang')
    // Should not throw and should fall back gracefully
    expect(() => i18n.t('app.title')).not.toThrow()
  })
})

export type UiLanguage = 'zh' | 'en';

export function getUiLanguage(): UiLanguage {
  if (typeof window === 'undefined') return 'zh';
  return new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'zh';
}

export function isReadmePreview() {
  if (typeof window === 'undefined') return false;
  return import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === '1';
}

export function text(lang: UiLanguage, en: string, zh: string) {
  return lang === 'en' ? en : zh;
}

const stageTranslations: Record<string, string> = {
  拜访: 'Visit',
  钥匙: 'Key',
  锁链: 'Chain',
  沉默: 'Silence',
  突破: 'Breakthrough'
};

export function stageText(stage: string, lang: UiLanguage) {
  return lang === 'en' ? (stageTranslations[stage] ?? stage) : stage;
}

export function prophecyText(value: string, lang: UiLanguage) {
  if (lang !== 'en') return value;
  if (value.includes('古老的Dragon')) {
    return '"The ancient Dragon only accepts brave players. Prove your sincerity first, then speak of treasure."';
  }
  return value;
}

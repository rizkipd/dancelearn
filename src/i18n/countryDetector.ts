/**
 * Custom i18next language detector that detects language based on country code
 * from navigator.language instead of language code.
 *
 * Example:
 * - navigator.language = 'en-JP' → detects 'ja' (Japanese) based on JP country code
 * - navigator.language = 'fr-ID' → detects 'id' (Indonesian) based on ID country code
 * - navigator.language = 'en-US' → detects 'en' (English) as default
 */

// Country code to language mapping
const countryToLanguageMap: Record<string, string> = {
  JP: 'ja',  // Japan → Japanese
  ID: 'id',  // Indonesia → Indonesian
  // Add more countries here as needed:
  // KR: 'ko',  // Korea → Korean
  // CN: 'zh',  // China → Chinese
};

// Default language for countries not in the map
const DEFAULT_LANGUAGE = 'en';

export const countryDetector = {
  name: 'countryDetector',

  lookup(): string | undefined {
    // Try to get browser language
    const browserLang = (typeof navigator !== 'undefined' &&
                        (navigator.language || (navigator as any).userLanguage)) || '';

    console.log('[countryDetector] Browser language:', browserLang);

    if (!browserLang) {
      console.log('[countryDetector] No browser language found, using default:', DEFAULT_LANGUAGE);
      return DEFAULT_LANGUAGE;
    }

    // Extract parts from language string
    // Examples: 'en-US' → ['en', 'US'], 'ja-JP' → ['ja', 'JP'], 'ja' → ['ja']
    const parts = browserLang.split('-');
    const languageCode = parts[0].toLowerCase();

    if (parts.length < 2) {
      // No country code (e.g., just 'ja', 'id', 'en')
      // Try to use the language code directly if it's supported
      console.log('[countryDetector] No country code, checking language code:', languageCode);

      // If language code matches one of our supported languages, use it
      if (languageCode === 'ja' || languageCode === 'id' || languageCode === 'en') {
        console.log('[countryDetector] Language code is supported, using:', languageCode);
        return languageCode;
      }

      // Otherwise use default
      console.log('[countryDetector] Language code not supported, using default:', DEFAULT_LANGUAGE);
      return DEFAULT_LANGUAGE;
    }

    // Get the country code (second part) and normalize to uppercase
    const countryCode = parts[1].toUpperCase();
    console.log('[countryDetector] Detected country code:', countryCode);

    // Map country code to language
    const language = countryToLanguageMap[countryCode] || DEFAULT_LANGUAGE;
    console.log('[countryDetector] Mapped to language:', language);

    return language;
  },

  cacheUserLanguage(): void {
    // Language caching is handled by localStorage detector
    // No need to implement here
  }
};

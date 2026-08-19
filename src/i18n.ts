import LZString from 'lz-string';
import { COMPRESSED_LOCALES, COMPRESSED_DEFAULT_QUESTIONS } from './i18n/compressedLocales';
import { getCachedTranslation } from './translationCache';

export type Language = 'sv' | 'fr' | 'en' | 'es' | 'de' | 'no' | 'da' | 'fi' | 'it' | 'et' | 'lv' | 'lt' | 'uk' | 'is' | 'se' | 'nl' | 'be';

export interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'be', name: 'Vlaams (België)', flag: '🇧🇪' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'is', name: 'Íslenska', flag: '🇮🇸' },
  { code: 'se', name: 'Davvisámegiella', flag: '🦌' },
  { code: 'et', name: 'Eesti', flag: '🇪🇪' },
  { code: 'lv', name: 'Latviešu', flag: '🇱🇻' },
  { code: 'lt', name: 'Lietuvių', flag: '🇱🇹' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export function detectLanguage(): Language {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('quiz_app_lang');
      if (saved && (
        saved === 'sv' || saved === 'fr' || saved === 'en' || saved === 'es' ||
        saved === 'de' || saved === 'no' || saved === 'da' || saved === 'fi' ||
        saved === 'it' || saved === 'et' || saved === 'lv' || saved === 'lt' || 
        saved === 'uk' || saved === 'is' || saved === 'se' || saved === 'nl' || saved === 'be'
      )) {
        return saved as Language;
      }
    } catch {
      // ignore
    }
  }
  
  const navLang = (typeof navigator !== 'undefined' ? (navigator.language || (navigator.languages && navigator.languages[0]) || '') : '').toLowerCase();
  if (navLang.startsWith('nl-be') || navLang.startsWith('vls') || navLang.startsWith('wa')) return 'be';
  if (navLang.startsWith('nl')) return 'nl';
  if (navLang.startsWith('be')) return 'be';
  if (navLang.startsWith('en')) return 'en';
  if (navLang.startsWith('de')) return 'de';
  if (navLang.startsWith('fr')) return 'fr';
  if (navLang.startsWith('sv')) return 'sv';
  if (navLang.startsWith('es')) return 'es';
  if (navLang.startsWith('no') || navLang.startsWith('nb') || navLang.startsWith('nn')) return 'no';
  if (navLang.startsWith('da')) return 'da';
  if (navLang.startsWith('fi')) return 'fi';
  if (navLang.startsWith('is')) return 'is';
  if (navLang.startsWith('se') || navLang.startsWith('sme') || navLang.startsWith('sma') || navLang.startsWith('smj')) return 'se';
  if (navLang.startsWith('it')) return 'it';
  if (navLang.startsWith('et')) return 'et';
  if (navLang.startsWith('lv')) return 'lv';
  if (navLang.startsWith('lt')) return 'lt';
  if (navLang.startsWith('uk')) return 'uk';
  
  return 'en';
}

// In-memory cache for unpacked/decompressed dictionaries
const unpackedDictionaries: Partial<Record<Language, Record<string, any>>> = {};

/**
 * Checks if a language is already unpacked into active memory.
 */
export function isLanguageUnpacked(lang: Language): boolean {
  return !!unpackedDictionaries[lang];
}

/**
 * Unpacks (decompresses) a language dictionary on demand when selected or needed.
 * Once unpacked, subsequent calls are instantaneous memory lookups.
 */
export function unpackLanguage(lang: Language): Record<string, any> {
  if (unpackedDictionaries[lang]) {
    return unpackedDictionaries[lang]!;
  }
  
  const compressed = COMPRESSED_LOCALES[lang];
  if (compressed) {
    try {
      const decompressed = LZString.decompressFromBase64(compressed);
      if (decompressed) {
        const parsed = JSON.parse(decompressed);
        unpackedDictionaries[lang] = parsed;
        return parsed;
      }
    } catch (e) {
      console.error(`[i18n] Failed to decompress language '${lang}':`, e);
    }
  }

  // Fallback to Swedish if available or empty dictionary
  if (lang !== 'sv') {
    return unpackLanguage('sv');
  }
  return {};
}

/**
 * Preloads/unpacks an array of languages into memory.
 */
export function preloadLanguages(languages: Language[]): void {
  for (const lang of languages) {
    unpackLanguage(lang);
  }
}

/**
 * Gets a language dictionary (auto-unpacking if not already in memory).
 */
export function getLanguageDictionary(lang: Language): Record<string, any> {
  return unpackLanguage(lang);
}

// Transparent Proxy object for backward compatibility with `translations[lang]`
export const translations: Record<Language, Record<string, any>> = new Proxy({} as any, {
  get: (_target, prop: string) => {
    if (typeof prop === 'string' && prop in COMPRESSED_LOCALES) {
      return getLanguageDictionary(prop as Language);
    }
    return undefined;
  },
  has: (_target, prop: string) => {
    return typeof prop === 'string' && prop in COMPRESSED_LOCALES;
  }
});

// Lazy question translations dictionary
let unpackedDefaultQuestions: Record<string, Record<Language, { text: string; options?: string[] }>> | null = null;

export function getDefaultQuestionTranslations(): Record<string, Record<Language, { text: string; options?: string[] }>> {
  if (!unpackedDefaultQuestions) {
    try {
      const decompressed = LZString.decompressFromBase64(COMPRESSED_DEFAULT_QUESTIONS);
      if (decompressed) {
        unpackedDefaultQuestions = JSON.parse(decompressed);
      }
    } catch (e) {
      console.error('[i18n] Failed to unpack default question translations:', e);
      unpackedDefaultQuestions = {};
    }
  }
  return unpackedDefaultQuestions || {};
}

const DICTIONARY_OVERRIDES: Record<string, Partial<Record<Language, string>>> = {
  libraryTab: {
    sv: 'Bibliotek',
    en: 'Library',
    nl: 'Bibliotheek',
    be: 'Bibliotheek',
    no: 'Bibliotek',
    da: 'Bibliotek',
    fi: 'Kirjasto',
    is: 'Bókasafn',
    se: 'Girjerádju',
    et: 'Raamatukogu',
    lv: 'Bibliotēka',
    lt: 'Biblioteka',
    uk: 'Бібліотека',
    de: 'Bibliothek',
    fr: 'Bibliothèque',
    it: 'Biblioteca',
    es: 'Biblioteca',
  },
  libraryTitle: {
    sv: 'Bibliotek & sparade quiz',
    en: 'Library & saved quizzes',
    nl: 'Bibliotheek & opgeslagen quizzen',
    be: 'Bibliotheek & opgeslagen quizzen',
    no: 'Bibliotek & lagrede quizer',
    da: 'Bibliotek & gemte quizzer',
    fi: 'Kirjasto & tallennetut tietovisat',
    is: 'Bókasafn & vistuð spurningakeppni',
    se: 'Girjerádju & vurkejuvvon gilvvut',
    et: 'Raamatukogu & salvestatud viktoriinid',
    lv: 'Bibliotēka & saglabātās viktorīnas',
    lt: 'Biblioteka ir išsaugotos viktorinos',
    uk: 'Бібліотека та збережені вікторини',
    de: 'Bibliothek & gespeicherte Quiz',
    fr: 'Bibliothèque & quiz enregistrés',
    it: 'Biblioteca & quiz salvati',
    es: 'Biblioteca & cuestionarios guardados',
  },
  library: {
    sv: 'Bibliotek',
    en: 'Library',
    nl: 'Bibliotheek',
    be: 'Bibliotheek',
    no: 'Bibliotek',
    da: 'Bibliotek',
    fi: 'Kirjasto',
    is: 'Bókasafn',
    se: 'Girjerádju',
    et: 'Raamatukogu',
    lv: 'Bibliotēka',
    lt: 'Biblioteka',
    uk: 'Бібліотека',
    de: 'Bibliothek',
    fr: 'Bibliothèque',
    it: 'Biblioteca',
    es: 'Biblioteca',
  },
  availableLanguagesLabel: {
    sv: 'Tillgängliga språk',
    en: 'Available languages',
    nl: 'Beschikbare talen',
    be: 'Beschikbare talen',
    no: 'Tilgjengelige språk',
    da: 'Tilgængelige sprog',
    fi: 'Saatavilla olevat kielet',
    is: 'Fáanleg tungumál',
    se: 'Oččolaš gielat',
    et: 'Saadaval keeled',
    lv: 'Pieejamās valodas',
    lt: 'Prieinamos kalbos',
    uk: 'Доступні мови',
    de: 'Verfügbare Sprachen',
    fr: 'Langues disponibles',
    it: 'Lingue disponibili',
    es: 'Idiomas disponibles',
  },
  quizLanguagesTitle: {
    sv: 'Språk för frågorna',
    en: 'Question languages',
    nl: 'Talen van de vragen',
    be: 'Talen van de vragen',
    no: 'Spørsmålsspråk',
    da: 'Spørgsmålssprog',
    fi: 'Kysymysten kielet',
    is: 'Tungumál spurninga',
    se: 'Gažaldagaid gielat',
    et: 'Küsimuste keeled',
    lv: 'Jautājumu valodas',
    lt: 'Klausimų kalbos',
    uk: 'Мови запитань',
    de: 'Fragensprachen',
    fr: 'Langues des questions',
    it: 'Lingue delle domande',
    es: 'Idiomas de las preguntas',
  },
  activeQuizLanguage: {
    sv: 'Aktivt språk i appen',
    en: 'Active app language',
    nl: 'Actieve app-taal',
    be: 'Actieve app-taal',
    no: 'Aktivt språk i appen',
    da: 'Aktivt sprog i appen',
    fi: 'Aktiivinen sovelluskieli',
    is: 'Virkt tungumál í forriti',
    se: 'Aktívalaš giella',
    et: 'Aktiivne rakenduse keel',
    lv: 'Aktīvā lietotnes valoda',
    lt: 'Aktyvi programėlės kalba',
    uk: 'Активна мова додатка',
    de: 'Aktive App-Sprache',
    fr: 'Langue active de l’application',
    it: 'Lingua attiva dell’app',
    es: 'Idioma activo de la aplicación',
  },
  moreLangsLabel: {
    sv: 'fler',
    en: 'more',
    nl: 'meer',
    be: 'meer',
    no: 'flere',
    da: 'flere',
    fi: 'lisää',
    is: 'fleiri',
    se: 'eanet',
    et: 'rohkem',
    lv: 'vairāk',
    lt: 'daugiau',
    uk: 'більше',
    de: 'weitere',
    fr: 'de plus',
    it: 'altre',
    es: 'más',
  },
  questionOriginalLang: {
    sv: 'Originalspråk',
    en: 'Original language',
    nl: 'Originele taal',
    be: 'Originele taal',
    no: 'Originalspråk',
    da: 'Originalsprog',
    fi: 'Alkuperäinen kieli',
    is: 'Upprunalegt tungumál',
    se: 'Álgoálgosaš giella',
    et: 'Algkeel',
    lv: 'Oriģinālvaloda',
    lt: 'Originali kalba',
    uk: 'Оригінальна мова',
    de: 'Originalsprache',
    fr: 'Langue originale',
    it: 'Lingua originale',
    es: 'Idioma original',
  },
  translationsAvailable: {
    sv: 'Översättningar',
    en: 'Translations',
    nl: 'Vertalingen',
    be: 'Vertalingen',
    no: 'Oversettelser',
    da: 'Oversættelser',
    fi: 'Käännökset',
    is: 'Þýðingar',
    se: 'Jorgalusat',
    et: 'Tõlked',
    lv: 'Tulkojumi',
    lt: 'Vertimai',
    uk: 'Переклади',
    de: 'Übersetzungen',
    fr: 'Traductions',
    it: 'Traduzioni',
    es: 'Traducciones',
  },
  quizHasAllQuestionsTranslated: {
    sv: 'Finns på alla 17 språk',
    en: 'Available in all 17 languages',
    nl: 'Beschikbaar in alle 17 talen',
    be: 'Beschikbaar in alle 17 talen',
    no: 'Tilgjengelig på alle 17 språk',
    da: 'Tilgængelig på alle 17 sprog',
    fi: 'Saatavilla kaikilla 17 kielellä',
    is: 'Fáanlegt á öllum 17 tungumálum',
    se: 'Oččolaš buot 17 gielas',
    et: 'Saadaval kõigis 17 keeles',
    lv: 'Pieejams visās 17 valodās',
    lt: 'Prieinama visomis 17 kalbų',
    uk: 'Доступно всіма 17 мовами',
    de: 'In allen 17 Sprachen verfügbar',
    fr: 'Disponible dans les 17 langues',
    it: 'Disponibile in tutte le 17 lingue',
    es: 'Disponible en los 17 idiomas',
  },
  activeLangAvailableMsg: {
    sv: 'Ditt valda språk finns tillgängligt',
    en: 'Your selected language is available',
    nl: 'Uw geselecteerde taal is beschikbaar',
    be: 'Uw geselecteerde taal is beschikbaar',
    no: 'Ditt valgte språk er tilgjengelig',
    da: 'Dit valgte sprog er tilgængeligt',
    fi: 'Valitsemasi kieli on saatavilla',
    is: 'Valið tungumál er fáanlegt',
    se: 'Du válljejuvvon giella lea oččolaš',
    et: 'Teie valitud keel on saadaval',
    lv: 'Jūsu izvēlētā valoda ir pieejama',
    lt: 'Jūsų pasirinkta kalba yra prieinama',
    uk: 'Обрана мова доступна',
    de: 'Ihre ausgewählte Sprache ist verfügbar',
    fr: 'Votre langue sélectionnée est disponible',
    it: 'La tua lingua selezionata è disponibile',
    es: 'Tu idioma seleccionado está disponible',
  }
};

/**
 * Primary translation function.
 * Synchronous, fast, and uses unpacked dictionary with fallback to Swedish.
 */
export function t(lang: Language, key: string, params?: Record<string, string>): string {
  const override = DICTIONARY_OVERRIDES[key]?.[lang] || DICTIONARY_OVERRIDES[key]?.['sv'];
  if (override) {
    let text = override;
    if (params) {
      Object.keys(params).forEach(pKey => {
        text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), params[pKey]);
      });
    }
    return text;
  }
  const dictionary = getLanguageDictionary(lang);
  const fallback = lang === 'sv' ? dictionary : getLanguageDictionary('sv');
  let text = dictionary[key] || fallback[key] || key;
  if (params) {
    Object.keys(params).forEach(pKey => {
      text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), params[pKey]);
    });
  }
  return text;
}

/**
 * Translates default questions or retrieves cached translations.
 */
export function translateQuestion(
  qId: string, 
  defaultText: string, 
  defaultOptions: string[], 
  lang: Language, 
  origLang: Language = 'sv'
): { text: string; options: string[] } {
  if (lang === origLang) {
    return { text: defaultText, options: defaultOptions };
  }
  const defaultQuestions = getDefaultQuestionTranslations();
  const qTrans = defaultQuestions[qId]?.[lang];
  if (qTrans) {
    return {
      text: qTrans.text,
      options: qTrans.options || defaultOptions
    };
  }
  const cached = getCachedTranslation({
    id: qId,
    text: defaultText,
    options: defaultOptions,
    correctAnswers: [],
    originalLanguage: origLang
  }, lang);
  if (cached) {
    return cached;
  }
  return { text: defaultText, options: defaultOptions };
}

// Initial eager unpack of fallback and detected language for instant first paint
try {
  unpackLanguage('sv');
  const initial = detectLanguage();
  if (initial !== 'sv') {
    unpackLanguage(initial);
  }
} catch {
  // safe fallback
}

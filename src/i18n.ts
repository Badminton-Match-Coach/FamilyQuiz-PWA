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
  importPastedJsonBtn: {
    sv: 'Importera quizkod', en: 'Import quiz code', nl: 'Quizcode importeren', be: 'Quizcode importeren',
    no: 'Importer quizkode', da: 'Importér quizkode', fi: 'Tuo visakoodi', is: 'Flytja inn spurningakóða',
    se: 'Fievrrit sisa kvizakoda', et: 'Impordi viktoriinikood', lv: 'Importēt viktorīnas kodu', lt: 'Importuoti viktorinos kodą',
    uk: 'Імпортувати код вікторини', de: 'Quiz-Code importieren', fr: 'Importer le code du quiz', it: 'Importa codice quiz', es: 'Importar código de prueba'
  },
  pasteAiResponseTitle: {
    sv: 'Klistra in quizkod eller text', en: 'Paste quiz code or text', nl: 'Plak quizcode of tekst', be: 'Plak quizcode of tekst',
    no: 'Lim inn quizkode eller tekst', da: 'Indsæt quizkode eller tekst', fi: 'Liitä visakoodi tai teksti', is: 'Líma inn spurningakóða eða texta',
    se: 'Liimmet kvizakoda dahje teavstta', et: 'Kleebi viktoriinikood või tekst', lv: 'Ielīmēt viktorīnas kodu vai tekstu', lt: 'Įklijuokite viktorinos kodą arba tekstą',
    uk: 'Вставте код вікторини або текст', de: 'Quiz-Code oder Text einfügen', fr: 'Coller le code du quiz ou le texte', it: 'Incolla codice quiz o testo', es: 'Pegar código de prueba o texto'
  },
  pasteAiResponsePlaceholder: {
    sv: 'Klistra in quizkod eller text här...', en: 'Paste quiz code or text here...', nl: 'Plak hier quizcode of tekst...', be: 'Plak hier quizcode of tekst...',
    no: 'Lim inn quizkode eller tekst her...', da: 'Indsæt quizkode eller tekst her...', fi: 'Liitä visakoodi tai teksti tähän...', is: 'Líma inn spurningakóða eða texta hér...',
    se: 'Liimmet kvizakoda dás...', et: 'Kleebi viktoriinikood siia...', lv: 'Ielīmējiet viktorīnas kodu šeit...', lt: 'Įklijuokite viktorinos kodą čia...',
    uk: 'Вставте код вікторини тут...', de: 'Quiz-Code hier einfügen...', fr: 'Coller le code ici...', it: 'Incolla qui il codice quiz...', es: 'Pegar código aquí...'
  },
  pasteCodeOrTextLabel: {
    sv: 'Klistra in quizkod eller text', en: 'Paste quiz code or text', nl: 'Plak quizcode of tekst', be: 'Plak quizcode of tekst',
    no: 'Lim inn quizkode eller tekst', da: 'Indsæt quizkode eller tekst', fi: 'Liitä visakoodi tai teksti', is: 'Líma inn spurningakóða eða texta',
    se: 'Liimmet kvizakoda dahje teavstta', et: 'Kleebi viktoriinikood või tekst', lv: 'Ielīmēt viktorīnas kodu vai tekstu', lt: 'Įklijuokite viktorinos kodą arba tekstą',
    uk: 'Вставте код вікторини або текст', de: 'Quiz-Code oder Text einfügen', fr: 'Coller le code du quiz ou le texte', it: 'Incolla codice quiz o testo', es: 'Pegar código de prueba o texto'
  },
  pasteCodePlaceholder: {
    sv: 'Klistra in quizkod eller text här...', en: 'Paste quiz code or text here...', nl: 'Plak hier quizcode of tekst...', be: 'Plak hier quizcode of tekst...',
    no: 'Lim inn quizkode eller tekst her...', da: 'Indsæt quizkode eller tekst her...', fi: 'Liitä visakoodi tai teksti tähän...', is: 'Líma inn spurningakóða eða texta hér...',
    se: 'Liimmet kvizakoda dás...', et: 'Kleebi viktoriinikood siia...', lv: 'Ielīmējiet viktorīnas kodu šeit...', lt: 'Įklijuokite viktorinos kodą čia...',
    uk: 'Вставте код вікторини тут...', de: 'Quiz-Code hier einfügen...', fr: 'Coller le code ici...', it: 'Incolla qui il codice quiz...', es: 'Pegar código aquí...'
  },
  exportDbBtn: {
    sv: 'Spara säkerhetskopia', en: 'Save backup file', nl: 'Back-up opslaan', be: 'Back-up opslaan',
    no: 'Lagre sikkerhetskopi', da: 'Gem sikkerhedskopi', fi: 'Tallenna varmuuskopio', is: 'Vista öryggisafrit',
    se: 'Vurke sihkarvuođakopiija', et: 'Salvesta varukoopia', lv: 'Saglabāt dublējumu', lt: 'Išsaugoti atsarginę kopiją',
    uk: 'Зберегти резервну копію', de: 'Sicherungskopie speichern', fr: 'Sauvegarder une copie', it: 'Salva copia di backup', es: 'Guardar copia de seguridad'
  },
  importDbBtn: {
    sv: 'Öppna säkerhetskopia', en: 'Open backup file', nl: 'Back-up openen', be: 'Back-up openen',
    no: 'Åpne sikkerhetskopi', da: 'Åbn sikkerhedskopi', fi: 'Avaa varmuuskopio', is: 'Opna öryggisafrit',
    se: 'Raba sihkarvuođakopiija', et: 'Ava varukoopia', lv: 'Atvērt dublējumu', lt: 'Atidaryti atsarginę kopiją',
    uk: 'Відкрити резервну копію', de: 'Sicherungskopie öffnen', fr: 'Ouvrir une copie', it: 'Apri copia di backup', es: 'Abrir copia de seguridad'
  },
  fetchCatalogBtn: {
    sv: 'HÄMTA KATALOG', en: 'Fetch catalog', nl: 'Catalogus ophalen', be: 'Catalogus ophalen',
    no: 'Hent katalog', da: 'Hent katalog', fi: 'Hae katalogi', is: 'Sækja skrá',
    se: 'Viežžat kataloga', et: 'Laadi kataloog', lv: 'Ielādēt katalogu', lt: 'Gauti katalogą',
    uk: 'Отримати каталог', de: 'Katalog abrufen', fr: 'Récupérer le catalogue', it: 'Recupera catalogo', es: 'Obtener catálogo'
  },
  changeCatalogBtn: {
    sv: 'ÄNDRA KATALOG', en: 'Change catalog', nl: 'Catalogus wijzigen', be: 'Catalogus wijzigen',
    no: 'Endre katalog', da: 'Skift katalog', fi: 'Vaihda katalogi', is: 'Breyta skrá',
    se: 'Rievdadit kataloga', et: 'Muuda kataloogi', lv: 'Mainīt katalogu', lt: 'Keisti katalogą',
    uk: 'Змінити каталог', de: 'Katalog ändern', fr: 'Changer le catalogue', it: 'Cambia catalogo', es: 'Cambiar catálogo'
  },
  catalogSourceLabel: {
    sv: 'Katalogkälla', en: 'Catalog source', nl: 'Catalogusbron', be: 'Catalogusbron',
    no: 'Katalogkilde', da: 'Katalogkilde', fi: 'Katalogin lähde', is: 'Katalógugjafi',
    se: 'Kataloga-gáldu', et: 'Kataloogi allikas', lv: 'Kataloga avots', lt: 'Katalogo šaltinis',
    uk: 'Джерело каталогу', de: 'Katalogquelle', fr: 'Source du catalogue', it: 'Fonte catalogo', es: 'Fuente del catálogo'
  },
  catalogUrlPlaceholder: {
    sv: 'Klistra in katalog-URL', en: 'Paste catalog URL', nl: 'Plak catalogus-URL', be: 'Plak catalogus-URL',
    no: 'Lim inn katalog-URL', da: 'Indsæt katalog-URL', fi: 'Liitä katalogin URL', is: 'Líma inn URL skráar',
    se: 'Liimmet kataloga URL', et: 'Kleebi kataloogi URL', lv: 'Ielīmējiet kataloga URL', lt: 'Įklijuokite katalogo URL',
    uk: 'Вставте URL каталогу', de: 'Katalog-URL einfügen', fr: 'Coller l’URL du catalogue', it: 'Incolla URL catalogo', es: 'Pegar URL del catálogo'
  },
  resetCatalogBtn: {
    sv: 'ÅTERSTÄLL KATALOG', en: 'Reset catalog', nl: 'Catalogus resetten', be: 'Catalogus resetten',
    no: 'Tilbakestill katalog', da: 'Nulstil katalog', fi: 'Tyhjennä katalogi', is: 'Núllstilla skrá',
    se: 'Resette kataloga', et: 'Lähtesta kataloog', lv: 'Atiestatīt katalogu', lt: 'Atstatyti katalogą',
    uk: 'Скинути каталог', de: 'Katalog zurücksetzen', fr: 'Réinitialiser le catalogue', it: 'Reimposta catalogo', es: 'Restablecer catálogo'
  },
  recentQuizSection: {
    sv: 'Senast använt / sparad quiz', en: 'Recent / saved quiz', nl: 'Recent / opgeslagen quiz', be: 'Recent / opgeslagen quiz',
    no: 'Nylig brukt / lagret quiz', da: 'Senest brugte / gemte quiz', fi: 'Viimeksi käytetty / tallennettu visa', is: 'Nýlega notað / vistað quiz',
    se: 'Maŋemusat geavahuvvon kviza', et: 'Viimati kasutatud / salvestatud viktoriin', lv: 'Nesen lietotā / saglabātā viktorīna', lt: 'Paskutinė naudota / išsaugota viktorina',
    uk: 'Нещодавно використана / збережена вікторина', de: 'Zuletzt verwendetes / gespeichertes Quiz', fr: 'Quiz récemment utilisé / enregistré', it: 'Quiz recente / salvato', es: 'Quiz reciente / guardado'
  },
  hideSavedQuizzes: {
    sv: 'Dölj sparade quiz', en: 'Hide saved quizzes', nl: 'Opgeslagen quizzen verbergen', be: 'Opgeslagen quizzen verbergen',
    no: 'Skjul lagrede quizzer', da: 'Skjul gemte quizzer', fi: 'Piilota tallennetut visat', is: 'Fela vistuð quiz',
    se: 'Čiega vurkejuvvon kvizaid', et: 'Peida salvestatud viktoriinid', lv: 'Paslēpt saglabātās viktorīnas', lt: 'Slėpti išsaugotas viktorinas',
    uk: 'Сховати збережені вікторини', de: 'Gespeicherte Quizze ausblenden', fr: 'Masquer les quiz enregistrés', it: 'Nascondi quiz salvati', es: 'Ocultar quizzes guardados'
  },
  showSavedQuizzes: {
    sv: 'Visa alla sparade quiz', en: 'Show all saved quizzes', nl: 'Toon alle opgeslagen quizzen', be: 'Toon alle opgeslagen quizzen',
    no: 'Vis alle lagrede quizzer', da: 'Vis alle gemte quizzer', fi: 'Näytä kaikki tallennetut visat', is: 'Sýna öll vistuð quiz',
    se: 'Čájet buot vurkejuvvon kvizaid', et: 'Näita kõiki salvestatud viktoriine', lv: 'Rādīt visas saglabātās viktorīnas', lt: 'Rodyti visas išsaugotas viktorinas',
    uk: 'Показати всі збережені вікторини', de: 'Alle gespeicherten Quizze anzeigen', fr: 'Afficher tous les quiz enregistrés', it: 'Mostra tutti i quiz salvati', es: 'Mostrar todos los quizzes guardados'
  },
  saveCurrentQuizShortBtn: {
    sv: 'Spara nuvarande quiz', en: 'Save current quiz', nl: 'Huidige quiz opslaan', be: 'Huidige quiz opslaan',
    no: 'Lagre nåværende quiz', da: 'Gem nuværende quiz', fi: 'Tallenna nykyinen visa', is: 'Vista núverandi quiz',
    se: 'Vurke dálá kviza', et: 'Salvesta praegune viktoriin', lv: 'Saglabāt pašreizējo viktorīnu', lt: 'Išsaugoti dabartinę viktoriną',
    uk: 'Зберегти поточну вікторину', de: 'Aktuelles Quiz speichern', fr: 'Enregistrer le quiz actuel', it: 'Salva il quiz corrente', es: 'Guardar quiz actual'
  },
  currentlyLoadedBadge: {
    sv: 'Aktivt i appen', en: 'Active in app', nl: 'Actief in app', be: 'Actief in app',
    no: 'Aktiv i appen', da: 'Aktiv i appen', fi: 'Aktiivinen sovelluksessa', is: 'Virkt í appi',
    se: 'Aktívalaš áppas', et: 'Rakenduses aktiivne', lv: 'Aktīva lietotnē', lt: 'Aktyvi programėlėje',
    uk: 'Активний у додатку', de: 'Aktiv in der App', fr: 'Actif dans l’app', it: 'Attivo nell’app', es: 'Activo en la app'
  },
  latestSavedBadge: {
    sv: 'Senast sparad', en: 'Latest saved', nl: 'Laatst opgeslagen', be: 'Laatst opgeslagen',
    no: 'Sist lagret', da: 'Sidst gemt', fi: 'Viimeksi tallennettu', is: 'Síðast vistað',
    se: 'Maŋemusat vurkejuvvon', et: 'Viimati salvestatud', lv: 'Pēdējoreiz saglabāts', lt: 'Paskutinį kartą išsaugotas',
    uk: 'Останнє збережене', de: 'Zuletzt gespeichert', fr: 'Dernier enregistré', it: 'Ultimo salvato', es: 'Último guardado'
  },
  geotagFollowUpSection: {
    sv: 'GEOTAGG/FÖLJDFRÅGA', en: 'GEOTAG/FOLLOW-UP', nl: 'GEOTAG/VERVOLGVRAAG', be: 'GEOTAG/VERVOLGVRAAG',
    no: 'GEOTAG/OPPFØLGINGSSPØRSMÅL', da: 'GEOTAG/OPFØLGENDE SPØRGSMÅL', fi: 'GEOTAG/JATKOKYSYMYS',
    is: 'GEOTAG/FRAMHALDSSPURNING', se: 'GEOTAG/ČUOVUSGAHČČAN', et: 'GEOTAG/JÄRELKÜSIMUS',
    lv: 'ĢEOTAGS/PAPILJAUTĀJUMS', lt: 'GEOTAG/PAPILDOMAS KLAUSIMAS', uk: 'ГЕОТЕГ/ДОДАТКОВЕ ПИТАННЯ',
    de: 'GEOTAG/FOLGEFRAGE', fr: 'GÉOTAG/QUESTION SUIVANTE', it: 'GEOTAG/DOMANDA SUCCESSIVA', es: 'GEOTAG/PREGUNTA DE SEGUIMIENTO'
  },
  followUpQuestionLabel: {
    sv: 'Följdfråga', en: 'Follow-up question', nl: 'Vervolgvraag', be: 'Vervolgvraag', no: 'Oppfølgingsspørsmål',
    da: 'Opfølgende spørgsmål', fi: 'Jatkokysymys', is: 'Framhaldsspurning', se: 'Čuovusgažžan', et: 'Järelküsimus',
    lv: 'Papiljautājums', lt: 'Papildomas klausimas', uk: 'Додаткове питання', de: 'Folgefrage', fr: 'Question suivante',
    it: 'Domanda successiva', es: 'Pregunta de seguimiento'
  },
  followUpQuestionDescription: {
    sv: 'Välj en manuellt skapad fråga som öppnas efter denna.', en: 'Choose a manually created question to open after this one.',
    nl: 'Kies een handmatig gemaakte vraag die hierna wordt geopend.', be: 'Kies een handmatig gemaakte vraag die hierna wordt geopend.',
    no: 'Velg et manuelt opprettet spørsmål som åpnes etter dette.', da: 'Vælg et manuelt oprettet spørgsmål, der åbnes bagefter.',
    fi: 'Valitse manuaalisesti luotu kysymys, joka avautuu tämän jälkeen.', is: 'Veldu handvirkt búna spurningu sem opnast eftir þessa.',
    se: 'Vállje jearaldaga mii rahppojuvvo dán maŋŋá.', et: 'Vali käsitsi loodud küsimus, mis avatakse pärast seda.',
    lv: 'Izvēlieties manuāli izveidotu jautājumu, kas tiks atvērts pēc šī.', lt: 'Pasirinkite rankiniu būdu sukurtą klausimą, kuris bus atidarytas po šio.',
    uk: 'Виберіть створене вручну питання, яке відкриється після цього.', de: 'Wählen Sie eine manuell erstellte Frage, die danach geöffnet wird.',
    fr: 'Choisissez une question créée manuellement à ouvrir ensuite.', it: 'Scegli una domanda creata manualmente da aprire dopo questa.',
    es: 'Elige una pregunta creada manualmente para abrirla después de esta.'
  },
  noFollowUpOption: {
    sv: 'Ingen följdfråga', en: 'No follow-up question', nl: 'Geen vervolgvraag', be: 'Geen vervolgvraag', no: 'Ingen oppfølging',
    da: 'Ingen opfølgende spørgsmål', fi: 'Ei jatkokysymystä', is: 'Engin framhaldsspurning', se: 'Ii čuovusgažžan', et: 'Järelküsimust pole',
    lv: 'Nav papiljautājuma', lt: 'Nėra papildomo klausimo', uk: 'Без додаткового питання', de: 'Keine Folgefrage', fr: 'Aucune question suivante',
    it: 'Nessuna domanda successiva', es: 'Sin pregunta de seguimiento'
  },
  followUpAlwaysOption: {
    sv: 'Visa alltid', en: 'Always show', nl: 'Altijd tonen', be: 'Altijd tonen', no: 'Vis alltid', da: 'Vis altid', fi: 'Näytä aina',
    is: 'Sýna alltaf', se: 'Čájet álo', et: 'Näita alati', lv: 'Rādīt vienmēr', lt: 'Rodyti visada', uk: 'Показувати завжди',
    de: 'Immer anzeigen', fr: 'Toujours afficher', it: 'Mostra sempre', es: 'Mostrar siempre'
  },
  followUpCorrectOption: {
    sv: 'Visa efter rätt svar', en: 'Show after correct answer', nl: 'Tonen na goed antwoord', be: 'Tonen na goed antwoord', no: 'Vis etter riktig svar',
    da: 'Vis efter korrekt svar', fi: 'Näytä oikean vastauksen jälkeen', is: 'Sýna eftir rétt svar', se: 'Čájet rievttes vástádusa maŋŋá',
    et: 'Näita pärast õiget vastust', lv: 'Rādīt pēc pareizas atbildes', lt: 'Rodyti po teisingo atsakymo', uk: 'Показувати після правильної відповіді',
    de: 'Nach richtiger Antwort anzeigen', fr: 'Afficher après une bonne réponse', it: 'Mostra dopo la risposta corretta', es: 'Mostrar tras la respuesta correcta'
  },
  followUpIncorrectOption: {
    sv: 'Visa efter fel svar', en: 'Show after incorrect answer', nl: 'Tonen na fout antwoord', be: 'Tonen na fout antwoord', no: 'Vis etter feil svar',
    da: 'Vis efter forkert svar', fi: 'Näytä väärän vastauksen jälkeen', is: 'Sýna eftir rangt svar', se: 'Čájet boastut vástádusa maŋŋá',
    et: 'Näita pärast valet vastust', lv: 'Rādīt pēc nepareizas atbildes', lt: 'Rodyti po neteisingo atsakymo', uk: 'Показувати після неправильної відповіді',
    de: 'Nach falscher Antwort anzeigen', fr: 'Afficher après une mauvaise réponse', it: 'Mostra dopo la risposta errata', es: 'Mostrar tras la respuesta incorrecta'
  },
  overwriteQuizConfirm: {
    sv: 'Vill du uppdatera detta quiz i IndexedDB med ditt nuvarande quiz?', en: 'Do you want to update this quiz in IndexedDB with your current quiz?',
    nl: 'Wil je deze quiz in IndexedDB bijwerken met je huidige quiz?', be: 'Wil je deze quiz in IndexedDB bijwerken met je huidige quiz?',
    no: 'Vil du oppdatere denne quizen i IndexedDB med den nåværende quizen?', da: 'Vil du opdatere denne quiz i IndexedDB med din nuværende quiz?',
    fi: 'Haluatko päivittää tämän tietokannan nykyisellä visallasi?', is: 'Viltu uppfæra þessa spurningakeppni í IndexedDB með núverandi keppni?',
    se: 'Háliidat go ođasmahttit dán kviza IndexedDB:s dálá kvizaiguin?', et: 'Kas soovid seda viktoriini IndexedDB-s praeguse viktoriiniga uuendada?',
    lv: 'Vai vēlaties atjaunināt šo viktorīnu IndexedDB ar pašreizējo viktorīnu?', lt: 'Ar norite atnaujinti šią viktoriną IndexedDB su dabartine viktorina?',
    uk: 'Оновити цей тест в IndexedDB поточним тестом?', de: 'Möchten Sie dieses Quiz in IndexedDB mit Ihrem aktuellen Quiz aktualisieren?',
    fr: 'Voulez-vous mettre à jour ce quiz dans IndexedDB avec votre quiz actuel ?', it: 'Vuoi aggiornare questo quiz in IndexedDB con il quiz corrente?',
    es: '¿Quieres actualizar este quiz en IndexedDB con tu quiz actual?'
  },
  deleteQuizConfirm: {
    sv: 'Vill du radera detta sparade quiz?', en: 'Do you want to delete this saved quiz?', nl: 'Wil je deze opgeslagen quiz verwijderen?', be: 'Wil je deze opgeslagen quiz verwijderen?',
    no: 'Vil du slette denne lagrede quizen?', da: 'Vil du slette denne gemte quiz?', fi: 'Haluatko poistaa tämän tallennetun visan?', is: 'Viltu eyða þessari vistuðu spurningakeppni?',
    se: 'Háliidat go sihkkut dán vurkejuvvon kviza?', et: 'Kas soovid selle salvestatud viktoriini kustutada?', lv: 'Vai vēlaties dzēst šo saglabāto viktorīnu?',
    lt: 'Ar norite ištrinti šią išsaugotą viktoriną?', uk: 'Видалити цей збережений тест?', de: 'Möchten Sie dieses gespeicherte Quiz löschen?',
    fr: 'Voulez-vous supprimer ce quiz enregistré ?', it: 'Vuoi eliminare questo quiz salvato?', es: '¿Quieres eliminar este quiz guardado?'
  },
  clearDbConfirm: {
    sv: 'Vill du radera alla sparade quiz från IndexedDB?', en: 'Do you want to delete all saved quizzes from IndexedDB?', nl: 'Wil je alle opgeslagen quizzen uit IndexedDB verwijderen?', be: 'Wil je alle opgeslagen quizzen uit IndexedDB verwijderen?',
    no: 'Vil du slette alle lagrede quizer fra IndexedDB?', da: 'Vil du slette alle gemte quizzer fra IndexedDB?', fi: 'Haluatko poistaa kaikki tallennetut visat IndexedDB:stä?', is: 'Viltu eyða öllum vistuðum spurningakeppnum úr IndexedDB?',
    se: 'Háliidat go sihkkut buot vurkejuvvon kvizat IndexedDB:s?', et: 'Kas soovid kõik salvestatud viktoriinid IndexedDB-st kustutada?', lv: 'Vai vēlaties dzēst visas saglabātās viktorīnas no IndexedDB?',
    lt: 'Ar norite ištrinti visas išsaugotas viktorinas iš IndexedDB?', uk: 'Видалити всі збережені тести з IndexedDB?', de: 'Möchten Sie alle gespeicherten Quizze aus IndexedDB löschen?',
    fr: 'Voulez-vous supprimer tous les quiz enregistrés d’IndexedDB ?', it: 'Vuoi eliminare tutti i quiz salvati da IndexedDB?', es: '¿Quieres eliminar todos los quizzes guardados de IndexedDB?'
  },
  indexedDbActionFailed: {
    sv: 'Åtgärden kunde inte genomföras i IndexedDB.', en: 'The action could not be completed in IndexedDB.', nl: 'De actie kon niet worden uitgevoerd in IndexedDB.', be: 'De actie kon niet worden uitgevoerd in IndexedDB.',
    no: 'Handlingen kunne ikke fullføres i IndexedDB.', da: 'Handlingen kunne ikke fuldføres i IndexedDB.', fi: 'Toimintoa ei voitu suorittaa IndexedDB:ssä.', is: 'Ekki tókst að framkvæma aðgerðina í IndexedDB.',
    se: 'Dáhttu ii sáhttán čađahuvvot IndexedDB:s.', et: 'Toimingut ei saanud IndexedDB-s lõpule viia.', lv: 'Darbību nevarēja pabeigt IndexedDB.',
    lt: 'Veiksmo nepavyko užbaigti IndexedDB.', uk: 'Не вдалося виконати дію в IndexedDB.', de: 'Die Aktion konnte in IndexedDB nicht abgeschlossen werden.',
    fr: 'L’action n’a pas pu être effectuée dans IndexedDB.', it: 'Impossibile completare l’operazione in IndexedDB.', es: 'No se pudo completar la acción en IndexedDB.'
  },
  dragToReorder: {
    sv: 'Dra och släpp för att ändra ordning', en: 'Drag and drop to reorder', nl: 'Slepen en neerzetten om te herschikken', be: 'Slepen en neerzetten om te herschikken',
    no: 'Dra og slipp for å endre rekkefølge', da: 'Træk og slip for at ændre rækkefølge', fi: 'Vedä ja pudota muuttaaksesi järjestystä', is: 'Draga og sleppa til að endurraða',
    se: 'Giesat ja luoitte rievdadit ortnega', et: 'Lohista ja aseta järjekorra muutmiseks', lv: 'Velciet un nometiet, lai mainītu secību', lt: 'Vilkite ir numeskite, norėdami pakeisti tvarką',
    uk: 'Перетягніть, щоб змінити порядок', de: 'Ziehen und ablegen, um die Reihenfolge zu ändern', fr: 'Glisser-déposer pour réorganiser', it: 'Trascina e rilascia per riordinare',
    es: 'Arrastra y suelta para reordenar'
  },
  dragFollowUpReorderNotice: {
    sv: 'Följdfrågor kan bara byta ordning inbördes under sin huvudfråga', en: 'Follow-up questions can only be reordered within their parent question',
    nl: 'Vervolgvragen kunnen alleen binnen hun hoofdvraag worden herschikt', be: 'Vervolgvragen kunnen alleen binnen hun hoofdvraag worden herschikt',
    no: 'Oppfølgingsspørsmål kan kun flyttes under sin egen hovedoppgave', da: 'Opfølgende spørgsmål kan kun flyttes under deres hovedspørgsmål',
    fi: 'Jatkokysymyksiä voi siirtää vain saman pääkysymyksen sisällä', is: 'Framhaldsspurningum er aðeins hægt að endurraða undir sinni eigin aðalspurningu',
    se: 'Čuovusgažaldagaid sáhttá dušše sirdit iežas váldogažaldaga vuolde', et: 'Järelküsimusi saab ümber järjestada ainult sama peaküsimuse sees',
    lv: 'Papiljautājumus var pārkārtot tikai viena galvenā jautājuma ietvaros', lt: 'Papildomi klausimai gali būti pertvarkomi tik pagrindinio klausimo ribose',
    uk: 'Додаткові питання можна змінювати лише в межах одного головного питання', de: 'Folgefragen können nur innerhalb ihrer Hauptfrage verschoben werden',
    fr: 'Les questions suivantes ne peuvent être réorganisées qu’au sein de leur question principale', it: 'Le domande successive possono essere riordinate solo all’interno della domanda principale',
    es: 'Las preguntas de seguimiento solo se pueden reordenar dentro de su pregunta principal'
  },
  moveQuestionUp: {
    sv: 'Flytta upp', en: 'Move up', nl: 'Omhoog verplaatsen', be: 'Omhoog verplaatsen', no: 'Flytt opp', da: 'Flyt op', fi: 'Siirrä ylös',
    is: 'Færa upp', se: 'Sirdde bajás', et: 'Liiguta üles', lv: 'Pārvietot uz augšu', lt: 'Perkelti aukštyn', uk: 'Перемістити вгору',
    de: 'Nach oben verschieben', fr: 'Déplacer vers le haut', it: 'Sposta su', es: 'Mover hacia arriba'
  },
  moveQuestionDown: {
    sv: 'Flytta ner', en: 'Move down', nl: 'Omlaag verplaatsen', be: 'Omlaag verplaatsen', no: 'Flytt ned', da: 'Flyt ned', fi: 'Siirrä alas',
    is: 'Færa niður', se: 'Sirdde vulos', et: 'Liiguta alla', lv: 'Pārvietot uz leju', lt: 'Perkelti žemyn', uk: 'Перемістити вниз',
    de: 'Nach unten verschieben', fr: 'Déplacer vers le bas', it: 'Sposta giù', es: 'Mover hacia abajo'
  },
  hideLocationOnMapLabel: {
    sv: 'Dölj position på kartan (Skattjakt)',
    en: 'Hide position on quiz map (Treasure hunt)',
    nl: 'Locatie verbergen op quizkaart (Schatzoektocht)',
    be: 'Locatie verbergen op quizkaart (Schatzoektocht)',
    no: 'Skjul posisjon på quiz-kartet (Skattejakt)',
    da: 'Skjul position på quiz-kortet (Skattejagt)',
    fi: 'Piilota sijainti kartalta (Aarrejahti)',
    is: 'Fela staðsetningu á spurningakorti (Fjársjóðsleit)',
    se: 'Čiega sajádaga kvizakárttas (Báikenávddašeapmi)',
    et: 'Peida asukoht viktoriinikaardilt (Aardejahil)',
    lv: 'Paslēpt atrašanās vietu kartē (Dārgumu medības)',
    lt: 'Slėpti vietą žemėlapyje (Lobių paieška)',
    uk: 'Приховати позицію на карті (Пошук скарбів)',
    de: 'Position auf Quiz-Karte ausblenden (Schatzsuche)',
    fr: 'Masquer la position sur la carte (Chasse au trésor)',
    it: 'Nascondi posizione sulla mappa (Caccia al tesoro)',
    es: 'Ocultar ubicación en el mapa (Búsqueda del tesoro)'
  },
  hideLocationOnMapDescription: {
    sv: 'Frågans nål döljs på deltagarnas karta. Perfekt för skattjakt där tidigare svar och ledtrådar ger vart man ska härnäst!',
    en: 'The pin is hidden on the participants\' map. Perfect for treasure hunts where previous clues and answers lead the way!',
    nl: 'De speld is verborgen op de deelnemerskaart. Perfect voor schatzoektochten waarbij eerdere antwoorden de weg wijzen!',
    be: 'De speld is verborgen op de deelnemerskaart. Perfect voor schatzoektochten waarbij eerdere antwoorden de weg wijzen!',
    no: 'Spørsmålets nål skjules på deltakernes kart. Perfekt for skattejakt hvor tidligere svar og hint leder til neste sted!',
    da: 'Spørgsmålets nål skjules på deltagernes kort. Perfekt til skattejagt, hvor tidligere svar og spor viser vej!',
    fi: 'Kysymyksen nasta piilotetaan osallistujien kartalta. Täydellinen aarrejahtiin, jossa edelliset vihjeet johdattavat perille!',
    is: 'Spurningapinninn er falinn á korti þátttakenda. Fullkomið fyrir fjársjóðsleit þar sem vísbendingar vísa veginn!',
    se: 'Gažaldaga násti lea čihkkon oasseváldiid kárttas. Heive bures báikenávddašeapmái gos ovddit vástádusat čájehit geainnu!',
    et: 'Nööpnõel on osalejate kaardil peidetud. Ideaalne aardejahiks, kus eelmised vastused ja vihjed juhatavad teed!',
    lv: 'Spraudīte ir paslēpta dalībnieku kartē. Lieliski piemērots dārgumu medībām, kur norādes rāda ceļu!',
    lt: 'Smeigtukas paslėptas dalyvių žemėlapyje. Puikiai tinka lobių paieškai, kur ankstesni atsakymai rodo kelią!',
    uk: 'Мітка прихована на карті учасників. Ідеально для квестів, де підказки та відповіді вказують шлях!',
    de: 'Die Stecknadel ist auf der Teilnehmerkarte ausgeblendet. Perfekt für Schatzsuchen, bei denen Hinweise den Weg weisen!',
    fr: 'L’épingle est masquée sur la carte des participants. Idéal pour les chasses au trésor guidées par des énigmes !',
    it: 'Lo spillo è nascosto sulla mappa dei partecipanti. Perfetto per cacce al tesoro dove le risposte guidano i partecipanti!',
    es: 'El marcador está oculto en el mapa de los participantes. ¡Perfecto para búsquedas del tesoro donde las pistas indican el camino!'
  },
  treasureHuntBadge: {
    sv: 'Skattjakt (Dold på karta)',
    en: 'Treasure Hunt (Hidden on map)',
    nl: 'Schatzoektocht (Verborgen op kaart)',
    be: 'Schatzoektocht (Verborgen op kaart)',
    no: 'Skattejakt (Skjult på kart)',
    da: 'Skattejagt (Skjult på kort)',
    fi: 'Aarrejahti (Piilotettu kartalta)',
    is: 'Fjársjóðsleit (Falið á korti)',
    se: 'Báikenávddašeapmi (Čihkkon kárttas)',
    et: 'Aardejaht (Kaardil peidetud)',
    lv: 'Dārgumu medības (Paslēpts kartē)',
    lt: 'Lobių paieška (Paslėpta žemėlapyje)',
    uk: 'Пошук скарбів (Приховано на карті)',
    de: 'Schatzsuche (Auf Karte verborgen)',
    fr: 'Chasse au trésor (Masqué)',
    it: 'Caccia al tesoro (Nascosta)',
    es: 'Búsqueda del tesoro (Oculta)'
  },
  treasureHuntLockMessage: {
    sv: 'Denna fråga har en hemlig position (skattjakt). Följ ledtrådarna eller svaret från föregående fråga för att hitta rätt plats i verkligheten!',
    en: 'This question has a secret location (treasure hunt). Follow the clues or answer from the previous question to find the right spot!',
    nl: 'Deze vraag heeft een geheime locatie (schatzoektocht). Volg de aanwijzingen of het antwoord van de vorige vraag om de juiste plek te vinden!',
    be: 'Deze vraag heeft een geheime locatie (schatzoektocht). Volg de aanwijzingen of het antwoord van de vorige vraag om de juiste plek te vinden!',
    no: 'Dette spørsmålet har en hemmelig posisjon (skattejakt). Følg hintene eller svaret fra forrige spørsmål for å finne riktig sted!',
    da: 'Dette spørgsmål har en hemmelig position (skattejagt). Følg sporene eller svaret fra forrige spørgsmål for at finde det rigtige sted!',
    fi: 'Tällä kysymyksellä on salainen sijainti (aarrejahti). Seuraa edellisen kysymyksen vihjeitä löytääksesi oikean paikan!',
    is: 'Þessi spurning er með leynistaðsetningu (fjársjóðsleit). Fylgdu vísbendingum eða svari úr fyrri spurningu til að finna réttan stað!',
    se: 'Dán gažaldagas lea čiegos sajádat (báikenávddašeapmi). Čuovo ovddit vástádusa rávvagiid gávdnat rievttes báikki!',
    et: 'Sellel küsimusel on salajane asukoht (aardejaht). Järgi eelmise küsimuse vihjeid, et leida õige koht!',
    lv: 'Šim jautājumam ir slepena atrašanās vieta (dārgumu medības). Sekojiet iepriekšējā jautājuma norādēm, lai atrastu pareizo vietu!',
    lt: 'Šis klausimas turi slaptą vietą (lobių paieška). Sekite ankstesnio klausimo užuominas, kad rastumėte vietą!',
    uk: 'Це питання має таємну локацію (пошук скарбів). Слідуйте підказкам попереднього питання, щоб знайти потрібне місце!',
    de: 'Diese Frage hat einen geheimen Ort (Schatzsuche). Folge den Hinweisen der vorherigen Frage, um den richtigen Ort zu finden!',
    fr: 'Cette question a un emplacement secret (chasse au trésor). Suivez les indices de la question précédente pour trouver l’endroit !',
    it: 'Questa domanda ha una posizione segreta (caccia al tesoro). Segui gli indizi della domanda precedente per trovare il luogo!',
    es: 'Esta pregunta tiene una ubicación secreta (búsqueda del tesoro). ¡Sigue las pistas de la pregunta anterior para encontrar el lugar!'
  },
  treasureHuntQuestionViewTitle: {
    sv: 'Hemlig position (Skattjakt)',
    en: 'Secret Location (Treasure Hunt)',
    nl: 'Geheime locatie (Schatzoektocht)',
    be: 'Geheime locatie (Schatzoektocht)',
    no: 'Hemmelig posisjon (Skattejakt)',
    da: 'Hemmelig position (Skattejagt)',
    fi: 'Salainen sijainti (Aarrejahti)',
    is: 'Leynistaðsetning (Fjársjóðsleit)',
    se: 'Čiegos sajádat (Báikenávddašeapmi)',
    et: 'Salajane asukoht (Aardejaht)',
    lv: 'Slepena atrašanās vieta (Dārgumu medības)',
    lt: 'Slapta vieta (Lobių paieška)',
    uk: 'Таємна локація (Пошук скарбів)',
    de: 'Geheimer Ort (Schatzsuche)',
    fr: 'Position secrète (Chasse au trésor)',
    it: 'Posizione segreta (Caccia al tesoro)',
    es: 'Ubicación secreta (Búsqueda del tesoro)'
  },
  treasureHuntQuestionViewDesc: {
    sv: 'Positionen är dold på kartan. Lös ledtrådarna för att lista ut vart du ska gå!',
    en: 'The location is hidden on the map. Solve the clues to figure out where to go!',
    nl: 'De locatie is verborgen op de kaart. Los de aanwijzingen op om te weten waar je heen moet!',
    be: 'De locatie is verborgen op de kaart. Los de aanwijzingen op om te weten waar je heen moet!',
    no: 'Posisjonen er skjult på kartet. Løs hintene for å finne ut hvor du skal gå!',
    da: 'Positionen er skjult på kortet. Løs sporene for at finde ud af, hvor du skal hen!',
    fi: 'Sijainti on piilotettu kartalta. Ratkaise vihjeet tietääksesi minne mennä!',
    is: 'Staðsetningin er falin á kortinu. Leystu vísbendingarnar til að vita hvert á að fara!',
    se: 'Sajádat lea čihkkon kárttas. Čoavdde rávvagiid gávdnat gosa mannat!',
    et: 'Asukoht on kaardil peidetud. Lahenda vihjed, et teada saada, kuhu minna!',
    lv: 'Atrašanās vieta ir paslēpta kartē. Atrisiniet norādes, lai saprastu, kurp doties!',
    lt: 'Vieta paslėpta žemėlapyje. Išspręskite užuominas, kad sužinotumėte, kur eiti!',
    uk: 'Локація прихована на карті. Розгадайте підказки, щоб дізнатися, куди йти!',
    de: 'Der Standort ist auf der Karte verborgen. Löse die Hinweise, um herauszufinden, wohin du gehen musst!',
    fr: 'Le lieu est masqué sur la carte. Résolvez les énigmes pour trouver où aller !',
    it: 'La posizione è nascosta sulla mappa. Risolvi gli enigmi per trovare la meta!',
    es: 'La ubicación está oculta en el mapa. ¡Resuelve las pistas para descubrir adónde ir!'
  },
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
  },
  createNewQuizBtn: {
    sv: 'Skapa Nytt Quiz',
    en: 'Create New Quiz',
    nl: 'Nieuwe quiz maken',
    be: 'Nieuwe quiz maken',
    no: 'Lag nytt quiz',
    da: 'Opret nyt quiz',
    fi: 'Luo uusi tietovisa',
    is: 'Búa til nýtt quiz',
    se: 'Rávis ođđa quiz',
    et: 'Loo uus viktoriin',
    lv: 'Izveidot jaunu viktorīnu',
    lt: 'Sukurti naują viktoriną',
    uk: 'Створити нову вікторину',
    de: 'Neues Quiz erstellen',
    fr: 'Créer un nouveau quiz',
    it: 'Crea nuovo quiz',
    es: 'Crear nuevo cuestionario',
  },
  createNewQuizDesc: {
    sv: 'Rensa alla frågor och börja om med ett tomt formulär',
    en: 'Clear all questions and start fresh with a blank form',
    nl: 'Wis alle vragen en begin opnieuw met een leeg formulier',
    be: 'Wis alle vragen en begin opnieuw met een leeg formulier',
    no: 'Slett alle spørsmål og start på nytt med et tomt skjema',
    da: 'Ryd alle spørgsmål og start forfra med en tom formular',
    fi: 'Tyhjennä kaikki kysymykset ja aloita alusta tyhjällä lomakkeella',
    is: 'Hreinsa allar spurningar og byrja upp á nýtt með tómu eyðublaði',
    se: 'Sihko buot gažaldagaid ja álggat ođđasit guoros skoviin',
    et: 'Kustutage kõik küsimused ja alustage uuesti tühja vormiga',
    lv: 'Notīriet visus jautājumus un sāciet no jauna ar tukšu veidlapu',
    lt: 'Išvalykite visus klausimus ir pradėkite iš naujo su tuščia forma',
    uk: 'Очистити всі запитання та почати заново з порожньої форми',
    de: 'Alle Fragen löschen und mit einem leeren Formular neu beginnen',
    fr: 'Effacer toutes les questions et recommencer avec un formulaire vierge',
    it: 'Cancella tutte le domande e ricomincia con un modulo vuoto',
    es: 'Borra todas las preguntas y comienza de nuevo con un formulario en blanco',
  },
  createNewQuizConfirm: {
    sv: 'Har du sparat ditt nuvarande Quiz och är säker på att du vill skapa ett helt nytt blankt Quiz?',
    en: 'Have you saved your current Quiz and are sure you want to create a completely new blank Quiz?',
    nl: 'Heeft u uw huidige quiz opgeslagen en weet u zeker dat u een compleet nieuwe blanco quiz wilt maken?',
    be: 'Heeft u uw huidige quiz opgeslagen en weet u zeker dat u een compleet nieuwe blanco quiz wilt maken?',
    no: 'Har du lagret ditt nåværende quiz og er sikker på at du vil lage et helt nytt blankt quiz?',
    da: 'Har du gemt dit nuværende quiz og er sikker på, at du vil oprette et helt nyt tomt quiz?',
    fi: 'Oletko tallentanut nykyisen tietovisasi ja oletko varma, että haluat luoda täysin uuden tyhjän tietovisan?',
    is: 'Hefur þú vistað núverandi quiz og ert viss um að þú viljir búa til alveg nýtt tómt quiz?',
    se: 'Leatgo vurken dálá quiza ja leatgo sihkar ahte háliidat ráhkadit áibbas ođđa guoros quiza?',
    et: 'Kas olete oma praeguse viktoriini salvestanud ja olete kindel, et soovite luua täiesti uue tühja viktoriini?',
    lv: 'Vai esat saglabājis savu pašreizējo viktorīnu un esat pārliecināts, ka vēlaties izveidot pilnīgi jaunu tukšu viktorīnu?',
    lt: 'Ar išsaugojote dabartinę viktoriną ir esate tikri, kad norite sukurti visiškai naują tuščią viktoriną?',
    uk: 'Ви зберегли поточну вікторину і впевнені, що хочете створити абсолютно нову порожню вікторину?',
    de: 'Haben Sie Ihr aktuelles Quiz gespeichert und sind sicher, dass Sie ein komplett neues, leeres Quiz erstellen möchten?',
    fr: 'Avez-vous enregistré votre quiz actuel et êtes-vous sûr de vouloir créer un tout nouveau quiz vierge ?',
    it: 'Hai salvato il tuo quiz attuale e sei sicuro di voler creare un quiz completamente nuovo e vuoto?',
    es: '¿Has guardado tu cuestionario actual y estás seguro de que deseas crear un cuestionario completamente nuevo en blanco?',
  },
  confirmCreateNewQuizBtn: {
    sv: 'Ja, skapa nytt quiz',
    en: 'Yes, create new quiz',
    nl: 'Ja, nieuwe quiz maken',
    be: 'Ja, nieuwe quiz maken',
    no: 'Ja, lag nytt quiz',
    da: 'Ja, opret nyt quiz',
    fi: 'Kyllä, luo uusi tietovisa',
    is: 'Já, búa til nýtt quiz',
    se: 'Joo, rávis ođđa quiza',
    et: 'Jah, loo uus viktoriin',
    lv: 'Jā, izveidot jaunu viktorīnu',
    lt: 'Taip, sukurti naują viktoriną',
    uk: 'Так, створити нову вікторину',
    de: 'Ja, neues Quiz erstellen',
    fr: 'Oui, créer un nouveau quiz',
    it: 'Sì, crea nuovo quiz',
    es: 'Sí, crear nuevo cuestionario',
  },
  settingsHelpTitle: {
    sv: 'Guide: Inställningar & Funktioner',
    en: 'Guide: Settings & Features',
    nl: 'Gids: Instellingen & Functies',
    be: 'Gids: Instellingen & Functies',
    no: 'Guide: Innstillinger & Funksjoner',
    da: 'Guide: Indstillinger & Funktioner',
    fi: 'Opas: Asetukset ja toiminnot',
    is: 'Leiðbeiningar: Stillingar og eiginleikar',
    se: 'Ofelaš: Heivehusat & Doaimmat',
    et: 'Juhend: Seaded ja funktsioonid',
    lv: 'Pamācība: Iestatījumi un funkcijas',
    lt: 'Gidas: Nustatymai ir funkcijos',
    uk: 'Посібник: Налаштування та функції',
    de: 'Leitfaden: Einstellungen & Funktionen',
    fr: 'Guide : Paramètres et fonctionnalités',
    it: 'Guida: Impostazioni e funzionalità',
    es: 'Guía: Ajustes y funciones',
  },
  settingsHelpSubtitle: {
    sv: 'Lär dig hur du skapar, redigerar, geotaggar, sparar och delar din tipspromenad.',
    en: 'Learn how to create, edit, geotag, save, and share your quiz trail.',
    nl: 'Leer hoe u uw quizpad kunt maken, bewerken, geotaggen, opslaan en delen.',
    be: 'Leer hoe u uw quizpad kunt maken, bewerken, geotaggen, opslaan en delen.',
    no: 'Lær hvordan du lager, redigerer, geotagger, lagrer og deler din tipstur.',
    da: 'Lær hvordan du opretter, redigerer, geotagger, gemmer og deler dit stjerneløb.',
    fi: 'Opi luomaan, muokkaamaan, geotaggaamaan, tallentamaan ja jakamaan tietovisapolkusi.',
    is: 'Lærðu hvernig á að búa til, breyta, staðsetja, vista og deila spurningagöngunni.',
    se: 'Oahpa mo ráhkadat, divut, geotaggat, vurket ja juogat kvizavádjoleami.',
    et: 'Õppige oma viktoriinirada looma, redigeerima, geotäägima, salvestama ja jagama.',
    lv: 'Uzziniet, kā izveidot, rediģēt, ģeomarķēt, saglabāt un kopīgot savu viktorīnas taku.',
    lt: 'Sužinokite, kaip kurti, redaguoti, žymėti vietas, išsaugoti ir bendrinti savo viktorinos taką.',
    uk: 'Дізнайтеся, як створювати, редагувати, додавати геомітки, зберігати та ділитися вікториною.',
    de: 'Erfahren Sie, wie Sie Ihren Quizpfad erstellen, bearbeiten, geotaggen, speichern und teilen.',
    fr: 'Apprenez à créer, modifier, géotaguer, enregistrer et partager votre parcours de quiz.',
    it: 'Scopri come creare, modificare, geotaggare, salvare e condividere il tuo percorso a quiz.',
    es: 'Aprende a crear, editar, geoetiquetar, guardar y compartir tu recorrido de preguntas.',
  },
  settingsHelpStep1: {
    sv: '1. Allmänt, Skapa Nytt Quiz & Säkerhet',
    en: '1. General, Create New Quiz & Security',
    nl: '1. Algemeen, Nieuwe quiz maken & Beveiliging',
    be: '1. Algemeen, Nieuwe quiz maken & Beveiliging',
    no: '1. Generelt, Lag nytt quiz & Sikkerhet',
    da: '1. Generelt, Opret nyt quiz & Sikkerhed',
    fi: '1. Yleiset, Luo uusi tietovisa & Suojaus',
    is: '1. Almennt, Búa til nýtt quiz & Öryggi',
    se: '1. Oppalaš, Rávis ođđa quiza & Sihkarvuohta',
    et: '1. Üldine, Loo uus viktoriin & Turvalisus',
    lv: '1. Vispārīgi, Izveidot jaunu viktorīnu & Drošība',
    lt: '1. Bendrai, Sukurti naują viktoriną & Saugumas',
    uk: '1. Загальне, Створити нову вікторину та Безпека',
    de: '1. Allgemein, Neues Quiz erstellen & Sicherheit',
    fr: '1. Général, Créer un nouveau quiz & Sécurité',
    it: '1. Generale, Crea nuovo quiz & Sicurezza',
    es: '1. General, Crear nuevo cuestionario & Seguridad',
  },
  settingsHelpStep1Desc: {
    sv: 'I fliken "Allmänt" sätter du quizets titel, logotyp-URL och lösenord för facit/admin. Använd "Skapa Nytt Quiz" för att rensa minnet och starta ett helt tomt quiz med ett nytt QuizID. Här finns även "Lås Quiz-läge för deltagare" (så deltagare inte kan ändra frågor eller se facit) och "Tvinga svar i nummerordning (1 -> 2 -> 3...)".',
    en: 'In the "General" tab, configure the quiz title, logo URL, and master password. Use "Create New Quiz" to clear memory and start fresh with a new Quiz ID. You can also activate "Lock Quiz Mode for participants" and "Require answers in sequential order (1 -> 2 -> 3...)".',
    nl: 'In het tabblad "Algemeen" stelt u de titel, logo-URL en wachtwoord in. Gebruik "Nieuwe quiz maken" om het geheugen te wissen en opnieuw te beginnen met een nieuw Quiz ID. Activeer ook "Quizmodus vergrendelen" en "Opeenvolgende antwoordvolgorde vereisen".',
    be: 'In het tabblad "Algemeen" stelt u de titel, logo-URL en wachtwoord in. Gebruik "Nieuwe quiz maken" om het geheugen te wissen en opnieuw te beginnen met een nieuw Quiz ID. Activeer ook "Quizmodus vergrendelen" en "Opeenvolgende antwoordvolgorde vereisen".',
    no: 'I fanen "Generelt" angir du tittel, logo-URL og passord. Bruk "Lag nytt quiz" for å tømme minnet og starte på nytt med en ny Quiz-ID. Her kan du også aktivere "Lås Quiz-modus for deltakere" og "Krev svar i rekkefølge (1 -> 2 -> 3...)".',
    da: 'Under fanen "Generelt" angiver du titel, logo-URL og adgangskode. Brug "Opret nyt quiz" til at rydde hukommelsen og starte forfra med et nyt Quiz ID. Aktivér også "Lås Quiz-tilstand for deltagere" og "Kræv svar i rækkefølge (1 -> 2 -> 3...)".',
    fi: '"Yleiset"-välilehdellä asetat otsikon, logon URL-osoitteen ja salasanan. Käytä "Luo uusi tietovisa" tyhjentääksesi muistin ja aloittaaksesi alusta uudella Quiz ID:llä. Voit myös lukita osallistujatilan ja vaatia kysymysten vastaamisen numerojärjestyksessä.',
    is: 'Í flipanum "Almennt" stillir þú titil, lógó og lykilorð. Notaðu "Búa til nýtt quiz" til að hreinsa minni og byrja upp á nýtt með nýtt Quiz ID. Virkjaðu læstan ham og krafist þess að svarað sé í réttri röð.',
    se: 'Flikas "Oppalaš" bijat bajilčállaga, logo-URL ja beassansáni. Geavat "Rávis ođđa quiza" sihkkut muitu ja álggahit ođđasit ođđa Quiz ID:in. Sáhtát maid giddet oasseváldidili ja gáibidit ortnetvástádusa.',
    et: 'Vahekaardil "Üldine" määrake pealkiri, logo URL ja parool. Kasutage "Loo uus viktoriin", et mälu tühjendada ja uue viktoriini ID-ga alustada. Samuti saate lukustada osalejarežiimi ja nõuda vastamist järjestikku.',
    lv: 'Cilnē "Vispārīgi" iestatiet nosaukumu, logotipa URL un paroli. Izmantojiet "Izveidot jaunu viktorīnu", lai notīrītu atmiņu un sāktu ar jaunu Quiz ID. Varat arī bloķēt dalībnieku režīmu un pieprasīt secīgu atbildēšanu.',
    lt: 'Skirtuke „Bendrai“ nustatykite pavadinimą, logotipo URL ir slaptažodį. Naudokite „Sukurti naują viktoriną“, kad išvalytumėte atmintį ir pradėtumėte iš naujo. Taip pat galite užrakinti dalyvių režimą ir reikalauti atsakyti iš eilės.',
    uk: 'У вкладці «Загальне» налаштуйте назву, URL логотипу та пароль. Використовуйте «Створити нову вікторину», щоб очистити пам’ять та почати заново. Ви також можете заблокувати режим учасника та вимагати послідовних відповідей.',
    de: 'Im Reiter „Allgemein“ legen Sie Titel, Logo-URL und Passwort fest. Nutzen Sie „Neues Quiz erstellen“, um den Speicher zu leeren und mit einer neuen Quiz-ID zu starten. Aktivieren Sie auch den Sperrmodus und die Reihenfolgepflicht.',
    fr: 'Dans l’onglet « Général », définissez le titre, l’URL du logo et le mot de passe. Utilisez « Créer un nouveau quiz » pour effacer la mémoire et repartir avec un nouvel identifiant. Activez le mode verrouillé et l’ordre séquentiel obligatoire.',
    it: 'Nella scheda "Generale", imposta titolo, URL del logo e password. Usa "Crea nuovo quiz" per azzerare la memoria e iniziare da capo con un nuovo ID. Puoi anche bloccare la modalità partecipante e forzare l’ordine sequenziale.',
    es: 'En la pestaña "General", configura el título, la URL del logo y la contraseña. Usa "Crear nuevo cuestionario" para reiniciar la memoria y comenzar con un nuevo ID. Activa también el modo bloqueado y el orden secuencial obligatorio.',
  },
  settingsHelpStep2: {
    sv: '2. Frågor, Följdfrågor & Dra-och-släpp',
    en: '2. Questions, Follow-ups & Drag-and-Drop',
    nl: '2. Vragen, Vervolgvragen & Slepen',
    be: '2. Vragen, Vervolgvragen & Slepen',
    no: '2. Spørsmål, Oppfølging & Dra-og-slipp',
    da: '2. Spørgsmål, Opfølgning & Træk-og-slip',
    fi: '2. Kysymykset, Jatkokysymykset & Järjestäminen',
    is: '2. Spurningar, Framhaldsspurningar & Draga og sleppa',
    se: '2. Gažaldagat, Čuovusgažaldagat & Giesat-ja-luoitte',
    et: '2. Küsimused, Järelküsimused & Lohistamine',
    lv: '2. Jautājumi, Papiljautājumi & Vilkšana',
    lt: '2. Klausimai, Papildomi klausimai ir Vilkimas',
    uk: '2. Питання, Додаткові питання та Перетягування',
    de: '2. Fragen, Folgefragen & Drag-and-Drop',
    fr: '2. Questions, Questions suivantes & Glisser-déposer',
    it: '2. Domande, Domande successive & Trascina e rilascia',
    es: '2. Preguntas, Preguntas de seguimiento & Arrastrar y soltar',
  },
  settingsHelpStep2Desc: {
    sv: 'I fliken "Frågor" skapar du 1X2-flervalsfrågor, Poängfrågor 🎯 och Fritextfrågor ✍️ (med automatisk stavningstolerans via Soundex). Använd Dra-och-släpp (eller pilknappar) för att ändra ordning. Koppla smarta Följdfrågor som öppnas alltid, vid rätt svar eller vid fel svar. Sök och använd massmarkering för bulk-radering.',
    en: 'In the "Questions" tab, create 1X2 multiple-choice questions, Point questions 🎯, and Free-text questions ✍️ (with Soundex fuzzy spelling tolerance). Use Drag-and-Drop to reorder. Attach smart Follow-up questions that open always, on correct answer, or on incorrect answer. Use search and multi-select for bulk actions.',
    nl: 'In het tabblad "Vragen" maakt u 1X2-, Punt- 🎯 en Vrije tekstvragen ✍️ (met automatische spellingstolerantie). Gebruik slepen en neerzetten om te sorteren. Koppel slimme vervolgvragen (altijd, bij goed of fout antwoord).',
    be: 'In het tabblad "Vragen" maakt u 1X2-, Punt- 🎯 en Vrije tekstvragen ✍️ (met automatische spellingstolerantie). Gebruik slepen en neerzetten om te sorteren. Koppel slimme vervolgvragen (altijd, bij goed of fout antwoord).',
    no: 'I fanen "Spørsmål" lager du 1X2-, Poeng- 🎯 og Fritekstspørsmål ✍️ (med skrivefeiltoleranse). Bruk dra-og-slipp for å endre rekkefølge. Koble på smarte oppfølgingsspørsmål (alltid, ved rett eller feil svar).',
    da: 'Under "Spørgsmål" opretter du 1X2-, Point- 🎯 og Fritekstspørgsmål ✍️. Brug træk-og-slip til at sortere. Tilknyt opfølgende spørgsmål (vises altid, ved rigtigt eller forkert svar).',
    fi: '"Kysymykset"-välilehdellä luot 1X2-, Piste- 🎯 ja Tekstivastauksia ✍️ (automaattisella kirjoitusvirhesietokyvyllä). Järjestä kysymyksiä vetämällä ja liitä älykkäitä jatkokysymyksiä.',
    is: 'Í "Spurningar" býrðu til 1X2, Stiga- 🎯 og Textaspurningar ✍️. Notaðu draga og sleppa til að endurraða og tengdu framhaldsspurningar.',
    se: '"Gažaldagat"-flikkas ráhkadat 1X2-, Čuokkis- 🎯 ja Čállinvástádusgažaldagaid ✍️. Geavat giesat-ja-luoitte ja laktte čuovusgažaldagaid.',
    et: 'Vahekaardil "Küsimused" looge 1X2, Punkti- 🎯 ja Vabateksti ✍️ küsimusi. Järjestage küsimusi lohistades ja lisage nutikaid järelküsimusi.',
    lv: 'Cilnē "Jautājumi" veidojiet 1X2, Punktu 🎯 un Brīvā teksta ✍️ jautājumus. Pārkārtojiet ar vilkšanu un pievienojiet papiljautājumus.',
    lt: 'Skirtuke „Klausimai“ kurkite 1X2, Taškų 🎯 ir Tekstinius ✍️ klausimus. Rūšiuokite vilkdami ir prisekite papildomus klausimus.',
    uk: 'У вкладці «Питання» створюйте питання 1X2, бальні 🎯 та текстові ✍️ з автовиправленням помилок. Перетягуйте для сортування та прив’язуйте додаткові запитання.',
    de: 'Im Reiter „Fragen“ erstellen Sie 1X2-, Punkte- 🎯 und Freitextfragen ✍️ (mit Soundex-Fehlertoleranz). Ändern Sie die Reihenfolge per Drag-and-Drop und verknüpfen Sie Folgefragen.',
    fr: 'Dans « Questions », créez des choix multiples 1X2, des questions à points 🎯 et du texte libre ✍️. Réorganisez par glisser-déposer et liez des questions suivantes.',
    it: 'In "Domande" crea quiz 1X2, a punti 🎯 e a risposta libera ✍️. Riordina trascinando e collega domande di approfondimento intelligenti.',
    es: 'En "Preguntas", crea opciones 1X2, preguntas de puntos 🎯 y texto libre ✍️. Reordena arrastrando y vincula preguntas de seguimiento.',
  },
  settingsHelpStep3: {
    sv: '3. Flerspråkighet (17 språk) & Svep',
    en: '3. Multilingual (17 languages) & Swipe',
    nl: '3. Meertaligheid (17 talen) & Vegen',
    be: '3. Meertaligheid (17 talen) & Vegen',
    no: '3. Flerspråklighet (17 språk) & Sveip',
    da: '3. Flersprogethed (17 sprog) & Stryg',
    fi: '3. Monikielisyys (17 kieltä) & Pyyhkäisy',
    is: '3. Fjöltyngi (17 tungumál) & Strjúka',
    se: '3. Máŋggagielatvuohta (17 giela) & Njuiket',
    et: '3. Mitmekeelsus (17 keelt) & Viipamine',
    lv: '3. Daudzvalodība (17 valodas) & Pārvilkšana',
    lt: '3. Daugiakalbystė (17 kalbų) ir Braukimas',
    uk: '3. Багатомовність (17 мов) та Свайпи',
    de: '3. Mehrsprachigkeit (17 Sprachen) & Wischen',
    fr: '3. Multilingue (17 langues) & Balayage',
    it: '3. Multilingue (17 lingue) e Swipe',
    es: '3. Multilingüe (17 idiomas) y Deslizamiento',
  },
  settingsHelpStep3Desc: {
    sv: 'Klicka på en fråga för att öppna helskärmsredigeraren. Växla direkt mellan alla 17 språkflaggor i toppen för att granska eller redigera översättningar, eller svep åt vänster/höger på pekskärmen. Den inbyggda översättningscachen gör att flerspråkiga frågor laddas blixtsnabbt även offline.',
    en: 'Click any question to open the full-screen editor. Switch between all 17 language flags at the top to review or edit translations, or swipe left/right on touch screens. Built-in translation caching ensures instant loading even offline.',
    nl: 'Klik op een vraag om de schermvullende editor te openen. Schakel tussen alle 17 taalvlaggen of veeg naar links/rechts om vertalingen te bewerken.',
    be: 'Klik op een vraag om de schermvullende editor te openen. Schakel tussen alle 17 taalvlaggen of veeg naar links/rechts om vertalingen te bewerken.',
    no: 'Klikk på et spørsmål for fullskjermredigering. Bytt mellom alle 17 språkflagg eller sveip venstre/høyre for å tilpasse oversettelser.',
    da: 'Klik på et spørgsmål for at åbne fuldskærmseditoren. Skift mellem alle 17 sprogflag eller stryg til venstre/højre for at redigere oversættelser.',
    fi: 'Napsauta kysymystä avataksesi koko näytön editorin. Vaihda 17 kielilipun välillä tai pyyhkäise vasemmalle/oikealle muokataksesi käännöksiä.',
    is: 'Smelltu á spurningu til að opna heildarritilinn. Skiptu á milli allra 17 fána eða strjúktu til að breyta þýðingum.',
    se: 'Coahkkal gažaldaga ollesšearbmarievdadeapmái. Molssut buot 17 leavgga gaskka dahje njuike jorgalusaid divvumii.',
    et: 'Klõpsake küsimusel täisekraani redaktori avamiseks. Vahetage 17 keelelipu vahel või viibake tõlgete muutmiseks.',
    lv: 'Noklikšķiniet uz jautājuma, lai atvērtu pilnekrāna redaktoru. Pārslēdzieties starp 17 valodu karogiem vai velciet, lai rediģētu tulkojumus.',
    lt: 'Spustelėkite klausimą, kad atidarytumėte redaktorių. Perjunkite 17 kalbų vėliavėles arba braukite vertimams tvarkyti.',
    uk: 'Натисніть на запитання для повноекранного редагування. Перемикайтеся між 17 прапорами мов або свайпайте для перегляду перекладів.',
    de: 'Klicken Sie auf eine Frage, um den Vollbild-Editor zu öffnen. Wechseln Sie zwischen allen 17 Sprachflaggen oder wischen Sie, um Übersetzungen anzupassen.',
    fr: 'Cliquez sur une question pour ouvrir l’éditeur plein écran. Basculez entre les 17 drapeaux de langue ou balayez pour modifier les traductions.',
    it: 'Clicca su una domanda per aprire l’editor a schermo intero. Passa tra le 17 bandiere o scorri per modificare le traduzioni.',
    es: 'Haz clic en una pregunta para abrir el editor a pantalla completa. Cambia entre las 17 banderas de idiomas o desliza para editar traducciones.',
  },
  settingsHelpStep4: {
    sv: '4. AI Skapa & Gemini API-nyckel',
    en: '4. AI Creation & Gemini API Key',
    nl: '4. AI Maken & Gemini API-sleutel',
    be: '4. AI Maken & Gemini API-sleutel',
    no: '4. AI Oppretting & Gemini API-nøkkel',
    da: '4. AI Oprettelse & Gemini API-nøgle',
    fi: '4. AI Luo & Gemini API-avain',
    is: '4. AI Búa til & Gemini API-lykill',
    se: '4. AI Ráhkadeapmi & Gemini API-čoavdda',
    et: '4. AI loomine & Gemini API võti',
    lv: '4. AI izveide & Gemini API atslēga',
    lt: '4. AI kūrimas ir Gemini API raktas',
    uk: '4. Створення через AI та ключ Gemini API',
    de: '4. KI-Erstellung & Gemini API-Schlüssel',
    fr: '4. Création par IA & Clé API Gemini',
    it: '4. Creazione AI e Chiave API Gemini',
    es: '4. Creación con IA y Clave API de Gemini',
  },
  settingsHelpStep4Desc: {
    sv: 'I fliken "AI Skapa" genererar du automatiskt frågor utifrån tema, målgrupp och åldersintervall med Google Gemini. Spara din egen kostnadsfria API-nyckel lokalt i appen, eller kopiera färdiga flerspråkiga AI-prompter till ChatGPT/Claude och klistra in JSON-resultatet för direkt import.',
    en: 'In the "AI Create" tab, generate customized quiz questions by topic, target group, and age with Google Gemini. Save your free API key locally, or copy ready-made multilingual prompts to ChatGPT/Claude and paste the JSON output for direct import.',
    nl: 'In het tabblad "AI Maken" genereert u automatisch vragen met Google Gemini. Bewaar uw eigen API-sleutel of kopieer prompts naar externe AI.',
    be: 'In het tabblad "AI Maken" genereert u automatisch vragen met Google Gemini. Bewaar uw eigen API-sleutel of kopieer prompts naar externe AI.',
    no: 'I fanen "AI Oppretting" genererer du spørsmål automatisk med Google Gemini. Lagre API-nøkkelen din lokalt eller kopier ferdige prompter til ChatGPT/Claude.',
    da: 'Under "AI Oprettelse" genererer du automatisk spørgsmål med Google Gemini. Gem din API-nøgle lokalt eller kopier prompts til ekstern AI.',
    fi: '"AI Luo"-välilehdellä luot kysymyksiä automaattisesti Google Geminillä. Tallenna API-avaimesi tai kopioi kehotteet ulkoiseen tekoälyyn.',
    is: 'Í "AI Búa til" býrðu til spurningar sjálfvirkt með Google Gemini. Vistaðu API lykilinn eða afritaðu fyrirmæli í ChatGPT.',
    se: '"AI Ráhkadeapmi"-flikkas ráhkadat gažaldagaid Google Geminiin. Vurke API-čoavdaga dahje máhcat ChatGPT:i.',
    et: 'Vahekaardil "AI loomine" looge küsimusi Google Gemini abil. Salvestage oma API võti või kopeerige viibad välisesse AI-sse.',
    lv: 'Cilnē "AI izveide" ģenerējiet jautājumus ar Google Gemini. Saglabājiet API atslēgu vai kopējiet uzvednes uz ārējo AI.',
    lt: 'Skirtuke „AI kūrimas“ kurkite klausimus naudodami „Google Gemini“. Išsaugokite API raktą arba kopijuokite užklausas į išorinį AI.',
    uk: 'У вкладці «Створення через AI» генеруйте питання через Google Gemini. Збережіть свій API-ключ або копіюйте промпти для ChatGPT/Claude.',
    de: 'Im Reiter „KI-Erstellung“ generieren Sie Fragen automatisch mit Google Gemini. Speichern Sie Ihren API-Schlüssel oder kopieren Sie Prompts zu ChatGPT.',
    fr: 'Dans « Création par IA », générez des questions avec Google Gemini. Enregistrez votre clé API ou copiez des invites prêtes à l’emploi pour ChatGPT/Claude.',
    it: 'Nella scheda "Creazione AI" genera domande con Google Gemini. Salva la chiave API o copia i prompt per ChatGPT/Claude.',
    es: 'En "Creación con IA", genera preguntas con Google Gemini. Guarda tu clave API o copia los prompts para ChatGPT/Claude.',
  },
  settingsHelpStep5: {
    sv: '5. Karta, GPS-Stationer & Skattjakt',
    en: '5. Map, GPS Stations & Treasure Hunt',
    nl: '5. Kaart, GPS-stations & Schatzoektocht',
    be: '5. Kaart, GPS-stations & Schatzoektocht',
    no: '5. Kart, GPS-stasjoner & Skattejakt',
    da: '5. Kort, GPS-stationer & Skattejagt',
    fi: '5. Kartta, GPS-asemat & Aarrejahti',
    is: '5. Kort, GPS stöðvar & Fjársjóðsleit',
    se: '5. Kárta, GPS-stašuvnnat & Báikenávddašeapmi',
    et: '5. Kaart, GPS-jaamad & Aardejahil',
    lv: '5. Karte, GPS stacijas & Dārgumu medības',
    lt: '5. Žemėlapis, GPS stotys ir Lobių paieška',
    uk: '5. Карта, GPS-станції та Пошук скарбів',
    de: '5. Karte, GPS-Stationen & Schatzsuche',
    fr: '5. Carte, Balises GPS & Chasse au trésor',
    it: '5. Mappa, Stazioni GPS e Caccia al tesoro',
    es: '5. Mapa, Estaciones GPS y Búsqueda del tesoro',
  },
  settingsHelpStep5Desc: {
    sv: 'Geotagga frågor på kartan eller använd "Rita slinga på karta" för att automatiskt fördela frågor vid fysiska GPS-stationer. Ställ in en lås-radie (t.ex. 20 m) så att frågor låses upp först när deltagarna når platsen. Aktivera "Dölj position på kartan (Skattjakt)" om nålen ska vara hemlig tills ledtrådar lösts!',
    en: 'Geotag questions on the map or use "Draw route on map" to automatically space questions along a trail. Set an unlock radius (e.g. 20 m) so questions unlock only when physically reaching the spot. Activate "Hide pin on map (Treasure hunt)" to keep locations secret until clues are solved!',
    nl: 'Geotag vragen op de kaart of gebruik "Spoor tekenen" om vragen automatisch te verdelen. Stel een ontgrendelradius in (bijv. 20 m) en activeer "Locatie verbergen (Schatzoektocht)" voor geheime posten.',
    be: 'Geotag vragen op de kaart of gebruik "Spoor tekenen" om vragen automatisch te verdelen. Stel een ontgrendelradius in (bijv. 20 m) en activeer "Locatie verbergen (Schatzoektocht)" voor geheime posten.',
    no: 'Geotagg spørsmål på kartet eller bruk "Tegn løype på kart". Sett en opplåsingsradius (f.eks. 20 m) og aktiver "Skjul posisjon (Skattejakt)" for hemmelige poster.',
    da: 'Geotag spørgsmål på kortet eller brug "Tegn rute på kort". Indstil en radius (f.eks. 20 m) og aktivér "Skjul position (Skattejagt)" for hemmelige poster.',
    fi: 'Geotaggaa kysymyksiä kartalle tai piirrä reitti. Aseta avausetäisyys (esim. 20 m) ja aktivoi "Piilota sijainti (Aarrejahti)" salaisia rasteja varten.',
    is: 'Staðsettu spurningar á korti eða teiknaðu leið. Stilltu opnunarfjarlægð (t.d. 20 m) og virkjaðu "Fela staðsetningu (Fjársjóðsleit)".',
    se: 'Geotagga gažaldagaid kárttas dahje sárggo johtolaga. Bija rahpanradiusa (omd. 20 m) ja čiega sajádaga báikenávddašeapmái.',
    et: 'Geotäägige küsimused kaardile või joonistage rada. Määrake avamisraadius (nt 20 m) ja peitke asukoht aardejahi režiimis.',
    lv: 'Ģeomarķējiet jautājumus kartē vai zīmējiet maršrutu. Iestatiet rādiusu (piem., 20 m) un paslēpiet atrašanās vietu dārgumu medībām.',
    lt: 'Žymėkite klausimus žemėlapyje arba brėžkite maršrutą. Nustatykite spindulį (pvz., 20 m) ir slėpkite vietą lobių paieškai.',
    uk: 'Додавайте геомітки на карті або малюйте маршрут. Встановіть радіус відкриття (наприклад, 20 м) та ховайте мітки в режимі пошуку скарбів.',
    de: 'Geotaggen Sie Fragen auf der Karte oder nutzen Sie „Route zeichnen“. Stellen Sie einen Freischaltradius ein und aktivieren Sie die Schatzsuche für geheime Stationen.',
    fr: 'Géotaguez les questions sur la carte ou utilisez « Tracer un parcours ». Réglez un rayon de déverrouillage et masquez l’épingle pour une chasse au trésor.',
    it: 'Geotagga le domande sulla mappa o usa "Traccia percorso". Imposta un raggio di sblocco e nascondi la posizione per la caccia al tesoro.',
    es: 'Geoetiqueta preguntas en el mapa o usa "Trazar ruta". Configura el radio de desbloqueo y oculta el marcador para el modo búsqueda del tesoro.',
  },
  settingsHelpStep6: {
    sv: '6. Dela Direktlänk, QR-kod & Samla Svar',
    en: '6. Share Direct Link, QR Code & Collect Answers',
    nl: '6. Directe link delen, QR-code & Antwoorden verzamelen',
    be: '6. Directe link delen, QR-code & Antwoorden verzamelen',
    no: '6. Del direktelenke, QR-kode & Samle svar',
    da: '6. Del direkte link, QR-kode & Saml svar',
    fi: '6. Jaa suora linkki, QR-koodi & Kerää vastaukset',
    is: '6. Deila beinum hlekk, QR-kóða & Safna svörum',
    se: '6. Juoge njuolggoliŋkka, QR-koda & Čohkke vástádusaid',
    et: '6. Jaga otselinki, QR-koodi & Kogu vastuseid',
    lv: '6. Kopīgot tiešo saiti, QR kodu & Apkopot atbildes',
    lt: '6. Bendrinti tiesioginę nuorodą, QR kodą ir Rinkti atsakymus',
    uk: '6. Поділитися посиланням, QR-кодом та Збір відповідей',
    de: '6. Direktlink teilen, QR-Code & Antworten sammeln',
    fr: '6. Partager le lien direct, QR code & Collecter les réponses',
    it: '6. Condividi link diretto, codice QR e Raccogli risposte',
    es: '6. Compartir enlace directo, código QR y Recopilar respuestas',
  },
  settingsHelpStep6Desc: {
    sv: 'Använd "Dela Direktlänk" eller generera en QR-kod för att skicka quizet till deltagarnas mobiler. Hela quizet komprimeras direkt i URL:en utan att någon extern server behövs. I fliken Allmänt kan du även exportera och importera deltagarsvar för att smidigt sammanställa resultat från alla deltagares enheter.',
    en: 'Use "Share Direct Link" or generate a QR code to send the quiz to participants\' mobile phones. The entire quiz is compressed directly into the URL without needing an external server. In the General tab, export and import participant answers to consolidate scores across all devices.',
    nl: 'Deel de directe link of QR-code. De hele quiz zit gecomprimeerd in de URL zonder externe server. Exporteer en importeer antwoorden van deelnemers.',
    be: 'Deel de directe link of QR-code. De hele quiz zit gecomprimeerd in de URL zonder externe server. Exporteer en importeer antwoorden van deelnemers.',
    no: 'Bruk "Del direktelenke" eller QR-kode. Hele quizen komprimeres i URL-en uten behov for ekstern server. Eksporter og importer deltakernes svar.',
    da: 'Brug "Del direkte link" eller QR-kode. Hele quizzen komprimeres i URL\'en uden behov for en server. Eksportér og importér deltagersvar.',
    fi: 'Jaa suora linkki tai QR-koodi. Koko visa pakataan URL-osoitteeseen ilman ulkoista palvelinta. Vie ja tuo osallistujien vastauksia.',
    is: 'Notaðu "Deila beinum hlekk" eða QR-kóða. Öll spurningakeppnin er þjöppuð í slóðina án þess að þurfa netþjón. Flyttu inn og út svör.',
    se: 'Juoge njuolggoliŋkka dahje QR-koda. Olles quiza lea čoahkkáibáhkkejuvvon liŋkii. Olggosfievrrit ja sisafevrrit vástádusaid.',
    et: 'Kasutage otselinki või QR-koodi. Kogu viktoriin on pakitud URL-i ilma serverita. Eksportige ja importige osalejate vastuseid.',
    lv: 'Izmantojiet tiešo saiti vai QR kodu. Visa viktorīna ir saspiesta URL bez servera nepieciešamības. Eksportējiet un importējiet atbildes.',
    lt: 'Naudokite tiesioginę nuorodą arba QR kodą. Visa viktorina suglaudinama URL be serverio. Eksportuokite ir importuokite atsakymus.',
    uk: 'Використовуйте пряме посилання або QR-код. Вікторина стискається в URL без потреби в сервері. Експортуйте та імпортуйте відповіді учасників.',
    de: 'Nutzen Sie den Direktlink oder QR-Code. Das Quiz wird serverlos in der URL komprimiert. Teilnehmerantworten können exportiert und importiert werden.',
    fr: 'Utilisez « Partager le lien direct » ou un code QR. Le quiz entier est compressé dans l’URL sans serveur. Exportez et importez les réponses des participants.',
    it: 'Usa "Condividi link diretto" o il codice QR. L’intero quiz è compresso nell’URL senza server. Esporta e importa le risposte dei partecipanti.',
    es: 'Usa "Compartir enlace directo" o genera un código QR. Todo el cuestionario se comprime en la URL sin servidor. Exporta e importa las respuestas de los participantes.',
  },
  settingsHelpStep7: {
    sv: '7. Sparade Quiz, Bibliotek & Databasbackup',
    en: '7. Saved Quizzes, Library & Database Backup',
    nl: '7. Opgeslagen quizzen, Bibliotheek & Databaseback-up',
    be: '7. Opgeslagen quizzen, Bibliotheek & Databaseback-up',
    no: '7. Lagrede quizzer, Bibliotek & Sikkerhetskopi',
    da: '7. Gemte quizzer, Bibliotek & Sikkerhedskopi',
    fi: '7. Tallennetut visat, Kirjasto & Varmuuskopio',
    is: '7. Vistuð quiz, Safn & Öryggisafrit',
    se: '7. Vurkejuvvon kvizat, Girjerádju & Sihkarvuođagáhtten',
    et: '7. Salvestatud viktoriinid, Raamatukogu & Varukoopia',
    lv: '7. Saglabātās viktorīnas, Bibliotēka & Rezerves kopija',
    lt: '7. Išsaugotos viktorinos, Biblioteka ir Atsarginė kopija',
    uk: '7. Збережені тести, Бібліотека та Резервна копія',
    de: '7. Gespeicherte Quizze, Bibliothek & Datenbanksicherung',
    fr: '7. Quiz enregistrés, Bibliothèque & Sauvegarde de base',
    it: '7. Quiz salvati, Libreria e Backup del database',
    es: '7. Cuestionarios guardados, Biblioteca y Copia de seguridad',
  },
  settingsHelpStep7Desc: {
    sv: 'Under fliken "Sparade Quiz & Bibliotek" sparas alla dina tipspromenader i webbläsarens interna IndexedDB och kan sorteras efter datum eller namn. Ladda in färdiga tipspromenader från katalogen, eller exportera/importera hela din databas som en säkerhetskopia (JSON-fil).',
    en: 'Under the "Saved Quizzes & Library" tab, all your quiz trails are stored in the browser\'s IndexedDB and can be sorted by date or name. Load ready-made quizzes from the catalog, or export/import your entire database as a JSON backup.',
    nl: 'In het tabblad "Opgeslagen quizzen" worden al uw quizzen opgeslagen in IndexedDB. Laad kant-en-klare quizzen of maak een JSON-back-up.',
    be: 'In het tabblad "Opgeslagen quizzen" worden al uw quizzen opgeslagen in IndexedDB. Laad kant-en-klare quizzen of maak een JSON-back-up.',
    no: 'Under "Lagrede quizzer" lagres dine runder i IndexedDB. Last inn ferdige quizzer eller ta en komplett JSON-sikkerhetskopi.',
    da: 'Under "Gemte quizzer" gemmes dine runder i IndexedDB. Indlæs færdige quizzer eller tag en JSON-sikkerhedskopi.',
    fi: '"Tallennetut visat"-välilehdellä visat tallennetaan IndexedDB:hen. Lataa valmiita visoja tai tee JSON-varmuuskopio.',
    is: 'Undir "Vistuð quiz" eru keppnir vistaðar í IndexedDB. Hlaðið inn tilbúnum keppnum eða takið JSON öryggisafrit.',
    se: '"Vurkejuvvon kvizat"-flikkas vurdnojuvvojit kvizat IndexedDB:s. Viečča gárvves kvizaid dahje váldde JSON-sihkarvuođamáhcahusa.',
    et: 'Vahekaardil "Salvestatud viktoriinid" salvestatakse rajad IndexedDB-sse. Laadige valmis viktoriine või tehke JSON-varukoopia.',
    lv: 'Cilnē "Saglabātās viktorīnas" maršruti tiek saglabāti IndexedDB. Ielādējiet gatavas viktorīnas vai veiciet JSON dublējumu.',
    lt: 'Skirtuke „Išsaugotos viktorinos“ takai saugomi IndexedDB. Įkelkite paruoštas viktorinas arba darykite JSON atsarginę kopiją.',
    uk: 'У вкладці «Збережені тести» всі вікторини зберігаються в IndexedDB. Завантажуйте готові тести або створюйте резервну копію у форматі JSON.',
    de: 'Unter „Gespeicherte Quizze“ werden Ihre Quizze in IndexedDB gesichert. Laden Sie fertige Vorlagen oder sichern Sie die Datenbank als JSON.',
    fr: 'Dans « Quiz enregistrés », vos parcours sont sauvegardés dans IndexedDB. Chargez des quiz prêts à l’emploi ou exportez/importez une sauvegarde JSON.',
    it: 'Nella scheda "Quiz salvati", i tuoi percorsi sono memorizzati in IndexedDB. Carica quiz già pronti o fai un backup JSON completo.',
    es: 'En "Cuestionarios guardados", tus recorridos se guardan en IndexedDB. Carga cuestionarios del catálogo o realiza una copia de seguridad en JSON.',
  },
  howItWorksStep1: {
    sv: '1. Deltagare & Anpassade frågor',
    en: '1. Participants & Adapted questions',
    nl: '1. Deelnemers & Aangepaste vragen',
    be: '1. Deelnemers & Aangepaste vragen',
    no: '1. Deltakere & Tilpassede spørsmål',
    da: '1. Deltagere & Tilpassede spørgsmål',
    fi: '1. Osallistujat & Mukautetut kysymykset',
    is: '1. Þátttakendur & Sérsniðnar spurningar',
    se: '1. Oasseváldit & Heivehuvvon gažaldagat',
    et: '1. Osalejad & Kohandatud küsimused',
    lv: '1. Dalībnieki & Pielāgoti jautājumi',
    lt: '1. Dalyviai ir Pritaikyti klausimai',
    uk: '1. Учасники та адаптовані запитання',
    de: '1. Teilnehmer & Angepasste Fragen',
    fr: '1. Participants & Questions adaptées',
    it: '1. Partecipanti & Domande personalizzate',
    es: '1. Participantes y Preguntas adaptadas',
  },
  howItWorksStep1Desc: {
    sv: 'Lägg till deltagare eller lag under fliken "Deltagare". Välj Barn 👶 eller Vuxen 🧑 för att få automatiskt åldersanpassade frågor under tipspromenaden.',
    en: 'Add participants or teams under the "Participants" tab. Choose Child 👶 or Adult 🧑 to receive age-adapted questions throughout the trail.',
    nl: 'Voeg deelnemers of teams toe onder het tabblad "Deelnemers". Kies Kind 👶 of Volwassene 🧑 om vragen op maat te krijgen.',
    be: 'Voeg deelnemers of teams toe onder het tabblad "Deelnemers". Kies Kind 👶 of Volwassene 🧑 om vragen op maat te krijgen.',
    no: 'Legg til deltakere eller lag under "Deltakere". Velg Barn 👶 eller Voksen 🧑 for aldersanpassede spørsmål.',
    da: 'Tilføj deltagere eller hold under "Deltagere". Vælg Barn 👶 eller Voksen 🧑 for alderssvarende spørgsmål.',
    fi: 'Lisää osallistujia tai joukkueita "Osallistujat"-välilehdellä. Valitse Lapsi 👶 tai Aikuinen 🧑 saadaksesi sopivat kysymykset.',
    is: 'Bættu við þátttakendum eða liðum undir "Þátttakendur". Veldu Barn 👶 eða Fullorðinn 🧑 til að fá aldursmiðaðar spurningar.',
    se: 'Lasit oasseváldiid dahje joavkkuid "Oasseváldit"-flikkas. Vállje Mánná 👶 dahje Rávvis 🧑 oažžut heivvolaš gažaldagaid.',
    et: 'Lisage osalejad või meeskonnad vahekaardil "Osalejad". Valige Laps 👶 või Täiskasvanu 🧑 kohandatud küsimuste jaoks.',
    lv: 'Pievienojiet dalībniekus vai komandas cilnē "Dalībnieki". Izvēlieties Bērns 👶 vai Pieaugušais 🧑 pielāgotiem jautājumiem.',
    lt: 'Pridėkite dalyvius arba komandas skirtuke „Dalyviai“. Pasirinkite Vaikas 👶 arba Suaugęs 🧑 atitinkamiems klausimams gauti.',
    uk: 'Додавайте учасників або команди у вкладці «Учасники». Оберіть Дитина 👶 або Дорослий 🧑 для отримання адаптованих запитань.',
    de: 'Fügen Sie Teilnehmer oder Teams unter „Teilnehmer“ hinzu. Wählen Sie Kind 👶 oder Erwachsener 🧑 für altersgerechte Fragen.',
    fr: 'Ajoutez des participants ou des équipes dans « Participants ». Choisissez Enfant 👶 ou Adulte 🧑 pour des questions adaptées.',
    it: 'Aggiungi partecipanti o squadre nella scheda "Partecipanti". Scegli Bambino 👶 o Adulto 🧑 per domande adatte all’età.',
    es: 'Añade participantes o equipos en "Participantes". Elige Niño 👶 o Adulto 🧑 para recibir preguntas adaptadas a la edad.',
  },
  howItWorksStep2: {
    sv: '2. GPS-karta, Kompass & Ruttspårning',
    en: '2. GPS Map, Compass & Route Tracking',
    nl: '2. GPS-kaart, Kompas & Routespoor',
    be: '2. GPS-kaart, Kompas & Routespoor',
    no: '2. GPS-kart, Kompass & Rutesporing',
    da: '2. GPS-kort, Kompas & Rutesporing',
    fi: '2. GPS-kartta, Kompassi & Reitinseuranta',
    is: '2. GPS-kort, Áttaviti & Leiðarskráning',
    se: '2. GPS-kárta, Kompássa & Johtolaga čuovvun',
    et: '2. GPS-kaart, Kompass & Rajajälgimine',
    lv: '2. GPS karte, Kompass & Maršruta izsekošana',
    lt: '2. GPS žemėlapis, Kompasas ir Maršruto sekimas',
    uk: '2. GPS-карта, Компас та Відстеження маршруту',
    de: '2. GPS-Karte, Kompass & Routenverfolgung',
    fr: '2. Carte GPS, Boussole & Suivi d’itinéraire',
    it: '2. Mappa GPS, Bussola & Tracciamento percorso',
    es: '2. Mapa GPS, Brújula y Seguimiento de ruta',
  },
  howItWorksStep2Desc: {
    sv: 'Klicka på "Starta Quizzet" och navigera med kartan, kompassnålen och avståndsmätaren. Geotaggade frågor låses upp när du närmar dig stationen. Din gångväg ritas automatiskt som en grön linje och mäter din vandrade distans.',
    en: 'Click "Start Quiz" and navigate using the map, compass badge, and distance meter. Geotagged questions unlock when you approach the station. Your walked path is automatically drawn as a green line and measures total distance.',
    nl: 'Klik op "Quiz starten" en navigeer met de kaart, het kompas en de afstandsmeter. Geotag-vragen ontgrendelen zodra u in de buurt bent. Uw gelopen pad wordt getekend.',
    be: 'Klik op "Quiz starten" en navigeer met de kaart, het kompas en de afstandsmeter. Geotag-vragen ontgrendelen zodra u in de buurt bent. Uw gelopen pad wordt getekend.',
    no: 'Klikk "Start Quizen" og naviger med kartet og kompasset. Geotaggede spørsmål låses opp når du nærmer deg stasjonen. Ruten din tegnes automatisk.',
    da: 'Klik på "Start Quiz" og naviger med kort og kompas. Geotaggede spørgsmål låses op, når du nærmer dig stationen. Din gåede rute tegnes automatisk.',
    fi: 'Paina "Aloita visa" ja suunnista kartan ja kompassin avulla. Geotagilla varustetut kysymykset aukeavat rastille saavuttaessa. Kuljettu reitti piirretään kartalle.',
    is: 'Smelltu á "Byrja quiz" og rataðu með korti og áttavita. Spurningar opnast þegar þú nálgast stöðina og gengin leið er teiknuð sjálfvirkt.',
    se: 'Coahkkal "Álggat quiza" ja ofelaš kárttain ja kompássain. Gažaldagat rahpasit go lagodat stašuvnna. Du vádjolan bálggis sárgojuvvo kártii.',
    et: 'Klõpsake "Alusta viktoriini" ja navigeerige kaardi ning kompassi abil. Geotäägitud küsimused avanevad jaamale lähenedes ja teekond joonistatakse kaardile.',
    lv: 'Nospiediet "Sākt viktorīnu" un orientējieties ar karti un kompasu. Ģeomarķētie jautājumi atslēdzas, tuvojoties stacijai, un noietā taka tiek iezīmēta.',
    lt: 'Paspauskite „Pradėti viktoriną“ ir naršykite naudodami žemėlapį bei kompasą. Klausimai su vietos žyma atsirakina priartėjus, o nueitas kelias pažymimas.',
    uk: 'Натисніть «Розпочати вікторину» та орієнтуйтеся за картою і компасом. Питання з геомітками відкриваються при наближенні, а маршрут записується.',
    de: 'Klicken Sie auf „Quiz starten“ und navigieren Sie mit Karte, Kompass und Entfernungsmesser. Geotag-Fragen öffnen sich bei Annäherung, und die Strecke wird aufgezeichnet.',
    fr: 'Cliquez sur « Démarrer le quiz » et orientez-vous avec la carte, la boussole et le télémètre. Les questions géotaguées se débloquent à l’approche et le tracé s’enregistre.',
    it: 'Clicca su "Inizia quiz" e naviga con mappa, bussola e distanziometro. Le domande geotaggate si sbloccano avvicinandoti e il percorso viene tracciato.',
    es: 'Haz clic en "Iniciar cuestionario" y navega con el mapa, la brújula y el medidor de distancia. Las preguntas geoetiquetadas se desbloquean al acercarte y se registra tu ruta.',
  },
  howItWorksStep3: {
    sv: '3. Flexibla Frågetyper & Följdfrågor',
    en: '3. Flexible Question Types & Follow-ups',
    nl: '3. Flexibele vraagtypes & Vervolgvragen',
    be: '3. Flexibele vraagtypes & Vervolgvragen',
    no: '3. Fleksible spørsmålstyper & Oppfølging',
    da: '3. Fleksible spørgsmålstyper & Opfølgning',
    fi: '3. Joustavat kysymystyypit & Jatkokysymykset',
    is: '3. Sveigjanlegar spurningategundir & Framhald',
    se: '3. Njuovžilis gažaldatšlájat & Čuovusgažaldagat',
    et: '3. Paindlikud küsimusetüübid & Järelküsimused',
    lv: '3. Elastīgi jautājumu veidi & Papiljautājumi',
    lt: '3. Įvairūs klausimų tipai ir Papildomi klausimai',
    uk: '3. Гнучкі типи питань та Додаткові завдання',
    de: '3. Flexible Fragetypen & Folgefragen',
    fr: '3. Types de questions flexibles & Questions suivantes',
    it: '3. Tipi di domande flessibili & Domande successive',
    es: '3. Tipos de preguntas flexibles y Seguimiento',
  },
  howItWorksStep3Desc: {
    sv: 'Svara på klassiska 1X2-flervalsfrågor, poängfrågor 🎯 (närmast vinner/skattning) eller fritextfrågor ✍️ med smart stavningskontroll. Var observant på spännande följdfrågor som kan dyka upp längs promenaden!',
    en: 'Answer classic 1X2 multiple-choice questions, point questions 🎯 (closest guess/estimation), or free-text questions ✍️ with smart fuzzy spell-checking. Watch out for exciting follow-up questions appearing along the trail!',
    nl: 'Beantwoord klassieke 1X2-vragen, puntvragen 🎯 of vrije tekstvragen ✍️ met slimme spellingcontrole. Let op eventuele vervolgvragen onderweg!',
    be: 'Beantwoord klassieke 1X2-vragen, puntvragen 🎯 of vrije tekstvragen ✍️ met slimme spellingcontrole. Let op eventuele vervolgvragen onderweg!',
    no: 'Svar på klassiske 1X2-spørsmål, poengspørsmål 🎯 eller fritekstspørsmål ✍️ med stavekontroll. Se opp for oppfølgingsspørsmål underveis!',
    da: 'Svar på klassiske 1X2-spørgsmål, pointspørgsmål 🎯 eller fritekstspørgsmål ✍️ med stavekontrol. Hold øje med opfølgende spørgsmål!',
    fi: 'Vastaa perinteisiin 1X2-kysymyksiin, pistekysymyksiin 🎯 tai tekstikysymyksiin ✍️. Tarkkaile reitillä avautuvia jatkokysymyksiä!',
    is: 'Svaraðu hefðbundnum 1X2 spurningum, stigaspurningum 🎯 eða textaspurningum ✍️. Fylgstu með framhaldsspurningum á göngunni!',
    se: 'Vásit 1X2-gažaldagaide, čuokkisgažaldagaide 🎯 dahje čállingažaldagaide ✍️. Čuovo mielde jus čuovusgažaldagat rahpasit!',
    et: 'Vastake klassikalistele 1X2 küsimustele, punktiküsimustele 🎯 või vabatekstiküsimustele ✍️. Pange tähele rajal avanevaid järelküsimusi!',
    lv: 'Atbildiet uz 1X2 jautājumiem, punktu jautājumiem 🎯 vai brīvā teksta jautājumiem ✍️. Pievērsiet uzmanību papiljautājumiem takā!',
    lt: 'Atsakykite į 1X2 klausimus, taškų klausimus 🎯 arba tekstinius klausimus ✍️. Stebėkite pasirodančius papildomus klausimus!',
    uk: 'Відповідайте на класичні 1X2 питання, бальні 🎯 або текстові ✍️ з розумною перевіркою. Слідкуйте за додатковими запитаннями на маршруті!',
    de: 'Beantworten Sie klassische 1X2-Fragen, Punktefragen 🎯 oder Freitextfragen ✍️ mit Schreibweisentoleranz. Achten Sie auf Folgefragen auf Ihrem Weg!',
    fr: 'Répondez aux choix multiples 1X2, aux questions à points 🎯 ou au texte libre ✍️ avec tolérance orthographique. Surveillez les questions suivantes !',
    it: 'Rispondi a domande 1X2, domande a punti 🎯 o testo libero ✍️ con controllo ortografico flessibile. Attento alle domande successive lungo il percorso!',
    es: 'Responde a preguntas clásicas 1X2, de puntos 🎯 o texto libre ✍️ con corrección ortográfica flexible. ¡Atento a las preguntas de seguimiento en el camino!',
  },
  howItWorksStep4: {
    sv: '4. Resultat, Facit & Diplom',
    en: '4. Results, Answer Key & Diploma',
    nl: '4. Resultaten, Antwoorden & Diploma',
    be: '4. Resultaten, Antwoorden & Diploma',
    no: '4. Resultater, Fasit & Diplom',
    da: '4. Resultater, Facit & Diplom',
    fi: '4. Tulokset, Oikeat vastaukset & Diplomi',
    is: '4. Niðurstöður, Svör & Viðurkenning',
    se: '4. Bohtosat, Rievttes vástádusat & Duodastus',
    et: '4. Tulemused, Õiged vastused & Diplom',
    lv: '4. Rezultāti, Pareizās atbildes & Diploms',
    lt: '4. Rezultatai, Atsakymai ir Diplomas',
    uk: '4. Результати, Відповіді та Диплом',
    de: '4. Ergebnisse, Lösung & Urkunde',
    fr: '4. Résultats, Corrigé & Diplôme',
    it: '4. Risultati, Soluzioni & Diploma',
    es: '4. Resultados, Solucionario y Diploma',
  },
  howItWorksStep4Desc: {
    sv: 'När alla gått i mål låses facit upp med Quiz-lösenordet under fliken "Resultat". Då stannar GPS-spårningen och du ser slutpoäng, rätta svar, personliga diplom och en komplett sammanfattning av din vandrade slinga.',
    en: 'When everyone finishes, unlock the answer key with the master password under the "Results" tab. GPS tracking stops, revealing final scores, correct answers, personalized diplomas, and your complete walked trail summary.',
    nl: 'Wanneer iedereen klaar is, ontgrendelt u de antwoorden met het wachtwoord. GPS-tracking stopt en u ziet eindscores, diploma\'s en de route.',
    be: 'Wanneer iedereen klaar is, ontgrendelt u de antwoorden met het wachtwoord. GPS-tracking stopt en u ziet eindscores, diploma\'s en de route.',
    no: 'Når alle er i mål, låser du opp fasiten med passordet under "Resultater". GPS-sporingen stopper og du ser poeng, diplom og oppsummering av ruten.',
    da: 'Når alle er i mål, låses facit op med adgangskoden under "Resultater". GPS-sporingen stopper, og du ser point, diplom og ruteoversigt.',
    fi: 'Kun kaikki ovat valmiita, avaa oikeat vastaukset salasanalla "Tulokset"-välilehdellä. GPS-seuranta päättyy ja näet pisteet, diplomit ja reittiyhteenvedon.',
    is: 'Þegar allir eru búnir opnarðu svörin með lykilorðinu undir "Niðurstöður". GPS skráning hættir og lokastig, viðurkenningar og leiðarsamantekt birtast.',
    se: 'Go buohkat leat geargan, raba rievttes vástádusaid beassansániin "Bohtosat"-flikkas. GPS-čuovvun nohka ja oainnát čuoggáid, duodastusa ja johtolaga.',
    et: 'Kui kõik on lõpetanud, avage vastused parooliga vahekaardil "Tulemused". GPS-jälgimine peatub ning kuvatakse punktid, diplomid ja teekonna kokkuvõte.',
    lv: 'Kad visi finišējuši, atslēdziet atbildes ar paroli cilnē "Rezultāti". GPS izsekošana apstājas, un redzami punkti, diplomi un maršruta kopsavilkums.',
    lt: 'Visiems baigus, atrakinkite atsakymus slaptažodžiu skirtuke „Rezultatai“. GPS sekimas sustoja, rodomi taškai, diplomai ir maršruto suvestinė.',
    uk: 'Коли всі фінішують, відкрийте правильні відповіді за допомогою пароля у вкладці «Результати». GPS зупиняється, з’являються бали, дипломи та маршрут.',
    de: 'Wenn alle im Ziel sind, schalten Sie die Lösungen mit dem Passwort unter „Ergebnisse“ frei. Das GPS-Tracking stoppt, und Sie sehen Endpunkte, Urkunden und die Wanderstrecke.',
    fr: 'Quand tout le monde a terminé, débloquez les réponses avec le mot de passe dans « Résultats ». Le suivi GPS s’arrête, affichant scores, diplômes et résumé du parcours.',
    it: 'Quando tutti hanno finito, sblocca le soluzioni con la password in "Risultati". Il tracciamento GPS si ferma, mostrando punteggi finali, diplomi e riepilogo del percorso.',
    es: 'Cuando todos hayan terminado, desbloquea las soluciones con la contraseña en "Resultados". El GPS se detiene, mostrando puntuaciones finales, diplomas y el resumen de la ruta.',
  },
  aiGeotagLandmarksLabel: {
    sv: '📍 Geotagga platser/landmärken automatiskt',
    en: '📍 Auto-geotag places & landmarks (GPS coordinates)',
    nl: '📍 Locaties & bezienswaardigheden automatisch geotaggen',
    be: '📍 Locaties & bezienswaardigheden automatisch geotaggen',
    no: '📍 Geotagg steder/landemerker automatisk',
    da: '📍 Geotag steder/landemærker automatisk',
    fi: '📍 Geotäggää paikat ja maamerkit automaattisesti',
    is: '📍 Sjálfvirk GPS-staðsetning fyrir staði/kennileiti',
    se: '📍 Geotagget báikkiid/mearkkaid automáhtalaččat',
    et: '📍 Geosildista kohad ja vaatamisväärsused automaatselt',
    lv: '📍 Automātiski ģeomarķēt vietas un orientierus',
    lt: '📍 Automatiškai žymėti vietas ir lankytinus objektus',
    uk: '📍 Автоматично геотегувати місця та пам\'ятки',
    de: '📍 Orte & Sehenswürdigkeiten automatisch geotaggen',
    fr: '📍 Géolocaliser automatiquement les lieux et monuments',
    it: '📍 Geotag automatico per luoghi e monumenti',
    es: '📍 Geotaggear automáticamente lugares y monumentos',
  },
  aiGeotagLandmarksDesc: {
    sv: 'Låter AI identifiera om frågan handlar om en specifik plats/sevärdhet och automatiskt sätta ut dess exakta GPS-position på kartan.',
    en: 'Allows AI to detect if a question is about a specific real-world place/landmark and automatically set its exact GPS coordinates on the map.',
    nl: 'Laat AI herkennen of een vraag over een specifieke plek gaat en stel automatisch de GPS-coördinaten in.',
    be: 'Laat AI herkennen of een vraag over een specifieke plek gaat en stel automatisch de GPS-coördinaten in.',
    no: 'Lar AI oppdage om spørsmålet handler om et bestemt sted og setter automatisk GPS-posisjonen på kartet.',
    da: 'Lader AI registrere, om spørgsmålet handler om et bestemt sted, og sætter automatisk GPS-positionen på kortet.',
    fi: 'Antaa tekoälyn tunnistaa paikkaan liittyvät kysymykset ja asettaa niiden tarkan GPS-sijainnin kartalle.',
    is: 'Leyfir gervigreind að finna GPS hnit ef spurning tengist ákveðnum stað eða kennileiti.',
    se: 'Diktá AI diehtit jus gažaldat lea dihto báikki birra ja bidjat dan GPS-kárttii.',
    et: 'Võimaldab tehisintellektil tuvastada kohapõhised küsimused ja määrata nende täpsed GPS-koordinaadid kaardile.',
    lv: 'Ļauj MI noteikt, vai jautājums ir par konkrētu vietu, un automātiski iestatīt GPS koordinātas kartē.',
    lt: 'Leidžia dirbtiniam intelektui atpažinti su konkrečia vieta susijusius klausimus ir nustatyti GPS koordinates.',
    uk: 'Дозволяє ШІ визначати, чи питання стосується конкретного місця, та автоматично встановлювати GPS-координати.',
    de: 'Lässt KI erkennen, ob eine Frage sich auf einen bestimmten Ort bezieht, und setzt automatisch die GPS-Koordinaten auf der Karte.',
    fr: 'Permet à l\'IA de détecter si une question concerne un lieu précis et de définir automatiquement ses coordonnées GPS sur la carte.',
    it: 'Consente all\'IA di rilevare se una domanda riguarda un luogo specifico e impostare automaticamente le coordinate GPS sulla mappa.',
    es: 'Permite a la IA detectar si una pregunta trata sobre un lugar específico y establecer automáticamente sus coordenadas GPS en el mapa.',
  },
  searchPlaceInputPlaceholder: {
    sv: 'Sök plats, adress eller landmärke...',
    en: 'Search place, address or landmark...',
    nl: 'Zoek plaats, adres of bezienswaardigheid...',
    be: 'Zoek plaats, adres of bezienswaardigheid...',
    no: 'Søk sted, adresse eller landemerke...',
    da: 'Søg sted, adresse eller landemærke...',
    fi: 'Etsi paikkaa, osoitetta tai maamerkkiä...',
    is: 'Leita að stað, heimilisfangi eða kennileiti...',
    se: 'Oza báikki, čujuhusa dahje mearkka...',
    et: 'Otsi kohta, aadressi või vaatamisväärsust...',
    lv: 'Meklēt vietu, adresi vai orientieri...',
    lt: 'Ieškoti vietos, adreso ar objekto...',
    uk: 'Пошук місця, адреси або пам\'ятки...',
    de: 'Ort, Adresse oder Sehenswürdigkeit suchen...',
    fr: 'Rechercher un lieu, une adresse ou un monument...',
    it: 'Cerca luogo, indirizzo o monumento...',
    es: 'Buscar lugar, dirección o monumento...',
  },
  searchAndGeotagBtn: {
    sv: 'Sök & tagga',
    en: 'Search & tag',
    nl: 'Zoeken & taggen',
    be: 'Zoeken & taggen',
    no: 'Søk & tagg',
    da: 'Søg & tag',
    fi: 'Hae & tägää',
    is: 'Leita & merkja',
    se: 'Oza & merke',
    et: 'Otsi ja märgi',
    lv: 'Meklēt un marķēt',
    lt: 'Ieškoti ir pažymėti',
    uk: 'Пошук та тег',
    de: 'Suchen & taggen',
    fr: 'Chercher & taguer',
    it: 'Cerca & tagga',
    es: 'Buscar y etiquetar',
  },
  aiGeotagSingleBtn: {
    sv: 'Hitta GPS med AI',
    en: 'Find GPS with AI',
    nl: 'GPS zoeken met AI',
    be: 'GPS zoeken met AI',
    no: 'Finn GPS med AI',
    da: 'Find GPS med AI',
    fi: 'Hae GPS tekoälyllä',
    is: 'Finna GPS með gervigreind',
    se: 'Gávnna GPS AI:in',
    et: 'Leia GPS tehisintellektiga',
    lv: 'Atrast GPS ar MI',
    lt: 'Rasti GPS su AI',
    uk: 'Знайти GPS через ШІ',
    de: 'GPS mit KI finden',
    fr: 'Trouver GPS avec l\'IA',
    it: 'Trova GPS con l\'IA',
    es: 'Buscar GPS con IA',
  },
  searchingLocation: {
    sv: 'Söker plats...',
    en: 'Searching location...',
    nl: 'Locatie zoeken...',
    be: 'Locatie zoeken...',
    no: 'Søker sted...',
    da: 'Søger sted...',
    fi: 'Etsitään sijaintia...',
    is: 'Leitar að staðsetningu...',
    se: 'Oza báikki...',
    et: 'Koha otsimine...',
    lv: 'Meklē vietu...',
    lt: 'Ieškoma vietos...',
    uk: 'Пошук місця...',
    de: 'Ort wird gesucht...',
    fr: 'Recherche du lieu...',
    it: 'Ricerca posizione...',
    es: 'Buscando ubicación...',
  },
  locationFoundSuccess: {
    sv: 'Plats geotaggad: {name}',
    en: 'Location geotagged: {name}',
    nl: 'Locatie getagd: {name}',
    be: 'Locatie getagd: {name}',
    no: 'Sted geotagget: {name}',
    da: 'Sted geotagget: {name}',
    fi: 'Sijainti tägätty: {name}',
    is: 'Staðsetning merkt: {name}',
    se: 'Báiki merkejuvvon: {name}',
    et: 'Koht geosildistatud: {name}',
    lv: 'Vieta ģeomarķēta: {name}',
    lt: 'Vieta pažymėta: {name}',
    uk: 'Місце геотеґовано: {name}',
    de: 'Ort getaggt: {name}',
    fr: 'Lieu géolocalisé : {name}',
    it: 'Luogo geotaggato: {name}',
    es: 'Lugar etiquetado: {name}',
  },
  noLocationFoundAlert: {
    sv: 'Hittade inga koordinater för denna plats. Testa att söka efter ett mer specifikt namn eller klicka direkt på kartan.',
    en: 'Could not find coordinates for this place. Try a more specific name or click directly on the map.',
    nl: 'Geen coördinaten gevonden. Probeer een specifiekere naam of klik op de kaart.',
    be: 'Geen coördinaten gevonden. Probeer een specifiekere naam of klik op de kaart.',
    no: 'Fant ingen koordinater for dette stedet. Prøv et mer spesifikt navn eller klikk på kartet.',
    da: 'Fandt ingen koordinater for dette sted. Prøv et mere specifikt navn eller klik på kortet.',
    fi: 'Koordinaatteja ei löytynyt. Kokeile tarkempaa nimeä tai valitse sijainti suoraan kartalta.',
    is: 'Fann engin hnit fyrir þennan stað. Prófaðu nákvæmara nafn eða smelltu á kortið.',
    se: 'Eai gávdnon koordináhtat dán báikái. Geahččal dárkileappot dahje deaddil kártii.',
    et: 'Selle koha koordinaate ei leitud. Proovige täpsemat nime või klõpsake otse kaardil.',
    lv: 'Šai vietai koordinātas netika atrastas. Mēģiniet precīzāku nosaukumu vai noklikšķiniet uz kartes.',
    lt: 'Šios vietos koordinačių rasti nepavyko. Bandykite tikslesnį pavadinimą arba spustelėkite žemėlapį.',
    uk: 'Не вдалося знайти координати цього місця. Спробуйте точнішу назву або виберіть на карті.',
    de: 'Keine Koordinaten für diesen Ort gefunden. Versuchen Sie einen genaueren Namen oder klicken Sie auf die Karte.',
    fr: 'Coordonnées introuvables. Essayez un nom plus précis ou cliquez directement sur la carte.',
    it: 'Nessuna coordinata trovata. Prova con un nome più specifico o clicca direttamente sulla mappa.',
    es: 'No se encontraron coordenadas para este lugar. Prueba con un nombre más específico o haz clic en el mapa.',
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

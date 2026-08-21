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

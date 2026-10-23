// Översättningar för quizeditorn. Nyckeln är den svenska texten; värdena är [engelska, franska, tyska].
// Lägg till ett nytt språk genom att lägga till det i LANGUAGES och som en ny position i varje rad.
window.LANGUAGES = [
  { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' }
];
window.DEFAULT_LANG = 'sv';
window.LANG_KEY = 'bgl-lang';

window.I18N = {
  // Rubrik och verktygsfält
  [`Quizeditor – Family Quiz`]: [`Quiz editor – Family Quiz`, `Éditeur de quiz – Family Quiz`, `Quiz-Editor – Family Quiz`],
  [`📝 Quizeditor`]: [`📝 Quiz editor`, `📝 Éditeur de quiz`, `📝 Quiz-Editor`],
  [`📂 Öppna mapp…`]: [`📂 Open folder…`, `📂 Ouvrir un dossier…`, `📂 Ordner öffnen…`],
  [`＋ Ny quiz`]: [`＋ New quiz`, `＋ Nouveau quiz`, `＋ Neues Quiz`],
  [`🔄 Synka manifest`]: [`🔄 Sync manifest`, `🔄 Synchroniser le manifeste`, `🔄 Manifest synchronisieren`],
  [`Bygg om manifest.json från filerna i mappen`]: [`Rebuild manifest.json from the files in the folder`, `Reconstruire manifest.json à partir des fichiers du dossier`, `manifest.json aus den Dateien im Ordner neu erstellen`],
  [`💾 Spara`]: [`💾 Save`, `💾 Enregistrer`, `💾 Speichern`],
  [`Språk`]: [`Language`, `Langue`, `Sprache`],

  // Språknamn
  [`Svenska`]: [`Swedish`, `Suédois`, `Schwedisch`],
  [`Engelska`]: [`English`, `Anglais`, `Englisch`],
  [`Tyska`]: [`German`, `Allemand`, `Deutsch`],
  [`Franska`]: [`French`, `Français`, `Französisch`],
  [`Spanska`]: [`Spanish`, `Espagnol`, `Spanisch`],
  [`Norska`]: [`Norwegian`, `Norvégien`, `Norwegisch`],
  [`Danska`]: [`Danish`, `Danois`, `Dänisch`],
  [`Finska`]: [`Finnish`, `Finnois`, `Finnisch`],
  [`Italienska`]: [`Italian`, `Italien`, `Italienisch`],
  [`Estniska`]: [`Estonian`, `Estonien`, `Estnisch`],
  [`Lettiska`]: [`Latvian`, `Letton`, `Lettisch`],
  [`Litauiska`]: [`Lithuanian`, `Lituanien`, `Litauisch`],
  [`Ukrainska`]: [`Ukrainian`, `Ukrainien`, `Ukrainisch`],
  [`Isländska`]: [`Icelandic`, `Islandais`, `Isländisch`],
  [`Nordsamiska`]: [`Northern Sami`, `Same du Nord`, `Nordsamisch`],
  [`Nederländska`]: [`Dutch`, `Néerlandais`, `Niederländisch`],
  [`Flamländska`]: [`Flemish`, `Flamand`, `Flämisch`],

  // Frågetyper och grupper
  [`Flerval`]: [`Multiple choice`, `Choix multiple`, `Mehrfachauswahl`],
  [`Fritext`]: [`Free text`, `Texte libre`, `Freitext`],
  [`Poäng`]: [`Points`, `Points`, `Punkte`],
  [`Ledtrådsstege`]: [`Clue ladder`, `Échelle d'indices`, `Hinweisleiter`],
  [`Barn`]: [`Children`, `Enfants`, `Kinder`],
  [`Vuxen`]: [`Adult`, `Adulte`, `Erwachsene`],
  [`Vuxna`]: [`Adults`, `Adultes`, `Erwachsene`],
  [`Barn och vuxna`]: [`Children and adults`, `Enfants et adultes`, `Kinder und Erwachsene`],

  // Logotyp
  [`Quizens logotyp`]: [`Quiz logo`, `Logo du quiz`, `Quiz-Logo`],
  [`Förhandsvisning av quizets logotyp`]: [`Quiz logo preview`, `Aperçu du logo du quiz`, `Vorschau des Quiz-Logos`],
  [`Kunde inte läsa bildfilen`]: [`Could not read the image file`, `Impossible de lire le fichier image`, `Bilddatei konnte nicht gelesen werden`],
  [`Webbläsaren saknar filväljare för logotyper – använd Chrome eller Edge`]: [`The browser has no file picker for logos – use Chrome or Edge`, `Le navigateur n'a pas de sélecteur de fichiers pour les logos – utilisez Chrome ou Edge`, `Der Browser hat keine Dateiauswahl für Logos – verwende Chrome oder Edge`],
  [`Bildfiler`]: [`Image files`, `Fichiers image`, `Bilddateien`],
  [`Den valda filen är inte en bild`]: [`The selected file is not an image`, `Le fichier sélectionné n'est pas une image`, `Die gewählte Datei ist kein Bild`],
  [`Logotyp kopierad till quizmappen: {0} – spara quizet`]: [`Logo copied to the quiz folder: {0} – save the quiz`, `Logo copié dans le dossier du quiz : {0} – enregistrez le quiz`, `Logo in den Quiz-Ordner kopiert: {0} – Quiz speichern`],
  [`Logotyp inbäddad i quizet – spara quizet`]: [`Logo embedded in the quiz – save the quiz`, `Logo intégré au quiz – enregistrez le quiz`, `Logo im Quiz eingebettet – Quiz speichern`],
  [`Kunde inte välja logotyp: {0}`]: [`Could not choose logo: {0}`, `Impossible de choisir le logo : {0}`, `Logo konnte nicht gewählt werden: {0}`],

  // AI och översättning
  [`AI-tjänsten returnerade inget JSON-svar`]: [`The AI service returned no JSON response`, `Le service d'IA n'a renvoyé aucune réponse JSON`, `Der KI-Dienst lieferte keine JSON-Antwort`],
  [`Gemini svarade {0}: {1}`]: [`Gemini responded {0}: {1}`, `Gemini a répondu {0} : {1}`, `Gemini antwortete {0}: {1}`],
  [`AI-genereringen misslyckades`]: [`AI generation failed`, `La génération par l'IA a échoué`, `KI-Generierung fehlgeschlagen`],
  [`AI-tjänsten returnerade ett ogiltigt översättningssvar`]: [`The AI service returned an invalid translation response`, `Le service d'IA a renvoyé une réponse de traduction invalide`, `Der KI-Dienst lieferte eine ungültige Übersetzungsantwort`],
  [`Översättningen misslyckades`]: [`The translation failed`, `La traduction a échoué`, `Die Übersetzung ist fehlgeschlagen`],
  [`🌐 Skapa språkvarianter av quizet`]: [`🌐 Create language versions of the quiz`, `🌐 Créer des versions linguistiques du quiz`, `🌐 Sprachvarianten des Quiz erstellen`],
  [`Översättningarna sparas på frågorna i quizfilen och blir tillgängliga som språkval i appen. En befintlig översättning skrivs inte över.`]: [`Translations are stored on the questions in the quiz file and become available as language choices in the app. An existing translation is not overwritten.`, `Les traductions sont enregistrées dans les questions du fichier du quiz et deviennent disponibles comme choix de langue dans l'application. Une traduction existante n'est pas écrasée.`, `Die Übersetzungen werden bei den Fragen in der Quiz-Datei gespeichert und stehen in der App als Sprachauswahl zur Verfügung. Eine vorhandene Übersetzung wird nicht überschrieben.`],
  [`Frågornas källspråk (för frågor som saknar språk)`]: [`Source language of the questions (for questions without a language)`, `Langue source des questions (pour les questions sans langue)`, `Ausgangssprache der Fragen (für Fragen ohne Sprache)`],
  [`Välj ett eller flera språk att översätta till:`]: [`Choose one or more languages to translate into:`, `Choisissez une ou plusieurs langues de traduction :`, `Wähle eine oder mehrere Zielsprachen:`],
  [`Välj alla`]: [`Select all`, `Tout sélectionner`, `Alle auswählen`],
  [`Rensa val`]: [`Clear selection`, `Effacer la sélection`, `Auswahl löschen`],
  [`🌐 Översätt quizet`]: [`🌐 Translate the quiz`, `🌐 Traduire le quiz`, `🌐 Quiz übersetzen`],
  [`Öppna eller skapa ett quiz först`]: [`Open or create a quiz first`, `Ouvrez ou créez d'abord un quiz`, `Öffne oder erstelle zuerst ein Quiz`],
  [`Ange en Gemini API-nyckel i AI-panelen först`]: [`Enter a Gemini API key in the AI panel first`, `Saisissez d'abord une clé API Gemini dans le panneau IA`, `Gib zuerst einen Gemini-API-Schlüssel im KI-Bereich ein`],
  [`Välj minst ett målspråk`]: [`Choose at least one target language`, `Choisissez au moins une langue cible`, `Wähle mindestens eine Zielsprache`],
  [`Quizet innehåller inga frågor att översätta`]: [`The quiz has no questions to translate`, `Le quiz ne contient aucune question à traduire`, `Das Quiz enthält keine Fragen zum Übersetzen`],
  [`Alla valda språk finns redan för frågorna`]: [`All selected languages already exist for the questions`, `Toutes les langues choisies existent déjà pour les questions`, `Alle gewählten Sprachen sind bei den Fragen bereits vorhanden`],
  [`Översätter…`]: [`Translating…`, `Traduction…`, `Übersetze…`],
  [`Översätter {0} av {1}`]: [`Translating {0} of {1}`, `Traduction {0} sur {1}`, `Übersetze {0} von {1}`],
  [`AI-svaret saknar fråga {0}`]: [`The AI response is missing question {0}`, `La réponse de l'IA ne contient pas la question {0}`, `In der KI-Antwort fehlt Frage {0}`],
  [`AI-svaret saknar {0}-översättning för "{1}"`]: [`The AI response is missing the {0} translation for "{1}"`, `La réponse de l'IA ne contient pas la traduction {0} de « {1} »`, `In der KI-Antwort fehlt die {0}-Übersetzung für „{1}“`],
  [`AI-svaret har fel antal svarsalternativ för {0}-översättningen av "{1}"`]: [`The AI response has the wrong number of answer options for the {0} translation of "{1}"`, `La réponse de l'IA a un nombre incorrect d'options de réponse pour la traduction {0} de « {1} »`, `Die KI-Antwort hat die falsche Anzahl Antwortoptionen für die {0}-Übersetzung von „{1}“`],
  [`AI-svaret har fel antal ledtrådar för {0}-översättningen av "{1}"`]: [`The AI response has the wrong number of clues for the {0} translation of "{1}"`, `La réponse de l'IA a un nombre incorrect d'indices pour la traduction {0} de « {1} »`, `Die KI-Antwort hat die falsche Anzahl Hinweise für die {0}-Übersetzung von „{1}“`],
  [`AI-svaret saknar översatt rätt svar för "{0}"`]: [`The AI response is missing the translated correct answer for "{0}"`, `La réponse de l'IA ne contient pas la bonne réponse traduite pour « {0} »`, `In der KI-Antwort fehlt die übersetzte richtige Antwort für „{0}“`],
  [`{0} språkvarianter skapade för {1} frågor – spara quizet`]: [`{0} language versions created for {1} questions – save the quiz`, `{0} versions linguistiques créées pour {1} questions – enregistrez le quiz`, `{0} Sprachvarianten für {1} Fragen erstellt – Quiz speichern`],
  [`Kunde inte översätta quizet: {0}`]: [`Could not translate the quiz: {0}`, `Impossible de traduire le quiz : {0}`, `Quiz konnte nicht übersetzt werden: {0}`],
  [` ({0} av {1} frågor klara; spara för att behålla dem)`]: [` ({0} of {1} questions done; save to keep them)`, ` ({0} questions sur {1} terminées ; enregistrez pour les conserver)`, ` ({0} von {1} Fragen fertig; speichern, um sie zu behalten)`],
  [`Svaret är inte ett quiz-objekt`]: [`The response is not a quiz object`, `La réponse n'est pas un objet de quiz`, `Die Antwort ist kein Quiz-Objekt`],
  [`JSON innehåller inga barnQuestions eller vuxenQuestions`]: [`The JSON contains no barnQuestions or vuxenQuestions`, `Le JSON ne contient ni barnQuestions ni vuxenQuestions`, `Das JSON enthält weder barnQuestions noch vuxenQuestions`],
  [`{0} frågor tillagda i quizet`]: [`{0} questions added to the quiz`, `{0} questions ajoutées au quiz`, `{0} Fragen zum Quiz hinzugefügt`],
  [`Skriv ett ämne för AI-frågorna`]: [`Enter a topic for the AI questions`, `Saisissez un sujet pour les questions de l'IA`, `Gib ein Thema für die KI-Fragen ein`],
  [`Ange en Gemini API-nyckel först`]: [`Enter a Gemini API key first`, `Saisissez d'abord une clé API Gemini`, `Gib zuerst einen Gemini-API-Schlüssel ein`],
  [`⏳ Skapar frågor…`]: [`⏳ Creating questions…`, `⏳ Création des questions…`, `⏳ Erstelle Fragen…`],
  [`Kunde inte skapa AI-frågor: {0}`]: [`Could not create AI questions: {0}`, `Impossible de créer les questions IA : {0}`, `KI-Fragen konnten nicht erstellt werden: {0}`],
  [`✨ Skapa frågor med AI`]: [`✨ Create questions with AI`, `✨ Créer des questions avec l'IA`, `✨ Fragen mit KI erstellen`],
  [`Webbläsaren saknar stöd för att kopiera till urklipp`]: [`The browser does not support copying to the clipboard`, `Le navigateur ne permet pas de copier dans le presse-papiers`, `Der Browser unterstützt das Kopieren in die Zwischenablage nicht`],
  [`AI-prompt kopierad – klistra in den i valfri AI-tjänst`]: [`AI prompt copied – paste it into any AI service`, `Prompt IA copié – collez-le dans le service d'IA de votre choix`, `KI-Prompt kopiert – in einen beliebigen KI-Dienst einfügen`],
  [`Kunde inte kopiera AI-prompten: {0}`]: [`Could not copy the AI prompt: {0}`, `Impossible de copier le prompt IA : {0}`, `KI-Prompt konnte nicht kopiert werden: {0}`],
  [`Ogiltig AI-JSON: {0}`]: [`Invalid AI JSON: {0}`, `JSON IA invalide : {0}`, `Ungültiges KI-JSON: {0}`],
  [`🤖 Skapa frågor med AI eller klistra in AI-JSON`]: [`🤖 Create questions with AI or paste AI JSON`, `🤖 Créer des questions avec l'IA ou coller du JSON IA`, `🤖 Fragen mit KI erstellen oder KI-JSON einfügen`],
  [`Använd en Gemini API-nyckel. Nyckeln sparas endast lokalt i denna webbläsare. AI-frågorna läggs till i aktuell quiz och bör alltid granskas före publicering.`]: [`Use a Gemini API key. The key is stored only locally in this browser. The AI questions are added to the current quiz and should always be reviewed before publishing.`, `Utilisez une clé API Gemini. La clé n'est enregistrée que localement dans ce navigateur. Les questions de l'IA sont ajoutées au quiz actuel et doivent toujours être relues avant publication.`, `Verwende einen Gemini-API-Schlüssel. Der Schlüssel wird nur lokal in diesem Browser gespeichert. Die KI-Fragen werden dem aktuellen Quiz hinzugefügt und sollten vor der Veröffentlichung immer geprüft werden.`],
  [`Gemini API-nyckel`]: [`Gemini API key`, `Clé API Gemini`, `Gemini-API-Schlüssel`],
  [`Ämne`]: [`Topic`, `Sujet`, `Thema`],
  [`Frågornas språk`]: [`Language of the questions`, `Langue des questions`, `Sprache der Fragen`],
  [`Till exempel svensk historia`]: [`For example Swedish history`, `Par exemple l'histoire suédoise`, `Zum Beispiel schwedische Geschichte`],
  [`Har du ingen API-nyckel? `]: [`Don't have an API key? `, `Vous n'avez pas de clé API ? `, `Du hast keinen API-Schlüssel? `],
  [`Skapa eller hantera Gemini API-nycklar i Google AI Studio ↗`]: [`Create or manage Gemini API keys in Google AI Studio ↗`, `Créer ou gérer des clés API Gemini dans Google AI Studio ↗`, `Gemini-API-Schlüssel in Google AI Studio erstellen oder verwalten ↗`],
  [`Frågor per målgrupp`]: [`Questions per audience`, `Questions par public`, `Fragen pro Zielgruppe`],
  [`Målgrupp`]: [`Audience`, `Public`, `Zielgruppe`],
  [`Kopiera en prompt för ChatGPT, Claude eller en annan AI-tjänst`]: [`Copy a prompt for ChatGPT, Claude or another AI service`, `Copier un prompt pour ChatGPT, Claude ou un autre service d'IA`, `Einen Prompt für ChatGPT, Claude oder einen anderen KI-Dienst kopieren`],
  [`📋 Kopiera AI-prompt`]: [`📋 Copy AI prompt`, `📋 Copier le prompt IA`, `📋 KI-Prompt kopieren`],
  [`Använd den kopierade prompten i ChatGPT, Claude eller en annan AI-tjänst och klistra sedan in dess JSON-svar nedan.`]: [`Use the copied prompt in ChatGPT, Claude or another AI service, then paste its JSON response below.`, `Utilisez le prompt copié dans ChatGPT, Claude ou un autre service d'IA, puis collez ci-dessous sa réponse JSON.`, `Verwende den kopierten Prompt in ChatGPT, Claude oder einem anderen KI-Dienst und füge die JSON-Antwort unten ein.`],
  [`Har du redan fått JSON från ChatGPT, Gemini eller Claude? Klistra in den här för att lägga till frågorna:`]: [`Already have JSON from ChatGPT, Gemini or Claude? Paste it here to add the questions:`, `Vous avez déjà du JSON de ChatGPT, Gemini ou Claude ? Collez-le ici pour ajouter les questions :`, `Du hast bereits JSON von ChatGPT, Gemini oder Claude? Füge es hier ein, um die Fragen hinzuzufügen:`],
  [`📥 Lägg till inklistrad JSON`]: [`📥 Add pasted JSON`, `📥 Ajouter le JSON collé`, `📥 Eingefügtes JSON hinzufügen`],

  // Lista och filer
  [`📂 {0} (kan sparas direkt)`]: [`📂 {0} (can be saved directly)`, `📂 {0} (enregistrement direct possible)`, `📂 {0} (kann direkt gespeichert werden)`],
  [`Ingen mapp vald`]: [`No folder selected`, `Aucun dossier sélectionné`, `Kein Ordner gewählt`],
  [`🌐 {0} (läsläge – sparar via nedladdning)`]: [`🌐 {0} (read mode – saves via download)`, `🌐 {0} (mode lecture – enregistre par téléchargement)`, `🌐 {0} (Lesemodus – speichert per Download)`],
  [`Inga quizfiler hittades.`]: [`No quiz files found.`, `Aucun fichier de quiz trouvé.`, `Keine Quiz-Dateien gefunden.`],
  [`Klicka på "Öppna mapp…" och välj din quizzes-katalog.`]: [`Click "Open folder…" and choose your quizzes folder.`, `Cliquez sur « Ouvrir un dossier… » et choisissez votre dossier quizzes.`, `Klicke auf „Ordner öffnen…“ und wähle deinen quizzes-Ordner.`],
  [`Webbläsaren saknar mappåtkomst – använd Chrome eller Edge, eller lägg katalogen på en webbserver.`]: [`The browser has no folder access – use Chrome or Edge, or put the folder on a web server.`, `Le navigateur n'a pas d'accès aux dossiers – utilisez Chrome ou Edge, ou placez le dossier sur un serveur web.`, `Der Browser hat keinen Ordnerzugriff – verwende Chrome oder Edge oder lege den Ordner auf einen Webserver.`],
  [`{0} · {1} barn · {2} vuxen`]: [`{0} · {1} children · {2} adult`, `{0} · {1} enfants · {2} adultes`, `{0} · {1} Kinder · {2} Erwachsene`],
  [` · ny`]: [` · new`, ` · nouveau`, ` · neu`],
  [`Du har osparade ändringar. Fortsätta ändå?`]: [`You have unsaved changes. Continue anyway?`, `Vous avez des modifications non enregistrées. Continuer quand même ?`, `Du hast ungespeicherte Änderungen. Trotzdem fortfahren?`],
  [`Filen ser inte ut som en quiz`]: [`The file does not look like a quiz`, `Le fichier ne ressemble pas à un quiz`, `Die Datei sieht nicht wie ein Quiz aus`],
  [`Kunde inte öppna {0}: {1}`]: [`Could not open {0}: {1}`, `Impossible d'ouvrir {0} : {1}`, `{0} konnte nicht geöffnet werden: {1}`],
  [`Kunde inte läsa quizmappen: {0}`]: [`Could not read the quiz folder: {0}`, `Impossible de lire le dossier du quiz : {0}`, `Quiz-Ordner konnte nicht gelesen werden: {0}`],

  // Redigering av quiz
  [`Välj en quiz i listan eller skapa en ny.`]: [`Choose a quiz in the list or create a new one.`, `Choisissez un quiz dans la liste ou créez-en un nouveau.`, `Wähle ein Quiz in der Liste oder erstelle ein neues.`],
  [`🚀 Starta`]: [`🚀 Start`, `🚀 Démarrer`, `🚀 Starten`],
  [`🔗 Kopiera länk`]: [`🔗 Copy link`, `🔗 Copier le lien`, `🔗 Link kopieren`],
  [`Länk kopierad`]: [`Link copied`, `Lien copié`, `Link kopiert`],
  [`🗑 Ta bort`]: [`🗑 Delete`, `🗑 Supprimer`, `🗑 Löschen`],
  [`Titel`]: [`Title`, `Titre`, `Titel`],
  [`Beskrivning (visas i appens bibliotek)`]: [`Description (shown in the app library)`, `Description (affichée dans la bibliothèque de l'application)`, `Beschreibung (in der Bibliothek der App angezeigt)`],
  [`Fler inställningar`]: [`More settings`, `Plus de paramètres`, `Weitere Einstellungen`],
  [`(standard)`]: [`(default)`, `(par défaut)`, `(Standard)`],
  [`Strikt`]: [`Strict`, `Strict`, `Streng`],
  [`Normal`]: [`Normal`, `Normal`, `Normal`],
  [`Förlåtande`]: [`Lenient`, `Indulgent`, `Nachsichtig`],
  [`Tidsgräns (minuter, 0 = ingen)`]: [`Time limit (minutes, 0 = none)`, `Limite de temps (minutes, 0 = aucune)`, `Zeitlimit (Minuten, 0 = keins)`],
  [`Quiz-lösenord (facit)`]: [`Quiz password (answer key)`, `Mot de passe du quiz (corrigé)`, `Quiz-Passwort (Lösungen)`],
  [`Detta lösenord används i appen för att låsa upp facit och slutresultat. Om fältet lämnas tomt låses facit normalt upp automatiskt när alla deltagare har svarat. Det är inte samma lösenord som appens adminlösenord för att öppna Redigera/Inställningar.`]: [`This password is used in the app to unlock the answer key and final result. If the field is left empty, the answer key is normally unlocked automatically when all participants have answered. It is not the same as the app's admin password for opening Edit/Settings.`, `Ce mot de passe sert dans l'application à déverrouiller le corrigé et le résultat final. Si le champ est vide, le corrigé se déverrouille normalement automatiquement lorsque tous les participants ont répondu. Ce n'est pas le mot de passe administrateur de l'application pour ouvrir Modifier/Paramètres.`, `Dieses Passwort wird in der App verwendet, um Lösungen und Endergebnis freizuschalten. Bleibt das Feld leer, werden die Lösungen normalerweise automatisch freigeschaltet, sobald alle Teilnehmer geantwortet haben. Es ist nicht das Admin-Passwort der App zum Öffnen von Bearbeiten/Einstellungen.`],
  [`Logotyp (URL)`]: [`Logo (URL)`, `Logo (URL)`, `Logo (URL)`],
  [`Välj logga…`]: [`Choose logo…`, `Choisir un logo…`, `Logo wählen…`],
  [`Upplåsningsavstånd för platsfrågor (m)`]: [`Unlock distance for location questions (m)`, `Distance de déverrouillage des questions de lieu (m)`, `Freischaltabstand für Ortsfragen (m)`],
  [`Textmatchning`]: [`Text matching`, `Correspondance du texte`, `Textabgleich`],
  [`Frågorna måste besvaras i ordning`]: [`Questions must be answered in order`, `Les questions doivent être traitées dans l'ordre`, `Fragen müssen der Reihe nach beantwortet werden`],
  [`＋ Ny fråga`]: [`＋ New question`, `＋ Nouvelle question`, `＋ Neue Frage`],
  [`Avancerat – rå JSON`]: [`Advanced – raw JSON`, `Avancé – JSON brut`, `Erweitert – rohes JSON`],
  [`Använd JSON`]: [`Use JSON`, `Utiliser le JSON`, `JSON verwenden`],
  [`Saknar barnQuestions/vuxenQuestions`]: [`Missing barnQuestions/vuxenQuestions`, `barnQuestions/vuxenQuestions manquants`, `barnQuestions/vuxenQuestions fehlen`],
  [`JSON tillämpad`]: [`JSON applied`, `JSON appliqué`, `JSON angewendet`],
  [`Ogiltig JSON: {0}`]: [`Invalid JSON: {0}`, `JSON invalide : {0}`, `Ungültiges JSON: {0}`],

  // Språkväxlare och översättningsredigering
  [`Visa/redigera språk:`]: [`View/edit language:`, `Afficher/modifier la langue :`, `Sprache anzeigen/bearbeiten:`],
  [`Original`]: [`Original`, `Original`, `Original`],
  [`Redigerar {0}. Originaltext: {1} – typ, rätt svar och plats ändras i originalspråket.`]: [`Editing {0}. Original text: {1} – type, correct answer and location are changed in the original language.`, `Modification de {0}. Texte original : {1} – le type, la bonne réponse et le lieu se modifient dans la langue d'origine.`, `Bearbeite {0}. Originaltext: {1} – Typ, richtige Antwort und Ort werden in der Originalsprache geändert.`],
  [`(ingen)`]: [`(none)`, `(aucun)`, `(keiner)`],
  [`Svarsalternativ`]: [`Answer options`, `Options de réponse`, `Antwortoptionen`],
  [`Ledtrådar`]: [`Clues`, `Indices`, `Hinweise`],

  // Frågekort
  [`↳ Följdfråga: `]: [`↳ Follow-up question: `, `↳ Question de suivi : `, `↳ Folgefrage: `],
  [`(ingen text)`]: [`(no text)`, `(aucun texte)`, `(kein Text)`],
  [`Frågetyp`]: [`Question type`, `Type de question`, `Fragetyp`],
  [`Bild (URL eller filnamn)`]: [`Image (URL or file name)`, `Image (URL ou nom de fichier)`, `Bild (URL oder Dateiname)`],
  [`Frågetext`]: [`Question text`, `Texte de la question`, `Fragetext`],
  [`Rätt svar`]: [`Correct answer`, `Bonne réponse`, `Richtige Antwort`],
  [`Alternativa svar, kommaseparerade`]: [`Alternative answers, comma-separated`, `Réponses alternatives, séparées par des virgules`, `Alternative Antworten, durch Komma getrennt`],
  [`Godkända alternativ`]: [`Accepted alternatives`, `Alternatives acceptées`, `Akzeptierte Alternativen`],
  [`Maxpoäng`]: [`Max points`, `Points maximum`, `Höchstpunktzahl`],
  [`t.ex. [56,2432187, 12,8614824] eller OpenStreetMap-länk`]: [`e.g. [56.2432187, 12.8614824] or OpenStreetMap link`, `p. ex. [56,2432187, 12,8614824] ou lien OpenStreetMap`, `z. B. [56,2432187, 12,8614824] oder OpenStreetMap-Link`],
  [`Klistra in koordinater eller OpenStreetMap-länk`]: [`Paste coordinates or OpenStreetMap link`, `Collez des coordonnées ou un lien OpenStreetMap`, `Koordinaten oder OpenStreetMap-Link einfügen`],
  [`Ogiltigt koordinatformat eller koordinater utanför tillåtna gränser`]: [`Invalid coordinate format or coordinates outside the allowed range`, `Format de coordonnées invalide ou coordonnées hors limites`, `Ungültiges Koordinatenformat oder Koordinaten außerhalb des erlaubten Bereichs`],
  [`Koordinater tillagda`]: [`Coordinates added`, `Coordonnées ajoutées`, `Koordinaten hinzugefügt`],
  [`Använd`]: [`Use`, `Utiliser`, `Verwenden`],
  [`Ingen följdfråga`]: [`No follow-up question`, `Aucune question de suivi`, `Keine Folgefrage`],
  [`Plats (valfritt)`]: [`Location (optional)`, `Lieu (facultatif)`, `Ort (optional)`],
  [`Klistra in koordinater`]: [`Paste coordinates`, `Coller des coordonnées`, `Koordinaten einfügen`],
  [`Latitud`]: [`Latitude`, `Latitude`, `Breitengrad`],
  [`Longitud`]: [`Longitude`, `Longitude`, `Längengrad`],
  [`Platsnamn`]: [`Place name`, `Nom du lieu`, `Ortsname`],
  [`Följdfråga`]: [`Follow-up question`, `Question de suivi`, `Folgefrage`],
  [`Välj en fråga som ska visas efter den här frågan och när den ska visas.`]: [`Choose a question to show after this question and when it should be shown.`, `Choisissez une question à afficher après celle-ci et quand l'afficher.`, `Wähle eine Frage, die nach dieser Frage angezeigt wird, und wann sie angezeigt werden soll.`],
  [`Fråga`]: [`Question`, `Question`, `Frage`],
  [`Villkor`]: [`Condition`, `Condition`, `Bedingung`],
  [`Alltid`]: [`Always`, `Toujours`, `Immer`],
  [`Endast vid rätt svar`]: [`Only on correct answer`, `Seulement si la réponse est correcte`, `Nur bei richtiger Antwort`],
  [`Endast vid fel svar`]: [`Only on wrong answer`, `Seulement si la réponse est fausse`, `Nur bei falscher Antwort`],
  [`Har översättningar ({0}) som inte uppdateras när du ändrar texten. `]: [`Has translations ({0}) that are not updated when you change the text. `, `Contient des traductions ({0}) qui ne sont pas mises à jour lorsque vous modifiez le texte. `, `Hat Übersetzungen ({0}), die beim Ändern des Textes nicht aktualisiert werden. `],
  [`Ta bort översättningar`]: [`Remove translations`, `Supprimer les traductions`, `Übersetzungen entfernen`],
  [`Duplicera`]: [`Duplicate`, `Dupliquer`, `Duplizieren`],
  [`Ta bort`]: [`Delete`, `Supprimer`, `Löschen`],
  [`Ta bort frågan?`]: [`Delete the question?`, `Supprimer la question ?`, `Frage löschen?`],
  [`Bocka i rätt svar (flera går bra).`]: [`Tick the correct answer (several are fine).`, `Cochez la bonne réponse (plusieurs possibles).`, `Richtige Antwort ankreuzen (mehrere möglich).`],
  [`Svarsalternativ {0}`]: [`Answer option {0}`, `Option de réponse {0}`, `Antwortoption {0}`],
  [`＋ Svarsalternativ`]: [`＋ Answer option`, `＋ Option de réponse`, `＋ Antwortoption`],
  [`Ledtrådar från svårast till lättast, med poäng per steg.`]: [`Clues from hardest to easiest, with points per step.`, `Indices du plus difficile au plus facile, avec des points par étape.`, `Hinweise vom schwersten zum leichtesten, mit Punkten pro Stufe.`],
  [`＋ Ledtråd`]: [`＋ Clue`, `＋ Indice`, `＋ Hinweis`],
  [`📍 Visa position i OpenStreetMap`]: [`📍 Show position in OpenStreetMap`, `📍 Afficher la position dans OpenStreetMap`, `📍 Position in OpenStreetMap anzeigen`],
  [`Öppnas i OpenStreetMaps egen kartvy.`]: [`Opens in OpenStreetMap's own map view.`, `S'ouvre dans la vue cartographique d'OpenStreetMap.`, `Öffnet sich in der eigenen Kartenansicht von OpenStreetMap.`],
  [`Fyll i giltig latitud och longitud för att visa positionen på kartan.`]: [`Enter a valid latitude and longitude to show the position on the map.`, `Saisissez une latitude et une longitude valides pour afficher la position sur la carte.`, `Gib gültigen Breiten- und Längengrad ein, um die Position auf der Karte anzuzeigen.`],

  // Spara och hantera
  [`Titel saknas`]: [`Title is missing`, `Le titre est manquant`, `Titel fehlt`],
  [`Sparat i mappen (inkl. manifest.json)`]: [`Saved to the folder (incl. manifest.json)`, `Enregistré dans le dossier (y compris manifest.json)`, `Im Ordner gespeichert (inkl. manifest.json)`],
  [`Filer nedladdade – ladda upp dem till din sajt`]: [`Files downloaded – upload them to your site`, `Fichiers téléchargés – envoyez-les sur votre site`, `Dateien heruntergeladen – lade sie auf deine Website hoch`],
  [`Kunde inte spara: {0}`]: [`Could not save: {0}`, `Impossible d'enregistrer : {0}`, `Speichern nicht möglich: {0}`],
  [`Titel på nya quizet:`]: [`Title of the new quiz:`, `Titre du nouveau quiz :`, `Titel des neuen Quiz:`],
  [`Ta bort {0} från mappen?`]: [`Delete {0} from the folder?`, `Supprimer {0} du dossier ?`, `{0} aus dem Ordner löschen?`],
  [`Kunde inte ta bort: {0}`]: [`Could not delete: {0}`, `Impossible de supprimer : {0}`, `Löschen nicht möglich: {0}`],
  [`Borttagen`]: [`Deleted`, `Supprimé`, `Gelöscht`],
  [`Öppna quizmappen med "Öppna mapp…" för att kunna ta bort quiz`]: [`Open the quiz folder with "Open folder…" to be able to delete quizzes`, `Ouvrez le dossier du quiz avec « Ouvrir un dossier… » pour pouvoir supprimer des quiz`, `Öffne den Quiz-Ordner mit „Ordner öffnen…“, um Quiz löschen zu können`],
  [`manifest.json uppdaterad ({0} quiz)`]: [`manifest.json updated ({0} quizzes)`, `manifest.json mis à jour ({0} quiz)`, `manifest.json aktualisiert ({0} Quiz)`],
  [`Kunde inte skriva manifest.json: {0}`]: [`Could not write manifest.json: {0}`, `Impossible d'écrire manifest.json : {0}`, `manifest.json konnte nicht geschrieben werden: {0}`],
  [`Webbläsaren saknar mappåtkomst – använd Chrome eller Edge`]: [`The browser has no folder access – use Chrome or Edge`, `Le navigateur n'a pas d'accès aux dossiers – utilisez Chrome ou Edge`, `Der Browser hat keinen Ordnerzugriff – verwende Chrome oder Edge`],
  [`Kunde inte läsa sparad mapp: {0}`]: [`Could not read the saved folder: {0}`, `Impossible de lire le dossier enregistré : {0}`, `Gespeicherter Ordner konnte nicht gelesen werden: {0}`],
  [`Kunde inte öppna mapp: {0}`]: [`Could not open folder: {0}`, `Impossible d'ouvrir le dossier : {0}`, `Ordner konnte nicht geöffnet werden: {0}`],
  [`Mappen öppnades men kunde inte kommas ihåg: {0}`]: [`The folder was opened but could not be remembered: {0}`, `Le dossier a été ouvert mais n'a pas pu être mémorisé : {0}`, `Der Ordner wurde geöffnet, konnte aber nicht gemerkt werden: {0}`]
};

(function () {
  var codes = window.LANGUAGES.map(function (l) { return l.code; });
  function initial() {
    var saved = null;
    try { saved = localStorage.getItem(window.LANG_KEY); } catch (e) {}
    if (saved && codes.indexOf(saved) > -1) return saved;
    var nav = (navigator.language || '').slice(0, 2).toLowerCase();
    return codes.indexOf(nav) > -1 ? nav : window.DEFAULT_LANG;
  }
  window.UI_LANG = initial();
  window.setUiLang = function (lang) {
    if (codes.indexOf(lang) < 0) return;
    window.UI_LANG = lang;
    try { localStorage.setItem(window.LANG_KEY, lang); } catch (e) {}
  };
  // Slår upp den svenska texten och ersätter {0}, {1} … med argumenten.
  window.tr = function (sv) {
    var args = Array.prototype.slice.call(arguments, 1);
    var idx = window.UI_LANG === 'sv' ? -1 : codes.indexOf(window.UI_LANG) - 1;
    var entry = window.I18N[sv];
    var text = (entry && idx >= 0 && entry[idx]) || sv;
    return text.replace(/\{(\d+)\}/g, function (m, n) { return args[n] !== undefined ? args[n] : m; });
  };
})();

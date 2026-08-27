const fs = require('fs');
const esbuild = require('esbuild');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove the misplaced block from inside useEffect
const badBlock = `  // Additional UI states for Settings and Import Modals
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [dbFilterCategory, setDbFilterCategory] = useState('all');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [libraryFilterLanguage, setLibraryFilterLanguage] = useState('all');
  const [librarySortBy, setLibrarySortBy] = useState<'name-asc' | 'date-desc' | 'count-desc'>('name-asc');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [directLinkLockOrderMode, setDirectLinkLockOrderMode] = useState<boolean>(false);

  const isAiGeotagging = useMemo(() => Object.values(isAiGeotaggingSingle).some(Boolean), [isAiGeotaggingSingle]);

  const handleSaveCustomApiKey = () => {
    try {
      localStorage.setItem('gemini_api_key', userApiKeyInput.trim());
      alert(t(lang, 'apiKeySavedSuccess') || 'API-nyckel sparad!');
      setShowApiKeyInput(false);
    } catch {
      // ignore
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, 600, 600, 0.85);
      const cached = await cacheLogoAsDataUrl(dataUrl);
      setQuizConfig(prev => ({ ...prev, logoUrl: cached }));
    } catch (err) {
      console.error('Failed to upload logo:', err);
    }
  };

  const handleRemoveLogo = () => {
    setQuizConfig(prev => ({ ...prev, logoUrl: undefined }));
  };

  const handleImportPastedJson = async (jsonString: string) => {
    if (!jsonString.trim()) return;
    processImportConfig(jsonString.trim());
  };`;

appCode = appCode.replace(badBlock, '');

// Restore the original useEffect correctly if needed or verify
const correctTarget = `  const selectedLanguage = SUPPORTED_LANGUAGES.find((l) => l.code === lang) ?? SUPPORTED_LANGUAGES[0];`;

const correctStatesAndHandlers = `  const selectedLanguage = SUPPORTED_LANGUAGES.find((l) => l.code === lang) ?? SUPPORTED_LANGUAGES[0];

  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [dbFilterCategory, setDbFilterCategory] = useState('all');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [libraryFilterLanguage, setLibraryFilterLanguage] = useState('all');
  const [librarySortBy, setLibrarySortBy] = useState<'name-asc' | 'date-desc' | 'count-desc'>('name-asc');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [directLinkLockOrderMode, setDirectLinkLockOrderMode] = useState<boolean>(false);

  const isAiGeotagging = useMemo(() => Object.values(isAiGeotaggingSingle).some(Boolean), [isAiGeotaggingSingle]);

  const handleSaveCustomApiKey = () => {
    try {
      localStorage.setItem('gemini_api_key', userApiKeyInput.trim());
      alert(t(lang, 'apiKeySavedSuccess') || 'API-nyckel sparad!');
      setShowApiKeyInput(false);
    } catch {
      // ignore
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, 600, 600, 0.85);
      const cached = await cacheLogoAsDataUrl(dataUrl);
      setQuizConfig(prev => ({ ...prev, logoUrl: cached }));
    } catch (err) {
      console.error('Failed to upload logo:', err);
    }
  };

  const handleRemoveLogo = () => {
    setQuizConfig(prev => ({ ...prev, logoUrl: undefined }));
  };

  const handleImportPastedJson = async (jsonString: string) => {
    if (!jsonString.trim()) return;
    processImportConfig(jsonString.trim());
  };`;

if (appCode.includes(correctTarget)) {
  appCode = appCode.replace(correctTarget, correctStatesAndHandlers);
}

fs.writeFileSync('src/App.tsx', appCode, 'utf8');
esbuild.transformSync(appCode, { loader: 'tsx' });
console.log('App.tsx states fixed successfully');

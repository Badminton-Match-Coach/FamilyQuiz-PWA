<?php
/**
 * files.php – Automatisk fillistning för quizkatalogen.
 *
 * Returnerar alla .json-filer i samma mapp (utom manifest.json) som en
 * JSON-array, så att index.html kan lista quizfilerna utan att manifest.json
 * behöver uppdateras manuellt.
 *
 * Kräver att servern kör PHP (t.ex. One.com, Loopia och de flesta webbhotell).
 * På ren statisk hosting (GitHub Pages, Netlify m.fl.) serveras filen bara som
 * text – index.html upptäcker det och faller tillbaka på manifest.json.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Cache-Control: no-store');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$files = array();
foreach (scandir(__DIR__) as $entry) {
    if ($entry === 'manifest.json') {
        continue;
    }
    if (strtolower(pathinfo($entry, PATHINFO_EXTENSION)) === 'json') {
        $files[] = $entry;
    }
}
sort($files);

echo json_encode($files, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

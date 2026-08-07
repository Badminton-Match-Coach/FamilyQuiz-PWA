<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/47c18d2e-c7a5-401a-8789-603b7f26a275

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Build For GitHub Pages

1. Install dependencies:
   `npm install`
2. Build production files:
   `npm run build`
3. Publish the content of `dist/` to your GitHub Pages target (for example the `gh-pages` branch).

This project is configured with relative asset paths (`base: './'`) so it works both on GitHub Pages and local preview.

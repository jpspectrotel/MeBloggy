# meBloggy (Angular)

A clean, mobile-first photo sharing & organizing app built with Angular and Angular Material. This project provides a local-first UI with IndexedDB-based image storage and JSON-driven data.

## Features Implemented
- Header with left `meBloggy` home text and top-right `upload` and `account` icons.
- Main showcase image occupying full width with a top-left title.
- Clickable main image opens a Material Dialog for basic editing preview.
- Multiple horizontal scrollable showcase sections (cards) with clickable images.
- Clicking a small image replaces the main showcase image and scrolls to top if needed.
- Clicking a showcase title navigates to a showcase page with animated route transitions and grid layout (6 per row).
- Images and sample data are loaded from JSON files in `assets`.
- Images are stored locally in IndexedDB for offline usage.

## Quick Start
1) Install dependencies:

```powershell
cd "c:\Users\jp\Documents\MeBloggy"
npm install
```

2) Serve the app:

```powershell
npm start
```

3) Open your browser to: http://localhost:4200

## Notes
- This initial build focuses on UI and local data storage; API sync is on roadmap.
- A small sample `default.jpg` exists in the project root for testing; duplicate usage in JSON to expand sections.
  
## Notes about IndexedDB and JSON
- When the app boots it will load the `src/assets/data/*.json` files and attempt to fetch files in `src/assets/` for images. The images are cached to IndexedDB for offline usage.
- To test more images, duplicate `default.jpg` under `src/assets` and add entries to `images.json` and `showcases.json` under `src/assets/data/`.
  
## Uploading Images
- Click the upload icon on the header to pick a file. The file will be stored in IndexedDB and appended to the first showcase for testing.

## Replacing default.jpg
- Replace `src/assets/default.jpg` with your real image file; if you want to use multiple sample images, add them under `src/assets` and update `src/assets/data/images.json`.

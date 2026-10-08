# Deployment Guide

SplitLocal is a 100% offline-first PWA (Progressive Web App). It requires NO backend, NO database, and NO server-side processing.

## 1. Build
Run the following command to generate the static files:
```bash
npm run build
```
This produces a `dist/` directory containing all necessary HTML, CSS, JS, and Service Worker assets.

## 2. Hosting
You can host the `dist/` folder on **any static HTTPS host**. Popular free options include:
- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages
- AWS S3 / CloudFront

### HTTP Rules (Required)
Your static host must enforce HTTPS. Service Workers (which power the offline capabilities and PWA installation) **only operate in secure contexts (HTTPS).**

## 3. WARNING: Domain Changes and IndexedDB
All user data is stored locally in the browser's IndexedDB, which is tightly bound to the domain (Origin). 

**CRITICAL WARNING:** 
If you deploy to `https://splitlocal.app` and later migrate to `https://new-splitlocal.app`, **ALL USERS WILL LOSE ACCESS TO THEIR DATA on the new origin.** The data is not deleted, but it is bound to the old origin and inaccessible from the new one. 

**The Fix:** Users must manually "Export" their backup file from the old domain *before* migrating, and "Import" it into the new domain.

**Deployment Best Practices:**
1. Serve over HTTPS only (Service Workers require it).
2. Keep one stable URL.
3. To test offline mode, users must load the app once online before testing offline.

## 4. Service Worker Updates
When you push a new build, users with the app already installed will see a "New update available" prompt inside the app. Clicking "Reload" clears the old cache and activates the new Service Worker.

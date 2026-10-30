# ASM Hardware POS

Sales and inventory system for ASM Hardware (React + Vite, Firebase, InventaAPI product catalog).

## Run it on your computer

1. Install once:
   ```bash
   npm install
   ```
2. Make your settings file (once): create a file named `.env` in this same folder
   (next to `package.json`) and put these lines in it. Fill in the values after the `=`.
   ```
   # InventaAPI: inventaapi.shop → API Keys → Copy. Leave a line empty if you don't use that segment.
   INVENTA_API_KEY_HARDWARE=
   INVENTA_API_KEY_GROCERY=
   INVENTA_API_KEY_PHARMACY=
   INVENTA_API_URL=https://inventaapi.shop

   # Firebase: Firebase console → Project settings → Your apps → Web app config
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=

   # Chatbot
   VITE_NVIDIA_API_KEY=
   ```
3. Start it:
   ```bash
   npm run dev
   ```
   Open http://localhost:5173. The terminal shows which InventaAPI keys it found, for example
   `[InventaAPI] Keys found for: Hardware, Grocery, Pharmacy`.

That's the only command. There is no separate server to start.

## Where settings go

There is **one** settings file: `.env` in the project root (next to `package.json`).
The list of settings is in step 2 above.

| What | Setting names | Where to get it |
|---|---|---|
| InventaAPI keys | `INVENTA_API_KEY_HARDWARE`, `INVENTA_API_KEY_GROCERY`, `INVENTA_API_KEY_PHARMACY` | inventaapi.shop → API Keys → Copy |
| Firebase | `VITE_FIREBASE_*` | Firebase console → Project settings → Web app |
| Chatbot | `VITE_NVIDIA_API_KEY` | NVIDIA API dashboard |

- **Changing an InventaAPI key:** paste the new key into `.env`, then stop `npm run dev` (Ctrl+C) and start it again.
- `.env` is never uploaded to GitHub (it's in `.gitignore`).
- **Live site (Vercel)** doesn't read `.env`. Set the same names in Vercel → Project → Settings → Environment Variables, then redeploy.
- InventaAPI keys stay on the server and are never sent to the browser. Anything starting with `VITE_` is built into the website and can be seen by visitors.

## How the InventaAPI catalog is loaded

The browser calls `/api/inventa/products`. That route calls InventaAPI once per segment key and combines the results.
The same code (`api/_lib/inventaCatalog.js`) runs locally inside `npm run dev` and on Vercel as `api/inventa/products.js`.

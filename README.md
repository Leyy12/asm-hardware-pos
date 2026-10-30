# ASM Hardware POS

Sales and inventory system for ASM Hardware (React + Vite, Firebase, InventaAPI product catalog).

## Run it on your computer

1. Install once:
   ```bash
   npm install
   ```
2. Make your settings file (once): copy `.env.example` to `.env` in this same folder, then fill it in.
   ```bash
   cp .env.example .env
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
`.env.example` lists every setting with a note on where to get it.

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

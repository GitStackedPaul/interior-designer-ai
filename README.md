# Interior Designer AI

![interior-design-image](public/app-screenshot.png)

AI-powered interior design tool. Upload a room photo, place furniture items, and generate a photorealistic redesign using OpenAI `gpt-image-1`.

## Features

- AI redesign via OpenAI `gpt-image-1`
- Multiple design styles and room types
- Drag-and-drop furniture placement with per-item placement notes
- Up to 10 furniture items per generation
- PWA installable — works as a desktop app on Windows, Mac, and mobile

## Local Development

### 1. Install Bun

```bash
# Windows
powershell -c "irm bun.sh/install.ps1 | iex"

# macOS/Linux
curl -fsSL https://bun.sh/install | bash
```

### 2. Install dependencies

```bash
bun install
```

### 3. Set up environment

```bash
cp .env.example .env.local
# Edit .env.local — add your OpenAI API key
# Get a key at https://platform.openai.com/api-keys
```

### 4. Run

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. In Vercel dashboard → **Settings → Environment Variables**, add:
   - `OPENAI_API_KEY` = your OpenAI API key (Production + Preview)
4. Deploy

The API key stays server-side — it is never exposed to the browser.

## Install as a Desktop App (PWA)

Once deployed, open the URL in **Chrome or Edge**:

1. Look for the **Install** icon in the address bar (or the ⊕ icon in the toolbar)
2. Click **Install**
3. A desktop shortcut is created — the app opens in its own window with no browser chrome

## Tech Stack

- **Next.js 16** · **React 19** · **TypeScript**
- **Tailwind CSS 4** · **shadcn/ui**
- **OpenAI SDK** — `gpt-image-1` image editing
- **Bun** — runtime and package manager
- **Vercel** — hosting

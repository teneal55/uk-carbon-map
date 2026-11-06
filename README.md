# uk-carbon-map

An interactive map of the UK's electricity regions, showing when and where grid power is cleanest, and eventually cheapest.

> **Status:** early work in progress. The Next.js app and base map are set up; data layers are coming next.

## So far

- A Next.js (App Router) and TypeScript app
- A full-screen, interactive Mapbox map centred on Great Britain

## Tech stack

- [Next.js](https://nextjs.org) (App Router)
- TypeScript
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) via [react-map-gl](https://visgl.github.io/react-map-gl/)

## Getting started

### Prerequisites

- Node.js 20 or later
- A free [Mapbox](https://www.mapbox.com) account and a public access token (starts with `pk.`)

### Run locally

```bash
git clone https://github.com/<your-username>/octopus-carbon-map.git
cd octopus-carbon-map
npm install
cp .env.example .env.local
```

Add your Mapbox token to `.env.local`:

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
```

Then start the dev server:

```bash
npm run dev
```
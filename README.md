# uk-carbon-map

[![CI](https://github.com/teneal55/uk-carbon-map/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/<your-username>/uk-carbon-map/actions/workflows/ci.yml)

An interactive map of the UK's electricity regions, showing when and where grid power is cleanest, and eventually cheapest.

Northern Ireland is shown on the map but has no data, as it's on a separate grid from Great Britain.

> **Status:** early work in progress. The Next.js app and base map are set up; data layers are coming next.

## So far

- A Next.js (App Router) and TypeScript app
- A full-screen, interactive Mapbox map centred on the UK
- Electricity region outlines in `public/regions.geojson`, generated from NESO boundary data by a Python script. See `scripts/prepare_boundaries.py` for how to create the data yourself.
- A year of daily average carbon intensity for each region in `data/daily-intensity.json`, from the [Carbon Intensity API](https://carbonintensity.org.uk), played on a timeline over the map
- A chart of the 7-day rolling average across the regions, with the range from the cleanest to the dirtiest region and each season's average. It draws in as the year plays, and the end of its line is the timeline's slider

## Tech stack

- [Next.js](https://nextjs.org) (App Router)
- TypeScript
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) via [react-map-gl](https://visgl.github.io/react-map-gl/)
- Python for collecting and preparing the data, in `scripts/`

## Getting started

### Prerequisites

- Node.js 20 or later
- A free [Mapbox](https://www.mapbox.com) account and a public access token (starts with `pk.`)

### Run locally

```bash
git clone https://github.com/teneal55/uk-carbon-map
cd uk-carbon-map
npm install
cp .env.example .env.local
```

Add your Mapbox token and Mapbox style url to `.env.local`:

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
NEXT_PUBLIC_MAPBOX_TOKEN=mapbox://style_url_here
```

#### Generate data from python scripts

The data files the app uses are already in the repo, so this is only needed to regenerate them. The scripts need Python 3.10 or later.

Create a virtual environment once, from the repo root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install geopandas
```

Then, with the virtual environment active:

```bash
# Region boundaries -> public/regions.geojson
# First download the 20240503 GeoJSON from
# https://www.neso.energy/data-portal/gis-boundaries-gb-dno-license-areas
# and save it as data/raw/gb-dno-license-areas-20240503.geojson
python scripts/prepare_boundaries.py

# A year of daily average carbon intensity, up to yesterday -> data/daily-intensity.json
python scripts/prepare_daily_intensity.py
```

The daily script downloads from the Carbon Intensity API and takes a few minutes.

Then start the dev server:

```bash
npm run dev
```

## Testing and CI

Unit and component tests use [Vitest](https://vitest.dev) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).

```bash
npm test             # run all tests once
npm run test:watch   # re-run tests on save
npm run lint         # ESLint
npm run typecheck    # generate Next.js route types, then type check
```

Every pull request and every push to `main` runs these checks in [GitHub Actions](.github/workflows/ci.yml): lint, type check, then tests. `main` is protected, so a PR can only be merged once CI passes.

## Deployment

The app is deployed on [Vercel](https://vercel.com). The same enviroment variable values are added in vercel as in the local version.

**Live site:** https://uk-carbon-map.vercel.app/

- **Production:** every merge to `main` deploys automatically to the live site.
- **Previews:** every pushed branch and pull request gets its own preview URL, so changes can be checked on a real deployment before merging.
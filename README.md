# Byte Sized Daily Brief

A finite, installable daily reading brief for engineers and engineering managers. The app links to original publishers and does not scrape or reproduce article bodies.

## Local development

```powershell
npm install
npm run generate
npm run dev
```

The generator fetches approved RSS/API sources, normalizes and deduplicates entries, applies deterministic freshness and diversity ranking, and writes `public\data\latest.json`. A curated fallback ensures the application remains usable when an upstream feed is unavailable.

## Production

```powershell
npm test
npm run build
```

The GitHub Actions workflow at `.github\workflows\byte-sized-daily.yml` refreshes the edition daily and deploys the static PWA to GitHub Pages.

## Content policy

- Fetch public RSS, Atom or documented APIs only.
- Display metadata, brief publisher-provided descriptions where permitted, and outbound links.
- Never fetch or store full article bodies.
- Review each source's syndication terms before adding it to the production catalogue.

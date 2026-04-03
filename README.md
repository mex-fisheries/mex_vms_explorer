# MEX VMS Explorer

Interactive map for exploring fishing vessel movements in Mexican waters using Vessel Monitoring System (VMS) data.

## Features

- Daily vessel positions on an interactive MapLibre GL map
- Animated playback across days and months
- Filter by fleet type, target species, gear type, and coastal state
- Color vessels by speed, gear, species, or fleet
- Click any vessel to view its monthly track and speed chart
- Optional port location overlay

## Data

Pre-processed JSON files derived from Mexican VMS records (2023). The R scripts in `scripts/` transform raw VMS CSVs into the compact columnar format used by the app.

## Usage

Serve the repo root with any static file server:

```sh
# Python
python3 -m http.server

# Node
npx serve .
```

Then open `http://localhost:8000` (or whichever port) in your browser.

## Deployment

Pushes to `main` auto-deploy to GitHub Pages via the included Actions workflow.

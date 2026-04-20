# Snapshot-based runtime catalog loading

This app will stop bundling master-derived JSON into the frontend and instead boot from a checked-in **Snapshot source** under `public/data/{snapshot}/`, with `global` and `jp` as supported **Game Data Snapshots**. The selected snapshot is canonicalized from the URL query parameter (`?snapshot=...`) because the app uses `HashRouter`, the app performs a blocking **Snapshot bootstrap** before mounting React, and all catalog-backed persisted state is namespaced per snapshot so switching snapshots triggers a full reload without leaking JP data into Global or vice versa.

## Considered Options

- Keep bundling one dataset into `src/modules/data/*.json` and add ad hoc JP-only lookups.
- Hot-swap catalogs inside a mounted app without a full reload.
- Load snapshot files progressively per feature.

We rejected these because they would either mix Global and JP state, require pervasive async guards across the app, or make the runtime architecture harder to reason about than a single blocking bootstrap with snapshot-scoped persistence.

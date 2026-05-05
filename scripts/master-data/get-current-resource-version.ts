#!/usr/bin/env node

import { fetchCurrentResourceVersion } from './uma-api';

async function main(): Promise<void> {
  const version = await fetchCurrentResourceVersion();
  process.stdout.write(version);
}

if (import.meta.main) {
  main().catch((err: Error) => {
    console.error(err.message);
    process.exit(1);
  });
}

#!/usr/bin/env bash
# Build the uma-sim-wasm module and emit the wasm-pack `--target web` bundle into
# the app at src/lib/uma-sim-wasm/pkg.
#
# IMPORTANT: the default `cargo` on some machines is a standalone (non-rustup)
# install that lacks the wasm32 std. We force the rustup `stable` toolchain (which
# has wasm32-unknown-unknown installed) onto PATH so `wasm-pack`/`cargo` resolve
# to it.
#
# Prereqs:
#   rustup target add wasm32-unknown-unknown
#   cargo install wasm-pack      # or: cargo binstall wasm-pack
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"

# Prefer the rustup stable toolchain (has wasm32 std).
if command -v rustup >/dev/null 2>&1; then
  sysroot="$(rustup run stable rustc --print sysroot)"
  # On Windows/git-bash the sysroot is a backslash path that bash PATH cannot
  # use; convert it to a unix-style path so the prepend actually wins.
  if command -v cygpath >/dev/null 2>&1; then
    sysroot="$(cygpath -u "$sysroot")"
  fi
  export PATH="$sysroot/bin:$PATH"
fi

if ! command -v wasm-pack >/dev/null 2>&1; then
  echo "error: wasm-pack not found. Install it with:  cargo install wasm-pack" >&2
  exit 1
fi

out_dir="$repo_root/src/lib/uma-sim-wasm/pkg"
echo "Building uma-sim-wasm -> $out_dir"
wasm-pack build "$repo_root/packages/uma-sim-wasm" \
  --target web \
  --out-dir "$out_dir" \
  --out-name uma_sim_wasm

echo "Done. Import from src/lib/uma-sim-wasm/loader.ts"

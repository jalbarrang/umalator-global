//! # uma-sim-wasm
//!
//! WebAssembly adapter for [`uma_sim_core`]. Acts as an **anti-corruption
//! layer**: [`dto`] translates between JS-facing serde shapes and the domain
//! value objects, and [`observer`] bridges the domain's `RaceObserver` port to
//! JS callbacks.
//!
//! Build with: `wasm-pack build packages/uma-sim-wasm --target web`.

pub mod dto;
pub mod observer;

// Public wasm-bindgen exports populated by t-019.

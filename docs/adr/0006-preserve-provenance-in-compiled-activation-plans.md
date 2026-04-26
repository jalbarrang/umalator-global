# Preserve provenance in compiled activation plans

Compiled/debug activation plans preserve provenance linking opportunities, predicates, trigger windows, branch priority, and diagnostics back to source skill alternatives and condition fragments; optimized runtime plans may strip this metadata. We chose this because this project relies on reverse-engineered mechanics and future developers need to answer “why did or did not this skill activate?” without reconstructing the pipeline from raw JSON, while still allowing the runtime representation to stay lean.

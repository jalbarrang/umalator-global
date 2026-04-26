# Build the new skill activation runtime alongside the legacy engine

We build the new activation parser, compiler, and runtime under a new `src/lib/sunday-tools/skill-activation/` bounded context while keeping the current engine active during the refactor. We chose this because the existing skill pipeline is already the behavior baseline for the app, and parallel development plus comparison tests lets us validate the new mechanic-faithful model against current parsing behavior before any migration switch-over.

# Generate Architecture Decision Record (ADR)

Create a structured ADR to document an architectural decision and its rationale.

## Steps

1. **Gather context**
   - Ask for title/topic, target folder, problem context
   - Clarify constraints, requirements, and alternatives considered
   - Identify the author (optional)
2. **Determine ADR number**
   - Check target folder for existing ADRs (e.g., `001-*.md`, `002-*.md`)
   - Use next sequential number
3. **Write the ADR**
   - Follow standard sections: Context, Goals/Non-Goals, Decision, Consequences, Alternatives
   - Use prose, Mermaid diagrams, and tables (not implementation code)
   - Include trade-offs and open questions
   - Reference existing ADRs in `docs/adr/` for structure examples

## ADR Writing Guidelines

- **Present tense** for decisions, past tense for context
- **Mermaid diagrams** for architecture visualization
- **Tables** for comparisons and reference data
- **Pseudocode** for interfaces only (under 20 lines)
- **Trade-offs** matter more than perfection

## ADR Checklist

- [ ] Clarifying questions answered
- [ ] Sequential number determined
- [ ] Context and decision clearly explained
- [ ] Consequences (positive and negative) documented
- [ ] Alternatives considered and rejected with reasons
- [ ] Open questions captured for future work

# Break Down Feature

Decompose a large feature into manageable user stories and tasks.

## Steps

1. **Define the feature**
   - Clarify scope and user value
   - Identify acceptance criteria
   - List affected components/files
2. **Create user story**
   - Write as: "As a [user], I want [goal] so that [benefit]"
   - Add description with context and acceptance criteria
   - Set appropriate priority (critical/high/medium/low)
3. **Break into tasks**
   - Identify technical implementation steps
   - Keep tasks small (1-2 day efforts)
   - Name tasks clearly and actionably
4. **Add dependencies**
   - Link tasks that must happen in sequence
   - Use `blocks` for hard dependencies, `related-to` for context

## Task Structure Template

**User Story**:
- Type: `user_story`
- Title: End-user focused outcome
- Description: Context + acceptance criteria checklist

**Implementation Tasks**:
- Type: `task`
- Title: Specific technical work (e.g., "Add API endpoint", "Create UI component")
- Description: Technical guidance, related files, scope boundaries

## Feature Breakdown Checklist

- [ ] Feature scope and goals clarified
- [ ] User story created with acceptance criteria
- [ ] Tasks broken down into 1-2 day chunks
- [ ] Dependencies linked in correct sequence
- [ ] Priorities assigned based on impact
- [ ] Out-of-scope items documented


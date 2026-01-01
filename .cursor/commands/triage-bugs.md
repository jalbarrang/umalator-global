# Triage Bugs

Categorize and prioritize bug reports to ensure the right issues get fixed first.

## Steps

1. **Gather information**
   - Reproduction steps (how to trigger the bug)
   - Expected vs. actual behavior
   - Impact (who is affected, how often)
   - Environment details if relevant
2. **Create bug task**
   - Type: `bug`
   - Title: Clear, specific description of the issue
   - Description: Reproduction steps, expected/actual behavior, context
3. **Assign priority**
   - **Critical**: Production down, data loss, security issue
   - **High**: Core feature broken, many users affected
   - **Medium**: Feature degraded, workaround exists
   - **Low**: Minor issue, edge case, cosmetic
4. **Link dependencies**
   - Mark as blocking other work if applicable
   - Link to related bugs or features

## Bug Description Template

```markdown
## Reproduction Steps

1. Step one
2. Step two
3. Observe issue

## Expected Behavior

What should happen.

## Actual Behavior

What actually happens.

## Impact

Who is affected and how often.
```

## Bug Triage Checklist

- [ ] Reproduction steps documented
- [ ] Expected vs. actual behavior clear
- [ ] Impact assessed (users affected, frequency)
- [ ] Priority assigned based on severity and impact
- [ ] Blocking relationships identified
- [ ] Related bugs or features linked


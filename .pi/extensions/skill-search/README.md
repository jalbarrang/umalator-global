# Skill Search Extension

Project-local pi extension for searching `src/modules/data/skills.json`.

## What it adds

- Tool: `search_skills`
- Command: `/skill-search`
- Command: `/skill-family`

## What it can search

- skill **name** (with fuzzy English matching)
- effect **type**
- **groupId**
- raw activation **condition** / precondition
- skill **family** (with fuzzy English matching)

## Examples

```text
/skill-search name:"Sharp Gaze"
/skill-search type:Recovery
/skill-search group:20144
/skill-search condition:order_rate>50
/skill-search family:"Risky Business"
/skill-family "Nothing Ventured"
```

## Notes

- The extension reads only local project data from `src/modules/data/skills.json`.
- Fuzzy matching is English-only; this project does not try to search JP names.
- Family lookup uses local skill relationships inferred from `groupId` and `versions` links.
- The `search_skills` tool is intended for agent use when answering user questions about local skills.

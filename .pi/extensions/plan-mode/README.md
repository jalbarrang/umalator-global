# Plan Mode Extension

Two-phase workflow: **plan** with a thinking model, then **execute** with a lighter one.

## How It Works

| Phase       | Model             | Thinking | Tools                                                                | Purpose                              |
| ----------- | ----------------- | -------- | -------------------------------------------------------------------- | ------------------------------------ |
| **Plan**    | `claude-opus-4-6` | `medium` | read, bash (read-only), grep, find, ls, questionnaire, search_skills | Analyze code, create a numbered plan |
| **Execute** | `gpt-5.5`         | `low`    | read, bash, edit, write, search_skills                               | Execute the plan step by step        |

## Commands

| Command      | Description                    |
| ------------ | ------------------------------ |
| `/plan`      | Toggle plan mode on/off        |
| `/todos`     | Show current plan progress     |
| `Ctrl+Alt+P` | Toggle plan mode (shortcut)    |
| `--plan`     | CLI flag to start in plan mode |

## Usage

1. Enter plan mode: `/plan` or `Ctrl+Alt+P`
2. Describe what you want to accomplish
3. The agent analyzes the codebase (read-only) and creates a numbered plan:

```
Plan:
1. Update the config parser to support YAML
2. Add validation for the new fields
3. Update tests for the parser changes
```

4. Choose **"Execute the plan"** when prompted
5. The agent switches to `low` thinking and executes each step
6. Steps are marked with `[DONE:n]` tags — progress shows in the widget
7. When all steps complete, tools and thinking level are restored

## Footer Indicators

- `📝 plan` — plan mode active (opus-4-6:medium, read-only)
- `📋 exec 2/5` — executing plan with gpt-5.5:low, 2 of 5 steps done

## Bash Safety

In plan mode, bash is restricted to read-only commands (ls, grep, git status, etc.).
Destructive commands (rm, mv, git commit, etc.) are blocked.

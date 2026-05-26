---
name: discord-announce
description: Post an announcement to the project's Discord channel. Use when the user says "post an announcement", "announce to discord", or "share update". Writes a user-facing changelog message based on the work done and posts it via the discord_announce tool.
---

# Discord Announce

Post a formatted announcement to the project's Discord `#updates` channel.

## When to use

- User says "post an announcement", "announce", "share on discord", or similar
- After shipping a feature, fix, or notable change

## Announcement formats

### Session update (default)

For announcing work done in the current session. Review what was built, then summarize for users.

### Release announcement

For announcing a tagged release. The user will specify which tags to diff (e.g. "v0.9.1 to v0.10.0"). Steps:

1. Run `git log --oneline --no-merges <from_tag>..<to_tag>` to gather commits
2. Read commit bodies for detail: `git log --no-merges <from_tag>..<to_tag> --format="%h %s%n%b---"`
3. Group changes into user-facing categories
4. Format using the release template below

## How to write the message

1. Review the source material (session work or git log)
2. Write a **user-facing** message — skip internal refactors, chores, and CI changes unless they affect users
3. Use Discord-compatible markdown:
   - `## Heading` for the title
   - `### Subheading` for categories
   - `**bold**` for emphasis
   - `- item` for bullet lists
   - Emoji for visual anchors: ✨ features, 🐛 fixes, ⚡ perf
4. Keep it concise — short paragraphs or heading + bullet list per category
5. Call the `discord_announce` tool with the message

### Style rules

- This is an **Uma Musume** simulator — do not use horse racing emoji (🏇, 🐴, etc.)
- Write for players/users, not developers
- Lead with the most impactful change
- Describe *what changed for the user*, not implementation details

### Release template

```
## Torena Sim v{version}

### ✨ {Main Feature Name}

{1-3 sentences describing the feature and why it matters}

- {Detail bullet}
- {Detail bullet}

### ✨ {Another Feature} (if applicable)

{Description}

### 🐛 Fixes & Improvements

- {Fix description}
- {Fix description}
```

## Requirements

- `DISCORD_WEBHOOK_URL` must be set in `.env`
- The `discord-announce` extension must be loaded (`.pi/extensions/discord-announce/`)

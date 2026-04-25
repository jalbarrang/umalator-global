# Umalator Global

## Package Management

- Prefer using `pnpm` for package management, avoid using `npm`/`yarn`/`bun`.
- Prefer using the available `package.json` scripts instead of running commands directly for typechecking, linting, formatting, testing, etc.

## Code Style

- Never create barrel files, always use named exports.

## React Patterns

- This project uses Base UI patterns, not older Radix-style composition.
- Do not assume local wrapper components support `asChild`.
- Before using common shadcn or Radix idioms, check the local wrapper API first.
- Prefer the repo's existing `render={...}` composition patterns when working with triggers and buttons.
- Destructure props inside the component body, not in the function signature.
- use `type` instead of `interface` for component props.
- Don't overuse `useEffect` for simple state updates.
- Don't use deprecated `forwardRef` for component refs, pass the `ref` as a prop.
- This project should follow the React 19+ composition patterns.
- This project doesn't use React Server Components.

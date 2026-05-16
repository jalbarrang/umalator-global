import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';

type GrabFrame = {
  component: string;
  file?: string;
  line?: number;
};

type GrabContext = {
  selectedText?: string;
  domSnippet?: string;
  frames: GrabFrame[];
  files: string[];
};

const MAX_SNIPPET_LENGTH = 2_000;
const MAX_SELECTED_TEXT_LENGTH = 1_000;

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function stripFence(value: string) {
  return value
    .replace(/^```[\w-]*\n?/, '')
    .replace(/\n?```$/, '')
    .trim();
}

function extractDomSnippet(prompt: string) {
  const fencedHtmlMatch = prompt.match(/```(?:html|jsx|tsx)?\n([\s\S]*?)\n```/i);
  if (fencedHtmlMatch?.[1]?.includes('<')) {
    return stripFence(fencedHtmlMatch[1]);
  }

  const firstTagIndex = prompt.search(/<\w[\s\S]*?>/);
  if (firstTagIndex === -1) return undefined;

  const stackIndex = prompt.indexOf('\n  in ', firstTagIndex);
  const endIndex = stackIndex === -1 ? prompt.length : stackIndex;
  return prompt.slice(firstTagIndex, endIndex).trim();
}

function extractFrames(prompt: string): GrabFrame[] {
  const frames: GrabFrame[] = [];
  const framePattern =
    /\bin\s+([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s+\(at\s+([^:)]+?)(?::(\d+))?(?::\d+)?\)/g;

  for (const match of prompt.matchAll(framePattern)) {
    const component = match[1];
    const file = match[2];
    const line = match[3] ? Number(match[3]) : undefined;

    frames.push({ component, file, line });
  }

  return frames;
}

function extractSelectedText(prompt: string) {
  const textMatch = prompt.match(
    /(?:selected text|text content|text):\s*([\s\S]*?)(?:\n\s*(?:dom|html|component stack|in\s+\w+\s+\(at)|$)/i
  );
  if (textMatch?.[1]) return textMatch[1].trim();

  return undefined;
}

function parseJsonPayload(prompt: string): GrabContext | undefined {
  const jsonMatch = prompt.match(/```json\n([\s\S]*?)\n```/i) ?? prompt.match(/({[\s\S]*})/);
  if (!jsonMatch?.[1]) return undefined;

  try {
    const payload = JSON.parse(jsonMatch[1]) as Record<string, unknown>;
    const domSnippet =
      typeof payload.html === 'string'
        ? payload.html
        : typeof payload.dom === 'string'
          ? payload.dom
          : typeof payload.outerHTML === 'string'
            ? payload.outerHTML
            : undefined;
    const selectedText =
      typeof payload.text === 'string'
        ? payload.text
        : typeof payload.textContent === 'string'
          ? payload.textContent
          : undefined;
    const rawStack =
      typeof payload.componentStack === 'string'
        ? payload.componentStack
        : typeof payload.reactStack === 'string'
          ? payload.reactStack
          : undefined;
    const frames = rawStack ? extractFrames(rawStack) : extractFrames(JSON.stringify(payload));
    const files = Array.from(
      new Set(frames.map((frame) => frame.file).filter(Boolean) as string[])
    );

    if (!domSnippet && !selectedText && frames.length === 0) return undefined;

    return { domSnippet, selectedText, frames, files };
  } catch {
    return undefined;
  }
}

function parseReactGrabPrompt(prompt: string): GrabContext | undefined {
  const jsonContext = parseJsonPayload(prompt);
  if (jsonContext) return jsonContext;

  const domSnippet = extractDomSnippet(prompt);
  const frames = extractFrames(prompt);
  const selectedText = extractSelectedText(prompt);
  const files = Array.from(new Set(frames.map((frame) => frame.file).filter(Boolean) as string[]));

  if (!domSnippet && !selectedText && frames.length === 0) return undefined;

  return { domSnippet, selectedText, frames, files };
}

function formatGrabContext(context: GrabContext) {
  const lines = ['React Grab selected element context:'];

  if (context.selectedText) {
    lines.push('', 'Selected text:', truncate(context.selectedText, MAX_SELECTED_TEXT_LENGTH));
  }

  if (context.domSnippet) {
    lines.push(
      '',
      'DOM snippet:',
      '```html',
      truncate(context.domSnippet, MAX_SNIPPET_LENGTH),
      '```'
    );
  }

  if (context.frames.length > 0) {
    lines.push('', 'Component stack:');
    for (const frame of context.frames) {
      const location = frame.file ? ` (${frame.file}${frame.line ? `:${frame.line}` : ''})` : '';
      lines.push(`- ${frame.component}${location}`);
    }
  }

  if (context.files.length > 0) {
    lines.push('', 'Likely relevant files:');
    for (const file of context.files) lines.push(`- ${file}`);
  }

  lines.push(
    '',
    'Guidance for the assistant:',
    '- Treat this as UI-selection context from the browser, not as source code to copy blindly.',
    '- Prefer inspecting the listed files before editing.',
    '- Use the selected DOM/classes/text to reason about the visual issue the user is pointing at.'
  );

  return lines.join('\n');
}

export default function reactGrabContextExtension(pi: ExtensionAPI) {
  pi.on('before_agent_start', async (event) => {
    const context = parseReactGrabPrompt(event.prompt);
    if (!context) return;

    return {
      message: {
        customType: 'react-grab-context',
        content: formatGrabContext(context),
        display: true
      }
    };
  });

  pi.registerTool({
    name: 'parse_react_grab_context',
    label: 'Parse React Grab Context',
    description:
      'Parse a react-grab browser element selection payload into concise UI context for debugging.',
    parameters: Type.Object({
      payload: Type.String({
        description: 'The raw react-grab payload or copied browser selection text.'
      })
    }),
    async execute(_toolCallId, params) {
      const context = parseReactGrabPrompt(params.payload);

      if (!context) {
        return {
          content: [{ type: 'text', text: 'No React Grab context was detected in the payload.' }],
          details: { detected: false }
        };
      }

      return {
        content: [{ type: 'text', text: formatGrabContext(context) }],
        details: { detected: true, ...context }
      };
    }
  });

  pi.registerCommand('react-grab-help', {
    description: 'Show how Pi handles react-grab browser element selections',
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        'Paste or send a react-grab selection payload. Pi will summarize DOM, component stack, and likely files automatically.',
        'info'
      );
    }
  });
}

/**
 * Plan Mode Extension
 *
 * Two-phase workflow:
 *   1. PLAN phase  — read-only tools + medium thinking → analyze & plan
 *   2. EXECUTE phase — full tools + low thinking → execute the plan
 *
 * Commands:
 *   /plan          — toggle plan mode
 *   /todos         — show current plan progress
 *   Ctrl+Alt+P     — toggle plan mode (shortcut)
 *
 * Flag:
 *   --plan         — start session in plan mode
 */

import type { AgentMessage } from '@mariozechner/pi-agent-core';
import type { AssistantMessage, TextContent } from '@mariozechner/pi-ai';
import type { ExtensionAPI, ExtensionContext } from '@mariozechner/pi-coding-agent';
import { Key } from '@mariozechner/pi-tui';
import { extractTodoItems, isSafeCommand, markCompletedSteps, type TodoItem } from './utils.js';

// ── Tool sets ────────────────────────────────────────────────────────────────
const PLAN_TOOLS = ['read', 'bash', 'grep', 'find', 'ls', 'questionnaire', 'search_skills'];
const EXEC_TOOLS = ['read', 'bash', 'edit', 'write', 'search_skills'];

// ── Model + thinking presets ─────────────────────────────────────────────────
const PLAN_MODEL = { provider: 'anthropic', id: 'claude-opus-4-6' } as const;
const PLAN_THINKING = 'medium' as const;

const EXEC_MODEL = { provider: 'openai', id: 'gpt-5.5' } as const;
const EXEC_THINKING = 'low' as const;

type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

// ── Helpers ──────────────────────────────────────────────────────────────────
function isAssistantMessage(m: AgentMessage): m is AssistantMessage {
  return m.role === 'assistant' && Array.isArray(m.content);
}

function getTextContent(message: AssistantMessage): string {
  return message.content
    .filter((b): b is TextContent => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

// ── Extension ────────────────────────────────────────────────────────────────
export default function planMode(pi: ExtensionAPI): void {
  let planEnabled = false;
  let executing = false;
  let hasPlan = false;
  let todos: TodoItem[] = [];
  let previousThinking: ThinkingLevel | undefined;
  let previousModel: { provider: string; id: string } | undefined;

  // ── Flag ──────────────────────────────────────────────────────────────────
  pi.registerFlag('plan', {
    description: 'Start in plan mode (read-only + medium thinking)',
    type: 'boolean',
    default: false,
  });

  // ── State persistence ─────────────────────────────────────────────────────
  function persist(): void {
    pi.appendEntry('plan-mode', {
      enabled: planEnabled,
      executing,
      hasPlan,
      todos,
    });
  }

  // ── UI updates ────────────────────────────────────────────────────────────
  function updateUI(ctx: ExtensionContext): void {
    const { theme } = ctx.ui;

    // Footer status
    if (executing && todos.length > 0) {
      const done = todos.filter((t) => t.completed).length;
      ctx.ui.setStatus('plan-mode', theme.fg('accent', `📋 exec ${done}/${todos.length}`));
    } else if (planEnabled) {
      ctx.ui.setStatus('plan-mode', theme.fg('warning', '📝 plan'));
    } else {
      ctx.ui.setStatus('plan-mode', undefined);
    }

    // Widget with todo list
    if (executing && todos.length > 0) {
      const lines = todos.map((item) => {
        if (item.completed) {
          return theme.fg('success', '☑ ') + theme.fg('muted', theme.strikethrough(item.text));
        }
        return `${theme.fg('muted', '☐ ')}${item.text}`;
      });
      ctx.ui.setWidget('plan-todos', lines);
    } else {
      ctx.ui.setWidget('plan-todos', undefined);
    }
  }

  // ── Activate / deactivate ─────────────────────────────────────────────────
  async function switchModel(
    ctx: ExtensionContext,
    preset: { provider: string; id: string },
  ): Promise<boolean> {
    const model = ctx.modelRegistry.find(preset.provider, preset.id);
    if (!model) {
      ctx.ui.notify(`Model ${preset.provider}/${preset.id} not found`, 'error');
      return false;
    }
    const ok = await pi.setModel(model);
    if (!ok) {
      ctx.ui.notify(`No API key for ${preset.provider}/${preset.id}`, 'error');
      return false;
    }
    return true;
  }

  async function enterPlanMode(ctx: ExtensionContext): Promise<void> {
    planEnabled = true;
    executing = false;
    hasPlan = false;
    todos = [];
    previousThinking = pi.getThinkingLevel() as ThinkingLevel;
    previousModel = ctx.model ? { provider: ctx.model.provider, id: ctx.model.id } : undefined;
    pi.setActiveTools(PLAN_TOOLS);
    await switchModel(ctx, PLAN_MODEL);
    pi.setThinkingLevel(PLAN_THINKING);
    ctx.ui.notify(
      `Plan mode ON — ${PLAN_MODEL.provider}/${PLAN_MODEL.id}:${PLAN_THINKING}`,
      'info',
    );
    updateUI(ctx);
    persist();
  }

  async function exitPlanMode(ctx: ExtensionContext): Promise<void> {
    planEnabled = false;
    executing = false;
    hasPlan = false;
    todos = [];
    pi.setActiveTools(EXEC_TOOLS);
    if (previousModel) {
      await switchModel(ctx, previousModel);
    }
    if (previousThinking) {
      pi.setThinkingLevel(previousThinking);
    }
    ctx.ui.notify('Plan mode OFF — original model restored', 'info');
    updateUI(ctx);
    persist();
  }

  async function startExecution(ctx: ExtensionContext): Promise<void> {
    planEnabled = false;
    executing = true;
    pi.setActiveTools(EXEC_TOOLS);
    await switchModel(ctx, EXEC_MODEL);
    pi.setThinkingLevel(EXEC_THINKING);
    ctx.ui.notify(
      `Executing plan — ${EXEC_MODEL.provider}/${EXEC_MODEL.id}:${EXEC_THINKING}`,
      'info',
    );
    updateUI(ctx);
    persist();
  }

  async function togglePlanMode(ctx: ExtensionContext): Promise<void> {
    if (planEnabled || executing) {
      await exitPlanMode(ctx);
    } else {
      await enterPlanMode(ctx);
    }
  }

  // ── Commands ──────────────────────────────────────────────────────────────
  pi.registerCommand('plan', {
    description: 'Toggle plan mode (read-only + medium thinking)',
    handler: async (_args, ctx) => togglePlanMode(ctx),
  });

  pi.registerCommand('todos', {
    description: 'Show current plan progress',
    handler: async (_args, ctx) => {
      if (todos.length === 0) {
        ctx.ui.notify('No plan yet. Use /plan to start planning.', 'info');
        return;
      }
      const list = todos.map((t, i) => `${i + 1}. ${t.completed ? '✓' : '○'} ${t.text}`).join('\n');
      ctx.ui.notify(`Plan Progress:\n${list}`, 'info');
    },
  });

  pi.registerShortcut(Key.ctrlAlt('p'), {
    description: 'Toggle plan mode',
    handler: async (ctx) => togglePlanMode(ctx),
  });

  // ── Block destructive bash in plan mode ───────────────────────────────────
  pi.on('tool_call', async (event) => {
    if (!planEnabled || event.toolName !== 'bash') return;
    const command = event.input.command as string;
    if (!isSafeCommand(command)) {
      return {
        block: true,
        reason: `Plan mode: command blocked. Use /plan to exit plan mode first.\nCommand: ${command}`,
      };
    }
  });

  // ── Filter stale plan context when not planning ───────────────────────────
  pi.on('context', async (event) => {
    if (planEnabled) return;
    return {
      messages: event.messages.filter((m) => {
        const msg = m as AgentMessage & { customType?: string };
        if (msg.customType === 'plan-mode-context') return false;
        if (msg.role !== 'user') return true;
        const content = msg.content;
        if (typeof content === 'string') {
          return !content.includes('[PLAN MODE ACTIVE]');
        }
        if (Array.isArray(content)) {
          return !content.some(
            (c) => c.type === 'text' && (c as TextContent).text?.includes('[PLAN MODE ACTIVE]'),
          );
        }
        return true;
      }),
    };
  });

  // ── Inject context for each phase ─────────────────────────────────────────
  pi.on('before_agent_start', async () => {
    if (planEnabled) {
      const baseContext = `[PLAN MODE ACTIVE]
You are in plan mode — a read-only exploration phase.

Restrictions:
- Available tools: ${PLAN_TOOLS.join(', ')}
- File modifications (edit, write) are DISABLED
- Bash is restricted to read-only commands`;

      const planInstructions = hasPlan
        ? `\n\nA plan has already been produced. Continue the conversation naturally — answer questions, discuss trade-offs, or refine ideas. Do NOT regenerate a numbered plan or todo list unless the user explicitly asks for one.`
        : `\n\nYour task:
1. Analyze the codebase thoroughly using the available tools
2. Ask clarifying questions if needed (use questionnaire tool)
3. Produce a detailed numbered plan under a "Plan:" header:

Plan:
1. First step — what to change and where
2. Second step — what to change and where
...

This project uses a local issue tracker under .scratch/ (one feature per directory with a PRD.md and numbered issue files). When the plan is approved for execution, steps will be tracked there — not as in-memory todos.

Do NOT attempt to make changes — only describe what you would do.`;

      return {
        message: {
          customType: 'plan-mode-context',
          content: baseContext + planInstructions,
          display: false,
        },
      };
    }

    if (executing && todos.length > 0) {
      const remaining = todos.filter((t) => !t.completed);
      const todoList = remaining.map((t) => `${t.step}. ${t.text}`).join('\n');
      return {
        message: {
          customType: 'plan-execution-context',
          content: `[EXECUTING PLAN — Full tool access enabled]

Remaining steps:
${todoList}

Execute each step in order. After completing a step, include [DONE:n] in your response.`,
          display: false,
        },
      };
    }
  });

  // ── Track [DONE:n] markers during execution ───────────────────────────────
  pi.on('turn_end', async (event, ctx) => {
    if (!executing || todos.length === 0) return;
    if (!isAssistantMessage(event.message)) return;

    const text = getTextContent(event.message);
    if (markCompletedSteps(text, todos) > 0) {
      updateUI(ctx);
    }
    persist();
  });

  // ── After agent finishes: prompt for next action ──────────────────────────
  pi.on('agent_end', async (event, ctx) => {
    // Check execution completion
    if (executing && todos.length > 0) {
      if (todos.every((t) => t.completed)) {
        const list = todos.map((t) => `~~${t.text}~~`).join('\n');
        pi.sendMessage(
          {
            customType: 'plan-complete',
            content: `**Plan Complete!** ✓\n\n${list}`,
            display: true,
          },
          { triggerTurn: false },
        );
        executing = false;
        todos = [];
        pi.setActiveTools(EXEC_TOOLS);
        if (previousModel) {
          await switchModel(ctx, previousModel);
        }
        if (previousThinking) {
          pi.setThinkingLevel(previousThinking);
        }
        updateUI(ctx);
        persist();
      }
      return;
    }

    if (!planEnabled || !ctx.hasUI) return;

    // Extract plan from last assistant message (only on first plan generation)
    if (!hasPlan) {
      const lastAssistant = [...event.messages].reverse().find(isAssistantMessage);
      if (lastAssistant) {
        const extracted = extractTodoItems(getTextContent(lastAssistant));
        if (extracted.length > 0) {
          todos = extracted;
          hasPlan = true;
        }
      }
    }

    // Show extracted plan
    if (todos.length > 0 && hasPlan) {
      const todoList = todos.map((t, i) => `${i + 1}. ☐ ${t.text}`).join('\n');
      pi.sendMessage(
        {
          customType: 'plan-todo-list',
          content: `**Plan Steps (${todos.length}):**\n\n${todoList}`,
          display: true,
        },
        { triggerTurn: false },
      );
    }

    // Build menu options based on current state
    const options: string[] = [];
    if (todos.length > 0) {
      options.push(`Execute the plan (${todos.length} steps)`);
      options.push('Edit the plan (open editor)');
    }
    options.push('Continue discussing');
    options.push('Exit plan mode');

    const choice = await ctx.ui.select('What would you like to do?', options);

    if (choice?.startsWith('Execute')) {
      startExecution(ctx);
      const msg =
        todos.length > 0
          ? `Execute the plan. Start with step 1: ${todos[0].text}`
          : 'Execute the plan you just created.';
      pi.sendMessage(
        { customType: 'plan-mode-execute', content: msg, display: true },
        { triggerTurn: true },
      );
    } else if (choice?.startsWith('Edit the plan')) {
      const refinement = await ctx.ui.editor('Edit the plan:', '');
      if (refinement?.trim()) {
        hasPlan = false; // Allow re-extraction after refinement
        pi.sendUserMessage(refinement.trim());
      }
    } else if (choice === 'Exit plan mode') {
      await exitPlanMode(ctx);
    }
    // "Continue discussing" → do nothing, user types next prompt
  });

  // ── Restore state on session start/resume ─────────────────────────────────
  pi.on('session_start', async (_event, ctx) => {
    // Check CLI flag
    if (pi.getFlag('plan') === true) {
      planEnabled = true;
    }

    // Restore persisted state
    const entries = ctx.sessionManager.getEntries();
    const saved = entries
      .filter(
        (e: { type: string; customType?: string }) =>
          e.type === 'custom' && e.customType === 'plan-mode',
      )
      .pop() as
      | { data?: { enabled: boolean; todos?: TodoItem[]; executing?: boolean } }
      | undefined;

    if (saved?.data) {
      planEnabled = saved.data.enabled ?? planEnabled;
      todos = saved.data.todos ?? todos;
      executing = saved.data.executing ?? executing;
      hasPlan = (saved.data as { hasPlan?: boolean }).hasPlan ?? false;
    }

    // Re-scan [DONE:n] markers on resume
    if (executing && todos.length > 0) {
      let execIdx = -1;
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i] as { type: string; customType?: string };
        if (entry.customType === 'plan-mode-execute') {
          execIdx = i;
          break;
        }
      }

      const messages: AssistantMessage[] = [];
      for (let i = execIdx + 1; i < entries.length; i++) {
        const entry = entries[i];
        if (
          entry.type === 'message' &&
          'message' in entry &&
          isAssistantMessage(entry.message as AgentMessage)
        ) {
          messages.push(entry.message as AssistantMessage);
        }
      }
      const allText = messages.map(getTextContent).join('\n');
      markCompletedSteps(allText, todos);
    }

    // Apply tool restrictions and thinking level
    if (planEnabled) {
      pi.setActiveTools(PLAN_TOOLS);
      const planModel = ctx.modelRegistry.find(PLAN_MODEL.provider, PLAN_MODEL.id);
      if (planModel) await pi.setModel(planModel);
      pi.setThinkingLevel(PLAN_THINKING);
    } else if (executing) {
      pi.setActiveTools(EXEC_TOOLS);
      const execModel = ctx.modelRegistry.find(EXEC_MODEL.provider, EXEC_MODEL.id);
      if (execModel) await pi.setModel(execModel);
      pi.setThinkingLevel(EXEC_THINKING);
    }

    updateUI(ctx);
  });
}

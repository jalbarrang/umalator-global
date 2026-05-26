import { resolve } from "node:path";
import { config } from "dotenv";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  config({ path: resolve(process.cwd(), ".env") });
  pi.registerTool({
    name: "discord_announce",
    label: "Discord Announce",
    description:
      "Post an announcement message to the project's Discord channel via webhook. " +
      "Use when the user asks to post, announce, or share updates to Discord.",
    promptSnippet:
      "Post an announcement to the project Discord channel via webhook.",
    promptGuidelines: [
      "Use discord_announce when the user says 'post an announcement', 'announce to discord', or 'share update on discord'.",
      "Write the message yourself based on the work done in this session. Use markdown formatting — Discord embeds support it.",
      "Keep announcements concise and user-facing. Don't list internal refactors unless they affect users.",
    ],
    parameters: Type.Object({
      message: Type.String({
        description:
          "The announcement message in markdown. Discord embed supports bold, italic, headers, lists, and code blocks.",
      }),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

      if (!webhookUrl) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Missing DISCORD_WEBHOOK_URL in .env — cannot post to Discord.",
            },
          ],
          isError: true,
          details: {},
        };
      }

      const body = {
        username: "Torena Sim - Updates",
        embeds: [
          {
            description: params.message,
            color: 0x3b82f6,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const resp = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const text = await resp.text();
        return {
          content: [
            {
              type: "text" as const,
              text: `Discord webhook failed (${resp.status}): ${text}`,
            },
          ],
          isError: true,
          details: {},
        };
      }

      return {
        content: [
          { type: "text" as const, text: "✅ Announcement posted to Discord." },
        ],
        details: {},
      };
    },
  });
}

/**
 * Codex Agent for Living Apps Dashboard Generator
 * 
 * This is the Codex SDK equivalent of claude_agent.py
 * Uses OpenAI's Codex TypeScript SDK for programmatic control
 * 
 * Codex auto-loads:
 * - AGENTS.md (equivalent to CLAUDE.md)
 * - .codex/skills/ (skill discovery)
 * 
 * Usage:
 *   npx ts-node codex_agent.ts
 *   # or after build:
 *   node codex_agent.js
 * 
 * Environment Variables:
 *   - OPENAI_API_KEY: OpenAI API key (required)
 *   - GIT_PUSH_URL: Git URL with OAuth2 token for pushing
 *   - REPO_NAME: Repository/appgroup name
 *   - LIVINGAPPS_API_KEY: Living Apps API key for dashboard links
 *   - USER_PROMPT: Optional custom prompt for continue mode
 */

import { Codex } from "@openai/codex-sdk";

// Output types for streaming to parent process (matches claude_agent.py format)
interface OutputMessage {
  type: "think" | "tool" | "result" | "status";
  content?: string;
  tool?: string;
  input?: string;
  status?: "success" | "error";
  cost?: number;
}

function log(message: OutputMessage): void {
  console.log(JSON.stringify(message));
}

function logStatus(content: string): void {
  log({ type: "status", content });
}

async function main(): Promise<void> {
  const startTime = Date.now();
  const userPrompt = process.env.USER_PROMPT;
  const repoName = process.env.REPO_NAME;

  logStatus("[CODEX] Initialisiere Codex SDK...");

  // Initialize Codex client
  // Note: Authentication is handled via ~/.codex/auth.json (copied from host)
  // The SDK inherits the environment and reads auth from CODEX_HOME
  const codex = new Codex({
    env: {
      // Pass through required environment variables
      PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
      HOME: process.env.HOME || "/home/user",
      CODEX_HOME: process.env.CODEX_HOME || "/home/user/.codex",
      GIT_PUSH_URL: process.env.GIT_PUSH_URL || "",
      REPO_NAME: process.env.REPO_NAME || "",
      LIVINGAPPS_API_KEY: process.env.LIVINGAPPS_API_KEY || "",
      // Node.js specific
      NODE_ENV: "production",
    },
  });

  // Model configuration - change this to use different models
  // Available models depend on your subscription:
  // - "o3" / "o3-mini" - Latest reasoning models
  // - "gpt-4.1" - GPT-4.1 
  // - "gpt-5-codex" - Codex-optimized (default)
  const model = process.env.CODEX_MODEL || "gpt-5.2-codex"; // Default to gpt-5.2-codex
  
  // Start a new thread with working directory and full permissions
  logStatus(`[CODEX] Erstelle Thread mit Model: ${model}`);
  logStatus("[CODEX] approvalPolicy: never, sandboxMode: danger-full-access");
  
  const thread = codex.startThread({
    model: model,
    workingDirectory: "/home/user/app",
    skipGitRepoCheck: true, // We handle git ourselves in deploy script
    approvalPolicy: "never", // No approval needed - fully autonomous
    sandboxMode: "danger-full-access", // Full file system access
    networkAccessEnabled: true, // Allow network for npm etc
    webSearchEnabled: false, // Don't need web search
    modelReasoningEffort: "xhigh", // Use more reasoning for complex tasks (valid: low, medium, high)
  });
  
  logStatus("[CODEX] Thread erstellt mit Full-Auto Mode");
  logStatus("[CODEX] Codex lädt AGENTS.md und .codex/skills/ automatisch");

  // Build the query based on mode (same as claude_agent.py)
  // Codex auto-loads AGENTS.md and .codex/skills/ - no manual loading needed!
  let query: string;

  if (userPrompt) {
    // Continue Mode: Custom prompt from user (same as claude_agent.py)
    logStatus(`[CODEX] Continue-Mode mit User-Prompt: ${userPrompt}`);
    
    query = `🚨 AUFGABE: Du MUSST das existierende Dashboard ändern und deployen!

User-Anfrage: "${userPrompt}"

PFLICHT-SCHRITTE (alle müssen ausgeführt werden):

1. LESEN: Lies src/pages/Dashboard.tsx um die aktuelle Struktur zu verstehen
2. ÄNDERN: Implementiere die User-Anfrage
3. TESTEN: Führe 'npm run build' aus um sicherzustellen dass es kompiliert
4. DEPLOYEN: Führe 'npx ts-node deploy_to_github.ts' aus um die Änderungen zu pushen

⚠️ KRITISCH:
- Du MUSST Änderungen am Code machen!
- Du MUSST am Ende das Deploy-Skript ausführen: npx ts-node deploy_to_github.ts
- Beende NICHT ohne zu deployen!
- Analysieren alleine reicht NICHT - du musst HANDELN!

Das Dashboard existiert bereits. Mache NUR die angeforderten Änderungen, nicht mehr.
Starte JETZT mit Schritt 1!`;

  } else {
    // Build Mode: Create new dashboard (same as claude_agent.py)
    logStatus("[CODEX] Build-Mode: Neues Dashboard erstellen");
    
    query = 
      "Use frontend-design Skill to analyse app structure and generate design_brief.md. " +
      "Build the Dashboard.tsx following design_brief.md exactly. " +
      "Use existing types and services from src/types/ and src/services/. " +
      "Deploy when done using: npx ts-node deploy_to_github.ts";
  }

  logStatus("[CODEX] Starte Agent...");

  try {
    // Use streaming to get intermediate progress
    logStatus("[CODEX] Sende Query an Codex...");
    const { events } = await thread.runStreamed(query);

    let itemCount = 0;
    let toolCallCount = 0;

    // Process events as they come
    for await (const event of events) {
      // Log ALL events for debugging
      logStatus(`[CODEX] Event: ${event.type}`);
      
      switch (event.type) {
        case "item.created":
        case "item.started":
          itemCount++;
          // New item started (tool call, message, etc.)
          if (event.item) {
            const itemStr = JSON.stringify(event.item).substring(0, 800);
            log({
              type: "tool",
              tool: event.item.type || "item",
              input: itemStr,
            });
          }
          break;

        case "item.completed":
          // Item finished
          if (event.item) {
            const itemType = event.item.type || "unknown";
            const itemStr = JSON.stringify(event.item).substring(0, 1000);
            logStatus(`[CODEX] Item completed: ${itemType}`);
            
            // Log based on item type
            if (itemType === "message" && "content" in event.item) {
              const content = event.item.content;
              if (Array.isArray(content)) {
                for (const block of content) {
                  if (block.type === "text" && "text" in block) {
                    log({ type: "think", content: block.text });
                  }
                }
              } else if (typeof content === "string") {
                log({ type: "think", content: content });
              }
            } else if (itemType === "function_call" || itemType === "tool_use" || itemType === "tool_call" || 
                       itemType === "command_execution" || itemType === "file_change") {
              toolCallCount++;
              log({
                type: "tool",
                tool: "name" in event.item ? String(event.item.name) : itemType,
                input: "arguments" in event.item ? String(event.item.arguments) : itemStr,
              });
            } else if (itemType === "todo_list" || itemType === "agent_message") {
              // Skip counting these as tool calls - they're agent organization/output
              log({ type: "think", content: itemStr });
            } else {
              // Log any other item type
              log({ type: "tool", tool: itemType, input: itemStr });
            }
          }
          break;

        case "turn.completed":
          // Turn finished
          const durationMs = Date.now() - startTime;
          const durationSec = (durationMs / 1000).toFixed(1);
          const durationMin = (durationMs / 60000).toFixed(1);
          
          logStatus(`[CODEX] Turn abgeschlossen - Items: ${itemCount}, Tool Calls: ${toolCallCount}`);
          logStatus(`[CODEX] ⏱️ Dauer: ${durationSec}s (${durationMin} min)`);
          
          // Extract usage/cost from event
          let totalCost = 0;
          let usageInfo = "";
          
          if (event.usage) {
            const usage = event.usage as Record<string, unknown>;
            // Log full usage object for debugging
            logStatus(`[CODEX] Usage: ${JSON.stringify(usage)}`);
            
            // Codex SDK usage structure may include:
            // - input_tokens, output_tokens, total_tokens
            // - or nested in different format
            const inputTokens = (usage.input_tokens as number) || (usage.prompt_tokens as number) || 0;
            const outputTokens = (usage.output_tokens as number) || (usage.completion_tokens as number) || 0;
            const totalTokens = (usage.total_tokens as number) || (inputTokens + outputTokens);
            
            // Approximate cost calculation for gpt-5.2-codex/o3
            // Input: ~$0.01/1K tokens, Output: ~$0.03/1K tokens (approximate)
            totalCost = (inputTokens * 0.00001) + (outputTokens * 0.00003);
            usageInfo = `Tokens: ${totalTokens} (in: ${inputTokens}, out: ${outputTokens})`;
            
            logStatus(`[CODEX] ${usageInfo}, Cost: $${totalCost.toFixed(4)}`);
          }
          
          log({
            type: "result",
            status: "success",
            cost: totalCost,
            content: `Items: ${itemCount}, Tools: ${toolCallCount}, Duration: ${durationSec}s${usageInfo ? `, ${usageInfo}` : ""}`,
          });
          break;

        case "turn.failed":
          logStatus("[CODEX] ❌ Turn fehlgeschlagen");
          if ("error" in event) {
            log({
              type: "result",
              status: "error",
              content: String(event.error),
            });
          }
          break;

        case "error":
          // Error occurred
          log({
            type: "result",
            status: "error",
            content: "error" in event ? String(event.error) : "Unknown error",
          });
          break;

        default:
          // Log event data for debugging
          const eventData = JSON.stringify(event).substring(0, 500);
          logStatus(`[CODEX] Unhandled event: ${eventData}`);
      }
    }

    const finalDurationMs = Date.now() - startTime;
    const finalDurationSec = (finalDurationMs / 1000).toFixed(1);
    const finalDurationMin = (finalDurationMs / 60000).toFixed(1);
    
    logStatus(`[CODEX] ✅ Agent beendet - Total Items: ${itemCount}, Tool Calls: ${toolCallCount}, Duration: ${finalDurationSec}s (${finalDurationMin} min)`);
    
    if (toolCallCount === 0) {
      logStatus("[CODEX] ⚠️ WARNUNG: Keine Tool Calls ausgeführt! Agent hat möglicherweise nichts getan.");
    }
    
    log({ type: "result", status: "success" });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";
    logStatus(`[CODEX] ❌ Fehler: ${errorMessage}`);
    logStatus(`[CODEX] Stack: ${errorStack}`);
    log({ type: "result", status: "error", content: errorMessage });
    process.exit(1);
  }
}

// Run main
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});


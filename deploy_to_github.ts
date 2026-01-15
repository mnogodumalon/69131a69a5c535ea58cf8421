/**
 * Deploy to GitHub Script
 * 
 * Standalone deployment script that can be called by any agent (Claude or Codex)
 * This replaces the MCP tool approach and provides a simple CLI interface
 * 
 * Usage:
 *   npx ts-node deploy_to_github.ts
 *   # or after build:
 *   node deploy_to_github.js
 * 
 * Environment Variables (required):
 *   - GIT_PUSH_URL: Git URL with OAuth2 token
 *   - REPO_NAME: Repository/appgroup name  
 *   - LIVINGAPPS_API_KEY: Living Apps API key for dashboard links
 */

import { execSync } from "child_process";
import * as https from "https";
import * as http from "http";

const APP_DIR = "/home/user/app";

// ============================================================================
// Utility Functions
// ============================================================================

function log(message: string): void {
  console.log(`[DEPLOY] ${message}`);
}

function logSuccess(message: string): void {
  console.log(`[DEPLOY] ✅ ${message}`);
}

function logWarning(message: string): void {
  console.log(`[DEPLOY] ⚠️ ${message}`);
}

function logError(message: string): void {
  console.error(`[DEPLOY] ❌ ${message}`);
}

function runGitCmd(cmd: string): string {
  log(`Executing: ${cmd}`);
  try {
    const result = execSync(cmd, {
      cwd: APP_DIR,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return result;
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string };
    throw new Error(`Git Error (${cmd}): ${err.stderr || err.message}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Simple HTTP GET request
function httpGet(url: string, headers: Record<string, string> = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === "https:" ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers: {
        "Accept": "application/json",
        ...headers,
      },
    };

    const req = client.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode || 0, body }));
    });

    req.on("error", reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
    req.end();
  });
}

// Simple HTTP PUT request
function httpPut(url: string, data: object, headers: Record<string, string> = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === "https:" ? https : http;
    const body = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: "PUT",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        ...headers,
      },
    };

    const req = client.request(options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => (responseBody += chunk));
      res.on("end", () => resolve({ status: res.statusCode || 0, body: responseBody }));
    });

    req.on("error", reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
    req.write(body);
    req.end();
  });
}

// ============================================================================
// Main Deployment Logic
// ============================================================================

async function deploy(): Promise<void> {
  const gitPushUrl = process.env.GIT_PUSH_URL;
  const repoName = process.env.REPO_NAME;
  const livingAppsApiKey = process.env.LIVINGAPPS_API_KEY;

  if (!gitPushUrl) {
    throw new Error("GIT_PUSH_URL environment variable is required");
  }

  if (!repoName) {
    throw new Error("REPO_NAME environment variable is required");
  }

  log("Starting deployment...");

  // Configure git
  runGitCmd("git config --global user.email 'lilo@livinglogic.de'");
  runGitCmd("git config --global user.name 'Lilo'");

  // Clean up any existing git state first
  try {
    execSync("rm -rf .git", { cwd: APP_DIR, stdio: "pipe" });
  } catch {
    // Ignore if .git doesn't exist
  }
  
  // Clean up temp directories from previous attempts
  try {
    execSync("rm -rf /tmp/old_repo", { stdio: "pipe" });
  } catch {
    // Ignore
  }

  // Check if repo exists and preserve history
  log("Checking if repository already exists...");
  let hasExistingRepo = false;
  try {
    runGitCmd(`git clone ${gitPushUrl} /tmp/old_repo`);
    runGitCmd("cp -r /tmp/old_repo/.git /home/user/app/.git");
    logSuccess("History from existing repo preserved");
    hasExistingRepo = true;
  } catch {
    // New repo - initialize from scratch
    logSuccess("New repository - initializing");
    runGitCmd("git init");
  }
  
  // Ensure we're on main branch
  try {
    runGitCmd("git checkout main");
  } catch {
    try {
      runGitCmd("git checkout -b main");
    } catch {
      // Already on main or branch exists, that's fine
    }
  }
  
  // Set up remote (remove first if exists)
  try {
    runGitCmd("git remote remove origin");
  } catch {
    // Remote doesn't exist, that's fine
  }
  runGitCmd(`git remote add origin ${gitPushUrl}`);

  // Commit and push
  runGitCmd("git add -A");
  
  // Only commit if there are changes or if it's a new repo
  try {
    runGitCmd("git commit -m 'Lilo Auto-Deploy'");
  } catch {
    // No changes to commit, that's okay - still push
    log("No changes to commit, pushing existing state...");
  }
  
  runGitCmd("git push origin main --force");

  logSuccess("Push successful!");

  // Wait for dashboard and activate links
  if (livingAppsApiKey && repoName) {
    await activateDashboardLinks(repoName, livingAppsApiKey);
  } else {
    logWarning("Skipping dashboard link activation (missing API key or repo name)");
  }

  logSuccess("Deployment complete!");
}

async function activateDashboardLinks(appgroupId: string, apiKey: string): Promise<void> {
  const headers = {
    "X-API-Key": apiKey,
    "Accept": "application/json",
    "Content-Type": "application/json",
  };

  try {
    // 1. Get all app IDs from appgroup
    log(`Loading appgroup: ${appgroupId}`);
    const appgroupResponse = await httpGet(
      `https://my.living-apps.de/rest/appgroups/${appgroupId}`,
      headers
    );

    if (appgroupResponse.status !== 200) {
      throw new Error(`Failed to fetch appgroup: ${appgroupResponse.status}`);
    }

    const appgroup = JSON.parse(appgroupResponse.body);
    const apps = appgroup.apps || {};
    const appIds = Object.values(apps).map((app: any) => app.id);

    log(`Found ${appIds.length} apps`);

    if (appIds.length === 0) {
      logWarning("No apps found in appgroup");
      return;
    }

    const dashboardUrl = `https://my.living-apps.de/github/${appgroupId}/`;

    // 2. Wait for dashboard to be available
    log(`Waiting for dashboard: ${dashboardUrl}`);
    const maxAttempts = 180; // 180 seconds max

    let dashboardAvailable = false;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const checkResponse = await httpGet(dashboardUrl);
        if (checkResponse.status === 200) {
          logSuccess("Dashboard is available!");
          dashboardAvailable = true;
          break;
        }
      } catch {
        // Ignore errors, keep trying
      }

      if (attempt < maxAttempts - 1) {
        await sleep(1000);
      }
    }

    if (!dashboardAvailable) {
      logWarning("Timeout - Dashboard not reachable, skipping link activation");
      return;
    }

    // 3. Activate dashboard links
    log("Activating dashboard links...");
    for (const appId of appIds) {
      try {
        // Activate URL
        await httpPut(
          `https://my.living-apps.de/rest/apps/${appId}/params/la_page_header_additional_url`,
          { description: "dashboard_url", type: "string", value: dashboardUrl },
          headers
        );

        // Update title
        await httpPut(
          `https://my.living-apps.de/rest/apps/${appId}/params/la_page_header_additional_title`,
          { description: "dashboard_title", type: "string", value: "Dashboard" },
          headers
        );

        log(`  ✓ App ${appId} activated`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logWarning(`  ✗ App ${appId}: ${errorMessage}`);
      }
    }

    logSuccess("Dashboard links successfully added!");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logWarning(`Error adding dashboard links: ${errorMessage}`);
  }
}

// ============================================================================
// Entry Point
// ============================================================================

deploy()
  .then(() => {
    console.log(JSON.stringify({ success: true, message: "Deployment successful!" }));
    process.exit(0);
  })
  .catch((error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(errorMessage);
    console.log(JSON.stringify({ success: false, error: errorMessage }));
    process.exit(1);
  });


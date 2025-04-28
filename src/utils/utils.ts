import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import * as github from "@actions/github";
import { ActionInputs } from "./input";
import { Output } from "./output";

export class Utils {
  public static async cloneRepository(inputs: ActionInputs): Promise<string> {
    try {
      core.startGroup("Cloning target repository");
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-repo-"));
      const cloneArgs = ["git", "clone", inputs.repositoryUrl, tempDir];
      if (inputs.repositoryBranch) {
        cloneArgs.splice(
          2,
          0,
          "--branch",
          inputs.repositoryBranch,
          "--single-branch",
        );
      }
      core.info(
        `Cloning ${inputs.repositoryUrl} ${inputs.repositoryBranch ? "(@" + inputs.repositoryBranch + ")" : ""} to ${tempDir}`,
      );
      await Utils.runCommand(cloneArgs);
      core.info(`Cloned target repository to ${tempDir}`);
      return tempDir;
    } finally {
      core.endGroup();
    }
  }

  public static async runTests(
    inputs: ActionInputs,
    targetDir: string,
  ): Promise<void> {
    try {
      core.startGroup("Running tests...");
      const testCmd = core.getInput("test_command");
      core.info(`Running: ${inputs.testCommand}`);
      await Utils.runCommand(["sh", "-c", inputs.testCommand], {cwd: targetDir});
      core.info("Tests passed");
    } finally {
      core.endGroup();
    }
  }

  public static async addCommentToPR(content: string, token?: string): Promise<boolean> {
    try {
      if (!token) {
        throw new ErrorWithHint("GitHub token is required but not provided.", `Set the ${ActionInputs.SOURCE_GIT_TOKEN_ENV} environment variable.`);
      }
      const octokit = github.getOctokit(token);
      const context = github.context;

      if (!context.payload.pull_request) {
        throw new Error("This action can only run on pull requests.");
      }

      const { owner, repo } = context.repo;
      const pull_number = context.payload.pull_request.number;

      core.info(`Adding comment to PR #${pull_number} in ${owner}/${repo}`);
      try {
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: pull_number,
          body: `\n\n${Output.ACTION_COMMENT_MARK}\n${content}`,
        });
      } catch (error: any) {
        throw new ErrorWithHint(error.message, "Make sure the workflow contains `pull-requests: write` permission.");
      }
      core.info("Comment added successfully.");
      return true;
    } catch (error: any) {
      core.warning(`Failed to add comment to PR: ${error.message}`);
      return false;
    }
  }

  public static async getPullRequestBranch(cloneUrl: string, prNumber: number, token?: string): Promise<string | undefined> {
    try {
      if (!token) {
        throw new ErrorWithHint("GitHub token is required but not provided.", `Set the ${ActionInputs.SOURCE_GIT_TOKEN_ENV} environment variable.`);
      }
      const octokit = github.getOctokit(token);
      const { owner, repo } = this.splitUrl(cloneUrl);
      const { data: pullRequest } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });
      return pullRequest.head.ref;
    } catch (error: any) {
      core.warning(`Failed to get pull request branch: ${error.message}`);
      return undefined;
    }
  }

  public static getCurrentPullRequestNumber(): number | undefined {
    const context = github.context;
    if (context.payload.pull_request) {
      return context.payload.pull_request.number;
    } else if (context.payload.issue) {
      return context.payload.issue.number;
    } else {
      core.warning("No pull request or issue found in the context.");
      return undefined;
    }
  }

  public static async isLabelExists(labelToCheck: string, token?: string): Promise<boolean> {
    try {
      if (!token) {
        throw new ErrorWithHint("GitHub token is required but not provided.", `Set the ${ActionInputs.SOURCE_GIT_TOKEN_ENV} environment variable.`);
      }
      const context = github.context;
      // Make sure we are in PR context
      if (!context.payload.pull_request) {
        return false;
      }
      const labels = context.payload.pull_request.labels;
      core.info(`PR labels: ${JSON.stringify(labels)}`);
      const labelExists = labels.some((label: { name: string }) => label.name === labelToCheck);
      if (labelExists) {
        core.info(`Label "${labelToCheck}" exists in the pull request.`);
      } else {
        core.info(`Label "${labelToCheck}" does not exist in the pull request.`);
      }
      return labelExists;
    } catch (error: any) {
      core.warning(`Failed to check if label exists: ${error.message}`);
      return false;
    }
  }

  public static splitUrl(url: string): { owner: string; repo: string } {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const owner = pathParts[pathParts.length - 2];
    const repo = pathParts[pathParts.length - 1].replace(/\.git$/, "");
    return { owner, repo };
  }

  public static async addJobSummaryContent(content: string, override: boolean = false): Promise<boolean> {
    try {
      core.info("Adding job summary content...");
      core.summary.addRaw(content);
      await core.summary.write({ overwrite: override });
      core.info("Job summary content added successfully.");
      return true;
    } catch (error: any) {
      core.warning(`Failed to ${override ? "override" : "add"} job summary content: ${error.message}`);
      return false;
    }
  }

  public static async runCommand(cmd: string[], cmdOptions?: CommandOptions): Promise<string> {
    if (cmd.length === 0 || cmd[0].length === 0) {
      throw new Error("Command is empty");
    }
    let command = cmd[0];
    let args: string[] | undefined = undefined;
    if (cmd.length > 1) {
      args = cmd.slice(1);
    }
    let stdout = "";
    let stderr = "";
    const options = {
      cwd: cmdOptions?.cwd,
      env: cmdOptions?.env,
      silent: cmdOptions?.silent,
      ignoreReturnCode: true,
      listeners: {
        stdout: (data: Buffer) => {
          stdout += data.toString();
        },
        stderr: (data: Buffer) => {
          let str = data.toString();
            if (cmdOptions?.stdErrFilter) {
                str = cmdOptions.stdErrFilter(str);
            }
          stderr += str;
        },
      },
    };
    const exitCode = await exec.exec(command, args, options);
    if (exitCode !== 0) {
      throw new CommandError(cmd.join(" "), stderr, exitCode, cmdOptions?.hint);
    }
    return stdout;
  }
}

export class ErrorWithHint extends Error {
  private _hint?: string;
  constructor(message?: string, hint?: string) {
    super(message);
    this._hint = hint;
  }
  public get hint(): string | undefined {
    return this._hint;
  }
  public toString(): string {
    return `${this.message}${this._hint ? `\nHint: ${this._hint}` : ""}`;
  }
}

export interface CommandOptions {
    cwd?: string;
    env?: { [key: string]: string } | undefined;
    silent?: boolean;
    hint?: string;
    stdErrFilter?: (data: string) => string;
}

export class CommandError extends ErrorWithHint {
  readonly stderr: string;
  readonly exitCode: number;

  constructor(
    command: string,
    stderr: string,
    exitCode: number,
    hint?: string,

  ) {
    super(`CommandError: ${command} failed with exit code ${exitCode}`, hint);
    this.stderr = stderr;
    this.exitCode = exitCode;
  }
}

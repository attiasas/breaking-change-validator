import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

export class ActionInputs {
  // The repository Clone URL to be validated
  public static readonly REPOSITORY_URL_ARG: string = "repository";
  // The repository branch to be validated
  public static readonly REPOSITORY_BRANCH_ARG: string = "branch";
  // The command to run the tests if any
  public static readonly TEST_COMMAND_ARG: string = "test_command";

  public readonly repositoryUrl: string;
  public readonly repositoryBranch: string;
  public readonly testCommand: string;

  public readonly sourceDir: string;

  constructor() {
    this.repositoryUrl = core.getInput(ActionInputs.REPOSITORY_URL_ARG, {
      required: true,
    });
    this.repositoryBranch = core.getInput(ActionInputs.REPOSITORY_BRANCH_ARG);
    this.testCommand = core.getInput(ActionInputs.TEST_COMMAND_ARG);
    this.sourceDir = process.env.GITHUB_WORKSPACE || "";
  }

  public runTargetTests(): boolean {
    return this.testCommand.length > 0;
  }
}

export class Utils {
  public static async cloneRepository(inputs: ActionInputs): Promise<string> {
    try {
      core.startGroup("Cloning target repository");
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-repo-"));
      //   const cloneArgs = ["clone", inputs.repositoryUrl, tempDir];
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
      //   await exec.exec("git", cloneArgs);
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
      //   await exec.exec("sh", ["-c", inputs.testCommand], { cwd: targetDir });
      await Utils.runCommand(["sh", "-c", inputs.testCommand], {cwd: targetDir});
      core.info("Tests passed");
    } finally {
      core.endGroup();
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
    core.info(`Command: ${command} ${args ? args.join(" ") : ""}`);
    const exitCode = await exec.exec(command, args, options);
    core.info(`Command done with exit code ${exitCode}`);
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

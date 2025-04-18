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

export class CommandError extends Error {
  readonly command: string;
  readonly stderr: string;
  readonly exitCode: number;

  constructor(
    command: string,
    stderr: string,
    exitCode: number,
    message?: string,
  ) {
    super(message);
    this.command = command;
    this.stderr = stderr;
    this.exitCode = exitCode;
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
      await Utils.runCommand(["sh", "-c", inputs.testCommand], targetDir);
      core.info("Tests passed");
    } finally {
      core.endGroup();
    }
  }

  public static async runCommand(
    cmd: string[],
    cwd?: string,
    env?: { [key: string]: string } | undefined,
    silent: boolean = false,
  ): Promise<string> {
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
      cwd: cwd,
      env: env,
      silent: silent,
      listeners: {
        stdout: (data: Buffer) => {
          stdout += data.toString();
        },
        stderr: (data: Buffer) => {
          stderr += data.toString();
        },
      },
    };
    const exitCode = await exec.exec(command, args, options);
    if (exitCode !== 0) {
      throw new CommandError(cmd.join(" "), stderr, exitCode);
    }
    return stdout;
  }
}

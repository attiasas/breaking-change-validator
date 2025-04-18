import * as core from "@actions/core";
// import * as exec from "@actions/exec";
import * as exec from "child_process";
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
  public static readonly SPAWN_PROCESS_BUFFER_SIZE: number = 104857600; // 100MB

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
      // await exec.exec("git", cloneArgs);
      core.info(await this.executeCmdAsync(cloneArgs.join(" "), tempDir));
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
      core.info(
        await this.executeCmdAsync(
          ["sh", "-c", inputs.testCommand].join(" "),
          targetDir,
        ),
      );
      core.info("Tests passed");
    } finally {
      core.endGroup();
    }
  }

  public static async executeCmdAsync(
    command: string,
    cwd?: string,
    env?: NodeJS.ProcessEnv | undefined,
    errIfStderrNotEmpty: boolean = true,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      try {
        const childProcess: exec.ChildProcess = exec.exec(
          command,
          {
            cwd: cwd,
            maxBuffer: Utils.SPAWN_PROCESS_BUFFER_SIZE,
            env: env,
          } as exec.ExecOptions,
          (
            error: exec.ExecException | null,
            stdout: string,
            stderr: string,
          ) => {
            if (error) {
              reject(error);
            } else {
              stderr.trim()
                ? errIfStderrNotEmpty
                  ? reject(new Error(stderr.trim()))
                  : resolve(stderr.trim())
                : resolve(stdout.trim());
            }
          },
        );
      } catch (error) {
        reject(error);
      }
    });
  }
}

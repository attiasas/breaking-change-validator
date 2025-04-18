import * as core from "@actions/core";
import { OutputType } from "./output";

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
  public readonly outputStrategy: OutputType[] = [OutputType.JobSummary];

  constructor() {
    this.sourceDir = process.env.GITHUB_WORKSPACE || "";
    // Target config
    this.repositoryUrl = core.getInput(ActionInputs.REPOSITORY_URL_ARG, {
      required: true,
    });
    this.repositoryBranch = core.getInput(ActionInputs.REPOSITORY_BRANCH_ARG);
    // Test config
    this.testCommand = core.getInput(ActionInputs.TEST_COMMAND_ARG);
    // Output config
    if ((process.env.GENERATE_VALIDATION_COMMENT || "false").toLowerCase() === "true") {
        this.outputStrategy.push(OutputType.Comment);
    }
  }

  public shouldRunTargetTests(): boolean {
    return this.testCommand.length > 0;
  }

  public requestedStrategy(type: OutputType): boolean {
    return this.outputStrategy.includes(type);
  }

  public toString(): string {
    return JSON.stringify({
        runningCustomTests: this.shouldRunTargetTests(),
        outputStrategy: this.outputStrategy,
    })
  }
}

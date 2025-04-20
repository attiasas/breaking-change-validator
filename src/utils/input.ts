import * as core from "@actions/core";
import { OutputType } from "./output";
import { ErrorWithHint } from "./utils";

export class ActionInputs {
  // The repository Clone URL to be validated
  public static readonly REPOSITORY_URL_ARG: string = "repository";
  // The repository branch to be validated
  public static readonly REPOSITORY_BRANCH_ARG: string = "branch";
  // The command to run the tests if any
  public static readonly TEST_COMMAND_ARG: string = "test_command";
  // Array, comma delimited, The strategy to use for output (terminal, job summary, comment)
  public static readonly OUTPUT_STRATEGY_ARG: string = "output_strategy";
  // If provided and the label exists, the action will consider the issues as resolved
  public static readonly REMEDIATION_LABEL_ARG: string = "remediation_label";
  // The environment variable to use for the GitHub token
  public static readonly SOURCE_GIT_TOKEN_ENV: string = "GITHUB_TOKEN";

  public readonly repositoryUrl: string;
  public readonly repositoryBranch: string;
  public readonly testCommand: string;
  public readonly remediationLabel: string;

  public readonly sourceDir: string;
  public readonly outputStrategy: OutputType[] = [];

  public readonly gitHubToken?: string;

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
    const outputStrategy = core.getInput(ActionInputs.OUTPUT_STRATEGY_ARG);
    if (outputStrategy) {
      const outputTypes = outputStrategy.split(",").map((type) => type.trim());
      this.outputStrategy = outputTypes.map((type) => ActionInputs.toOutputType(type));
    }
    // Remediation config
    this.remediationLabel = core.getInput(ActionInputs.REMEDIATION_LABEL_ARG);
    // Github token for optional operations
    this.gitHubToken = process.env[ActionInputs.SOURCE_GIT_TOKEN_ENV];
    if (!this.gitHubToken || this.gitHubToken.length === 0) {
      if (this.requestedStrategy(OutputType.Comment)) {
        throw new ErrorWithHint(`GitHub token is required but not provided for comment generation.`, `Set the ${ActionInputs.SOURCE_GIT_TOKEN_ENV} environment variable with "pull_request: write" permission.`);
      }
      if (this.hasRemediationLabel()) {
        throw new ErrorWithHint(`GitHub token is required but not provided for label remediation.`, `Set the ${ActionInputs.SOURCE_GIT_TOKEN_ENV} environment variable.`);
      }
    }
  }

  private static toOutputType(type: string): OutputType {
    switch (type.toLowerCase()) {
      case "terminal":
        return OutputType.TerminalSummary;
      case "summary":
        return OutputType.JobSummary;
      case "comment":
        return OutputType.Comment;
      default:
        throw new ErrorWithHint(`Invalid output type: ${type}`, `must be one of [terminal, summary, comment]`);
    }
  }

  public shouldRunTargetTests(): boolean {
    return this.testCommand.length > 0;
  }

  public requestedStrategy(type: OutputType): boolean {
    return this.outputStrategy.includes(type);
  }

  public hasRemediationLabel(): boolean {
    return this.remediationLabel.length > 0;
  }

  public shouldCheckRemediation(): boolean {
    return this.hasRemediationLabel() && this.gitHubToken !== undefined;
  }

  public get repositoryName(): string {
    const url = new URL(this.repositoryUrl);
    const pathParts = url.pathname.split("/");
    const repoName = pathParts[pathParts.length - 1];
    return repoName.replace(/\.git$/, "");
  }

  public toString(): string {
    let remediation = undefined;
    if (this.hasRemediationLabel()) {
      remediation = {
        label: this.remediationLabel,
      };
    }
    let output = undefined;
    if (this.outputStrategy.length > 0) {
      output = `[${this.outputStrategy.map((type) => type.toString()).join(", ")}]`;
    }
    return JSON.stringify({
        actions: {
          validation: "true",
          customTestCommand: this.shouldRunTargetTests(),
        },
        output: output,
        remediation: remediation,
    }, undefined, 1) + "\n";
  }
}

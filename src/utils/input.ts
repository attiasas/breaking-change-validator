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

  public readonly gitHubToken?: string;

  public readonly sourceDir: string;
  public readonly outputStrategy: OutputType[] = [OutputType.TerminalSummary, OutputType.JobSummary];

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
    let tokenForCommentGeneration = process.env.COMMENT_GENERATION_TOKEN;
    if (tokenForCommentGeneration) {
      // Optional token for comment generation
      if (tokenForCommentGeneration.length > 0) {
        this.gitHubToken = tokenForCommentGeneration;
        this.outputStrategy.push(OutputType.Comment);
      } else {
        core.warning("COMMENT_GENERATION_TOKEN is empty. Comment generation will be skipped.");
      }
    }
  }

  public shouldRunTargetTests(): boolean {
    return this.testCommand.length > 0;
  }

  public requestedStrategy(type: OutputType): boolean {
    return this.outputStrategy.includes(type);
  }

  public get repositoryName(): string {
    const url = new URL(this.repositoryUrl);
    const pathParts = url.pathname.split("/");
    const repoName = pathParts[pathParts.length - 1];
    return repoName.replace(/\.git$/, "");
  }

  public toString(): string {
    return JSON.stringify({
        actions: {
          validation: "true",
          customTestCommand: this.shouldRunTargetTests(),
        },
        output: `[${this.outputStrategy.map((type) => type.toString()).join(", ")}]`,
    }, undefined, 1) + "\n";
  }
}

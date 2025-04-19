import * as core from "@actions/core";
import { Utils } from "./utils/utils";
import {
  ActionErrorType,
  ActionResults,
  Output,
  OutputType,
} from "./utils/output";
import { ActionInputs } from "./utils/input";
import { ValidationManager } from "./validationManager";
import path from "path";

async function main() {
  try {
    core.info(
      `🔍 Breaking Change Validator Github Action (version ${require("../package.json").version})`,
    );
    // Initialize the action
    const inputs = new ActionInputs();
    core.info(inputs.toString());
    const results: ActionResults = new ActionResults();
    // Instantiate the validation manager with the source directory
    const validationManager = await new ValidationManager().init(
      inputs.sourceDir,
    );
    // Clone the target repository
    let targetDir = await Utils.cloneRepository(inputs);
    // Prepare the target for the actions
    await validationManager.installTarget(targetDir);
    // Validate the target
    await validateTarget(validationManager, targetDir, results)
      .then(async (validated: boolean) => {
        if (!validated || !inputs.shouldRunTargetTests()) {
          return;
        }
        // Run the target tests
        await testTarget(inputs, targetDir, results);
      })
      .finally(() => {
        reportResults(path.basename(targetDir), inputs, results);
      });
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

async function validateTarget(
  validationManager: ValidationManager,
  targetDir: string,
  results: ActionResults,
): Promise<boolean> {
  try {
    await validationManager.validateTarget(targetDir);
    return true;
  } catch (error: any) {
    results.appendError(error, ActionErrorType.ValidationError);
    return false;
  }
}

async function testTarget(
  inputs: ActionInputs,
  targetDir: string,
  results: ActionResults,
) {
  try {
    await Utils.runTests(inputs, targetDir);
  } catch (error: any) {
    results.appendError(error, ActionErrorType.TestError);
  }
}

async function reportResults(
  target: string,
  inputs: ActionInputs,
  results: ActionResults,
) {
  if (!results.hasErrors()) {
    core.info(Output.ACTION_SUCCESS_MSG);
    return;
  }
  try {
    core.startGroup("Generating output...");
    if (inputs.requestedStrategy(OutputType.JobSummary)) {
      await Utils.addJobSummaryContent(
        Output.generateMarkdown(target, results),
      );
    }
    if (inputs.requestedStrategy(OutputType.Comment)) {
      if (results.hasNotResolvedErrors()) {
        await Utils.addCommentToPR(Output.generateMarkdown(target, results));
      } else {
        core.info("Skipping comment generation: All errors are resolved.");
      }
    }
  } finally {
    core.endGroup();
  }
  if (inputs.requestedStrategy(OutputType.TerminalSummary)) {
    let summary = Output.generateSummary(results);
    if (summary.length > 0) {
      core.info(`\n\n${summary}`);
    }
  }
  // Set the action msg
  core.setFailed(Output.getActionFailedMessage(results));
}

main();

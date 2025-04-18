import * as core from "@actions/core";
import { Utils } from "./utils/utils";
import { ActionResults, Output, OutputType } from "./utils/output";
import { ActionInputs } from "./utils/input";
import { ValidationManager } from "./validationManager";

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
        reportResults(inputs, results);
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
    results.appendValidationError(error);
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
    results.appendTestError(error);
  }
}

async function reportResults(inputs: ActionInputs, results: ActionResults) {
  if (!results.hasErrors()) {
    core.info(Output.ACTION_SUCCESS_MSG);
    return;
  }
  let summary = Output.generateSummary(results);
  if (summary.length > 0) {
    core.info(summary);
  }
  if (inputs.requestedStrategy(OutputType.JobSummary)) {
    await Utils.addJobSummaryContent(Output.generateMarkdown(results));
  }
  if (inputs.requestedStrategy(OutputType.Comment)) {
    await Utils.addCommentToPR(Output.generateSummary(results));
  }
  // Set the action msg
  core.setFailed(results.getActionErrorMessage());
}

main();

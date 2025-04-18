import * as core from "@actions/core";
import { ActionInputs, Utils } from "./utils/utils";
import { ActionResults } from "./utils/output";
import { ValidationManager } from "./validationManager";

async function main() {
  try {
    core.info("Action Version: " + require("../package.json").version);
    // Initialize the action
    const inputs = new ActionInputs();
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
        if (!validated || !inputs.runTargetTests()) {
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
    results.AppendError(error);
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
    results.AppendError(error);
  }
}

function reportResults(inputs: ActionInputs, results: ActionResults) {
  if (!results.hasErrors()) {
    return;
  }
  core.setFailed(results.getErrorMessage());
}

main();

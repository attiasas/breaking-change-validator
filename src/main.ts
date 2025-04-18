import * as core from "@actions/core";
import { ActionInputs, Utils } from "./utils";
import { ActionResults } from "./output";
import { TechManager } from "./techManager";

async function main() {
  // Initialize the action
  const inputs = new ActionInputs();
  const results: ActionResults = new ActionResults();
  const techManager = new TechManager();
  core.info("Action Version: " + require("../package.json").version);
  try {
    // Instantiate the technology manager with the source directory
    await techManager.init(inputs.sourceDir);
    // Clone the target repository
    let targetDir = await Utils.cloneRepository(inputs);
    // Prepare the target for the actions
    await techManager.installTarget(techManager.source, targetDir);
    // Validate the target
    await runActionOnTarget(targetDir, results, async (targetDir) => {
      await techManager.validateTarget(targetDir);
    });
    if (!inputs.runTargetTests()) {
      core.debug("Skipping target tests");
      return;
    }
    // Run the target tests
    await runActionOnTarget(targetDir, results, async (targetDir) => {
      await Utils.runTests(inputs, targetDir);
    });
  } catch (error: any) {
    results.AppendError(error);
  } finally {
    reportResults(inputs, results);
  }
}

async function runActionOnTarget(
  targetDir: string,
  results: ActionResults,
  action: (targetDir: string) => Promise<void>,
) {
  try {
    await action(targetDir);
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

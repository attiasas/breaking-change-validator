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
import { RemediationManager } from "./remediationManager";

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
    if (
      (await validateTarget(validationManager, targetDir, results)) &&
      inputs.shouldRunTargetTests()
    ) {
      // Run the target tests only if the validation passed
      await testTarget(inputs, targetDir, results);
    }
    // Check if the issues are resolved
    await checkRemediation(inputs, results);
    // Output the results
    reportResults(inputs.repositoryName, inputs, results);
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

async function checkRemediation(inputs: ActionInputs, results: ActionResults) {
  if (!results.hasActionErrors()) {
    core.debug(
      "No issues found in the target repository, no need to check remediation.",
    );
    return;
  }
  if (!inputs.shouldCheckRemediation()) {
    core.debug("Skipping remediation check.");
    for (const error of results.getActionErrors()) {
      if (error.hint === undefined) {
        error.hint =
          !inputs.remediationLabel || inputs.remediationLabel.length === 0
            ? `Add the ${ActionInputs.REMEDIATION_LABEL_ARG} input to the action to enable remediation.`
            : `Add the ${inputs.remediationLabel} label to the PR to mark this issue as resolved.`;
      }
    }
    return;
  }
  await RemediationManager.checkRemediation(
    results,
    inputs.hasRemediationLabel() ? inputs.remediationLabel : undefined,
    inputs.gitHubToken,
  );
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
        await Utils.addCommentToPR(
          Output.generateMarkdown(target, results),
          inputs.gitHubToken,
        );
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
      core.info(`\n${summary}\n`);
    }
  }
  // Set the action msg
  core.setFailed(Output.getActionFailedMessage(results));
}

main();

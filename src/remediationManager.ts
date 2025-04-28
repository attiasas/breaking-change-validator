import * as core from "@actions/core";
import { ActionErrorType, ActionResults, Output } from "./utils/output";
import { Utils } from "./utils/utils";

export enum RemediationType {
  RemediationLabel = "RemediationLabel",
}

export class RemediationManager {
  public static async checkRemediation(
    results: ActionResults,
    remediationLabel?: string,
    gitHubToken?: string,
  ) {
    try {
      core.startGroup("Checking remediation...");
      if (remediationLabel) {
        if (await Utils.isLabelExists(remediationLabel, gitHubToken)) {
          this.markResolvedWithLabel(remediationLabel, results);
        } else {
          // Add hint to all not resolved errors without hints that the label does not exist
          for (const error of results.getActionErrors()) {
            if (!error.isResolved() && error.hint === undefined) {
              error.hint = `Add the ${remediationLabel} label to the PR to mark this issue as resolved.`;
            }
          }
        }
      }
      return true;
    } catch (error: any) {
      core.error(`Error checking remediation: ${error.message}`);
    } finally {
      core.endGroup();
    }
  }

  private static markResolvedWithLabel(label: string, results: ActionResults) {
    results.addRemediationEvidence(
      ActionErrorType.ValidationError,
      Output.getRemediationLabelEvidenceString(label),
    );
    results.addRemediationEvidence(
      ActionErrorType.TestError,
      Output.getRemediationLabelEvidenceString(label),
    );
  }
}

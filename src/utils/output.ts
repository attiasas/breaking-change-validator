import { CommandError, ErrorWithHint } from "./utils";

export enum ActionErrorType {
  ValidationError = "Breaking Change",
  TestError = "Test Command",
}

class ActionError {
  public readonly remediationEvidences: string[] = [];
  constructor(
    public readonly type: ActionErrorType,
    public readonly issue: string,
    public readonly stdErr?: string,
    public readonly hint?: string,
  ) {}

  public addRemediationEvidence(evidence: string): void {
    this.remediationEvidences.push(evidence);
  }

  public isResolved(): boolean {
    return this.remediationEvidences.length > 0;
  }
}

export class ActionResults {
  private readonly _actionErrors: ActionError[] = [];
  private readonly _generalErrors: Error[] = [];

  public appendError(error: any, type?: ActionErrorType): void {
    if (error instanceof ActionError) {
      // Already processed
      this._actionErrors.push(error);
      return;
    }
    if (!(error instanceof Error)) {
      // Nothing to do
      return;
    }
    // Filter out all errors that are not supported by the action
    if (!type || !(error instanceof ErrorWithHint)) {
      this._generalErrors.push(error);
      return;
    }
    let stdErr = error instanceof CommandError ? error.stderr : undefined;
    // Error that the action considers as a validation error
    this._actionErrors.push(new ActionError(type, error.message, stdErr, error.hint));
  }

  public addRemediationEvidence(type : ActionErrorType, evidence: string): void {
    // add evidence to all errors of the same type
    for (const error of this._actionErrors) {
      if (error.type === type) {
        error.addRemediationEvidence(evidence);
      }
    } 
  }

  public get generalErrors(): Error[] {
    return this._generalErrors;
  }

  public hasErrors(): boolean {
    return this.generalErrors.length > 0 || this.hasActionErrors();
  }

  public hasActionErrors(): boolean {
    return this._actionErrors.length > 0;
  }

  public hasNotResolvedErrors(): boolean {
    return this._actionErrors.some((error) => !error.isResolved());
  }

  public getActionErrors(type?: ActionErrorType): ActionError[] {
    return type ? this._actionErrors.filter((error) => error.type === type) : this._actionErrors;
  }
}

export enum OutputType {
  TerminalSummary = "Terminal Summary",
  JobSummary = "Job Summary",
  Comment = "PR Comment",
} 

export class Output {

  public static readonly ACTION_ERROR_MSG: string = `⛔️ Validation issues detected in the target repository.`;
  public static readonly ACTION_SUCCESS_MSG: string = `✅ No validation issues detected in the target repository.`;

  private static getStatusIcon(isResolved: boolean): string {
    return isResolved ? "✅" : "⚠️";
  }

  public static getActionFailedMessage(results: ActionResults): string {
    if (results.hasActionErrors()) {
      return Output.ACTION_ERROR_MSG;
    }
    let msg = [];
    for (const error of results.generalErrors) {
      msg.push(error.message);
    }
    return msg.join("\n");
  }

  public static generateSummary(results: ActionResults): string {
    let activeIssuesEntries = [];
    let resolvedIssuesEntries = [];
    // Process
    for (const error of results.getActionErrors()) {
      let isResolved = error.isResolved();
      // Add summary table entry
      let entryRow = `* ${this.getStatusIcon(isResolved)} ${this.getIssueTypeRowString(error.type)} --> ${error.issue}`;
      if (isResolved) {
        resolvedIssuesEntries.push(entryRow);
      } else {
        activeIssuesEntries.push(entryRow);
      }
    }
    // Output
    let out = `🚨 Detected ${activeIssuesEntries.length + resolvedIssuesEntries.length} issues.${resolvedIssuesEntries.length > 0 ? " (" + resolvedIssuesEntries.length + ")" : ""}\n\n`;
    if (activeIssuesEntries.length > 0) {
      out += activeIssuesEntries.join("\n");
    }
    if (resolvedIssuesEntries.length > 0) {
      if (activeIssuesEntries.length > 0) {
        // Mix of active and resolved issues, separate them
        out += "\n\n> Resolved:\n\n";
      }
      out += resolvedIssuesEntries.join("\n");
    }
    return out;
  }

  private static getIssueTypeRowString(type: ActionErrorType): string {
    // ValidationError is the most character long type, padding the others to match its length for better readability
    let padding = " ".repeat(ActionErrorType.ValidationError.length - type.length);
    return `[${type}]` + padding;
  }

  public static generateMarkdown(
    targetName: string,
    results: ActionResults,
  ): string {
    let activeIssuesTableEntries = [];
    let resolvedIssuesTableEntries = [];
    // Process
    for (const error of results.getActionErrors()) {
      let isResolved = error.isResolved();
      // Add summary table entry
      let tableEntry = `| ${this.getStatusIcon(isResolved)} | ${error.type} | ${error.issue} | ${this.getIssueDetailsString(error)} |`;
      if (isResolved) {
        resolvedIssuesTableEntries.push(tableEntry);
      } else {
        activeIssuesTableEntries.push(tableEntry);
      }
    }
    let activeCount = activeIssuesTableEntries.length;
    let resolvedCount = resolvedIssuesTableEntries.length;
    // Output
    let title = `## 🔍 ${targetName} validation results` + Output.getIssueCountTitleString(activeCount, resolvedCount);
    if (activeCount === 0 && resolvedCount === 0) {
      return `${title}\n\n${Output.ACTION_SUCCESS_MSG}`;
    }
    let table = `| Status | Validation | Issue | Details |\n| --- | --- | --- | --- |`;
    // Add all entries, sorted by status
    if (activeCount > 0) {
      table += `\n${activeIssuesTableEntries.join("\n")}`;
    }
    if (resolvedCount > 0) {
      table += `\n${resolvedIssuesTableEntries.join("\n")}`;
    }
    return `${title}\n\n${table}`;
  }

  private static getIssueDetailsString(error: ActionError): string {
    let details = "";
    if (error.hint && !error.isResolved()) {
      // Display hint only if the error is not resolved
      details += this.getDetailsTag("💡 Hint", `<br>${this.wrapStringWithQuote(error.hint)}`);
    }
    if (error.remediationEvidences.length > 0) {
      details += this.getDetailsTag("🧹 Remediation Evidence", error.remediationEvidences.reduce((acc, evidence) => acc + `<br> * ${this.wrapStringWithQuote(evidence)}`, ""));
    }
    if (error.stdErr && error.stdErr.length > 0) {
      details += this.getDetailsTag("🗯️ Error", this.getStdErrString(error.stdErr));
    }
    return details;
  }

  private static getStdErrString(raw: string, limitLines: number = 0): string {
    let out = "";
    let parsedLines = 0;
    for (const line of raw.split("\n")) {
      if (line.length == 0) {
        // Skip empty lines
        continue;
      }
      // Add <br> (replacing \n) if not the first line and wrap the line in quote (to `escape` in table)
      out += `${parsedLines > 0 ? "<br>" : ""}${this.wrapStringWithQuote(line)}`;
      // Check if limit requested and reached
      parsedLines++;
      if (limitLines > 0 && parsedLines >= limitLines) {
        break;
      }
    }
    return out;
  }

  private static getIssueCountTitleString(activeCount: number, resolvedCount: number): string {
    if (activeCount === 0 && resolvedCount === 0) {
      return "";
    }
    let out = ` - Found `;
    if (resolvedCount == 0 || activeCount == 0) {
      return out + `${this.getColoredTag(activeCount, resolvedCount == 0 ? Color.IssueColor : Color.ResolvedColor)} Issues.${activeCount == 0 ? " All resolved" : ""}`;
    }
    return out + `${this.getColoredTag(activeCount + resolvedCount, Color.MixedColor)} Issues. ( ${this.getColoredTag(activeCount, Color.IssueColor)} active, ${this.getColoredTag(resolvedCount, Color.ResolvedColor)} resolved )`; 
  }

  private static wrapStringWithQuote(str: string): string {
    return "`" + str + "`";
  }

  private static getDetailsTag(title: string, details: string): string {
    return `<details><summary>${title}</summary><p>${details}</p></details>`;
  }

  private static getColoredTag(str: number, color: Color): string {
    return `<span style="color:${color}">${str}</span>`;
  }
}

enum Color {
  IssueColor = `red`,
  ResolvedColor = `lightgreen`,
  MixedColor = `yellow`
}
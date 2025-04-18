import { CommandError } from "./utils";

export class ActionResults {
  private readonly _validationErrors: CommandError[] = [];
  private readonly _testErrors: CommandError[] = [];

  private readonly _generalErrors: Error[] = [];

  public appendValidationError(error: any): void {
    this.appendError(this._validationErrors, error);
  }

  public appendTestError(error: any): void {
    this.appendError(this._testErrors, error);
  }

  private appendError(container: CommandError[], error: any): void {
    if (error instanceof CommandError) {
      container.push(error);
      return;
    }
    if (error instanceof Error) {
      this._generalErrors.push(error);
      return;
    }
  }

  public hasErrors(): boolean {
    return this._generalErrors.length > 0 || this.hasActionErrors();
  }

  public hasActionErrors(): boolean {
    return this._validationErrors.length > 0 || this._testErrors.length > 0;
  }

  public getActionErrors(): CommandError[] {
    return [...this._validationErrors, ...this._testErrors];
  }

  public get generalErrors(): Error[] {
    return this._generalErrors;
  }
  public get validationErrors(): CommandError[] {
    return this._validationErrors;
  }
  public get testErrors(): CommandError[] {
    return this._testErrors;
  }

  public getActionErrorMessage(): string {
    if (this.hasActionErrors()) {
      return Output.ACTION_ERROR_MSG;
    }
    let msg = [];
    for (const error of this._generalErrors) {
      msg.push(error.message);
    }
    return msg.join("\n");
  }
}

export enum OutputType {
  JobSummary = "JobSummary",
  Comment = "PR Comment",
} 

export class Output {

  public static readonly ACTION_ERROR_MSG: string = `⛔️ Breaking changes detected in the target repository.`;
  public static readonly ACTION_SUCCESS_MSG: string = `✅ No breaking changes detected in the target repository.`;

  public static generateSummary(
    results: ActionResults
  ): string {
    let validationErrorCount = results.validationErrors.length;
    let testErrorCount = results.testErrors.length;
    let generalErrorCount = results.generalErrors.length;
    let out = `Action Summary: found ${validationErrorCount + testErrorCount} validation errors.\n`;
    if (validationErrorCount > 0) {
      out += `* Validation errors: ${validationErrorCount}\n`;
      for (let i = 0; i < validationErrorCount; i++) {
        out += ` (${i + 1}) ${results.validationErrors[i]}\n`;
      }
    }
    if (testErrorCount > 0) {
      out += `* Test errors: ${testErrorCount}\n`;
      for (let i = 0; i < testErrorCount; i++) {
        out += ` (${i + 1}) ${results.testErrors[i]}\n`;
      }
    }
    if (generalErrorCount > 0) {
      out += `* General errors: ${generalErrorCount}\n`;
      for (let i = 0; i < generalErrorCount; i++) {
        out += ` (${i + 1}) ${results.generalErrors[i]}\n`;
      }
    }
    return out;
  }

  public static generateMarkdown(
    results: ActionResults,
  ): string {
    let summary = "# 🔍 Breaking Changes Validator";
    if (!results.hasErrors()) {
      return summary + `\n\n${Output.ACTION_SUCCESS_MSG}`;
    }
    let table = "| Source | Handled | Error |\n|-------|-------|--------|\n";
    for (const error of results.validationErrors) {
      table += `| Validation | ❌ ${error.hint ? "Hint: " + error.hint : ""} | ${error.stderr} |\n`;
    }
    for (const error of results.testErrors) {
      table += `| Test | ❌ ${error.hint ? "Hint: " + error.hint : ""} | ${error.stderr} |\n`;
    }
    return `${summary}\n\n## ⚠️ Detected Errors\n\n${table}`;
  }


}
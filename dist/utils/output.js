"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Output = exports.OutputType = exports.ActionResults = void 0;
const utils_1 = require("./utils");
class ActionResults {
    constructor() {
        this._validationErrors = [];
        this._testErrors = [];
        this._generalErrors = [];
    }
    appendValidationError(error) {
        this.appendError(this._validationErrors, error);
    }
    appendTestError(error) {
        this.appendError(this._testErrors, error);
    }
    appendError(container, error) {
        if (error instanceof utils_1.CommandError) {
            container.push(error);
            return;
        }
        if (error instanceof Error) {
            this._generalErrors.push(error);
            return;
        }
    }
    hasErrors() {
        return this._generalErrors.length > 0 || this.hasActionErrors();
    }
    hasActionErrors() {
        return this._validationErrors.length > 0 || this._testErrors.length > 0;
    }
    getActionErrors() {
        return [...this._validationErrors, ...this._testErrors];
    }
    get generalErrors() {
        return this._generalErrors;
    }
    get validationErrors() {
        return this._validationErrors;
    }
    get testErrors() {
        return this._testErrors;
    }
    getActionErrorMessage() {
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
exports.ActionResults = ActionResults;
var OutputType;
(function (OutputType) {
    OutputType["JobSummary"] = "JobSummary";
    OutputType["Comment"] = "PR Comment";
})(OutputType || (exports.OutputType = OutputType = {}));
class Output {
    static generateSummary(results) {
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
    static generateMarkdown(results) {
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
exports.Output = Output;
Output.ACTION_ERROR_MSG = `⛔️ Breaking changes detected in the target repository.`;
Output.ACTION_SUCCESS_MSG = `✅ No breaking changes detected in the target repository.`;

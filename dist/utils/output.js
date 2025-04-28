"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Output = exports.OutputType = exports.ActionResults = exports.ActionErrorType = void 0;
const utils_1 = require("./utils");
var ActionErrorType;
(function (ActionErrorType) {
    ActionErrorType["ValidationError"] = "Breaking Change";
    ActionErrorType["TestError"] = "Test Command";
})(ActionErrorType || (exports.ActionErrorType = ActionErrorType = {}));
class ActionError {
    constructor(type, issue, stdErr, hint) {
        this.type = type;
        this.issue = issue;
        this.stdErr = stdErr;
        this.hint = hint;
        this.remediationEvidences = [];
    }
    addRemediationEvidence(evidence) {
        this.remediationEvidences.push(evidence);
    }
    isResolved() {
        return this.remediationEvidences.length > 0;
    }
}
class ActionResults {
    constructor() {
        this._actionErrors = [];
        this._generalErrors = [];
    }
    appendError(error, type) {
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
        if (!type || !(error instanceof utils_1.ErrorWithHint)) {
            this._generalErrors.push(error);
            return;
        }
        let stdErr = error instanceof utils_1.CommandError ? error.stderr : undefined;
        // Error that the action considers as a validation error
        this._actionErrors.push(new ActionError(type, error.message, stdErr, error.hint));
    }
    addRemediationEvidence(type, evidence) {
        // add evidence to all errors of the same type
        for (const error of this._actionErrors) {
            if (error.type === type) {
                error.addRemediationEvidence(evidence);
            }
        }
    }
    get generalErrors() {
        return this._generalErrors;
    }
    hasErrors() {
        return this.generalErrors.length > 0 || this.hasActionErrors();
    }
    hasActionErrors() {
        return this._actionErrors.length > 0;
    }
    hasNotResolvedErrors() {
        return this._actionErrors.some((error) => !error.isResolved());
    }
    getActionErrors(type) {
        return type ? this._actionErrors.filter((error) => error.type === type) : this._actionErrors;
    }
}
exports.ActionResults = ActionResults;
var OutputType;
(function (OutputType) {
    OutputType["TerminalSummary"] = "Terminal Summary";
    OutputType["JobSummary"] = "Job Summary";
    OutputType["Comment"] = "PR Comment";
})(OutputType || (exports.OutputType = OutputType = {}));
class Output {
    static getRemediationLabelEvidenceString(label) {
        return `🏷️ [Found ${this.wrapStringWithQuote(label)} label]`;
    }
    static getStatusIcon(isResolved) {
        return isResolved ? "✅" : "⚠️";
    }
    static getActionFailedMessage(results) {
        if (results.hasActionErrors()) {
            return Output.ACTION_ERROR_MSG;
        }
        let msg = [];
        for (const error of results.generalErrors) {
            msg.push(error.message);
        }
        return msg.join("\n");
    }
    static generateSummary(results) {
        let activeIssuesEntries = [];
        let resolvedIssuesEntries = [];
        // Process
        for (const error of results.getActionErrors()) {
            let isResolved = error.isResolved();
            // Add summary table entry
            let entryRow = `* ${this.getStatusIcon(isResolved)} ${this.getIssueTypeRowString(error.type)} --> ${error.issue}`;
            if (isResolved) {
                resolvedIssuesEntries.push(entryRow);
            }
            else {
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
    static getIssueTypeRowString(type) {
        // ValidationError is the most character long type, padding the others to match its length for better readability
        let padding = " ".repeat(ActionErrorType.ValidationError.length - type.length);
        return `[${type}]` + padding;
    }
    static generateMarkdown(targetName, results) {
        let activeIssuesTableEntries = [];
        let resolvedIssuesTableEntries = [];
        // Process
        for (const error of results.getActionErrors()) {
            let isResolved = error.isResolved();
            // Add summary table entry
            let tableEntry = `| ${this.getStatusIcon(isResolved)} | ${error.type} | ${error.issue} | ${this.getIssueDetailsString(error)} |`;
            if (isResolved) {
                resolvedIssuesTableEntries.push(tableEntry);
            }
            else {
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
    static getIssueDetailsString(error) {
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
    static getStdErrString(raw, limitLines = 0) {
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
    static getIssueCountTitleString(activeCount, resolvedCount) {
        if (activeCount === 0 && resolvedCount === 0) {
            return "";
        }
        let out = ` - Found `;
        if (resolvedCount == 0 || activeCount == 0) {
            return out + `${this.getColoredTag(activeCount, resolvedCount == 0 ? Color.IssueColor : Color.ResolvedColor)} Issues.${activeCount == 0 ? " All resolved" : ""}`;
        }
        return out + `${this.getColoredTag(activeCount + resolvedCount, Color.MixedColor)} Issues. ( ${this.getColoredTag(activeCount, Color.IssueColor)} active, ${this.getColoredTag(resolvedCount, Color.ResolvedColor)} resolved )`;
    }
    static wrapStringWithQuote(str) {
        return "`" + str + "`";
    }
    static getDetailsTag(title, details) {
        return `<details><summary>${title}</summary><p>${details}</p></details>`;
    }
    static getColoredTag(str, color) {
        return `<span style="color:${color}">${str}</span>`;
    }
}
exports.Output = Output;
Output.ACTION_COMMENT_MARK = `[comment]: <> (BREAKING_CHANGE_VALIDATOR)`;
Output.ACTION_ERROR_MSG = `⛔️ Validation issues detected in the target repository.`;
Output.ACTION_SUCCESS_MSG = `✅ No validation issues detected in the target repository.`;
var Color;
(function (Color) {
    Color["IssueColor"] = "red";
    Color["ResolvedColor"] = "lightgreen";
    Color["MixedColor"] = "yellow";
})(Color || (Color = {}));

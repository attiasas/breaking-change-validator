"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionInputs = void 0;
const core = __importStar(require("@actions/core"));
const output_1 = require("./output");
const utils_1 = require("./utils");
class ActionInputs {
    constructor() {
        this.outputStrategy = [];
        this.sourceDir = process.env.GITHUB_WORKSPACE || "";
        // Target config
        this.repositoryUrl = core.getInput(ActionInputs.REPOSITORY_URL_ARG, {
            required: true,
        });
        this.repositoryBranch = core.getInput(ActionInputs.REPOSITORY_BRANCH_ARG);
        // Test config
        this.testCommand = core.getInput(ActionInputs.TEST_COMMAND_ARG);
        // Output config
        const outputStrategy = core.getInput(ActionInputs.OUTPUT_STRATEGY_ARG);
        if (outputStrategy) {
            const outputTypes = outputStrategy.split(",").map((type) => type.trim());
            this.outputStrategy = outputTypes.map((type) => ActionInputs.toOutputType(type));
        }
        // Remediation config
        this.remediationLabel = core.getInput(ActionInputs.REMEDIATION_LABEL_ARG);
        // Github token for optional operations
        this.gitHubToken = process.env[ActionInputs.SOURCE_GIT_TOKEN_ENV];
        if (!this.gitHubToken || this.gitHubToken.length === 0) {
            if (this.requestedStrategy(output_1.OutputType.Comment)) {
                throw new utils_1.ErrorWithHint(`GitHub token is required but not provided for comment generation.`, `Set the ${ActionInputs.SOURCE_GIT_TOKEN_ENV} environment variable with "pull_request: write" permission.`);
            }
            if (this.hasRemediationLabel()) {
                throw new utils_1.ErrorWithHint(`GitHub token is required but not provided for label remediation.`, `Set the ${ActionInputs.SOURCE_GIT_TOKEN_ENV} environment variable.`);
            }
        }
    }
    static toOutputType(type) {
        switch (type.toLowerCase()) {
            case "terminal":
                return output_1.OutputType.TerminalSummary;
            case "summary":
                return output_1.OutputType.JobSummary;
            case "comment":
                return output_1.OutputType.Comment;
            default:
                throw new utils_1.ErrorWithHint(`Invalid output type: ${type}`, `must be one of [terminal, summary, comment]`);
        }
    }
    shouldRunTargetTests() {
        return this.testCommand.length > 0;
    }
    requestedStrategy(type) {
        return this.outputStrategy.includes(type);
    }
    hasRemediationLabel() {
        return this.remediationLabel.length > 0;
    }
    shouldCheckRemediation() {
        return this.hasRemediationLabel() && this.gitHubToken !== undefined;
    }
    get repositoryName() {
        const url = new URL(this.repositoryUrl);
        const pathParts = url.pathname.split("/");
        const repoName = pathParts[pathParts.length - 1];
        return repoName.replace(/\.git$/, "");
    }
    toString() {
        let remediation = undefined;
        if (this.hasRemediationLabel()) {
            remediation = {
                label: this.remediationLabel,
            };
        }
        let output = undefined;
        if (this.outputStrategy.length > 0) {
            output = `[${this.outputStrategy.map((type) => type.toString()).join(", ")}]`;
        }
        return JSON.stringify({
            actions: {
                validation: "true",
                customTestCommand: this.shouldRunTargetTests(),
            },
            output: output,
            remediation: remediation,
        }, undefined, 1) + "\n";
    }
}
exports.ActionInputs = ActionInputs;
// The repository Clone URL to be validated
ActionInputs.REPOSITORY_URL_ARG = "repository";
// The repository branch to be validated
ActionInputs.REPOSITORY_BRANCH_ARG = "branch";
// The command to run the tests if any
ActionInputs.TEST_COMMAND_ARG = "test_command";
// Array, comma delimited, The strategy to use for output (terminal, job summary, comment)
ActionInputs.OUTPUT_STRATEGY_ARG = "output_strategy";
// If provided and the label exists, the action will consider the issues as resolved
ActionInputs.REMEDIATION_LABEL_ARG = "remediation_label";
// The environment variable to use for the GitHub token
ActionInputs.SOURCE_GIT_TOKEN_ENV = "GITHUB_TOKEN";

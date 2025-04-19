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
class ActionInputs {
    constructor() {
        this.outputStrategy = [output_1.OutputType.TerminalSummary, output_1.OutputType.JobSummary];
        this.sourceDir = process.env.GITHUB_WORKSPACE || "";
        // Target config
        this.repositoryUrl = core.getInput(ActionInputs.REPOSITORY_URL_ARG, {
            required: true,
        });
        this.repositoryBranch = core.getInput(ActionInputs.REPOSITORY_BRANCH_ARG);
        // Test config
        this.testCommand = core.getInput(ActionInputs.TEST_COMMAND_ARG);
        // Output config
        let tokenForCommentGeneration = process.env.COMMENT_GENERATION_TOKEN;
        if (tokenForCommentGeneration) {
            // Optional token for comment generation
            if (tokenForCommentGeneration.length > 0) {
                this.gitHubToken = tokenForCommentGeneration;
                this.outputStrategy.push(output_1.OutputType.Comment);
            }
            else {
                core.warning("COMMENT_GENERATION_TOKEN is empty. Comment generation will be skipped.");
            }
        }
    }
    shouldRunTargetTests() {
        return this.testCommand.length > 0;
    }
    requestedStrategy(type) {
        return this.outputStrategy.includes(type);
    }
    toString() {
        return JSON.stringify({
            actions: {
                validation: "true",
                customTestCommand: this.shouldRunTargetTests(),
            },
            output: this.outputStrategy,
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

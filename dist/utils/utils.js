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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandError = exports.ErrorWithHint = exports.Utils = void 0;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const github = __importStar(require("@actions/github"));
const input_1 = require("./input");
const output_1 = require("./output");
class Utils {
    static cloneRepository(inputs) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                core.startGroup("Cloning target repository");
                const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-repo-"));
                const cloneArgs = ["git", "clone", inputs.repositoryUrl, tempDir];
                if (inputs.repositoryBranch) {
                    cloneArgs.splice(2, 0, "--branch", inputs.repositoryBranch, "--single-branch");
                }
                core.info(`Cloning ${inputs.repositoryUrl} ${inputs.repositoryBranch ? "(@" + inputs.repositoryBranch + ")" : ""} to ${tempDir}`);
                yield Utils.runCommand(cloneArgs);
                core.info(`Cloned target repository to ${tempDir}`);
                return tempDir;
            }
            finally {
                core.endGroup();
            }
        });
    }
    static runTests(inputs, targetDir) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                core.startGroup("Running tests...");
                const testCmd = core.getInput("test_command");
                core.info(`Running: ${inputs.testCommand}`);
                yield Utils.runCommand(["sh", "-c", inputs.testCommand], { cwd: targetDir });
                core.info("Tests passed");
            }
            finally {
                core.endGroup();
            }
        });
    }
    static addCommentToPR(content, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!token) {
                    throw new ErrorWithHint("GitHub token is required but not provided.", `Set the ${input_1.ActionInputs.SOURCE_GIT_TOKEN_ENV} environment variable.`);
                }
                const octokit = github.getOctokit(token);
                const context = github.context;
                if (!context.payload.pull_request) {
                    throw new Error("This action can only run on pull requests.");
                }
                const { owner, repo } = context.repo;
                const pull_number = context.payload.pull_request.number;
                core.info(`Adding comment to PR #${pull_number} in ${owner}/${repo}`);
                try {
                    yield octokit.rest.issues.createComment({
                        owner,
                        repo,
                        issue_number: pull_number,
                        body: `\n\n${output_1.Output.ACTION_COMMENT_MARK}\n${content}`,
                    });
                }
                catch (error) {
                    throw new ErrorWithHint(error.message, "Make sure the workflow contains `pull-requests: write` permission.");
                }
                core.info("Comment added successfully.");
                return true;
            }
            catch (error) {
                core.warning(`Failed to add comment to PR: ${error.message}`);
                return false;
            }
        });
    }
    static getPullRequestBranch(cloneUrl, prNumber, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!token) {
                    throw new ErrorWithHint("GitHub token is required but not provided.", `Set the ${input_1.ActionInputs.SOURCE_GIT_TOKEN_ENV} environment variable.`);
                }
                const octokit = github.getOctokit(token);
                const { owner, repo } = this.splitUrl(cloneUrl);
                const { data: pullRequest } = yield octokit.rest.pulls.get({
                    owner,
                    repo,
                    pull_number: prNumber,
                });
                return pullRequest.head.ref;
            }
            catch (error) {
                core.warning(`Failed to get pull request branch: ${error.message}`);
                return undefined;
            }
        });
    }
    static getCurrentPullRequestNumber() {
        const context = github.context;
        if (context.payload.pull_request) {
            return context.payload.pull_request.number;
        }
        else if (context.payload.issue) {
            return context.payload.issue.number;
        }
        else {
            core.warning("No pull request or issue found in the context.");
            return undefined;
        }
    }
    static isLabelExists(label, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!token) {
                    throw new ErrorWithHint("GitHub token is required but not provided.", `Set the ${input_1.ActionInputs.SOURCE_GIT_TOKEN_ENV} environment variable.`);
                }
                const context = github.context;
                // Make sure we are in PR context
                if (!context.payload.pull_request) {
                    return false;
                }
                const octokit = github.getOctokit(token);
                const { owner, repo } = context.repo;
                const labels = yield octokit.rest.issues.listLabelsForRepo({
                    owner,
                    repo,
                    issue_number: context.payload.pull_request.number,
                });
                core.info(`Labels in PR: ${JSON.stringify(labels.data)}`);
                const labelExists = labels.data.some((l) => l.name === label);
                if (labelExists) {
                    core.info(`Label "${label}" exists in the repository.`);
                }
                else {
                    core.info(`Label "${label}" does not exist in the repository.`);
                }
                return labelExists;
            }
            catch (error) {
                core.warning(`Failed to check if label exists: ${error.message}`);
                return false;
            }
        });
    }
    static splitUrl(url) {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split("/");
        const owner = pathParts[pathParts.length - 2];
        const repo = pathParts[pathParts.length - 1].replace(/\.git$/, "");
        return { owner, repo };
    }
    static addJobSummaryContent(content_1) {
        return __awaiter(this, arguments, void 0, function* (content, override = false) {
            try {
                core.info("Adding job summary content...");
                core.summary.addRaw(content);
                yield core.summary.write({ overwrite: override });
                core.info("Job summary content added successfully.");
                return true;
            }
            catch (error) {
                core.warning(`Failed to ${override ? "override" : "add"} job summary content: ${error.message}`);
                return false;
            }
        });
    }
    static runCommand(cmd, cmdOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            if (cmd.length === 0 || cmd[0].length === 0) {
                throw new Error("Command is empty");
            }
            let command = cmd[0];
            let args = undefined;
            if (cmd.length > 1) {
                args = cmd.slice(1);
            }
            let stdout = "";
            let stderr = "";
            const options = {
                cwd: cmdOptions === null || cmdOptions === void 0 ? void 0 : cmdOptions.cwd,
                env: cmdOptions === null || cmdOptions === void 0 ? void 0 : cmdOptions.env,
                silent: cmdOptions === null || cmdOptions === void 0 ? void 0 : cmdOptions.silent,
                ignoreReturnCode: true,
                listeners: {
                    stdout: (data) => {
                        stdout += data.toString();
                    },
                    stderr: (data) => {
                        let str = data.toString();
                        if (cmdOptions === null || cmdOptions === void 0 ? void 0 : cmdOptions.stdErrFilter) {
                            str = cmdOptions.stdErrFilter(str);
                        }
                        stderr += str;
                    },
                },
            };
            const exitCode = yield exec.exec(command, args, options);
            if (exitCode !== 0) {
                throw new CommandError(cmd.join(" "), stderr, exitCode, cmdOptions === null || cmdOptions === void 0 ? void 0 : cmdOptions.hint);
            }
            return stdout;
        });
    }
}
exports.Utils = Utils;
class ErrorWithHint extends Error {
    constructor(message, hint) {
        super(message);
        this._hint = hint;
    }
    get hint() {
        return this._hint;
    }
    toString() {
        return `${this.message}${this._hint ? `\nHint: ${this._hint}` : ""}`;
    }
}
exports.ErrorWithHint = ErrorWithHint;
class CommandError extends ErrorWithHint {
    constructor(command, stderr, exitCode, hint) {
        super(`CommandError: ${command} failed with exit code ${exitCode}`, hint);
        this.stderr = stderr;
        this.exitCode = exitCode;
    }
}
exports.CommandError = CommandError;

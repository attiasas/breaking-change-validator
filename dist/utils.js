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
exports.Utils = exports.ActionInputs = void 0;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
class ActionInputs {
    constructor() {
        this.repositoryUrl = core.getInput(ActionInputs.REPOSITORY_URL_ARG, {
            required: true,
        });
        this.repositoryBranch = core.getInput(ActionInputs.REPOSITORY_BRANCH_ARG);
        this.testCommand = core.getInput(ActionInputs.TEST_COMMAND_ARG);
        this.sourceDir = process.env.GITHUB_WORKSPACE || "";
    }
    runTargetTests() {
        return this.testCommand.length > 0;
    }
}
exports.ActionInputs = ActionInputs;
// The repository Clone URL to be validated
ActionInputs.REPOSITORY_URL_ARG = "repository";
// The repository branch to be validated
ActionInputs.REPOSITORY_BRANCH_ARG = "branch";
// The command to run the tests if any
ActionInputs.TEST_COMMAND_ARG = "test_command";
class Utils {
    static cloneRepository(inputs) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                core.startGroup("Cloning target repository");
                const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-repo-"));
                const cloneArgs = ["clone", inputs.repositoryUrl, tempDir];
                if (inputs.repositoryBranch) {
                    cloneArgs.splice(2, 0, "--branch", inputs.repositoryBranch, "--single-branch");
                }
                core.info(`Cloning ${inputs.repositoryUrl} ${inputs.repositoryBranch ? "(@" + inputs.repositoryBranch + ")" : ""} to ${tempDir}`);
                yield exec.exec("git", cloneArgs);
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
                yield exec.exec("sh", ["-c", inputs.testCommand], { cwd: targetDir });
                core.info("Tests passed");
            }
            finally {
                core.endGroup();
            }
        });
    }
}
exports.Utils = Utils;

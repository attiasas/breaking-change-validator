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
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Step 1: Extract PR module path
            const workspace = process.env.GITHUB_WORKSPACE || "";
            const mainGoMod = path.join(workspace, "go.mod");
            let prModule = "";
            if (fs.existsSync(mainGoMod)) {
                const content = fs.readFileSync(mainGoMod, "utf8");
                const match = content.match(/^module\s+(.+)$/m);
                if (match) {
                    prModule = match[1];
                    core.info(`PR module detected: ${prModule}`);
                }
                else {
                    core.warning("Could not parse module path from go.mod in workspace");
                }
            }
            else {
                core.warning("No go.mod found in PR workspace");
            }
            // Step 2: Download repository
            const repoUrl = core.getInput("repository", { required: true });
            const repoBranch = core.getInput("branch");
            const cloneDir = "repo-clone";
            const cloneArgs = ["clone", repoUrl, cloneDir];
            if (repoBranch) {
                cloneArgs.splice(2, 0, "--branch", repoBranch, "--single-branch");
            }
            core.info(`Cloning ${repoUrl} ${repoBranch ? "(@" + repoBranch + ")" : ""}`);
            yield exec.exec("git", cloneArgs);
            const repoPath = path.join(workspace, cloneDir);
            // Step 3: Append replace directive
            const gomodPath = path.join(repoPath, "go.mod");
            if (!fs.existsSync(gomodPath)) {
                throw new Error("go.mod not found in cloned repository");
            }
            if (prModule) {
                const replaceLine = `replace ${prModule} => ${workspace}`;
                fs.appendFileSync(gomodPath, `\n${replaceLine}\n`);
                core.info(`Appended: ${replaceLine}`);
            }
            let failed = false;
            // Step 4: Validate compilation (go vet)
            try {
                core.startGroup("go vet");
                yield exec.exec("go", ["vet", "./..."], { cwd: repoPath });
                core.info("go vet passed");
                core.endGroup();
            }
            catch (err) {
                failed = true;
                core.endGroup();
                core.error(`go vet failed: ${err.message}`);
            }
            // Step 5: Validate tests (optional)
            const testCmd = core.getInput("test_command");
            if (testCmd) {
                try {
                    core.startGroup("Test Command");
                    core.info(`Running: ${testCmd}`);
                    yield exec.exec("sh", ["-c", testCmd], { cwd: repoPath });
                    core.info("Tests passed");
                    core.endGroup();
                }
                catch (err) {
                    failed = true;
                    core.endGroup();
                    core.error(`Tests failed: ${err.message}`);
                }
            }
            // Step 6: Output validation results
            const failOnError = core.getBooleanInput("fail_on_test_error");
            if (failed) {
                const message = "Repository validation failed";
                if (failOnError)
                    core.setFailed(message);
                else
                    core.warning(message);
            }
            else {
                core.info("Repository validation succeeded");
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();

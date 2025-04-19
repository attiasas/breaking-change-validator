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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const utils_1 = require("./utils/utils");
const output_1 = require("./utils/output");
const input_1 = require("./utils/input");
const validationManager_1 = require("./validationManager");
const path_1 = __importDefault(require("path"));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            core.info(`🔍 Breaking Change Validator Github Action (version ${require("../package.json").version})`);
            // Initialize the action
            const inputs = new input_1.ActionInputs();
            core.info(inputs.toString());
            const results = new output_1.ActionResults();
            // Instantiate the validation manager with the source directory
            const validationManager = yield new validationManager_1.ValidationManager().init(inputs.sourceDir);
            // Clone the target repository
            let targetDir = yield utils_1.Utils.cloneRepository(inputs);
            // Prepare the target for the actions
            yield validationManager.installTarget(targetDir);
            // Validate the target
            yield validateTarget(validationManager, targetDir, results)
                .then((validated) => __awaiter(this, void 0, void 0, function* () {
                if (!validated || !inputs.shouldRunTargetTests()) {
                    return;
                }
                // Run the target tests
                yield testTarget(inputs, targetDir, results);
            }))
                .finally(() => {
                reportResults(path_1.default.basename(targetDir), inputs, results);
            });
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function validateTarget(validationManager, targetDir, results) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield validationManager.validateTarget(targetDir);
            return true;
        }
        catch (error) {
            results.appendError(error, output_1.ActionErrorType.ValidationError);
            return false;
        }
    });
}
function testTarget(inputs, targetDir, results) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield utils_1.Utils.runTests(inputs, targetDir);
        }
        catch (error) {
            results.appendError(error, output_1.ActionErrorType.TestError);
        }
    });
}
function reportResults(target, inputs, results) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!results.hasErrors()) {
            core.info(output_1.Output.ACTION_SUCCESS_MSG);
            return;
        }
        try {
            core.startGroup("Generating output...");
            if (inputs.requestedStrategy(output_1.OutputType.JobSummary)) {
                yield utils_1.Utils.addJobSummaryContent(output_1.Output.generateMarkdown(target, results));
            }
            if (inputs.requestedStrategy(output_1.OutputType.Comment)) {
                if (results.hasNotResolvedErrors()) {
                    yield utils_1.Utils.addCommentToPR(output_1.Output.generateMarkdown(target, results), inputs.gitHubToken);
                }
                else {
                    core.info("Skipping comment generation: All errors are resolved.");
                }
            }
        }
        finally {
            core.endGroup();
        }
        if (inputs.requestedStrategy(output_1.OutputType.TerminalSummary)) {
            let summary = output_1.Output.generateSummary(results);
            if (summary.length > 0) {
                core.info(`\n\n${summary}`);
            }
        }
        // Set the action msg
        core.setFailed(output_1.Output.getActionFailedMessage(results));
    });
}
main();

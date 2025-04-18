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
const utils_1 = require("./utils");
const output_1 = require("./output");
const techManager_1 = require("./techManager");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // Initialize the action
        const inputs = new utils_1.ActionInputs();
        const results = new output_1.ActionResults();
        const techManager = new techManager_1.TechManager();
        core.info("Action Version: " + require("../package.json").version);
        try {
            // Instantiate the technology manager with the source directory
            yield techManager.init(inputs.sourceDir);
            // Clone the target repository
            let targetDir = yield utils_1.Utils.cloneRepository(inputs);
            // Prepare the target for the actions
            yield techManager.installTarget(techManager.source, targetDir);
            // Validate the target
            yield runActionOnTarget(targetDir, results, (targetDir) => __awaiter(this, void 0, void 0, function* () {
                yield techManager.validateTarget(targetDir);
            }));
            if (!inputs.runTargetTests()) {
                core.debug("Skipping target tests");
                return;
            }
            // Run the target tests
            yield runActionOnTarget(targetDir, results, (targetDir) => __awaiter(this, void 0, void 0, function* () {
                yield utils_1.Utils.runTests(inputs, targetDir);
            }));
        }
        catch (error) {
            results.AppendError(error);
        }
        finally {
            reportResults(inputs, results);
        }
    });
}
function runActionOnTarget(targetDir, results, action) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield action(targetDir);
        }
        catch (error) {
            results.AppendError(error);
        }
    });
}
function reportResults(inputs, results) {
    if (!results.hasErrors()) {
        return;
    }
    core.setFailed(results.getErrorMessage());
}
main();

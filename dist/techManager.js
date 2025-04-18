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
exports.TechManager = void 0;
const core = __importStar(require("@actions/core"));
const goLang_1 = require("./technnologies/goLang");
class TechManager {
    constructor() {
        this._validators = [];
        this._validators.push(new goLang_1.GolangHandler());
    }
    get source() {
        if (this._source === undefined) {
            throw new Error("No source module found");
        }
        return this._source;
    }
    init(wd) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                core.startGroup("Parsing source repository");
                this._source = yield this.extractModule(wd);
                core.info(`Extracted module: ${JSON.stringify(this.source)}`);
            }
            finally {
                core.endGroup();
            }
        });
    }
    extractModule(targetDir) {
        return __awaiter(this, void 0, void 0, function* () {
            // Extract the module information from the target technology
            for (const validator of this._validators) {
                if (yield validator.isSupporting(targetDir)) {
                    return yield validator.extractModule(targetDir);
                }
            }
            throw new Error("No supported technology found");
        });
    }
    installTarget(source, targetDir) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                core.startGroup("Preparing target repository");
                let installed = [];
                // Install the target technology
                for (const validator of this._validators) {
                    if (yield validator.isSupporting(targetDir)) {
                        yield validator.install(source, targetDir);
                        installed.push(validator.constructor.name);
                    }
                }
                if (installed.length === 0) {
                    throw new Error("No supported technology found");
                }
                core.info(`Installed source module to target with ${installed.join(", ")}`);
            }
            finally {
                core.endGroup();
            }
        });
    }
    validateTarget(targetDir) {
        return __awaiter(this, void 0, void 0, function* () {
            let validated = [];
            try {
                core.startGroup(`Validating...`);
                // Validate the target technology
                for (const validator of this._validators) {
                    if (yield validator.isSupporting(targetDir)) {
                        yield validator.validate(targetDir);
                        validated.push(validator.constructor.name);
                    }
                }
                if (validated.length === 0) {
                    throw new Error("No supported technology found");
                }
                core.info("Validation passed with " + validated.join(", "));
            }
            finally {
                if (validated.length === 0) {
                    core.info(`Validation failed`);
                }
                core.endGroup();
            }
        });
    }
}
exports.TechManager = TechManager;

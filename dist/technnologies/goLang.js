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
exports.GolangHandler = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const exec = __importStar(require("@actions/exec"));
const core = __importStar(require("@actions/core"));
class GolangHandler {
    isSupporting(wd) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if the directory contains a go.mod file
            return fs.existsSync(path.join(wd, GolangHandler.DESCRIPTOR_FILE));
        });
    }
    extractModule(wd) {
        return __awaiter(this, void 0, void 0, function* () {
            const mainGoMod = path.join(wd, GolangHandler.DESCRIPTOR_FILE);
            const content = fs.readFileSync(mainGoMod, "utf8");
            const match = content.match(/^module\s+(.+)$/m);
            if (match) {
                return {
                    type: GolangHandler.GO_TYPE,
                    name: match[1],
                    path: mainGoMod,
                };
            }
            throw new Error("Could not parse module from go.mod");
        });
    }
    install(source, wd) {
        return __awaiter(this, void 0, void 0, function* () {
            if (source.type !== "golang") {
                throw new Error("Source Module type mismatch");
            }
            const goModPath = path.join(wd, GolangHandler.DESCRIPTOR_FILE);
            const replaceLine = `replace ${source.name} => ${path.dirname(source.path)}`;
            fs.appendFileSync(goModPath, `\n${replaceLine}\n`);
            core.info(`Appended: '${replaceLine}' to ${goModPath}`);
        });
    }
    validate(wd) {
        return __awaiter(this, void 0, void 0, function* () {
            // Run Golang validation command
            yield exec.exec("go", ["vet", "./..."], { cwd: wd });
        });
    }
}
exports.GolangHandler = GolangHandler;
GolangHandler.DESCRIPTOR_FILE = "go.mod";
GolangHandler.GO_TYPE = "golang";

import * as core from "@actions/core";
import { GolangHandler } from "./goLang";

export class TechManager {
    private _validators: TechValidator[] = [];
    private _source: Module | undefined;

    constructor() {
        this._validators.push(new GolangHandler());
    }

    public get source(): Module {
        if (this._source === undefined) {
            throw new Error("No source module found");
        }
        return this._source;
    }

    public async init(wd: string): Promise<string> {
        try {
            core.startGroup("Parsing source repository");
            this._source = await this.extractModule(wd);
            return JSON.stringify(this.source);
        } finally {
            core.endGroup();
        }
    }

    private async extractModule(targetDir: string): Promise<Module> {
        // Extract the module information from the target technology
        for (const validator of this._validators) {
            if (await validator.isSupporting(targetDir)) {
                return await validator.extractModule(targetDir);
            }
        }
        throw new Error("No supported technology found");
    }

    public async installTarget(source: Module, targetDir: string): Promise<void> {
        try {
            core.startGroup("Preparing target repository");
            let installed = false;
            // Install the target technology
            for (const validator of this._validators) {
                if (await validator.isSupporting(targetDir)) {
                    await validator.install(source, targetDir);
                    installed = true;
                }
            }
            if (!installed) {
                throw new Error("No supported technology found");
            }
        } finally {
            core.endGroup();
        }
    }

    public async validateTarget(targetDir: string): Promise<void> {
        try {
            core.startGroup("Validating...");
            let validated = false;
            // Validate the target technology
            for (const validator of this._validators) {
                if (await validator.isSupporting(targetDir)) {
                    await validator.validate(targetDir);
                    validated = true;
                }
            }
            if (!validated) {
                throw new Error("No supported technology found");
            }
            core.info("Validation passed");
        } finally {
            core.endGroup();
        }
    }
}

export abstract class TechValidator {
    public abstract isSupporting(wd: string): Promise<boolean>;
    public abstract extractModule(wd: string): Promise<Module>;
    public abstract install(source: Module, wd: string): Promise<void>;
    public abstract validate(wd: string): Promise<void>;
}

export interface Module {
    name: string;
    path: string;
    type: string;
}
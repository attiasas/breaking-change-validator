import * as core from "@actions/core";
import { GolangValidator } from "./validators/goLangValidator";
import { Module, TechValidator } from "./validators/techValidator";

export class ValidationManager {
  private _validators: TechValidator[] = [];
  private _source: Module | undefined;

  constructor() {
    this._validators.push(new GolangValidator());
  }

  public get source(): Module {
    if (this._source === undefined) {
      throw new Error("No source module found");
    }
    return this._source;
  }

  public async init(wd: string): Promise<ValidationManager> {
    try {
      core.startGroup("Parsing source repository");
      this._source = await this.extractModule(wd);
      core.info(`Extracted module: ${JSON.stringify(this.source)}`);
      return this;
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

  public async installTarget(targetDir: string): Promise<void> {
    try {
      core.startGroup("Preparing target repository");
      let installed = [];
      // Install the target technology
      for (const validator of this._validators) {
        if (await validator.isSupporting(targetDir)) {
          await validator.install(this.source, targetDir);
          installed.push(validator.constructor.name);
        }
      }
      if (installed.length === 0) {
        throw new Error("No supported technology found");
      }
      core.info(
        `Installed source module to target with ${installed.join(", ")}`,
      );
    } finally {
      core.endGroup();
    }
  }

  public async validateTarget(targetDir: string): Promise<void> {
    let validated = [];
    try {
      core.startGroup(`Validating...`);
      // Validate the target technology
      for (const validator of this._validators) {
        if (await validator.isSupporting(targetDir)) {
          await validator.validate(targetDir);
          validated.push(validator.constructor.name);
        }
      }
      if (validated.length === 0) {
        throw new Error("No supported technology found");
      }
      core.info("Validation passed with " + validated.join(", "));
    } finally {
      if (validated.length === 0) {
        core.info(`Validation failed`);
      }
      core.endGroup();
    }
  }
}

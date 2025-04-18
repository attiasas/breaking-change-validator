import * as fs from "fs";
import * as path from "path";
import * as exec from "@actions/exec";
import * as core from "@actions/core";
import { Module, TechValidator } from "./techValidator";
import { Utils } from "../utils";

export class GolangHandler implements TechValidator {
    public static readonly DESCRIPTOR_FILE: string = "go.mod";
    public static readonly GO_TYPE: string = "golang";

    public async isSupporting(wd: string): Promise<boolean> {
        // Check if the directory contains a go.mod file
        return fs.existsSync(path.join(wd, GolangHandler.DESCRIPTOR_FILE));
    }

    public async extractModule(wd: string): Promise<Module> {
        const mainGoMod = path.join(wd, GolangHandler.DESCRIPTOR_FILE);
        const content = fs.readFileSync(mainGoMod, "utf8");
        const match = content.match(/^module\s+(.+)$/m);
        if (match) {
            return {
                type: GolangHandler.GO_TYPE,
                name: match[1],
                path: mainGoMod,
            } as Module;
        }
        throw new Error("Could not parse module from go.mod");
    }

    public async install(source: Module, wd: string): Promise<void> {
        if (source.type !== "golang") {
            throw new Error("Source Module type mismatch");
        }
        const goModPath = path.join(wd, GolangHandler.DESCRIPTOR_FILE);
        const replaceLine = `replace ${source.name} => ${path.dirname(source.path)}`;
        fs.appendFileSync(goModPath, `\n${replaceLine}\n`);
        core.info(`Appended: '${replaceLine}' to ${goModPath}`);
    }

    public async validate(wd: string): Promise<void> {
        core.info("Running go validation...");
        // await exec.exec("go", ["vet", "./..."], { cwd: wd });
        await Utils.runCommand(["go", "vet", "./..."], wd);
    }

}
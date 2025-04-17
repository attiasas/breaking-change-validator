import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as fs from "fs";
import * as path from "path";

async function run() {
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
      } else {
        core.warning("Could not parse module path from go.mod in workspace");
      }
    } else {
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
    core.info(
      `Cloning ${repoUrl} ${repoBranch ? "(@" + repoBranch + ")" : ""}`,
    );
    await exec.exec("git", cloneArgs);
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
      await exec.exec("go", ["vet", "./..."], { cwd: repoPath });
      core.info("go vet passed");
      core.endGroup();
    } catch (err: any) {
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
        await exec.exec("sh", ["-c", testCmd], { cwd: repoPath });
        core.info("Tests passed");
        core.endGroup();
      } catch (err: any) {
        failed = true;
        core.endGroup();
        core.error(`Tests failed: ${err.message}`);
      }
    }

    // Step 6: Output validation results
    const failOnError = core.getBooleanInput("fail_on_test_error");
    if (failed) {
      const message = "Repository validation failed";
      if (failOnError) core.setFailed(message);
      else core.warning(message);
    } else {
      core.info("Repository validation succeeded");
    }
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();

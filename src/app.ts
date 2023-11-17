import express from "express";
import path from "path";
import { spawn, exec } from "child_process";
import * as util from "util";
import * as fs from "fs/promises";

const app = express();
const port = 3000;

type RequestBody = {
  gitUrl: string;
};

const spawnAsync = util.promisify(spawn);
const execAsync = util.promisify(exec);

// Add this line to enable JSON parsing middleware
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Hello, World!");
});

app.post("/api/owasp-dependency-check", async (request, res) => {
  console.log(`Http request for url "${request.url}"`);

  console.log(`Parsing request body as JSON`);
  console.log(`Request body: ${JSON.stringify(request.body, null, 2)}`);
  // Parse the request body as JSON
  const requestJson = request.body;
  console.log(`Parsed request body: ${JSON.stringify(requestJson, null, 2)}`);

  // Validate the input
  if (!requestJson) {
    res.status(400).send("Bad Request: Missing request body");
  }
  // Set the OWASP Dependency-Check data directory
  const dependencyCheckDataDir = process.env.DEPENDENCY_CHECK_DATA_DIR || "/opt/dependency-check/data";

  const { gitUrl } = requestJson as RequestBody;
  console.log(`gitUrl: ${gitUrl}`);
  // const tempDir = `/tmp/gitrepos/${context.invocationId}`;
  const tempDir = "/tmp/gitrepos/bobbin054";
  console.log(`tempDir: ${tempDir}`);
  const reportPath = path.join(tempDir, "dependency-check-report.json");
  console.log(`reportPath: ${reportPath}`);

  try {
    const { stdout: gitCommandStdout, stderr: gitCommandStderr } = await execAsync(`git clone ${gitUrl} ${tempDir}`);

    console.log(`Running owasp dependency-check on: ${gitUrl}`);

    // Use spawn to run the command
    const dependencyCheckProcess = spawn("dependency-check.sh", [
      "--project",
      "Dependency Check",
      "--scan",
      tempDir,
      "--out",
      tempDir,
      "--format",
      "JSON",
    ]);

    // Capture and stream stdout and stderr
    dependencyCheckProcess.stdout.on("data", (data) => {
      console.log(`Dependency Check stdout: ${data}`);
    });
    dependencyCheckProcess.stderr.on("data", (data) => {
      console.error(`Dependency Check stderr: ${data}`);
    });

    // Wait for the process to exit
    const exitCode: number | null = await new Promise((resolve) => {
      dependencyCheckProcess.on("close", (code) => resolve(code));
    });

    if (exitCode !== 0) {
      console.error(`Dependency Check process exited with code ${exitCode}`);
      return res.status(500).send(`Dependency Check process exited with code ${exitCode}`);
    }

    // Read the JSON report
    const report = await fs.readFile(reportPath, "utf8");
    console.log(`Report: ${report}`);

    // Clean up
    execAsync(`rm -rf ${tempDir}`);

    return res.status(201).contentType("application/json").send(report);
  } catch (err) {
    if (err instanceof Error) {
      console.log(`Execution error: ${err.message}`);
      return res.status(500).send(err.message);
    }
    return res.status(500).send("Unknown error");
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

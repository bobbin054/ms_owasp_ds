import express from "express";
import path from "path";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import { readFile } from "fs/promises";

const app = express();
const port = 3000;

type RequestBody = {
  gitUrl: string;
};

const execAsync = promisify(exec);
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Hello, World!");
});

app.post("/api/owasp-dependency-check", async (request, res) => {
  console.log(`Http request for url "${request.url}"`);
  console.log(`Request body: ${JSON.stringify(request.body, null, 2)}`);
  if (!request.body) {
    res.status(400).send("Bad Request: Missing request body");
  }
  const { gitUrl } = request.body as RequestBody;
  console.log(`gitUrl: ${gitUrl}`);
  const tempDir = `/tmp/gitrepos/${request.ip}`;
  console.log(`tempDir: ${tempDir}`);
  const reportPath = path.join(tempDir, "dependency-check-report.json");
  console.log(`reportPath: ${reportPath}`);
  try {
    await execAsync(`git clone ${gitUrl} ${tempDir}`);
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
    const report = await readFile(reportPath, "utf8");
    console.log(`Report: ${report}`);
    // Clean up
    execAsync(`rm -rf ${tempDir}`);
    // Send the report as the response
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

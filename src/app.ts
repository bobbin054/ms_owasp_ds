import express from "express";
import path from "path";
import { exec } from "child_process";
import * as util from "util";
import * as fs from "fs/promises";
const app = express();
const port = 3000;

type RequestBody = {
  gitUrl: string;
};

// Promisify exec for async/await usage
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

  const { gitUrl } = requestJson as RequestBody;
  console.log(`gitUrl: ${gitUrl}`);
  // const tempDir = `/tmp/gitrepos/${context.invocationId}`;
  const tempDir = "/tmp/gitrepos/bobbin054";
  console.log(`tempDir: ${tempDir}`);
  const reportPath = path.join(tempDir, "dependency-check-report.json");
  console.log(`reportPath: ${reportPath}`);

  try {
    console.log(`Cloning git repository: ${gitUrl}`);
    const { stdout: gitCommandStdout, stderr: gitCommandStderr } = await execAsync(`git clone ${gitUrl} ${tempDir}`);
    console.log(gitCommandStderr);
    console.log(`Running owasp dependency-check on: ${gitUrl}`);
    const { stdout: owaspCommandStdout, stderr: owaspCommandStderr } = await execAsync(
      `dependency-check.sh --project "Dependency Check" --scan ${tempDir} ` + `--out ${tempDir} --format "JSON"`
    );
    console.log(`${owaspCommandStderr}`);
    // Read the JSON report
    const report = await fs.readFile(reportPath, "utf8");
    console.log(`Report: ${report}`);
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

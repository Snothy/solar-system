
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const OUTPUT_DIR = path.join(__dirname, '../output');
const PHYSICS_DIR = path.join(__dirname, '../physics-wasm');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate filename with timestamp
// Generate filename with local timestamp
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');
const seconds = String(now.getSeconds()).padStart(2, '0');
const ms = String(now.getMilliseconds()).padStart(3, '0');
const timestamp = `${year}-${month}-${day}T${hours}-${minutes}-${seconds}-${ms}`;
const reportFile = path.join(OUTPUT_DIR, `test_report_${timestamp}.md`);

console.log('Running unit tests (sequentially for log capture)...');
console.log(`Report will be saved to: ${reportFile}`);

// Run cargo test with --test-threads=1 to ensure log output is associated with the correct test
const cargo = spawn('cargo', ['test', '--test', 'unit_tests', '--', '--nocapture', '--test-threads=1'], {
  cwd: PHYSICS_DIR,
  env: process.env
});

let output = '';

cargo.stdout.on('data', (data) => {
  const str = data.toString();
  process.stdout.write(str); // Stream to console
  output += str;
});

cargo.stderr.on('data', (data) => {
  const str = data.toString();
  process.stderr.write(str); // Stream to console
  output += str;
});

cargo.on('close', (code) => {
  console.log(`\nTests completed with exit code ${code}`);
  generateMarkdownReport(output, code === 0);
});

function generateMarkdownReport(rawOutput, success) {
  // Strip ANSI codes
  const cleanOutput = rawOutput.replace(/\u001b\[\d+m/g, '');
  const lines = cleanOutput.split('\n');

  // Data structure to hold parsed tests
  const tests = [];
  let buffer = [];

  // Regex for test start: "test unit::path::to::test ..."
  // It might end with "ok" or "FAILED" if no output, or be just "..." if output follows.
  const testStartRegex = /^test\s+(unit::\S+)\s+\.\.\.(.*)$/;
  const resultRegex = /^(ok|FAILED|ignored)$/;
  const summaryRegex = /^test result: (ok|FAILED)\. (\d+) passed; (\d+) failed; (\d+) ignored/;

  let summaryLine = '';
  let currentTest = null;

  for (const line of lines) {
    // Check for test start
    const startMatch = line.match(testStartRegex);
    if (startMatch) {
      const fullName = startMatch[1];
      const remainder = startMatch[2].trim();

      currentTest = {
        fullName,
        name: fullName.split('::').pop(),
        module: fullName.split('::').slice(0, -1).join('::'),
        status: null,
        logs: []
      };

      // Check if it finished on the same line
      if (remainder === 'ok' || remainder === 'FAILED' || remainder === 'ignored') {
        currentTest.status = remainder;
        tests.push(currentTest);
        currentTest = null;
      }
      continue;
    }

    // Check for test result (if test is active)
    if (currentTest) {
      const resultMatch = line.trim().match(resultRegex);
      if (resultMatch) {
        currentTest.status = resultMatch[1];
        tests.push(currentTest);
        currentTest = null;
        continue;
      }

      // Otherwise, it's a log line
      // Filter noise
      const trimmed = line.trim();
      if (trimmed !== '' &&
        !trimmed.startsWith('running ') &&
        !trimmed.startsWith('test result:') &&
        !trimmed.includes('Finished `test` profile')) {
        currentTest.logs.push(line);
      }
    } else if (summaryRegex.test(line)) {
      summaryLine = line;
    }
  }

  // Generate Markdown
  let markdown = `# 🧪 Unit Test Report\n\n`;
  markdown += `**Date:** ${new Date().toLocaleString()}\n`;
  markdown += `**Overall Status:** ${success ? '✅ PASSED' : '❌ FAILED'}\n`;
  if (summaryLine) {
    markdown += `**Summary:** \`${summaryLine}\`\n`;
  }
  markdown += `\n---\n\n`;

  // Group by module
  const modules = {};
  for (const test of tests) {
    if (!modules[test.module]) {
      modules[test.module] = [];
    }
    modules[test.module].push(test);
  }

  const moduleNames = Object.keys(modules).sort();

  for (const modName of moduleNames) {
    const modTests = modules[modName];
    const shortModName = modName.replace('unit::', '');

    markdown += `## 📦 ${shortModName}\n\n`;

    // Create a table for this module
    markdown += `| Status | Test Name | Metrics / Logs |\n`;
    markdown += `| :---: | :--- | :--- |\n`;

    for (const test of modTests) {
      const icon = test.status === 'ok' ? '✅' : (test.status === 'ignored' ? '⚠️' : '❌');
      const name = `**${test.name}**`;

      let logContent = '';
      if (test.logs.length > 0) {
        // Format logs as a list or code block
        // Using <br> for newlines in table cell
        logContent = test.logs.map(l => `\`${l.replace(/\|/g, '\\|')}\``).join('<br>');
      } else {
        logContent = '_(no output)_';
      }

      markdown += `| ${icon} | ${name} | ${logContent} |\n`;
    }
    markdown += `\n`;
  }

  // Add Failures Section if any (redundant but useful for quick check)
  const failures = tests.filter(t => t.status === 'FAILED');
  if (failures.length > 0) {
    markdown += `## 🚨 Failures Detail\n\n`;
    for (const fail of failures) {
      markdown += `### ${fail.name}\n`;
      markdown += `**Module:** \`${fail.module}\`\n\n`;
      if (fail.logs.length > 0) {
        markdown += `\`\`\`text\n`;
        markdown += fail.logs.join('\n');
        markdown += `\n\`\`\`\n`;
      } else {
        markdown += `_No captured logs._\n`;
      }
      markdown += `\n`;
    }
  }

  fs.writeFileSync(reportFile, markdown);
  console.log(`Report generated successfully.`);
}

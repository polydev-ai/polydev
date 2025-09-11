#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const providersDir = path.join(__dirname, '../src/lib/api/providers');

// Timeout helper function to add to each provider
const timeoutHelperFunction = `
  private createAbortController(timeoutMs: number = 30000): AbortController {
    // Ensure timeout is valid (not undefined, null, Infinity, or negative)
    if (!timeoutMs || timeoutMs === Infinity || timeoutMs < 1 || timeoutMs > 300000) {
      timeoutMs = 30000 // Default to 30 seconds
    }
    
    const controller = new AbortController()
    setTimeout(() => controller.abort(), timeoutMs)
    return controller
  }`;

// List of CLI provider files to update
const cliProvidersToUpdate = [
  'codex-cli.ts',
  'gemini-cli.ts',
  'github-copilot.ts'
];

// Function to add timeout helper to a provider class
function addTimeoutHelper(content, className) {
  const classRegex = new RegExp(`(export class ${className}[^{]*{[^}]*?)(\n  async)`, 's');
  const match = content.match(classRegex);
  
  if (match) {
    return content.replace(classRegex, `$1${timeoutHelperFunction}$2`);
  }
  
  return content;
}

// Function to add signal to fetch calls
function addSignalToFetch(content) {
  // Add signal to fetch calls
  content = content.replace(
    /(const response = await fetch\([^,]+, {[\s\S]*?)(}\))/g,
    (match, prefix, suffix) => {
      if (match.includes('signal:')) return match; // Already has signal
      const controller = prefix.includes('const controller') ? '' : '      const controller = this.createAbortController()\n      ';
      return controller + prefix.replace('}\)', ',\n        signal: controller.signal\n      })')
    }
  );
  
  return content;
}

// Process each CLI provider file
cliProvidersToUpdate.forEach(filename => {
  const filePath = path.join(providersDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${filename} - file not found`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has timeout helper
  if (content.includes('createAbortController')) {
    console.log(`Skipping ${filename} - already has timeout helper`);
    return;
  }
  
  // Extract class name from filename
  const className = filename.replace('.ts', '').split('-').map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join('') + 'Handler';
  
  console.log(`Processing ${filename} with class ${className}...`);
  
  // Add timeout helper function
  content = addTimeoutHelper(content, className);
  
  // Add signal to fetch calls
  content = addSignalToFetch(content);
  
  // Write back to file
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filename}`);
});

console.log('Timeout validation added to all CLI provider files!');
#!/usr/bin/env node

/**
 * Post-install script to update PlantUML JAR to latest version
 *
 * The node-plantuml package (v0.9.0) bundles an outdated PlantUML JAR from 2019
 * that doesn't support modern C4-PlantUML syntax (specifically the ?= operator).
 *
 * This script downloads the latest PlantUML JAR and replaces the bundled one.
 *
 * Requirements:
 * - Graphviz must be installed for C4 diagrams to render properly
 *   macOS: brew install graphviz
 *   Ubuntu: sudo apt-get install graphviz
 *   Windows: choco install graphviz or download from graphviz.org
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PLANTUML_VERSION = '1.2024.8';
const DOWNLOAD_URL = `https://github.com/plantuml/plantuml/releases/download/v${PLANTUML_VERSION}/plantuml-${PLANTUML_VERSION}.jar`;
const VENDOR_PATH = path.join(__dirname, '..', 'node_modules', 'node-plantuml', 'vendor');
const TARGET_JAR = path.join(VENDOR_PATH, 'plantuml.jar');
const BACKUP_JAR = path.join(VENDOR_PATH, 'plantuml.jar.backup');

console.log('Updating PlantUML JAR for C4 compatibility...');
console.log(`Target version: ${PLANTUML_VERSION}`);

// Check if node-plantuml is installed
if (!fs.existsSync(VENDOR_PATH)) {
  console.log('node-plantuml not found - skipping PlantUML JAR update');
  process.exit(0);
}

// Check if already updated
if (fs.existsSync(BACKUP_JAR)) {
  console.log('PlantUML JAR already updated (backup exists) - skipping');
  process.exit(0);
}

// Backup original JAR
if (fs.existsSync(TARGET_JAR)) {
  console.log('Backing up original PlantUML JAR...');
  fs.copyFileSync(TARGET_JAR, BACKUP_JAR);
}

// Download new JAR
console.log(`Downloading PlantUML ${PLANTUML_VERSION}...`);
const file = fs.createWriteStream(TARGET_JAR);

https.get(DOWNLOAD_URL, (response) => {
  if (response.statusCode === 302 || response.statusCode === 301) {
    // Follow redirect
    https.get(response.headers.location, (redirectResponse) => {
      redirectResponse.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('✓ PlantUML JAR updated successfully');
        console.log('\nIMPORTANT: C4 diagrams require Graphviz to be installed:');
        console.log('  macOS:   brew install graphviz');
        console.log('  Ubuntu:  sudo apt-get install graphviz');
        console.log('  Windows: choco install graphviz');
        console.log('           or download from https://graphviz.org/download/');
      });
    }).on('error', (err) => {
      fs.unlinkSync(TARGET_JAR);
      console.error('Error downloading PlantUML JAR:', err.message);
      // Restore backup
      if (fs.existsSync(BACKUP_JAR)) {
        fs.copyFileSync(BACKUP_JAR, TARGET_JAR);
        fs.unlinkSync(BACKUP_JAR);
      }
      process.exit(1);
    });
  } else {
    response.pipe(file);

    file.on('finish', () => {
      file.close();
      console.log('✓ PlantUML JAR updated successfully');
      console.log('\nIMPORTANT: C4 diagrams require Graphviz to be installed:');
      console.log('  macOS:   brew install graphviz');
      console.log('  Ubuntu:  sudo apt-get install graphviz');
      console.log('  Windows: choco install graphviz');
      console.log('           or download from https://graphviz.org/download/');
    });
  }
}).on('error', (err) => {
  fs.unlinkSync(TARGET_JAR);
  console.error('Error downloading PlantUML JAR:', err.message);
  // Restore backup
  if (fs.existsSync(BACKUP_JAR)) {
    fs.copyFileSync(BACKUP_JAR, TARGET_JAR);
    fs.unlinkSync(BACKUP_JAR);
  }
  process.exit(1);
});

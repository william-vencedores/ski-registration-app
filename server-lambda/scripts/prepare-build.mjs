/**
 * Prepares the .build/ directory for SAM deployment.
 * Copies compiled JS, templates, and a production package.json,
 * then installs production-only dependencies.
 */
import { execSync } from 'child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const buildDir = join(root, '.build');

// Clean and create .build/
rmSync(buildDir, { recursive: true, force: true });
mkdirSync(buildDir, { recursive: true });

// Copy compiled JS
cpSync(join(root, 'dist'), buildDir, { recursive: true });

// Copy templates
cpSync(join(root, 'templates'), join(buildDir, 'templates'), { recursive: true });

// Create a minimal package.json with only production deps
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
const prodPkg = {
  name: pkg.name,
  version: pkg.version,
  type: pkg.type,
  dependencies: pkg.dependencies,
};
writeFileSync(join(buildDir, 'package.json'), JSON.stringify(prodPkg, null, 2));

// Install production dependencies in .build/
execSync('npm install --omit=dev', { cwd: buildDir, stdio: 'inherit' });

console.log('Build prepared in .build/');

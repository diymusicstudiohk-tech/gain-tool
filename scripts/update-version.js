#!/usr/bin/env node

/**
 * Update version.js by incrementing the patch version number
 * Run this script before building for deployment
 * Example: 1.0.0 -> 1.0.1, 1.3.8 -> 1.3.9
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
    // Path to version.js
    const versionFilePath = path.join(__dirname, '../src/utils/version.js');

    // Read current version.js
    const currentContent = fs.readFileSync(versionFilePath, 'utf-8');

    // Extract current version using regex
    const versionMatch = currentContent.match(/export const VERSION = '(\d+)\.(\d+)\.(\d+)'/);

    if (!versionMatch) {
        throw new Error('Could not find VERSION in version.js');
    }

    const major = parseInt(versionMatch[1], 10);
    const minor = parseInt(versionMatch[2], 10);
    const patch = parseInt(versionMatch[3], 10);

    // Increment patch version
    const newPatch = patch + 1;
    const newVersion = `${major}.${minor}.${newPatch}`;

    // Generate the new version.js content
    const content = `/**
 * Version and build information
 * This file should be updated during deployment
 */

// App version - increment patch number before each deploy
export const VERSION = '${newVersion}';

// Format the version for display
export const getVersionDisplay = () => {
    return \`版本 \${VERSION}\`;
};
`;

    // Write the file
    fs.writeFileSync(versionFilePath, content, 'utf-8');

    console.log(`✓ Updated version: ${major}.${minor}.${patch} → ${newVersion}`);
} catch (error) {
    console.error('Error updating version.js:', error.message);
    process.exit(1);
}

/**
 * Version and build information
 * This file should be updated during deployment
 */

// App version - increment patch number before each deploy
export const VERSION = '1.0.38';

// Format the version for display
export const getVersionDisplay = () => {
    return `版本 ${VERSION}`;
};

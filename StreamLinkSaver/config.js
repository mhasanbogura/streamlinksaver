/*
 * StreamLink Saver configuration
 *
 * Choose the fixed folder for every .strm save. The path starts from
 * the browser's Downloads folder. After editing this file, reload the
 * extension from the browser's extension-management page.
 */
const SAVE_PATH = "Downloads/";

// Expose the editable constant to the popup and service worker.
globalThis.SAVE_PATH = SAVE_PATH;

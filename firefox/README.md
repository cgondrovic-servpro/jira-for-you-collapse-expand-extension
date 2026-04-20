# Firefox Installation

## Developer Mode Installation (Recommended for Testing)

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Navigate to this `firefox/` directory
4. Select the `manifest.json` file
5. ✅ Extension loads immediately
6. ⚠️ **Important**: Extension is removed when Firefox restarts

### Alternative: Direct File Installation
If temporary installation fails:
1. Type `about:config` in address bar
2. Search for `xpinstall.signatures.required`
3. Set to `false` (requires Firefox restart)
4. Go to `about:addons` → gear icon → "Install Add-on From File"
5. Select the `.zip` package

## Permanent Installation (For Distribution)

### Option 1: Firefox Add-ons Store
1. Package as .xpi file: `web-ext build`
2. Submit to Mozilla Add-ons for review
3. Users can install from the store

### Option 2: Self-Distribution
1. Package as .xpi: `web-ext build`
2. Users must enable "Install add-ons from file" in Firefox settings
3. Install the .xpi file manually

## Building XPI Package

Install web-ext tool:
```bash
npm install -g web-ext
```

Build the package:
```bash
web-ext build
```

## Differences from Chrome

- Uses Manifest V3 (updated for modern Firefox)
- Compatible with both `browser.storage` and `chrome.storage` APIs
- Includes `gecko` specific configuration with required extension ID
- Requires extension signing for permanent installation

## Testing

Run with hot reload:
```bash
web-ext run
```

This will open a new Firefox instance with the extension loaded.
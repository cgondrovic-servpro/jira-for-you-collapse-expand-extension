# Chrome Installation

## Developer Mode Installation (Recommended for Testing)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" toggle in the top right corner
3. Click "Load unpacked" button
4. Navigate to and select this `chrome/` directory
5. ✅ Extension loads immediately and persists across browser restarts
6. 🔄 Use "Reload" button to update after code changes

### Troubleshooting Developer Mode
- **Extension not visible**: Check that you selected the `chrome/` folder, not a zip file
- **Permission errors**: Ensure `manifest.json` is in the selected directory
- **Updates not working**: Click the "Reload" (🔄) button next to the extension

## Distribution

### Chrome Web Store
1. Create a Chrome Web Store developer account ($5 fee)
2. Package the extension as a .zip file
3. Upload through the Chrome Web Store Developer Dashboard
4. Complete the store listing and submit for review

### Enterprise/Private Distribution
1. Package as .crx file using Chrome's packaging tools
2. Distribute through Google Admin Console for organizations
3. Or allow users to install via "Load unpacked" in developer mode

## Packaging for Store

Create a zip file containing all files in this directory:
```bash
zip -r jira-swimlane-collapser.zip *
```

## Features Specific to Chrome

- Uses Manifest V3 (latest standard)
- Chrome storage API for state persistence
- Base64 SVG icons embedded in manifest
- Full compatibility with Chrome's extension security model

## Permissions

The extension requests:
- `storage` - To remember collapsed sections across sessions
- Host permissions for Jira domains - To run content scripts

## Testing

After installation, visit any Jira "for-you" page to see the collapse/expand buttons.
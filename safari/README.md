# Safari Installation

Safari extensions require additional steps compared to Chrome/Firefox due to Apple's security model.

## Developer Mode Installation (For Testing)

### Prerequisites
1. **Enable Develop Menu**: Safari → Preferences → Advanced → ✅ "Show Develop menu in menu bar"
2. **Allow Unsigned Extensions**: Develop → ✅ "Allow Unsigned Extensions"

### Installation Steps
1. Open Safari → Preferences → Extensions
2. Click the "+" button or "Add Extension..."
3. Navigate to and select this `safari/` folder
4. ✅ Extension loads immediately
5. ⚠️ **Note**: Must re-enable "Allow Unsigned Extensions" after each Safari restart

### Troubleshooting Developer Mode
- **Extension not loading**: Ensure "Allow Unsigned Extensions" is checked
- **Missing Develop menu**: Check Safari → Preferences → Advanced settings
- **Permission denied**: Verify folder contains `manifest.json`

## Production Installation (Xcode Required)

### Safari App Extension Conversion
1. **Install Xcode** from Mac App Store (required)
2. **Convert extension**: `xcrun safari-web-extension-converter /path/to/safari/folder`
3. **Build in Xcode**: Follow conversion wizard prompts
4. **Install**: Built extension installs automatically

## Differences from Chrome/Firefox

- Uses localStorage instead of extension storage API
- Requires different manifest format
- Icons need to be different sizes (16, 32, 64 instead of 16, 48, 128)

## Building for App Store

If you want to distribute via App Store:
1. Use `safari-web-extension-converter`
2. Build in Xcode
3. Submit through App Store Connect

Note: Safari has stricter content security policies and may require additional permissions.
# Safari Extension - Xcode Project Setup

Your Safari extension has been successfully converted to a proper Xcode project! This allows you to build and run the extension locally without publishing to the App Store.

## Project Structure

The conversion created the following structure:
```
Jira For You Collapse Expand/
├── Jira For You Collapse Expand.xcodeproj/     # Xcode project file
├── iOS (App)/                                  # iOS app wrapper
├── iOS (Extension)/                            # iOS extension
├── macOS (App)/                                # macOS app wrapper  
├── macOS (Extension)/                          # macOS extension
├── Shared (App)/                               # Shared app resources
└── Shared (Extension)/                         # Your extension files
    └── Resources/
        ├── manifest.json                       # Extension manifest
        ├── content.js                          # Main extension script
        ├── styles.css                          # Extension styles
        └── icons/                              # Extension icons
```

## Building and Running the Extension

### Prerequisites
1. **Xcode** installed from the Mac App Store (free)
2. **macOS** (required for Safari extensions)
3. **Free Apple ID** (the same one you use for the App Store - no paid developer account needed!)

### Step 1: Open the Project
1. Navigate to the project directory:
   ```bash
   cd "/Users/chrisondrovic/Desktop/tmp/jira-for-you-collapse-expand-extension"
   ```
2. Open the Xcode project:
   ```bash
   open "Jira For You Collapse Expand/Jira For You Collapse Expand.xcodeproj"
   ```

### Step 2: Configure Signing (Free Apple ID)
1. In Xcode, select the project in the navigator
2. Select the **macOS (App)** target
3. Go to **Signing & Capabilities** tab
4. Check **"Automatically manage signing"**
5. Click **"Add Account..."** if you don't see your Apple ID
6. Sign in with your **free Apple ID** (the same one you use for the App Store)
7. Select your **Personal Team** (it will show your name + "(Personal Team)")
8. Xcode will automatically generate a bundle identifier
9. **Note**: You may see a warning about "No profiles found" - this is normal for free accounts

### Step 3: Build and Run
1. Select **macOS (App)** as the target (not the extension)
2. Choose your Mac as the destination
3. Click the **Run** button (▶️) or press `Cmd+R`
4. Xcode will build and launch the app

### Step 4: Enable the Extension in Safari
1. When the app launches, it will show a simple window
2. Open **Safari**
3. Go to **Safari → Preferences → Extensions**
4. Find **"Jira For You Collapse Expand"** in the list
5. Check the box to **enable** the extension
6. The extension is now active!

## Testing the Extension

1. Navigate to a Jira "For You" page:
   - `https://your-domain.atlassian.net/jira/for-you`
   - `https://your-domain.jira.com/jira/for-you`
2. You should see collapse/expand buttons for each swimlane section
3. Click the buttons to test the functionality

## Development Workflow

### Making Changes
1. Edit files in `Shared (Extension)/Resources/`:
   - `content.js` - Main extension logic
   - `styles.css` - Extension styling
   - `manifest.json` - Extension configuration
2. In Xcode, press `Cmd+R` to rebuild and run
3. The extension will automatically update in Safari

### Debugging
1. Open **Safari → Develop → [Your Extension Name] → Background Page**
2. Use the Web Inspector to debug your extension
3. Check the Console for any errors

## Distribution Options

### Local Development (Current Setup)
- ✅ No App Store required
- ✅ Free to use
- ✅ Easy to modify and test
- ⚠️ Must rebuild after Safari updates
- ⚠️ Only works on your Mac

### App Store Distribution (Optional)
If you want to distribute to others:
1. In Xcode, go to **Product → Archive**
2. Upload to App Store Connect
3. Submit for review
4. Users can install from the App Store

## Troubleshooting

### Extension Not Appearing
- **After Safari restart**: Extensions get disabled automatically - you need to re-enable them
- Ensure the app is running (check Dock)
- Go to Safari → Preferences → Extensions
- Find your extension and check the box to enable it
- Try disabling and re-enabling the extension if it's already checked

### Build Errors
- **"Build input file cannot be found: Icon.png"**: 
  - This has been fixed automatically - the Icon.png file is now in place
  - If you still get this error, try: `Product → Clean Build Folder` then rebuild
- **Free Apple ID**: Make sure you're using your free Apple ID (Personal Team)
- **Signing issues**: If you get signing errors, try:
  - Go to Xcode → Preferences → Accounts
  - Remove and re-add your Apple ID
  - In Signing & Capabilities, try changing the bundle identifier slightly
- **"No profiles found" warning**: This is normal with free accounts - ignore it
- Ensure Xcode is up to date
- Try cleaning the build folder (`Cmd+Shift+K`)

### Extension Not Working on Jira
- Verify you're on a supported Jira URL
- Check the browser console for errors
- Ensure the page has loaded completely

## File Locations

- **Extension Code**: `Shared (Extension)/Resources/`
- **App Wrapper**: `macOS (App)/` and `iOS (App)/`
- **Project Settings**: `Jira For You Collapse Expand.xcodeproj/`

## Next Steps

1. **Test thoroughly** on your Jira instance
2. **Customize** the extension as needed
3. **Share** the Xcode project with team members
4. **Consider** App Store distribution for wider reach

The extension is now ready for local development and testing!

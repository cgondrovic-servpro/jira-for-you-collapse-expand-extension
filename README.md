# Jira For You Swimlane Collapse / Expand

A lightweight, cross-browser extension that enhances Jira's "for-you" page by adding collapse/expand functionality to swimlane sections. Organize your workflow by hiding completed or irrelevant sections while keeping track of item counts.

## ✨ Features

- **🎯 Smart Detection**: Automatically detects swimlane sections regardless of Jira's layout changes
- **📊 Item Counts**: Shows the number of items in each section (e.g., "Collapse In Progress (5)")
- **💾 Persistent State**: Remembers which sections you've collapsed across browser sessions
- **🏷️ Status Recognition**: Recognizes common status keywords (To Do, In Progress, Done, Review/QA, etc.)
- **🌐 Cross-Browser Support**: Works on Chrome, Firefox, and Safari
- **🎨 Clean Design**: Minimal UI that blends seamlessly with Jira's interface
- **⚡ Real-time Updates**: Automatically handles dynamic content changes

## 🚀 Quick Start (Developer Mode)

> **Note**: These instructions are for development/testing. Production installations require browser store approval or additional security settings.

### Chrome
1. Download or clone this repository
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked" → select the `chrome/` folder
5. Visit any Jira for-you page to see it in action!

### Firefox
1. Open Firefox → `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select `manifest.json` from the `firefox/` folder
4. ⚠️ **Temporary**: Extension removed on Firefox restart

### Safari
1. Enable "Develop" menu: Safari → Preferences → Advanced → "Show Develop menu"
2. Open Safari → Develop → "Allow Unsigned Extensions"
3. See `safari/README.md` for detailed Xcode setup
4. More complex due to Safari's security requirements

📋 **Detailed installation guides** are available in each browser folder.

## 🔧 How It Works

The extension intelligently:
1. **Scans** the page using multiple detection strategies to find swimlane sections
2. **Identifies** sections based on status keywords and DOM structure
3. **Injects** clean collapse/expand buttons with item counts
4. **Persists** your preferences across browser sessions
5. **Adapts** to dynamic content changes automatically

## 🎯 Supported Platforms

- ✅ **Atlassian Cloud**: `*.atlassian.net/jira/for-you*`
- ✅ **Jira Cloud**: `*.jira.com/jira/for-you*`
- 🔄 **Auto-detects** various swimlane layouts and status names

## 📁 Project Structure

```
📦 jira-extension/
├── 🟢 chrome/          # Chrome extension (Manifest V3)
├── 🟠 firefox/         # Firefox extension (Manifest V2)
├── 🔵 safari/          # Safari extension (with localStorage)
├── 📄 README.md        # This documentation
└── 📄 *.json, *.js     # Legacy files (use browser folders)

Each browser folder contains:
📄 manifest.json        # Browser-specific configuration
🚀 content.js          # Main functionality and DOM manipulation
🎨 styles.css          # Styling for collapse/expand controls
📖 README.md           # Browser-specific installation guide
```

## 🌐 Browser Compatibility

| Browser | Version | Manifest | Storage | Status |
|---------|---------|----------|---------|---------|
| **Chrome** | 88+ | V3 | chrome.storage | ✅ Ready |
| **Firefox** | 58+ | V2 | browser.storage | ✅ Ready |
| **Safari** | 14+ | V2 | localStorage | ⚠️ Requires Xcode |

## 🎮 Usage

1. **Visit** your Jira "for-you" page
2. **Look** for blue collapse/expand buttons near section headers
3. **Click** buttons to collapse/expand sections (shows item counts)
4. **Enjoy** automatic preference saving across sessions

Example button: `▼ Collapse In Progress (5)` → `▶ Expand In Progress (5)`

## ⚙️ Technical Details

### Core Technologies
- **MutationObserver** - Real-time DOM change detection
- **Cross-browser Storage** - Persistent state management
- **Dynamic Selectors** - Robust element detection
- **SVG Icons** - Lightweight, scalable graphics

### Architecture
- **Content Script**: Injects functionality into Jira pages
- **Fallback Detection**: Multiple strategies for element finding
- **Performance Optimized**: Minimal DOM manipulation

## 🐛 Troubleshooting

**Extension not appearing?**
- ✅ Verify you're on a supported Jira URL
- ✅ Check extension is enabled in browser settings
- ✅ Refresh the page to reinitialize

**Buttons not working?**
- 🔍 Open browser console (F12) for error messages
- 🔄 Try disabling/re-enabling the extension
- 📝 Check browser folder README for specific instructions

## 🤝 Contributing

Found a bug or want to add a feature?
1. Fork this repository
2. Create a feature branch
3. Test across browsers
4. Submit a pull request

## 📜 License

This project is open source. Feel free to modify and distribute according to your needs.
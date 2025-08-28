## Firefox MV2 Extension: Image Red Toggle

This extension shows a small button at the top-right of images on hover. Clicking it replaces the image with a red placeholder of the same rendered size; clicking again restores the original image.

### Files
- `manifest.json`: MV2 manifest targeting Firefox
- `content.js`: Adds hover button and toggles images
- `content.css`: Styles the hover button

### Install (Temporary in Firefox)
1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Click "Load Temporary Add-on…".
3. Select the `manifest.json` file in this folder.

### Usage
- Hover an image on any page; a "Red" button appears near its top-right.
- Click the button to swap the image to a red placeholder of the same size.
- Click again to restore the original image.

### Notes
- Works in all frames (iframes included).
- Avoids tiny icons (<24px) to reduce noise.
# MV2_IMG
MV2_IMG

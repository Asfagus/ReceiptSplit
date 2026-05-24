# ReceiptSplit

## Lowest-work free version

The `web` folder contains a static Progressive Web App. It runs in Safari/Chrome, stores data in the browser, and can be hosted free on Cloudflare Pages, Netlify, or Vercel.

Current web app version: `1.2.1`.

### Try locally

You can open `web/index.html` directly for a quick look. For the installable PWA behavior, use a local server or free static hosting.

If Python is installed, run this from the project folder:

```bash
cd web
python -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

On iPhone, deploy the `web` folder to a free static host, open the URL in Safari, then use **Share > Add to Home Screen**.

### Free hosting options

- Cloudflare Pages: upload/connect the `web` folder.
- Netlify Free: drag the `web` folder into Netlify Drop or connect a repo.
- Vercel Hobby: import a repo and set the project root to `web`.

The app uses Tesseract.js from a CDN for browser OCR. There is no paid OCR API and no backend in this version.

## Native iOS starter

This is a native SwiftUI starter for an iPhone app that:

- uploads a receipt photo from the user's photo library
- runs on-device OCR with Apple's Vision framework
- parses likely receipt line items and prices
- keeps a participant list
- lets the user assign each item to one or more participants
- remembers past item assignments and suggests the same people next time
- calculates each participant's split

## How to Run

This workspace contains the Swift source files. To run it on a Mac:

1. Open Xcode.
2. Create a new iOS App project named `ReceiptSplit`.
3. Use SwiftUI for the interface.
4. Replace the generated Swift files with the files in the `ReceiptSplit` folder.
5. Add `Privacy - Photo Library Usage Description` to `Info.plist`, for example:

   `ReceiptSplit uses your photo library so you can select receipt images.`

6. Build and run on an iPhone or simulator.

## Notes

The first version uses simple local history: when you tap **Save Split to History**, it stores item-to-participant assignments in `UserDefaults`. Future receipts with matching item names will preselect those participants.

The receipt parser is intentionally conservative. Real receipts vary a lot, so the next useful upgrades would be:

- editable OCR text review before parsing
- tax and tip allocation
- fuzzy item matching instead of exact normalized matching
- camera scanning with `DataScannerViewController`
- iCloud sync for shared participant history

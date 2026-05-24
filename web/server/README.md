EasyOCR server

Run a local Flask server that accepts an uploaded image at `POST /ocr` and
returns JSON with `text` and `words` (each word has `text` and `confidence`).

Quick start:

```bash
python -m venv .venv
source .venv/bin/activate  # on Windows use `.venv\Scripts\activate`
pip install -r requirements.txt
python server.py
```

The server listens on port 5000 by default. The web client expects it at
`/server/ocr` (relative path); if you're running the server separately,
adjust the client URL or use a reverse proxy.

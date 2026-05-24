from flask import Flask, request, jsonify
from flask_cors import CORS
import io
from PIL import Image
import numpy as np

app = Flask(__name__)
CORS(app)

try:
    import easyocr
    READER = easyocr.Reader(["en"], gpu=False)
except Exception:
    READER = None


@app.route("/ocr", methods=["POST"])
def ocr():
    if READER is None:
        return jsonify({"error": "EasyOCR not available on server"}), 500
    if "file" not in request.files:
        return jsonify({"error": "no file uploaded"}), 400
    f = request.files["file"]
    img = Image.open(io.BytesIO(f.read())).convert("RGB")
    # run OCR
    results = READER.readtext(np.array(img)) if READER else []
    # results: list of (bbox, text, confidence)
    words = []
    text_lines = []
    for res in results:
        try:
            bbox, txt, conf = res
        except Exception:
            continue
        words.append({"text": txt, "confidence": float(conf)})
        text_lines.append(txt)

    full_text = "\n".join(text_lines)
    return jsonify({"text": full_text, "words": words})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

"""
Flask backend application for Gemini AI Chatbot.

This module handles HTTP requests, serves the frontend, and manages
the streaming chat interface with the Gemini API service.
"""

import atexit
import os
import signal
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request, send_from_directory
from flask_cors import CORS
from gemini_service import GeminiService
from utils import encode_stream_chunk
from werkzeug.utils import secure_filename

# Load .env from project root (same layout locally and in Docker: .../user/backend/app.py -> root)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=_PROJECT_ROOT / ".env")
load_dotenv()

# Initialize Flask app with frontend static folder
app = Flask(__name__, static_folder="../frontend", static_url_path="")

# Configuration from environment variables
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "5000"))
FRONTEND_PORT = int(os.getenv("FRONTEND_PORT", "3000"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ENVIRONMENT = (os.getenv("ENVIRONMENT") or "DEV").strip().upper() or "DEV"
PUBLIC_URL = os.getenv("PUBLIC_URL")

if PUBLIC_URL:
    print(f"Open at: {PUBLIC_URL}/  (and {PUBLIC_URL}/api/)")
    import logging

    logging.getLogger("werkzeug").setLevel(logging.WARNING)

# Initialize Gemini service
gemini_service = GeminiService(api_key=GEMINI_API_KEY)

# Temp dir for user file uploads (cleaned by OS)
UPLOAD_TEMP_DIR = Path(tempfile.gettempdir()) / "chatbot_user_uploads"
UPLOAD_TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Configure CORS to allow frontend to access API endpoints
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                f"http://localhost:{FRONTEND_PORT}",
                f"http://localhost:{BACKEND_PORT}",
            ]
        }
    },
)


@app.route("/")
def index():
    """Serve the main HTML page."""
    return send_from_directory(app.static_folder, "index.html")


@app.route("/favicon.ico")
def favicon():
    """Serve favicon (SVG) to avoid 404."""
    for name in ("favicon.ico", "favicon.svg"):
        p = Path(app.static_folder) / name
        if p.is_file():
            return send_from_directory(
                app.static_folder,
                name,
                mimetype="image/svg+xml" if name.endswith(".svg") else None,
            )
    return "", 404


@app.route("/api/files", methods=["GET"])
def list_files():
    """List documents in the session file store."""
    files = gemini_service.list_session_documents()
    return jsonify({"files": files})


@app.route("/api/files/delete", methods=["POST"])
def delete_file():
    """Delete a document from the session store. Body: { \"document_name\": \"...\" }."""
    data = request.get_json() or {}
    doc_name = data.get("document_name") or ""
    if not doc_name:
        return jsonify({"error": "document_name required"}), 400
    if gemini_service.delete_session_document(doc_name):
        return jsonify({"ok": True})
    return jsonify({"error": "Delete failed"}), 400


@app.route("/api/files/upload", methods=["POST"])
def upload_file():
    """
    Upload a file to the session file store so the chatbot can search over it.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    f = request.files["file"]
    if not f or f.filename == "":
        return jsonify({"error": "No file selected"}), 400
    name = secure_filename(f.filename) or "document"
    ext = Path(name).suffix or ".bin"
    fd, path = tempfile.mkstemp(suffix=ext, dir=UPLOAD_TEMP_DIR)
    try:
        os.close(fd)
        f.save(path)
        doc_name = gemini_service.upload_file_to_session(path, display_name=name)
        if doc_name:
            return jsonify({"ok": True, "filename": name, "document_name": doc_name})
        return jsonify({"error": "Upload to search store failed"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(path):
            try:
                os.unlink(path)
            except OSError:
                pass


@app.route("/<path:path>")
def static_files(path):
    """Serve static files (CSS, JS) from the frontend directory."""
    return send_from_directory(app.static_folder, path)


@app.route("/api/chat/gemini", methods=["POST"])
def chat_gemini():
    """
    Handle chat requests and stream responses from Gemini API.

    Returns a Server-Sent Events (SSE) stream with:
    - Text chunks as they arrive
    - Citation metadata
    - Token usage information
    - Error messages if something goes wrong
    """
    data = request.json or {}
    query = data.get("message", "")
    model_id = data.get("model_id") or None
    instruction_mode = data.get("instruction_mode") or None

    if not query:
        return jsonify({"error": "No message provided"}), 400

    def generate():
        """
        Generator function that yields SSE-formatted chunks.
        This allows real-time streaming of responses to the frontend.
        """
        try:
            for chunk_data in gemini_service.generate_chat_stream(
                query,
                model_id=model_id,
                instruction_mode=instruction_mode,
                environment=ENVIRONMENT,
            ):
                yield encode_stream_chunk(chunk_data)
        except Exception as e:
            # Send error to frontend if streaming fails
            error_data = {"error": f"Streaming error: {str(e)}"}
            yield encode_stream_chunk(error_data)
        finally:
            # Always send [DONE] marker to signal stream completion
            yield "data: [DONE]\n\n"

    return Response(generate(), mimetype="text/event-stream")


@app.route("/api/chat/clear", methods=["POST"])
def clear_history():
    """
    Clear the conversation history.

    This saves the current conversation before clearing,
    then starts a new conversation session.
    """
    gemini_service.clear_history()
    return jsonify({"status": "success", "message": "History cleared"})


@app.route("/api/chat/save", methods=["POST"])
def save_conversation():
    """
    Manually save the current conversation to a JSON file.

    Returns the filepath if successful, or an error if there's
    no conversation to save or the save operation fails.
    """
    filepath = gemini_service.save_conversation()
    if filepath:
        return jsonify(
            {"status": "success", "message": "Conversation saved", "filepath": filepath}
        )
    else:
        return (
            jsonify(
                {"status": "error", "message": "No conversation to save or save failed"}
            ),
            400,
        )


def signal_handler(sig, frame):
    """
    Handle shutdown signals (SIGINT, SIGTERM) gracefully.

    Saves the current conversation before exiting.
    """
    gemini_service.save_conversation()
    exit(0)


# Register signal handlers for graceful shutdown
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Register cleanup function to save conversation on normal exit
atexit.register(lambda: gemini_service.save_conversation())


if __name__ == "__main__":
    if not PUBLIC_URL:
        print(f"Backend running on port {BACKEND_PORT}")
    app.run(host="0.0.0.0", debug=True, port=BACKEND_PORT)

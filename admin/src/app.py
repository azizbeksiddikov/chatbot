"""
Admin Flask app: auth, file stores (dbs), files, conversations, static UI.
Paths are relative to repo layout: admin/src, admin/files, .env at project root.
Same structure locally and in container (project root = /app in Docker).
"""

from datetime import datetime, timezone
from functools import wraps
import json
import logging
import mimetypes
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Blueprint, Flask, jsonify, request, send_file, send_from_directory, session

import gemini_cli

# Paths: this file is admin/src/app.py -> ADMIN_DIR = admin, PROJECT_ROOT = repo root
_ADMIN_DIR = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _ADMIN_DIR.parent
load_dotenv(dotenv_path=_PROJECT_ROOT / '.env')
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='static', static_url_path='')
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-change-in-prod')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB

# API blueprint: register at /api and /chatbot_admin/api for admin UI (base href)
api_bp = Blueprint('api', __name__, url_prefix='/api')

# admin/files (mirrors repo; in Docker mount is ./admin/files -> /app/admin/files)
FILES_DIR = _ADMIN_DIR / 'files'
CONVERSATIONS_BASE_DIR = FILES_DIR / 'conversations'
CONVERSATIONS_BASE_DIR.mkdir(parents=True, exist_ok=True)
(CONVERSATIONS_BASE_DIR / 'dev').mkdir(exist_ok=True)
(CONVERSATIONS_BASE_DIR / 'prod').mkdir(exist_ok=True)

STATIC_DIR = Path(__file__).resolve().parent / 'static'


def login_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if not session.get('authenticated'):
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)

    return wrapped


# ---------- Auth ----------
@api_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'gemini-admin-backend'})


@api_bp.route('/auth/check', methods=['GET'])
def check_auth():
    return jsonify({'authenticated': session.get('authenticated', False)})


@api_bp.route('/auth/login', methods=['POST'])
def login():
    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 400
    data = request.get_json() or {}
    admin_id = (data.get('id') or '').strip()
    admin_password = (data.get('password') or '').strip()
    expected_id = os.environ.get('ADMIN_ID')
    expected_password = os.environ.get('ADMIN_PASSWORD')
    if not expected_id or not expected_password:
        logger.error('ADMIN_ID or ADMIN_PASSWORD not configured')
        return jsonify({'error': 'Server configuration error'}), 500
    if admin_id == expected_id and admin_password == expected_password:
        session['authenticated'] = True
        session.permanent = True
        app.permanent_session_lifetime = 86400  # 24h
        logger.info(f'User {admin_id} logged in')
        return jsonify({'success': True, 'message': 'Login successful'})
    logger.warning(f'Failed login for ID: {admin_id}')
    return jsonify({'error': 'Invalid credentials'}), 401


@api_bp.route('/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logout successful'})


# ---------- DBs ----------
@api_bp.route('/dbs', methods=['GET', 'POST', 'DELETE'])
@login_required
def dbs_view():
    if request.method == 'GET':
        try:
            stores = gemini_cli.list_dbs()
            return jsonify(stores)
        except Exception as e:
            logger.error(f'Error fetching databases: {e}', exc_info=True)
            return jsonify({'error': 'Failed to fetch databases'}), 500
    if request.method == 'POST':
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        data = request.get_json() or {}
        display_name = (data.get('display_name') or '').strip()
        if not display_name:
            return jsonify({'error': 'display_name is required'}), 400
        try:
            store = gemini_cli.client.file_search_stores.create(config={'display_name': display_name})
            logger.info(f'Created database: {display_name}')
            return jsonify(
                {
                    'name': getattr(store, 'name', None),
                    'display_name': getattr(store, 'display_name', None),
                }
            )
        except Exception as e:
            logger.error(f'Error creating database: {e}', exc_info=True)
            return jsonify({'error': 'Failed to create database'}), 500
    if request.method == 'DELETE':
        name = (request.args.get('name') or '').strip()
        if not name or not name.startswith('fileSearchStores/'):
            return jsonify({'error': 'Invalid database name format'}), 400
        try:
            gemini_cli.delete_db(name)
            logger.info(f'Deleted database: {name}')
            return jsonify({'success': True, 'name': name})
        except Exception as e:
            logger.error(f'Error deleting database {name}: {e}', exc_info=True)
            return jsonify({'error': 'Failed to delete database'}), 500
    return jsonify({'error': 'Method not allowed'}), 405


# ---------- Files ----------
@api_bp.route('/files', methods=['GET', 'POST', 'DELETE'])
@login_required
def files_view():
    if request.method == 'GET':
        store_name = (request.args.get('store_name') or '').strip()
        if not store_name or not store_name.startswith('fileSearchStores/'):
            return jsonify({'error': 'Invalid store_name format'}), 400
        try:
            files = gemini_cli.list_files(store_name)
            return jsonify(files)
        except Exception as e:
            logger.error(f'Error fetching files: {e}', exc_info=True)
            return jsonify({'error': 'Failed to fetch files'}), 500
    if request.method == 'POST':
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        file = request.files['file']
        store_name = (request.form.get('store_name') or '').strip()
        metadata_str = (request.form.get('metadata') or '').strip()
        if not store_name or not store_name.startswith('fileSearchStores/'):
            return jsonify({'error': 'Invalid store_name format'}), 400
        if not file.filename:
            return jsonify({'error': 'No selected file'}), 400
        file.seek(0, os.SEEK_END)
        size = file.tell()
        file.seek(0)
        if size == 0:
            return jsonify({'error': 'File is empty'}), 400
        if '..' in file.filename or '/' in file.filename or '\\' in file.filename:
            return jsonify({'error': 'Invalid filename'}), 400
        vector_db = store_name.replace('fileSearchStores/', '')
        if not vector_db:
            return jsonify({'error': 'Invalid store_name format'}), 400
        upload_dir = FILES_DIR / 'uploaded' / vector_db
        upload_dir.mkdir(parents=True, exist_ok=True)
        ext = os.path.splitext(file.filename)[1] or ''
        temp_path = upload_dir / f'temp_{os.urandom(8).hex()}{ext}'
        try:
            file.save(str(temp_path))
            metadata = None
            if metadata_str:
                try:
                    metadata = json.loads(metadata_str)
                    if not isinstance(metadata, dict):
                        raise ValueError('Metadata must be a JSON object')
                except (json.JSONDecodeError, ValueError) as e:
                    temp_path.unlink(missing_ok=True)
                    return jsonify({'error': str(e)}), 400
            doc_id = gemini_cli.upload_file_to_db(
                store_name, str(temp_path), metadata=metadata, display_name=file.filename
            )
            saved = upload_dir / f'{doc_id}{ext}'
            if temp_path.exists():
                temp_path.rename(saved)
            logger.info(f'Uploaded {file.filename} to {store_name}')
            return jsonify(
                {'success': True, 'filename': file.filename, 'document_id': doc_id, 'saved_path': str(saved)}
            )
        except Exception as e:
            logger.error(f'Error uploading file: {e}', exc_info=True)
            temp_path.unlink(missing_ok=True)
            return jsonify({'error': 'Failed to upload file'}), 500
    if request.method == 'DELETE':
        doc_name = (request.args.get('name') or '').strip()
        if not doc_name or 'documents/' not in doc_name:
            return jsonify({'error': 'Invalid document name format'}), 400
        try:
            gemini_cli.delete_file_from_db(doc_name)
            if '/documents/' in doc_name:
                store_name = doc_name.split('/documents/')[0]
                document_id = doc_name.split('/documents/')[-1]
                vector_db = store_name.replace('fileSearchStores/', '')
                if vector_db:
                    upload_dir = FILES_DIR / 'uploaded' / vector_db
                    if upload_dir.exists():
                        for f in upload_dir.iterdir():
                            if f.is_file() and f.stem == document_id:
                                try:
                                    f.unlink()
                                except OSError:
                                    pass
            return jsonify({'success': True})
        except Exception as e:
            logger.error(f'Error deleting file: {e}', exc_info=True)
            return jsonify({'error': 'Failed to delete file'}), 500
    return jsonify({'error': 'Method not allowed'}), 405


@api_bp.route('/files/text', methods=['POST'])
@login_required
def upload_text_content():
    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 400
    data = request.get_json() or {}
    content = (data.get('content') or '').strip()
    filename = (data.get('filename') or '').strip()
    store_name = (data.get('store_name') or '').strip()
    metadata = data.get('metadata') or {}
    if not content:
        return jsonify({'error': 'Content is required'}), 400
    if not filename:
        return jsonify({'error': 'Filename is required'}), 400
    if not store_name or not store_name.startswith('fileSearchStores/'):
        return jsonify({'error': 'Invalid store_name format'}), 400
    if '..' in filename or '/' in filename or '\\' in filename:
        return jsonify({'error': 'Invalid filename'}), 400
    if not os.path.splitext(filename)[1]:
        filename += '.txt'
    vector_db = store_name.replace('fileSearchStores/', '')
    if not vector_db:
        return jsonify({'error': 'Invalid store_name format'}), 400
    upload_dir = FILES_DIR / 'uploaded' / vector_db
    upload_dir.mkdir(parents=True, exist_ok=True)
    ext = os.path.splitext(filename)[1] or '.txt'
    temp_path = upload_dir / f'temp_{os.urandom(8).hex()}{ext}'
    try:
        temp_path.write_text(content, encoding='utf-8')
        meta = metadata if isinstance(metadata, dict) and metadata else None
        doc_id = gemini_cli.upload_file_to_db(store_name, str(temp_path), metadata=meta, display_name=filename)
        saved = upload_dir / f'{doc_id}{ext}'
        if temp_path.exists():
            temp_path.rename(saved)
        return jsonify({'success': True, 'filename': filename, 'document_id': doc_id, 'saved_path': str(saved)})
    except Exception as e:
        logger.error(f'Error uploading text: {e}', exc_info=True)
        temp_path.unlink(missing_ok=True)
        return jsonify({'error': 'Failed to upload text content'}), 500


@api_bp.route('/files/view', methods=['GET'])
@login_required
def view_file():
    doc_name = (request.args.get('name') or '').strip()
    if not doc_name or 'documents/' not in doc_name:
        return jsonify({'error': 'Invalid document name format'}), 400
    try:
        store_name = doc_name.split('/documents/')[0]
        document_id = doc_name.split('/documents/')[-1]
        vector_db = store_name.replace('fileSearchStores/', '')
        if not vector_db:
            return jsonify({'error': 'Invalid store name format'}), 400
        upload_dir = FILES_DIR / 'uploaded' / vector_db
        file_path = None
        if upload_dir.exists():
            for f in upload_dir.iterdir():
                if f.is_file() and f.stem == document_id:
                    file_path = f
                    break
        if not file_path or not file_path.exists():
            return jsonify({'error': 'File not found'}), 404
        ct = {'.pdf': 'application/pdf', '.txt': 'text/plain', '.md': 'text/markdown'}.get(
            file_path.suffix.lower(), 'application/octet-stream'
        )
        as_attachment = (request.args.get('download') or '').strip() == '1'
        return send_file(file_path, mimetype=ct, as_attachment=as_attachment, download_name=file_path.name)
    except Exception as e:
        logger.error(f'Error viewing file: {e}', exc_info=True)
        return jsonify({'error': 'Failed to view file'}), 500


# ---------- Conversations ----------
@api_bp.route('/conversations', methods=['GET', 'POST'])
def conversations_view():
    if request.method == 'GET':
        return list_conversations()
    if request.method == 'POST':
        return save_conversation()
    return jsonify({'error': 'Method not allowed'}), 405


@login_required
def list_conversations():
    try:
        out = []
        for env_folder in ('dev', 'prod'):
            env_dir = CONVERSATIONS_BASE_DIR / env_folder
            if env_dir.exists():
                for f in env_dir.glob('*.txt'):
                    st = f.stat()
                    out.append(
                        {'filename': f.name, 'size': st.st_size, 'modified': st.st_mtime, 'environment': env_folder}
                    )
        out.sort(key=lambda x: x['modified'], reverse=True)
        return jsonify(out)
    except Exception as e:
        logger.error(f'Error listing conversations: {e}', exc_info=True)
        return jsonify({'error': 'Failed to list conversations'}), 500


def save_conversation():
    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 400
    try:
        data = request.get_json() or {}
        session_data = data.get('sessionData') or {}
        if not isinstance(session_data, dict):
            session_data = {}
        conversation_start_time = (session_data.get('conversationStartTime') or '').strip()
        session_id = (session_data.get('sessionId') or '').strip()
        source = (data.get('source') or session_data.get('source') or '').strip()
        question = data.get('question', '')
        answer = data.get('answer', '')
        citations = data.get('citations', [])
        question_timestamp = data.get('questionTimestamp', '')
        answer_timestamp = data.get('answerTimestamp', '')
        is_dev = data.get('isDev', True)
        file_stores = data.get('fileStores', [])
        env_folder = 'dev' if is_dev else 'prod'
        conversations_dir = CONVERSATIONS_BASE_DIR / env_folder
        conversations_dir.mkdir(parents=True, exist_ok=True)
        safe_start = conversation_start_time.replace('/', '_').replace('\\', '_').replace('..', '_')
        safe_sid = session_id.replace('/', '_').replace('\\', '_').replace('..', '_')
        if not safe_start and not safe_sid:
            safe_start = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')
            safe_sid = os.urandom(8).hex()
        name_part = f'{safe_start}_{safe_sid}'
        filename = f'{name_part}.txt'
        filepath = conversations_dir / filename

        def write_header():
            header = f'{"=" * 80}\nCONVERSATION FILE\nSource: {source or "(none)"}\nEnvironment: {"Development" if is_dev else "Production"}\nSession ID: {session_id}\nStarted: {conversation_start_time}\n{"=" * 80}\nActive File Stores (DBs):\n'
            for s in file_stores or []:
                header += f'  - {s}\n'
            if not file_stores:
                header += '  (none)\n'
            header += f'\n{"=" * 80}\n\n'
            filepath.write_text(header, encoding='utf-8')

        if not filepath.exists():
            write_header()
        citations_str = (
            '\n'.join(f'  - {c.get("title", "")} (score: {c.get("relevance_score", "")})' for c in (citations or []))
            if citations
            else '  (none)'
        )
        entry = f'Question Timestamp: {question_timestamp}\nQuestion: {question or ""}\n\nAnswer Timestamp: {answer_timestamp}\nAnswer: {answer or ""}\n\nCitations:\n{citations_str}\n\n{"=" * 80}\n\n'
        if not filepath.exists():
            write_header()
        with filepath.open('a', encoding='utf-8') as f:
            f.write(entry)
        return jsonify({'success': True, 'filepath': str(filepath), 'filename': filename, 'environment': env_folder})
    except Exception as e:
        logger.error(f'Error saving conversation: {e}', exc_info=True)
        return jsonify({'error': 'Failed to save conversation'}), 500


@api_bp.route('/conversations/delete', methods=['DELETE', 'POST'])
@login_required
def delete_conversation():
    filename = (request.args.get('filename') or '').strip()
    environment = (request.args.get('environment') or 'dev').strip()
    if not filename:
        return jsonify({'error': 'filename is required'}), 400
    if environment not in ('dev', 'prod'):
        return jsonify({'error': 'Invalid environment'}), 400
    if '..' in filename or '/' in filename or '\\' in filename:
        return jsonify({'error': 'Invalid filename'}), 400
    if not filename.endswith('.txt'):
        return jsonify({'error': 'Invalid file type'}), 400
    try:
        filepath = CONVERSATIONS_BASE_DIR / environment / filename
        if not filepath.exists() or not filepath.is_file():
            return jsonify({'error': 'Conversation not found'}), 404
        filepath.unlink()
        return jsonify({'success': True, 'filename': filename})
    except Exception as e:
        logger.error(f'Error deleting conversation: {e}', exc_info=True)
        return jsonify({'error': 'Failed to delete conversation'}), 500


@api_bp.route('/conversations/view', methods=['GET'])
@login_required
def view_conversation():
    filename = (request.args.get('filename') or '').strip()
    environment = (request.args.get('environment') or 'dev').strip()
    if not filename:
        return jsonify({'error': 'filename is required'}), 400
    if environment not in ('dev', 'prod'):
        return jsonify({'error': 'Invalid environment'}), 400
    if '..' in filename or '/' in filename or '\\' in filename:
        return jsonify({'error': 'Invalid filename'}), 400
    if not filename.endswith('.txt'):
        return jsonify({'error': 'Invalid file type'}), 400
    try:
        filepath = CONVERSATIONS_BASE_DIR / environment / filename
        if not filepath.exists() or not filepath.is_file():
            return jsonify({'error': 'Conversation not found'}), 404
        as_attachment = (request.args.get('download') or '').strip() == '1'
        return send_file(filepath, mimetype='text/plain', as_attachment=as_attachment, download_name=filename)
    except Exception as e:
        logger.error(f'Error viewing conversation: {e}', exc_info=True)
        return jsonify({'error': 'Failed to view conversation'}), 500


# Register API at /api (admin frontend uses absolute /api for all API calls)
app.register_blueprint(api_bp)


# ---------- Static (chatbot_admin and root) ----------
def _serve_static(relative_path):
    if relative_path.startswith('chatbot_admin/'):
        relative_path = relative_path[len('chatbot_admin/') :]
    static_resolved = STATIC_DIR.resolve()
    full = (STATIC_DIR / relative_path).resolve()
    if not full.is_file():
        return None
    try:
        full.relative_to(static_resolved)
    except ValueError:
        return None
    ct, _ = mimetypes.guess_type(str(full))
    ct = ct or 'application/octet-stream'
    return send_file(full, mimetype=ct)


@app.route('/favicon.ico')
def favicon():
    p = STATIC_DIR / 'favicon.svg'
    if p.exists():
        return send_file(p, mimetype='image/svg+xml')
    return '', 404


@app.route('/chatbot_admin')
@app.route('/chatbot_admin/')
def chatbot_admin_index():
    p = STATIC_DIR / 'index.html'
    if p.exists():
        return send_file(p, mimetype='text/html')
    return '', 404


@app.route('/chatbot_admin/css/<path:subpath>')
def chatbot_admin_css(subpath):
    """Serve CSS under /chatbot_admin/css/ so /chatbot_admin/api/* is left to the blueprint."""
    return _send_static_if_file('css', subpath)


@app.route('/chatbot_admin/js/<path:subpath>')
def chatbot_admin_js(subpath):
    """Serve JS under /chatbot_admin/js/."""
    return _send_static_if_file('js', subpath)


@app.route('/chatbot_admin/favicon.svg')
def chatbot_admin_favicon():
    """Serve favicon so /chatbot_admin/api/* is left to the blueprint."""
    p = STATIC_DIR / 'favicon.svg'
    if p.is_file():
        return send_file(p, mimetype='image/svg+xml')
    return '', 404


def _send_static_if_file(prefix, subpath):
    static_resolved = STATIC_DIR.resolve()
    full = (STATIC_DIR / prefix / subpath).resolve()
    if not full.is_file():
        return '', 404
    try:
        full.relative_to(static_resolved)
    except ValueError:
        return '', 404
    ct, _ = mimetypes.guess_type(str(full))
    return send_file(full, mimetype=ct or 'application/octet-stream')


@app.route('/')
def index():
    p = STATIC_DIR / 'index.html'
    if p.exists():
        return send_file(p, mimetype='text/html')
    return '', 404


if __name__ == '__main__':
    port = 5006
    pub = os.environ.get('PUBLIC_URL')
    if pub:
        print(f'Open at: {pub}/  (and {pub}/chatbot_admin/, {pub}/api/)')
        import logging

        logging.getLogger('werkzeug').setLevel(logging.WARNING)
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('DJANGO_DEBUG', 'true').lower() == 'true')

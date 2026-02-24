import json
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai

logger = logging.getLogger(__name__)

# Paths: this file is admin/src/gemini_cli.py -> admin dir, project root (same layout as repo/Docker)
_ADMIN_DIR = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _ADMIN_DIR.parent
_load_env = _PROJECT_ROOT / '.env'
if _load_env.is_file():
    load_dotenv(dotenv_path=_load_env)
IS_DEBUG = os.environ.get('DJANGO_DEBUG', 'true').lower() == 'true'

# admin/files (same as repo; in Docker: ./admin/files -> /app/admin/files)
FILES_DIR = _ADMIN_DIR / 'files'
LOCAL_BASE_DIR = Path(__file__).resolve().parent
OUTPUTS_DIR = _ADMIN_DIR / 'outputs'
CONVERSATIONS_BASE_DIR = FILES_DIR / 'conversations'

# Create directories if they don't exist
os.makedirs(OUTPUTS_DIR, exist_ok=True)
os.makedirs(CONVERSATIONS_BASE_DIR, exist_ok=True)
os.makedirs(CONVERSATIONS_BASE_DIR / 'dev', exist_ok=True)
os.makedirs(CONVERSATIONS_BASE_DIR / 'prod', exist_ok=True)

# Initialize Gemini client (GEMINI_API_KEY or GOOGLE_API_KEY)
_api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
client = genai.Client(api_key=_api_key) if _api_key else genai.Client()


def list_dbs() -> list:
    """List all file search stores"""
    print('Fetching DBs...')
    try:
        response = list(client.file_search_stores.list())

        out = {
            'fileSearchStores': [
                {
                    'name': getattr(store, 'name', None),
                    'display_name': getattr(store, 'display_name', None),
                    'create_time': getattr(store, 'create_time', None),
                    'update_time': getattr(store, 'update_time', None),
                    'active_documents_count': getattr(store, 'active_documents_count', None),
                    'pending_documents_count': getattr(store, 'pending_documents_count', None),
                    'failed_documents_count': getattr(store, 'failed_documents_count', None),
                    'size_bytes': getattr(store, 'size_bytes', None),
                }
                for store in response
            ]
        }
        # Print with index for selection
        for i, store in enumerate(out['fileSearchStores']):
            print(f'{i + 1}. {store["display_name"]} ({store["name"]})')

        return out['fileSearchStores']
    except Exception as e:
        print(f'Error listing DBs: {e}')
        return []


def create_db(display_name: str) -> bool:
    """Create a new file search store"""
    store = client.file_search_stores.create(config={'display_name': display_name})

    out = {
        'name': getattr(store, 'name', None),
        'display_name': getattr(store, 'display_name', None),
        'create_time': getattr(store, 'create_time', None),
        'update_time': getattr(store, 'update_time', None),
        'active_documents_count': getattr(store, 'active_documents_count', None),
        'pending_documents_count': getattr(store, 'pending_documents_count', None),
        'failed_documents_count': getattr(store, 'failed_documents_count', None),
        'size_bytes': getattr(store, 'size_bytes', None),
    }
    print(json.dumps(out, indent=2, default=str))
    return True


def delete_db(name: str) -> bool:
    """Delete a file search store (name format: fileSearchStores/...)"""
    client.file_search_stores.delete(name=name, config={'force': True})
    print(json.dumps({'deleted': True, 'name': name}, indent=2))
    return True


def list_files(store_name: str) -> list:
    """List all files in a store (store_name format: fileSearchStores/...)"""
    print(f'Listing files for: {store_name}')
    try:
        pager = client.file_search_stores.documents.list(parent=store_name)

        file_list = []
        for doc in pager:
            custom_metadata = getattr(doc, 'custom_metadata', None)
            metadata_dict = {}
            if custom_metadata:
                # Convert CustomMetadata objects to dict
                for meta in custom_metadata:
                    key = getattr(meta, 'key', None)
                    if not key:
                        continue

                    string_value = getattr(meta, 'string_value', None)
                    string_list_value = getattr(meta, 'string_list_value', None)
                    numeric_value = getattr(meta, 'numeric_value', None)

                    if string_value is not None:
                        metadata_dict[key] = string_value
                    elif string_list_value is not None:
                        # Convert list to comma-separated string
                        values = getattr(string_list_value, 'values', [])
                        metadata_dict[key] = ', '.join(values) if values else ''
                    elif numeric_value is not None:
                        metadata_dict[key] = numeric_value

            doc_data = {
                'name': getattr(doc, 'name', None),
                'display_name': getattr(doc, 'display_name', None),
                'create_time': getattr(doc, 'create_time', None),
                'update_time': getattr(doc, 'update_time', None),
                'custom_metadata': metadata_dict if metadata_dict else None,
            }
            file_list.append(doc_data)

        # Print for menu selection
        for i, f in enumerate(file_list):
            print(f'  {i + 1}. {f["display_name"]} ({f["name"]})')

        return file_list
    except Exception as e:
        print(f'Error listing files: {e}')
        return []


def upload_file_to_db(store_name: str, file_path: str, metadata: dict = None, display_name: str = None) -> str:
    """Upload a file to a store with optional metadata and display name"""
    print(f'Uploading {file_path} to {store_name}...')
    if metadata:
        print(f'With metadata: {metadata}')
    if display_name:
        print(f'With display name: {display_name}')
    try:
        # Convert metadata dict to API format
        config = {}
        if metadata:
            custom_metadata = []
            for key, value in metadata.items():
                custom_metadata.append({'key': str(key), 'stringValue': str(value)})
            config['customMetadata'] = custom_metadata

        # Set display_name to preserve the original/custom filename
        if display_name:
            config['displayName'] = display_name

        if config:
            result = client.file_search_stores.upload_to_file_search_store(
                file_search_store_name=store_name,
                file=file_path,
                config=config,
            )
        else:
            result = client.file_search_stores.upload_to_file_search_store(
                file_search_store_name=store_name, file=file_path
            )

        # Extract document ID/name from result
        document_name = getattr(result, 'name', None)
        if not document_name:
            raise Exception('Failed to get document ID from Gemini response')

        # Extract just the document ID part (last segment after /documents/)
        # Format: fileSearchStores/{store_id}/documents/{document_id}
        if '/documents/' in document_name:
            document_id = document_name.split('/documents/')[-1]
        else:
            document_id = document_name.split('/')[-1]

        print(f'Upload successful. Document ID: {document_id}')
        return document_id
    except Exception as e:
        print(f'Error uploading file: {e}')
        import traceback

        traceback.print_exc()
        return False


def delete_file_from_db(document_name: str) -> bool:
    """Delete a file from a store (document_name format: fileSearchStores/.../documents/...)"""
    print(f'Deleting document: {document_name}')
    try:
        client.file_search_stores.documents.delete(name=document_name, config={'force': True})
        print('Deletion successful.')
        return True
    except Exception as e:
        print(f'Error deleting file: {e}')
        return False

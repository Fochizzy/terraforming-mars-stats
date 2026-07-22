from __future__ import annotations

import json
from pathlib import Path

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from update_planning_pack import expected_source_count


APP_DIR = Path(__file__).resolve().parent
SCOPES = ["https://www.googleapis.com/auth/drive.file"]
GOOGLE_DOC_MIME = "application/vnd.google-apps.document"
GOOGLE_FOLDER_MIME = "application/vnd.google-apps.folder"


def main() -> int:
    expected_doc_count = expected_source_count()
    state = json.loads((APP_DIR / "drive-map.json").read_text(encoding="utf-8"))
    credentials = Credentials.from_authorized_user_file(str(APP_DIR / "token.json"), SCOPES)
    service = build("drive", "v3", credentials=credentials, cache_discovery=False)
    folder_id = state["folder_id"]
    items: list[dict[str, object]] = []
    page_token = None
    while True:
        response = service.files().list(
            q=f"'{folder_id}' in parents and trashed = false",
            spaces="drive",
            fields="nextPageToken,files(id,name,mimeType,parents,appProperties)",
            pageSize=100,
            pageToken=page_token,
        ).execute()
        items.extend(response.get("files", []))
        page_token = response.get("nextPageToken")
        if not page_token:
            break

    state_ids = {record["id"] for record in state["documents"].values()}
    live_ids = {str(item["id"]) for item in items}
    native_docs = [item for item in items if item.get("mimeType") == GOOGLE_DOC_MIME]
    subfolders = [item for item in items if item.get("mimeType") == GOOGLE_FOLDER_MIME]
    others = [
        item
        for item in items
        if item.get("mimeType") not in (GOOGLE_DOC_MIME, GOOGLE_FOLDER_MIME)
    ]
    titles = [str(item.get("name", "")) for item in items]
    marked = [
        item
        for item in items
        if (item.get("appProperties") or {}).get("tm_pack_owner") == "tm-planning-pack-v1"
    ]
    result = {
        "success": (
            len(items) == expected_doc_count
            and len(native_docs) == expected_doc_count
            and not subfolders
            and not others
            and len(set(titles)) == expected_doc_count
            and len(marked) == expected_doc_count
            and len(state["documents"]) == expected_doc_count
            and live_ids == state_ids
        ),
        "total_items": len(items),
        "expected_documents": expected_doc_count,
        "native_google_docs": len(native_docs),
        "subfolders": len(subfolders),
        "other_files": len(others),
        "unique_titles": len(set(titles)),
        "app_managed_items": len(marked),
        "state_ids_match_live_ids": live_ids == state_ids,
        "state_documents": len(state["documents"]),
    }
    print(json.dumps(result, sort_keys=True))
    return 0 if result["success"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

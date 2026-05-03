import re
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


SPREADSHEET_NS = {"sheet": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
DEFAULT_SOURCE = Path(__file__).resolve().parents[2] / "documents" / "soict_courses.xlsx"

STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "bang",
    "bai",
    "boi",
    "cho",
    "co",
    "cua",
    "da",
    "day",
    "de",
    "den",
    "do",
    "duoc",
    "for",
    "from",
    "hoc",
    "in",
    "is",
    "it",
    "mon",
    "mot",
    "nganh",
    "nhung",
    "of",
    "on",
    "or",
    "so",
    "tai",
    "the",
    "thi",
    "to",
    "toi",
    "tren",
    "va",
    "ve",
    "về",
    "with",
}


def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    return "".join(char for char in normalized if not unicodedata.combining(char))


def normalize_text(value: str) -> str:
    text = strip_accents(value or "").lower().strip()
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"[^0-9a-zA-Z\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def tokenize_text(value: str) -> list[str]:
    normalized = normalize_text(value)
    return [
        token
        for token in normalized.split()
        if token not in STOP_WORDS and len(token) > 1
    ]


def build_search_document(title: str, course_code: str, provider: str) -> str:
    parts = [title or "", course_code or "", provider or ""]
    return " ".join(part.strip() for part in parts if part and part.strip())


def _column_from_reference(cell_reference: str) -> str:
    return "".join(char for char in cell_reference if char.isalpha())


def _shared_strings(archive: zipfile.ZipFile) -> list[str]:
    try:
        raw_xml = archive.read("xl/sharedStrings.xml")
    except KeyError:
        return []

    root = ET.fromstring(raw_xml)
    values: list[str] = []
    for item in root.findall("sheet:si", SPREADSHEET_NS):
        parts = item.findall(".//sheet:t", SPREADSHEET_NS)
        values.append("".join(part.text or "" for part in parts))
    return values


def _cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")

    if cell_type == "inlineStr":
        parts = cell.findall(".//sheet:t", SPREADSHEET_NS)
        return "".join(part.text or "" for part in parts)

    value_node = cell.find("sheet:v", SPREADSHEET_NS)
    if value_node is None or value_node.text is None:
        return ""

    value = value_node.text.strip()
    if cell_type == "s":
        return shared_strings[int(value)]
    return value


def read_xlsx_rows(source: str | Path) -> list[dict[str, str]]:
    source_path = Path(source)
    with zipfile.ZipFile(source_path) as archive:
        shared_strings = _shared_strings(archive)
        worksheet_xml = archive.read("xl/worksheets/sheet1.xml")

    root = ET.fromstring(worksheet_xml)
    rows = root.findall("sheet:sheetData/sheet:row", SPREADSHEET_NS)
    parsed_rows: list[dict[str, str]] = []

    headers: dict[str, str] = {}
    for index, row in enumerate(rows):
        current_row: dict[str, str] = {}
        for cell in row.findall("sheet:c", SPREADSHEET_NS):
            column = _column_from_reference(cell.attrib.get("r", ""))
            current_row[column] = _cell_value(cell, shared_strings)

        if index == 0:
            headers = current_row
            continue

        mapped = {headers.get(column, column): value for column, value in current_row.items()}
        mapped["_row_number"] = row.attrib.get("r", "")
        parsed_rows.append(mapped)

    return parsed_rows


def clean_course_rows(source: str | Path = DEFAULT_SOURCE) -> list[dict[str, str]]:
    raw_rows = read_xlsx_rows(source)
    cleaned_rows: list[dict[str, str]] = []
    seen_keys: set[tuple[str, str, str]] = set()

    for row in raw_rows:
        title = " ".join((row.get("Tên khóa học") or "").split())
        course_code = " ".join((row.get("Mã môn") or "").split()).upper()
        provider = " ".join((row.get("Tổ chức") or "").split())
        course_url = (row.get("Link khóa học") or "").strip()

        if not title or not course_url:
            continue

        dedupe_key = (
            normalize_text(title),
            normalize_text(course_code),
            course_url.lower(),
        )
        if dedupe_key in seen_keys:
            continue
        seen_keys.add(dedupe_key)

        search_document = build_search_document(title, course_code, provider)
        tokens = tokenize_text(search_document)

        cleaned_rows.append(
            {
                "title": title,
                "course_code": course_code or None,
                "provider": provider or "SOICT",
                "course_url": course_url,
                "normalized_title": normalize_text(title),
                "search_document": search_document,
                "tokenized_text": " ".join(tokens),
                "source_row": int(row.get("_row_number") or 0) or None,
            }
        )

    return cleaned_rows

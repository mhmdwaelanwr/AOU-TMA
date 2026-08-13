from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from bs4 import BeautifulSoup
import json
import re
import requests

ROOT = Path(__file__).resolve().parents[2]
EXPORT_DIR = ROOT / "exports" / "aou-catalogues"

FACULTIES = {
    "computer": {
        "name": "Faculty of Computer Studies",
        "url": "https://www.aou.edu.eg/faculties/computer/Pages/course-catalogue.aspx",
    },
    "business": {
        "name": "Faculty of Business Studies",
        "url": "https://www.aou.edu.eg/faculties/business/Pages/course-catalogue.aspx",
    },
    "language": {
        "name": "Faculty of Language Studies",
        "url": "https://www.aou.edu.eg/faculties/language/Pages/course-catalogue.aspx",
    },
    "media": {
        "name": "Faculty of Media and Mass Communication",
        "url": "https://www.aou.edu.eg/faculties/media/Pages/course-catalogue.aspx",
    },
    "education": {
        "name": "Faculty of Education",
        "url": "https://www.aou.edu.eg/faculties/education/Pages/course-catalogue.aspx",
    },
    "gmdt": {
        "name": "Graphic and Multimedia Design Technology",
        "url": "https://www.aou.edu.eg/faculties/gmdt/Pages/course-catalogue.aspx",
    },
}

LABELS = (
    "Course Code",
    "Course Title",
    "Pre-requisite",
    "Credit Hours",
    "Course Description",
    "Course Objectives",
    "Course Outcomes",
)


def normalize(value: str) -> str:
    value = value.replace("\u200b", " ").replace("\u200c", " ").replace("\u200d", " ")
    value = value.replace("\xa0", " ").replace("\ufeff", " ")
    return re.sub(r"\s+", " ", value).strip()


def inline_value(line: str, label: str) -> str | None:
    if not line.startswith(label):
        return None
    if "|" not in line:
        return None
    value = normalize(line.split("|", 1)[1])
    return value or None


def is_label(line: str) -> bool:
    return any(line.startswith(label) for label in LABELS)


def collect_field(segment: list[str], label: str) -> str | None:
    for i, line in enumerate(segment):
        if not line.startswith(label):
            continue
        parts: list[str] = []
        first = inline_value(line, label)
        if first:
            parts.append(first)
        for nxt in segment[i + 1:]:
            if is_label(nxt) or nxt == "Close":
                break
            if nxt in {"|", label}:
                continue
            cleaned = normalize(nxt)
            if cleaned and (not parts or cleaned != parts[-1]):
                parts.append(cleaned)
        text = normalize(" ".join(parts))
        return text or None
    return None


def parse_credit_hours(raw: str | None):
    if not raw:
        return None
    match = re.search(r"-?\d+(?:\.\d+)?", raw)
    if not match:
        return raw
    value = float(match.group(0))
    return int(value) if value.is_integer() else value


def parse_catalogue(html: str, faculty_key: str, faculty_name: str, source_url: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    lines = [normalize(text) for text in soup.stripped_strings if normalize(text)]
    records: list[dict] = []

    code_indexes = [i for i, line in enumerate(lines) if line.startswith("Course Code")]
    for pos, start in enumerate(code_indexes):
        next_code = code_indexes[pos + 1] if pos + 1 < len(code_indexes) else len(lines)
        close_index = next((i for i in range(start + 1, next_code) if lines[i] == "Close"), next_code)
        segment = lines[start:close_index]

        code = collect_field(segment, "Course Code")
        if not code:
            continue
        title = collect_field(segment, "Course Title")
        prerequisite = collect_field(segment, "Pre-requisite")
        credit_raw = collect_field(segment, "Credit Hours")
        description = collect_field(segment, "Course Description")
        objectives = collect_field(segment, "Course Objectives")
        outcomes = collect_field(segment, "Course Outcomes")

        records.append({
            "courseCode": code,
            "courseTitle": title,
            "preRequisite": prerequisite,
            "creditHours": parse_credit_hours(credit_raw),
            "creditHoursRaw": credit_raw,
            "courseDescription": description,
            "courseObjectives": objectives,
            "courseOutcomes": outcomes,
            "facultyKey": faculty_key,
            "faculty": faculty_name,
            "sourceUrl": source_url,
        })

    return records


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    exported_at = datetime.now(timezone.utc).isoformat()
    session = requests.Session()
    session.headers.update({
        "User-Agent": "AOU-Catalogue-JSON-Exporter/1.0",
        "Accept-Language": "en-US,en;q=0.9",
    })

    summary = []
    combined = []
    for key, meta in FACULTIES.items():
        response = session.get(meta["url"], timeout=60)
        response.raise_for_status()
        courses = parse_catalogue(response.text, key, meta["name"], meta["url"])
        duplicate_codes = sorted({
            code for code in [str(c["courseCode"]).casefold() for c in courses]
            if [str(c["courseCode"]).casefold() for c in courses].count(code) > 1
        })
        payload = {
            "schemaVersion": 1,
            "sourceLanguage": "en",
            "facultyKey": key,
            "faculty": meta["name"],
            "sourceUrl": meta["url"],
            "exportedAt": exported_at,
            "courseCount": len(courses),
            "duplicateCourseCodes": duplicate_codes,
            "courses": courses,
        }
        out = EXPORT_DIR / f"{key}.json"
        write_json(out, payload)
        summary.append({"facultyKey": key, "faculty": meta["name"], "courseCount": len(courses), "file": out.name, "sourceUrl": meta["url"]})
        combined.extend(courses)
        print(f"{key}: {len(courses)} courses -> {out}")

    write_json(EXPORT_DIR / "all_faculties.json", {
        "schemaVersion": 1,
        "sourceLanguage": "en",
        "exportedAt": exported_at,
        "facultyCount": len(FACULTIES),
        "courseRecordCount": len(combined),
        "faculties": summary,
        "courses": combined,
    })
    write_json(EXPORT_DIR / "manifest.json", {
        "schemaVersion": 1,
        "exportedAt": exported_at,
        "facultyCount": len(FACULTIES),
        "courseRecordCount": len(combined),
        "faculties": summary,
    })


if __name__ == "__main__":
    main()

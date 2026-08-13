from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
import json
import re
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
COURSES_PATH = ROOT / "backend-python" / "app" / "courses.json"
OUT_BACKEND = ROOT / "backend-python" / "app" / "course_catalogue_audit.json"
OUT_SERVERLESS = ROOT / "serverless" / "data" / "course_catalogue_audit.json"
OUT_FRONTEND = ROOT / "frontend" / "public" / "catalog" / "course_catalogue_audit.json"

SOURCES = {
    "Computer Studies": {
        "en": "https://www.aou.edu.eg/faculties/computer/Pages/course-catalogue.aspx",
        "ar": "https://www.aou.edu.eg/ar/faculties/computer/Pages/course-catalogue.aspx",
    },
    "Business Studies": {
        "en": "https://www.aou.edu.eg/faculties/business/Pages/course-catalogue.aspx",
        "ar": "https://www.aou.edu.eg/ar/faculties/business/Pages/course-catalogue.aspx",
    },
    "Language Studies": {
        "en": "https://www.aou.edu.eg/faculties/language/Pages/course-catalogue.aspx",
        "ar": "https://www.aou.edu.eg/ar/faculties/language/Pages/course-catalogue.aspx",
    },
    "Education": {
        "en": "https://www.aou.edu.eg/faculties/education/Pages/course-catalogue.aspx",
        "ar": "https://www.aou.edu.eg/ar/faculties/education/Pages/course-catalogue.aspx",
    },
    "Media": {
        "en": "https://www.aou.edu.eg/faculties/media/Pages/course-catalogue.aspx",
        "ar": "https://www.aou.edu.eg/ar/faculties/media/Pages/course-catalogue.aspx",
    },
}

ASSIGNMENT_SOURCE = "https://www.aou.edu.eg/students/examinations/Pages/assignment-schedule.aspx"
FCS_SCHEDULE = "https://www.aou.edu.eg/students/examinations/PublishingImages/Pages/assignment-schedule/Faculty%20of%20Computer%20Studies-TMA%20Cut-off%20Spring%2025-26.pdf"

# Same deadline row != same course. These groups come from the published TMA schedule.
SCHEDULE_GROUPS = [
    ["M129", "MT129", "MST129"], ["M105", "TM105"], ["TM111", "M110"],
    ["M131", "MT131"], ["GT101", "TU170"], ["M251", "M257"],
    ["T103", "TM103"], ["M132", "MT132"], ["T471", "TM471"],
    ["CES110", "CES111", "CES112", "CES113"],
    ["EDF109", "EDF228E", "EDF230", "EDS117", "EDS118", "EDS238", "EDS239E"],
    ["CES114", "CES115E", "CES231", "CES232"],
    ["CES233", "CES234", "CES235", "CES237E", "FTS11"],
    ["ACC302", "BE302"],
]

# Explicit source conflicts verified against the current official EN/AR catalogue pages.
KNOWN_CONFLICTS = {
    "M109": "EN computer catalogue: .NET Programming; AR computer catalogue currently shows Digital Photography 2.",
    "M140": "EN title says Python Programming while EN description/objectives and AR title describe introductory statistics.",
    "MT141": "EN catalogue: Introduction to Probability and Statistics; AR catalogue: Software Development - Part A.",
    "M252": "EN catalogue: Internet Programming; AR catalogue: Learning and Information Technology.",
    "M348": "EN catalogue: Applied statistical modelling; AR catalogue currently presents .NET Programming.",
}

LABELS = {
    "en": {"code":"Course Code", "title":"Course Title", "pre":"Pre-requisite", "credit":"Credit Hours", "desc":"Course Description", "obj":"Course Objectives", "out":"Course Outcomes", "close":"Close"},
    "ar": {"code":"رمز المقرر", "title":"اسم المقرر", "pre":"المتطلب السابق", "credit":"الساعات المعتمدة", "desc":"وصف المقرر", "obj":"أهداف المقرر", "out":"مخرجات المقرر", "close":"إغلاق"},
}


def norm(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\u200b", " ").replace("\xa0", " ")).strip()


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def value_after(lines: list[str], i: int, label: str, labels: set[str]) -> str | None:
    if "|" in lines[i]:
        value = norm(lines[i].split("|", 1)[1])
        if value and value != label:
            return value
    for item in lines[i+1:i+8]:
        if item in {"|", label}:
            continue
        if any(item.startswith(x) for x in labels):
            return None
        return norm(item) or None
    return None


def credit_number(value: str | None):
    if not value:
        return None
    m = re.search(r"\d+(?:\.\d+)?", value)
    if not m:
        return None
    n = float(m.group(0))
    return int(n) if n.is_integer() else n


def prerequisite_codes(value: str | None) -> list[str]:
    if not value:
        return []
    return sorted(set(re.findall(r"\b[A-Z]{1,6}\d{2,4}(?:-[A-Z0-9]+)?\b", value.upper())))


def parse_catalogue(html: str, lang: str) -> dict[str, dict]:
    l = LABELS[lang]
    all_labels = set(l.values())
    lines = [norm(x) for x in BeautifulSoup(html, "html.parser").stripped_strings if norm(x)]
    out: dict[str, dict] = {}
    for i, line in enumerate(lines):
        if not line.startswith(l["code"]):
            continue
        code = value_after(lines, i, l["code"], all_labels)
        if not code:
            continue
        title = pre = credit = None
        desc_parts: list[str] = []
        for j in range(i+1, min(i+100, len(lines))):
            cur = lines[j]
            if j > i+1 and cur.startswith(l["code"]):
                break
            if cur.startswith(l["title"]): title = value_after(lines, j, l["title"], all_labels) or title
            elif cur.startswith(l["pre"]): pre = value_after(lines, j, l["pre"], all_labels) or pre
            elif cur.startswith(l["credit"]): credit = value_after(lines, j, l["credit"], all_labels) or credit
            elif cur.startswith(l["desc"]):
                first = value_after(lines, j, l["desc"], all_labels)
                if first: desc_parts.append(first)
                for k in range(j+1, min(i+100, len(lines))):
                    nxt = lines[k]
                    if nxt.startswith((l["obj"], l["out"], l["code"])) or nxt == l["close"]:
                        break
                    if nxt in {"|", l["desc"]}: continue
                    if any(nxt.startswith(x) for x in all_labels - {l["desc"]}): break
                    if not desc_parts or desc_parts[-1] != nxt: desc_parts.append(nxt)
                break
        out[code.casefold()] = {
            "code": code,
            "title": title,
            "creditHours": credit_number(credit),
            "prerequisiteCodes": prerequisite_codes(pre),
            "descriptionAvailable": bool(norm(" ".join(desc_parts))) if desc_parts else False,
        }
    return out


def schedule_group(code: str):
    code = code.upper()
    return next((group for group in SCHEDULE_GROUPS if code in group), None)


def main() -> None:
    courses = json.loads(COURSES_PATH.read_text(encoding="utf-8"))
    counts = Counter(str(x["code"]).upper() for x in courses)
    duplicate_codes = sorted(code for code, count in counts.items() if count > 1)

    session = requests.Session()
    session.headers.update({"User-Agent":"AOU-TMA-Hub-Audit/6.0", "Accept-Language":"en-US,en;q=0.9,ar;q=0.7"})
    catalogues: dict[str, dict[str, dict]] = {}
    source_counts: dict[str, dict[str, int]] = {}
    for faculty, urls in SOURCES.items():
        catalogues[faculty], source_counts[faculty] = {}, {}
        for lang, url in urls.items():
            response = session.get(url, timeout=45)
            response.raise_for_status()
            parsed = parse_catalogue(response.text, lang)
            catalogues[faculty][lang] = parsed
            source_counts[faculty][lang] = len(parsed)
            print(f"{faculty} [{lang}] = {len(parsed)}")

    records = []
    status_counts = Counter()
    legacy = []
    conflicts = []
    for course in courses:
        code = str(course["code"]).upper()
        faculty = course["faculty"]
        en = catalogues.get(faculty, {}).get("en", {}).get(code.casefold())
        ar = catalogues.get(faculty, {}).get("ar", {}).get(code.casefold())
        warnings: list[str] = []
        issues: list[str] = []
        if code in KNOWN_CONFLICTS: issues.append(KNOWN_CONFLICTS[code])
        if en and ar:
            if en.get("creditHours") is not None and ar.get("creditHours") is not None and en["creditHours"] != ar["creditHours"]:
                issues.append(f"Credit hours differ: EN={en['creditHours']} AR={ar['creditHours']}")
            en_pre, ar_pre = set(en.get("prerequisiteCodes") or []), set(ar.get("prerequisiteCodes") or [])
            if en_pre and ar_pre and en_pre != ar_pre:
                issues.append(f"Prerequisite codes differ: EN={sorted(en_pre)} AR={sorted(ar_pre)}")
            status = "source_conflict" if issues else "verified_bilingual"
        elif en:
            status = "verified_english_only"; warnings.append("Not found as an exact code on the Arabic catalogue page.")
        elif ar:
            status = "verified_arabic_only"; warnings.append("Not found as an exact code on the English catalogue page.")
        else:
            status = "legacy_or_schedule_only"; legacy.append(code); warnings.append("No exact current catalogue record in either language.")
        if issues: conflicts.append(code)
        status_counts[status] += 1
        group = schedule_group(code)
        records.append({
            "code": code, "faculty": faculty, "status": status,
            "currentCatalogue": bool(en or ar),
            "cataloguePresence": {"en": bool(en), "ar": bool(ar)},
            "titleEn": en.get("title") if en else None,
            "titleAr": ar.get("title") if ar else None,
            "creditHours": {"en": en.get("creditHours") if en else None, "ar": ar.get("creditHours") if ar else None},
            "descriptionAvailable": {"en": bool(en and en.get("descriptionAvailable")), "ar": bool(ar and ar.get("descriptionAvailable"))},
            "prerequisiteCodes": {"en": en.get("prerequisiteCodes") if en else [], "ar": ar.get("prerequisiteCodes") if ar else []},
            "scheduleGroup": group,
            "groupedDeadline": bool(group),
            "conflicts": issues,
            "warnings": warnings,
            "sources": {"en": SOURCES.get(faculty,{}).get("en"), "ar": SOURCES.get(faculty,{}).get("ar"), "schedule": FCS_SCHEDULE if group and faculty == "Computer Studies" else ASSIGNMENT_SOURCE},
        })

    payload = {
        "version": 2,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "projectRecordCount": len(courses),
        "uniqueProjectCodeCount": len(counts),
        "duplicateProjectCodes": duplicate_codes,
        "duplicateProjectCodeCount": len(duplicate_codes),
        "legacyOrScheduleOnlyCodes": sorted(set(legacy)),
        "legacyOrScheduleOnlyCount": len(set(legacy)),
        "sourceConflictCodes": sorted(set(conflicts)),
        "sourceConflictCount": len(set(conflicts)),
        "statusCounts": dict(sorted(status_counts.items())),
        "sourceEntryCounts": source_counts,
        "scheduleRule": "Slash-separated codes sharing a TMA deadline are scheduling groups, not automatic aliases or duplicates.",
        "records": records,
    }
    for path in (OUT_BACKEND, OUT_SERVERLESS, OUT_FRONTEND): write_json(path, payload)
    print(json.dumps({k:v for k,v in payload.items() if k != "records"}, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()

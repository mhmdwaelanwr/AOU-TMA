from __future__ import annotations

from pathlib import Path
from bs4 import BeautifulSoup
import json
import re
import requests

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app"
COURSES_PATH = APP / "courses.json"

SOURCES = {
    "Computer Studies": "https://www.aou.edu.eg/faculties/computer/Pages/course-catalogue.aspx",
    "Business Studies": "https://www.aou.edu.eg/faculties/business/Pages/course-catalogue.aspx",
    "Language Studies": "https://www.aou.edu.eg/faculties/language/Pages/course-catalogue.aspx",
    "Education": "https://www.aou.edu.eg/faculties/education/Pages/course-catalogue.aspx",
    "Media": "https://www.aou.edu.eg/faculties/media/Pages/course-catalogue.aspx",
}

def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\u200b", " ")).strip()


def icon_for(title: str | None, description: str | None, faculty: str) -> str:
    title_text = (title or "").casefold()
    text = f"{title or ''} {description or ''}".casefold()
    if any(k in text for k in ["health", "nutrition", "disease", "medical"]): return "heart-pulse"
    if any(k in text for k in ["law", "legal", "legislation"]): return "scale"
    if any(k in text for k in ["media", "journalism", "radio", "television", "advertising", "public relations"]): return "radio"
    if any(k in text for k in ["financial", "finance", "accounting", "economics", "investment", "securities", "portfolio", "banking"]): return "landmark"
    if any(k in text for k in ["english", "translation", "linguistic", "literature"]) or "language" in title_text: return "languages"
    if any(k in text for k in ["education", "teaching", "learning", "curriculum", "child", "children", "psychology", "school", "play"]): return "graduation-cap"
    if any(k in text for k in ["data management", "database", "sql", "nosql"]): return "database"
    if any(k in text for k in ["statistics", "statistical", "analysis", "analytics", "mathematics", "math"]): return "chart-no-axes-combined"
    if any(k in text for k in ["management", "business", "marketing", "entrepreneur", "human resource", "organization", "leadership"]): return "briefcase-business"
    if any(k in text for k in ["python", "programming", "algorithm", "software", "computing", "computer", "information technology", "web", "network", "cyber", "artificial intelligence", "machine learning"]): return "code-2"
    return {"Computer Studies":"laptop","Business Studies":"briefcase-business","Education":"graduation-cap","Language Studies":"languages"}.get(faculty,"book-open")

def parse_catalogue(html: str) -> dict[str, dict]:
    soup = BeautifulSoup(html, "html.parser")
    lines = [normalize(s) for s in soup.stripped_strings if normalize(s)]
    result: dict[str, dict] = {}

    for i, line in enumerate(lines):
        if not line.startswith("Course Code"):
            continue
        code = normalize(line.split("|", 1)[-1]) if "|" in line else ""
        if not code or code == "Course Code":
            for probe in lines[i + 1:i + 5]:
                if probe != "|" and not probe.startswith(("Course Title", "Pre-requisite", "Credit Hours")):
                    code = normalize(probe)
                    break
        if not code:
            continue

        title = None
        description_parts: list[str] = []
        for j in range(i + 1, min(i + 28, len(lines))):
            current = lines[j]
            if j > i + 1 and current.startswith("Course Code"):
                break
            if current.startswith("Course Title"):
                candidate = normalize(current.split("|", 1)[-1]) if "|" in current else ""
                if not candidate or candidate == "Course Title":
                    for probe in lines[j + 1:j + 5]:
                        if probe != "|" and not probe.startswith(("Pre-requisite", "Credit Hours", "Course Description")):
                            candidate = normalize(probe)
                            break
                title = candidate or None
            elif current.startswith("Course Description"):
                first = normalize(current.split("|", 1)[-1]) if "|" in current else ""
                if not first or first == "Course Description":
                    for probe in lines[j + 1:j + 5]:
                        if probe != "|" and not probe.startswith(("Course Objectives", "Course Outcomes", "Course Code")):
                            first = normalize(probe)
                            break
                if first and first != "|":
                    description_parts.append(first)
                k = j + 1
                while k < min(i + 28, len(lines)):
                    nxt = lines[k]
                    if (
                        nxt.startswith("Course Objectives")
                        or nxt.startswith("Course Outcomes")
                        or nxt.startswith("Course Code")
                        or nxt == "Close"
                    ):
                        break
                    if nxt != "|" and (not description_parts or nxt != description_parts[-1]):
                        description_parts.append(nxt)
                    k += 1
                break

        result[code.casefold()] = {
            "code": code,
            "title": title,
            "description": normalize(" ".join(description_parts)) or None,
        }
    return result

def main() -> None:
    courses = json.loads(COURSES_PATH.read_text(encoding="utf-8"))
    by_faculty: dict[str, dict[str, dict]] = {}

    session = requests.Session()
    session.headers.update({"User-Agent": "AOU-TMA-Hub-Catalogue-Sync/1.0"})
    for faculty, url in SOURCES.items():
        response = session.get(url, timeout=30)
        response.raise_for_status()
        by_faculty[faculty] = parse_catalogue(response.text)
        print(f"{faculty}: {len(by_faculty[faculty])} catalogue entries")

    updated = 0
    for course in courses:
        catalogue = by_faculty.get(course["faculty"], {})
        match = catalogue.get(course["code"].casefold())
        if not match:
            continue
        if match.get("title"):
            course["title"] = match["title"]
            course["titleStatus"] = "verified"
        if match.get("description"):
            course["description"] = match["description"]
            course["descriptionStatus"] = "verified"
            course["descriptionSource"] = SOURCES[course["faculty"]]
            updated += 1
        course["icon"] = icon_for(course.get("title"), course.get("description"), course["faculty"])

    COURSES_PATH.write_text(json.dumps(courses, ensure_ascii=False, indent=2), encoding="utf-8")
    description_map = {
        c["code"]: {
            "title": c.get("title"),
            "description": c.get("description"),
            "status": c.get("descriptionStatus"),
            "source": c.get("descriptionSource"),
            "icon": c.get("icon"),
        }
        for c in courses
    }
    (APP / "course_descriptions.json").write_text(
        json.dumps(description_map, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Updated official descriptions: {updated}")

if __name__ == "__main__":
    main()

from __future__ import annotations

from pathlib import Path
from bs4 import BeautifulSoup
import json
import re
import requests

ROOT = Path(__file__).resolve().parents[2]
BACKEND_APP = ROOT / "backend-python" / "app"
COURSES_PATH = BACKEND_APP / "courses.json"
SERVERLESS_COURSES = ROOT / "serverless" / "data" / "courses.json"
FRONTEND_COURSES = ROOT / "frontend" / "public" / "catalog" / "courses.json"

SOURCES = {
    "Computer Studies": "https://www.aou.edu.eg/faculties/computer/Pages/course-catalogue.aspx",
    "Business Studies": "https://www.aou.edu.eg/faculties/business/Pages/course-catalogue.aspx",
    "Language Studies": "https://www.aou.edu.eg/faculties/language/Pages/course-catalogue.aspx",
    "Education": "https://www.aou.edu.eg/faculties/education/Pages/course-catalogue.aspx",
    "Media": "https://www.aou.edu.eg/faculties/media/Pages/course-catalogue.aspx",
}


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\u200b", " ").replace("\xa0", " ")).strip()


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
    return {"Computer Studies": "laptop", "Business Studies": "briefcase-business", "Education": "graduation-cap", "Language Studies": "languages"}.get(faculty, "book-open")


def value_after_label(lines: list[str], index: int, label: str) -> str | None:
    line = lines[index]
    if "|" in line:
        value = normalize(line.split("|", 1)[1])
        if value and value != label:
            return value
    for probe in lines[index + 1:index + 6]:
        if probe in {"|", label}:
            continue
        if probe.startswith(("Course Title", "Pre-requisite", "Credit Hours", "Course Description", "Course Objectives", "Course Outcomes", "Course Code")):
            break
        return normalize(probe) or None
    return None


def parse_catalogue(html: str) -> dict[str, dict]:
    soup = BeautifulSoup(html, "html.parser")
    lines = [normalize(text) for text in soup.stripped_strings if normalize(text)]
    result: dict[str, dict] = {}
    for i, line in enumerate(lines):
        if not line.startswith("Course Code"):
            continue
        code = value_after_label(lines, i, "Course Code")
        if not code:
            continue
        title: str | None = None
        description_parts: list[str] = []
        for j in range(i + 1, min(i + 80, len(lines))):
            current = lines[j]
            if j > i + 1 and current.startswith("Course Code"):
                break
            if current.startswith("Course Title"):
                title = value_after_label(lines, j, "Course Title") or title
                continue
            if current.startswith("Course Description"):
                first = value_after_label(lines, j, "Course Description")
                if first:
                    description_parts.append(first)
                for k in range(j + 1, min(i + 80, len(lines))):
                    nxt = lines[k]
                    if nxt.startswith(("Course Objectives", "Course Outcomes", "Course Code")) or nxt == "Close":
                        break
                    if nxt in {"|", "Course Description"}:
                        continue
                    if not description_parts or nxt != description_parts[-1]:
                        description_parts.append(nxt)
                break
        result[code.casefold()] = {"code": code, "title": title, "description": normalize(" ".join(description_parts)) or None}
    return result


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    courses = json.loads(COURSES_PATH.read_text(encoding="utf-8"))
    by_faculty: dict[str, dict[str, dict]] = {}
    session = requests.Session()
    session.headers.update({"User-Agent": "AOU-TMA-Hub-Catalogue-Sync/5.0", "Accept-Language": "en-US,en;q=0.9"})
    for faculty, url in SOURCES.items():
        response = session.get(url, timeout=45)
        response.raise_for_status()
        by_faculty[faculty] = parse_catalogue(response.text)
        print(f"{faculty}: {len(by_faculty[faculty])} official catalogue entries")
    exact_matches = 0
    descriptions = 0
    unresolved: list[str] = []
    for course in courses:
        faculty = course["faculty"]
        match = by_faculty.get(faculty, {}).get(str(course["code"]).casefold())
        if not match:
            unresolved.append(course["code"])
            if not course.get("description"):
                course["descriptionStatus"] = "unresolved_course"
            course["icon"] = icon_for(course.get("title"), course.get("description"), faculty)
            continue
        exact_matches += 1
        if match.get("title"):
            course["title"] = match["title"]
            course["titleStatus"] = "verified"
            course["catalogueSource"] = SOURCES[faculty]
        if match.get("description"):
            course["description"] = match["description"]
            course["descriptionStatus"] = "verified"
            course["descriptionSource"] = SOURCES[faculty]
            descriptions += 1
        elif not course.get("description"):
            course["descriptionStatus"] = "pending_official_sync"
        course["icon"] = icon_for(course.get("title"), course.get("description"), faculty)
    write_json(COURSES_PATH, courses)
    write_json(SERVERLESS_COURSES, courses)
    write_json(FRONTEND_COURSES, courses)
    description_map = {c["code"]: {"title": c.get("title"), "description": c.get("description"), "status": c.get("descriptionStatus"), "source": c.get("descriptionSource"), "icon": c.get("icon")} for c in courses}
    write_json(BACKEND_APP / "course_descriptions.json", description_map)
    report = {"totalProjectCourses": len(courses), "exactCatalogueMatches": exact_matches, "verifiedDescriptions": descriptions, "unresolvedExactCodes": unresolved, "sources": SOURCES}
    write_json(BACKEND_APP / "catalogue_sync_report.json", report)
    print(f"Project courses: {len(courses)}")
    print(f"Exact catalogue matches: {exact_matches}")
    print(f"Verified descriptions: {descriptions}")
    print(f"Unresolved exact codes: {len(unresolved)}")


if __name__ == "__main__":
    main()

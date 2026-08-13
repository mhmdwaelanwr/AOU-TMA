from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
import json
import os
import sqlite3
import uuid

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

BASE_DIR = Path(__file__).parent
COURSES = json.loads((BASE_DIR / "courses.json").read_text(encoding="utf-8"))
COURSE_BY_CODE = {course["code"].lower(): course for course in COURSES}
PAYMENT_MANIFEST = json.loads((BASE_DIR / "payment_methods.json").read_text(encoding="utf-8"))
DB_PATH = Path(os.getenv("ORDERS_DB_PATH", str(BASE_DIR / "orders.db")))
ALLOWED_CURRENCIES = {"EGP", "KWD", "SAR", "LBP", "JOD", "BHD", "OMR", "SDG", "ILS"}


def db_connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_column(conn: sqlite3.Connection, table: str, name: str, ddl: str) -> None:
    columns = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
    if name not in columns:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db_connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                course_code TEXT NOT NULL,
                customer_name TEXT NOT NULL,
                contact TEXT NOT NULL,
                notes TEXT,
                currency TEXT NOT NULL,
                price_egp REAL NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        ensure_column(conn, "orders", "payment_method", "TEXT")
        ensure_column(conn, "orders", "payment_reference", "TEXT")
        conn.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="AOU TMA Hub API",
    version="4.0.0",
    description="Catalog, official AOU course-description enrichment, payment-method configuration and order API.",
    lifespan=lifespan,
)

allowed_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False if allowed_origins == ["*"] else True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


class OrderIn(BaseModel):
    course_code: str = Field(min_length=2, max_length=32)
    customer_name: str = Field(min_length=2, max_length=80)
    contact: str = Field(min_length=3, max_length=80)
    notes: str | None = Field(default=None, max_length=1000)
    currency: str = Field(default="EGP", min_length=3, max_length=3)
    payment_method: str | None = Field(default=None, max_length=40)
    payment_reference: str | None = Field(default=None, max_length=120)

    @field_validator("course_code", "customer_name", "contact", mode="before")
    @classmethod
    def strip_required(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, value: str) -> str:
        normalized = value.upper().strip()
        if normalized not in ALLOWED_CURRENCIES:
            raise ValueError("unsupported currency")
        return normalized

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        normalized = value.strip()
        allowed = {item["id"] for item in PAYMENT_MANIFEST}
        if normalized not in allowed:
            raise ValueError("unsupported payment method")
        return normalized


class OrderOut(BaseModel):
    ok: bool
    order_id: str
    status: Literal["received"]
    created_at: str


def payment_public(item: dict) -> dict:
    destination = os.getenv(item["env"], "").strip()
    configured = bool(destination)
    instructions = None
    if configured:
        if item["group"] == "crypto":
            instructions = f"Send only {item['currency']} using {item.get('network', 'the selected network')} to this address."
        elif item["id"] == "instapay":
            instructions = "Send the exact amount to the configured InstaPay address and keep the transfer reference."
        else:
            instructions = "Send the exact EGP amount to this mobile wallet and keep the transfer reference."
    return {
        "id": item["id"],
        "group": item["group"],
        "label": item["label"],
        "currency": item["currency"],
        "network": item.get("network"),
        "icon": item["icon"],
        "configured": configured,
        "destination": destination if configured else None,
        "instructions": instructions,
    }


@app.get("/health")
def health():
    return {"ok": True, "service": "catalog-api", "version": app.version, "courses": len(COURSES)}


@app.get("/api/meta")
def meta():
    faculties = sorted({course["faculty"] for course in COURSES})
    semesters = sorted({course["semester"] for course in COURSES})
    return {
        "courseCount": len(COURSES),
        "facultyCount": len(faculties),
        "faculties": faculties,
        "semesters": semesters,
        "baseCurrency": "EGP",
        "verifiedTitleCount": sum(1 for course in COURSES if course.get("title")),
        "verifiedDescriptionCount": sum(1 for course in COURSES if course.get("descriptionStatus") == "verified"),
        "pendingDescriptionCount": sum(1 for course in COURSES if course.get("descriptionStatus") == "pending_official_sync"),
        "currencies": sorted(ALLOWED_CURRENCIES),
    }


@app.get("/api/payment-methods")
def payment_methods():
    items = [payment_public(item) for item in PAYMENT_MANIFEST]
    return {"count": len(items), "items": items}


@app.get("/api/courses")
def courses(q: str = Query(default="", max_length=160), faculty: str = Query(default="all", max_length=80)):
    query = q.casefold().strip()
    result = [
        course
        for course in COURSES
        if (faculty == "all" or course["faculty"] == faculty)
        and (
            not query
            or query in (
                f"{course['code']} {course.get('title') or ''} {course.get('description') or ''} "
                f"{course['faculty']} {course['facultyAr']}"
            ).casefold()
        )
    ]
    return {"count": len(result), "items": result}


@app.get("/api/courses/{code}")
def course(code: str):
    item = COURSE_BY_CODE.get(code.casefold().strip())
    if not item:
        raise HTTPException(status_code=404, detail="course_not_found")
    return item


@app.post("/api/orders", response_model=OrderOut, status_code=201)
def create_order(order: OrderIn):
    course_item = COURSE_BY_CODE.get(order.course_code.casefold())
    if not course_item:
        raise HTTPException(status_code=404, detail="course_not_found")

    now = datetime.now(timezone.utc)
    order_id = f"AOU-{now:%Y%m%d}-{uuid.uuid4().hex[:6].upper()}"
    status = "received"

    with db_connect() as conn:
        conn.execute(
            """
            INSERT INTO orders (
                id, course_code, customer_name, contact, notes,
                currency, price_egp, status, created_at, payment_method, payment_reference
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                order_id,
                course_item["code"],
                order.customer_name,
                order.contact,
                order.notes,
                order.currency,
                float(course_item["priceEgp"]),
                status,
                now.isoformat(),
                order.payment_method,
                order.payment_reference,
            ),
        )
        conn.commit()

    return OrderOut(ok=True, order_id=order_id, status="received", created_at=now.isoformat())

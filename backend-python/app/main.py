from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal
import hashlib, hmac, json, os, sqlite3, uuid, time

import bcrypt
import jwt
from fastapi import FastAPI, HTTPException, Query, Header, Depends, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

# ── Config ──────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
BASE_COURSES = json.loads((BASE_DIR / "courses.json").read_text(encoding="utf-8"))
PAYMENT_MANIFEST = json.loads((BASE_DIR / "payment_methods.json").read_text(encoding="utf-8"))
BRANCHES = json.loads((BASE_DIR / "branches.json").read_text(encoding="utf-8"))
try:
    ONSITE_MANIFEST = json.loads((BASE_DIR / "onsite_courses.json").read_text(encoding="utf-8"))
except FileNotFoundError:
    ONSITE_MANIFEST = {"version": 1, "courses": {}}
ONSITE_BY_CODE = ONSITE_MANIFEST.get("courses", {})
COURSES = []
for base in BASE_COURSES:
    resource = ONSITE_BY_CODE.get(str(base["code"]).upper())
    COURSES.append({**base, "onsite": bool(resource), "studyVideoUrl": resource.get("studyVideoUrl") if resource else None, "studyFiles": resource.get("studyFiles", []) if resource else []})
COURSE_BY_CODE = {c["code"].lower(): c for c in COURSES}
BRANCH_BY_CODE = {b["code"].upper(): b for b in BRANCHES}
FIAT_CURRENCIES = {b["currency"] for b in BRANCHES}
ORDER_CURRENCIES = FIAT_CURRENCIES | {"USDT"}
DB_PATH = Path(os.getenv("ORDERS_DB_PATH", str(BASE_DIR / "orders.db")))
JWT_SECRET = os.getenv("JWT_SECRET", "aou-tma-hub-secret-key-change-in-production-" + uuid.uuid4().hex[:8])
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 720  # 30 days
DEPOSIT_EGP = 29.0
FIRST_ORDER_DISCOUNT_PCT = 20.0
REFERRAL_CREDIT_EGP = 15.0
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# ── DB ──────────────────────────────────────────────────────────────────────
def db_connect():
    conn = sqlite3.connect(DB_PATH); conn.row_factory = sqlite3.Row; return conn

def ensure_column(conn, table, name, ddl):
    if name not in {r["name"] for r in conn.execute(f"PRAGMA table_info({table})")}:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db_connect() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
            password_hash TEXT, provider TEXT NOT NULL DEFAULT 'email', provider_id TEXT,
            avatar_url TEXT, referral_code TEXT UNIQUE, credit_egp REAL DEFAULT 0,
            is_banned INTEGER DEFAULT 0, created_at TEXT NOT NULL, last_login TEXT
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY, user_id TEXT, course_code TEXT NOT NULL,
            customer_name TEXT NOT NULL, contact TEXT NOT NULL, email TEXT, notes TEXT,
            currency TEXT NOT NULL, price_egp REAL NOT NULL, status TEXT NOT NULL,
            service_type TEXT NOT NULL DEFAULT 'TMA', branch_code TEXT NOT NULL,
            payment_method TEXT, payment_reference TEXT, deposit_amount REAL DEFAULT 29,
            deposit_paid INTEGER DEFAULT 0, deposit_proof_url TEXT, deposit_tx_hash TEXT,
            remaining_amount REAL, ip_address TEXT, first_order_discount_pct REAL,
            promo_code TEXT, promo_discount_pct REAL, referral_code TEXT,
            referral_credit_applied REAL, tma_file_url TEXT, admin_notes TEXT,
            created_at TEXT NOT NULL, updated_at TEXT
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY, order_id TEXT NOT NULL, user_id TEXT,
            amount REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'EGP',
            payment_method TEXT, proof_url TEXT, tx_hash TEXT,
            status TEXT NOT NULL DEFAULT 'pending', admin_notes TEXT,
            created_at TEXT NOT NULL
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS referrals (
            code TEXT PRIMARY KEY, owner_user_id TEXT, owner_name TEXT,
            owner_contact TEXT, created_at TEXT NOT NULL, total_uses INTEGER DEFAULT 0,
            total_credit_given REAL DEFAULT 0
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS referral_redemptions (
            id TEXT PRIMARY KEY, referral_code TEXT NOT NULL, order_id TEXT NOT NULL,
            user_id TEXT, credit_amount REAL NOT NULL, redeemed_at TEXT NOT NULL
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS promo_codes (
            code TEXT PRIMARY KEY, discount_pct REAL NOT NULL, max_uses INTEGER DEFAULT -1,
            times_used INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL, expires_at TEXT
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS complaints (
            id TEXT PRIMARY KEY, user_id TEXT, name TEXT, email TEXT,
            type TEXT NOT NULL, subject TEXT, description TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open', admin_reply TEXT,
            created_at TEXT NOT NULL
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS price_overrides (
            id TEXT PRIMARY KEY, service_type TEXT NOT NULL, branch_code TEXT,
            price_egp REAL NOT NULL, created_at TEXT NOT NULL
        )""")
        for name, ddl in [
            ("email","TEXT"),("payment_method","TEXT"),("payment_reference","TEXT"),
            ("branch_code","TEXT"),("claim_type","TEXT"),("quoted_local_amount","REAL"),
            ("quoted_local_currency","TEXT"),("quoted_usdt_amount","REAL"),
            ("referral_code","TEXT"),("referral_discount_pct","REAL"),("user_id","TEXT"),
            ("lms_username","TEXT"),("lms_password","TEXT")
        ]:
            ensure_column(conn,"orders",name,ddl)
        # Ensure promo_codes table exists
        try:
            conn.execute("SELECT code FROM promo_codes LIMIT 1")
        except sqlite3.OperationalError:
            conn.execute("""CREATE TABLE IF NOT EXISTS promo_codes (
                code TEXT PRIMARY KEY, discount_pct REAL NOT NULL, max_uses INTEGER DEFAULT -1,
                times_used INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
                created_at TEXT NOT NULL, expires_at TEXT
            )""")
        conn.commit()

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db(); yield

# ── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="TMAly API", version="8.0.0", description="Full auth, catalog, orders with deposit, referrals, promo codes, admin.", lifespan=lifespan)
allowed_origins=[o.strip() for o in os.getenv("CORS_ORIGINS","*").split(",") if o.strip()]
app.add_middleware(CORSMiddleware,allow_origins=allowed_origins,allow_credentials=allowed_origins!=["*"],allow_methods=["GET","POST","PUT","DELETE","OPTIONS"],allow_headers=["Content-Type","Authorization"])

# ── Auth helpers ────────────────────────────────────────────────────────────
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def check_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS), "iat": datetime.now(timezone.utc)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except Exception:
        return None

def get_current_user(authorization: str | None = Header(default=None)) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return decode_token(authorization[7:])

def require_user(authorization: str | None = Header(default=None)) -> str:
    user_id = get_current_user(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="not_authenticated")
    return user_id

def require_admin(user_id: str = Depends(require_user)) -> str:
    with db_connect() as conn:
        user = conn.execute("SELECT is_banned FROM users WHERE id=?", (user_id,)).fetchone()
    if not user or user["is_banned"]:
        raise HTTPException(status_code=403, detail="forbidden")
    return user_id

def generate_referral_code() -> str:
    return "AOU-" + uuid.uuid4().hex[:6].upper()

def user_public(user_row) -> dict:
    return {
        "id": user_row["id"], "name": user_row["name"], "email": user_row["email"],
        "provider": user_row["provider"], "avatar_url": user_row["avatar_url"],
        "referral_code": user_row["referral_code"], "credit_egp": user_row["credit_egp"] or 0,
        "is_banned": bool(user_row["is_banned"]),
        "created_at": user_row["created_at"]
    }

def get_client_ip(request: Request) -> str:
    return request.headers.get("x-forwarded-for", "").split(",")[0].strip() or request.client.host if request.client else "unknown"

def has_previous_orders(conn, user_id: str | None, ip_address: str) -> bool:
    if user_id:
        row = conn.execute("SELECT id FROM orders WHERE user_id=? LIMIT 1", (user_id,)).fetchone()
        if row: return True
    row = conn.execute("SELECT id FROM orders WHERE ip_address=? AND ip_address != 'unknown' LIMIT 1", (ip_address,)).fetchone()
    return bool(row)

# ── Pydantic models ────────────────────────────────────────────────────────
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(max_length=120)
    password: str = Field(min_length=6, max_length=100)
    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("invalid_email")
        return v

class LoginIn(BaseModel):
    email: str = Field(max_length=120)
    password: str = Field(max_length=100)
    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        return v.strip().lower()

class GoogleLoginIn(BaseModel):
    token: str = Field(min_length=10)
    name: str | None = Field(default=None, max_length=80)
    email: str = Field(max_length=120)
    avatar_url: str | None = Field(default=None, max_length=500)

class UpdateProfileIn(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)

class OrderIn(BaseModel):
    course_code: str = Field(min_length=2, max_length=32)
    customer_name: str = Field(min_length=2, max_length=80)
    contact: str = Field(min_length=3, max_length=80)
    email: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=1000)
    currency: str = Field(default="EGP", min_length=3, max_length=4)
    branch_code: str = Field(default="EG", min_length=2, max_length=2)
    service_type: Literal["TMA", "QUIZ", "ASSIGNMENT"] = "TMA"
    payment_method: str | None = Field(default=None, max_length=40)
    payment_reference: str | None = Field(default=None, max_length=120)
    promo_code: str | None = Field(default=None, max_length=20)
    referral_code: str | None = Field(default=None, max_length=20)
    deposit_proof_url: str | None = Field(default=None, max_length=500)
    deposit_tx_hash: str | None = Field(default=None, max_length=128)
    lms_username: str | None = Field(default=None, max_length=120)
    lms_password: str | None = Field(default=None, max_length=120)
    @field_validator("course_code", "customer_name", "contact", mode="before")
    @classmethod
    def strip_required(cls, v): return v.strip() if isinstance(v, str) else v
    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v):
        n = v.upper().strip()
        if n not in ORDER_CURRENCIES: raise ValueError("unsupported currency")
        return n
    @field_validator("branch_code")
    @classmethod
    def validate_branch(cls, v):
        n = v.upper().strip()
        if n not in BRANCH_BY_CODE: raise ValueError("unsupported branch")
        return n

class OrderOut(BaseModel):
    ok: bool; order_id: str; status: Literal["deposit_pending"]; deposit_amount: float; created_at: str

class DepositProofIn(BaseModel):
    order_id: str = Field(min_length=5, max_length=40)
    proof_url: str | None = Field(default=None, max_length=500)
    tx_hash: str | None = Field(default=None, max_length=128)
    payment_method: str | None = Field(default=None, max_length=40)

class ReferralValidateIn(BaseModel):
    code: str = Field(min_length=3, max_length=20)

class AdminUpdateOrderIn(BaseModel):
    status: str | None = Field(default=None, max_length=30)
    admin_notes: str | None = Field(default=None, max_length=1000)
    price_egp: float | None = Field(default=None, ge=0)

class AdminPromoIn(BaseModel):
    code: str = Field(min_length=2, max_length=20)
    discount_pct: float = Field(ge=1, le=100)
    max_uses: int = Field(default=-1)
    expires_at: str | None = None

class AdminBanUserIn(BaseModel):
    user_id: str
    ban: bool

class AdminUpdatePriceIn(BaseModel):
    service_type: Literal["TMA", "QUIZ", "ASSIGNMENT"]
    branch_code: str | None = None
    price_egp: float = Field(ge=0)

class ComplaintIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str | None = Field(default=None, max_length=120)
    type: Literal["bug", "complaint", "suggestion"] = "complaint"
    subject: str = Field(min_length=2, max_length=200)
    description: str = Field(min_length=10, max_length=2000)

# ── Payment public ──────────────────────────────────────────────────────────
def payment_public(item):
    destination = os.getenv(item["env"], "").strip(); configured = bool(destination)
    instructions = None
    if configured:
        instructions = (f"Send only {item['currency']} using {item.get('network','the selected network')} to this address." if item["group"] == "crypto" else "Send the exact amount and keep the transfer reference.")
    return {"id": item["id"], "group": item["group"], "label": item["label"], "currency": item["currency"], "network": item.get("network"), "icon": item["icon"], "configured": configured, "destination": destination if configured else None, "instructions": instructions}

# ── Price helpers ───────────────────────────────────────────────────────────
def get_service_price(conn, service_type: str, branch_code: str) -> float:
    row = conn.execute("SELECT price_egp FROM price_overrides WHERE service_type=? AND branch_code=? ORDER BY created_at DESC LIMIT 1", (service_type, branch_code)).fetchone()
    if row: return row["price_egp"]
    row = conn.execute("SELECT price_egp FROM price_overrides WHERE service_type=? AND branch_code IS NULL ORDER BY created_at DESC LIMIT 1", (service_type,)).fetchone()
    if row: return row["price_egp"]
    # Default prices
    defaults = {"TMA": 150.0, "QUIZ": 29.0, "ASSIGNMENT": 150.0}
    return defaults.get(service_type, 150.0)

def apply_first_order_discount(conn, user_id: str | None, ip_address: str, base_price: float) -> tuple[float, float]:
    """Returns (discount_pct, discount_amount)"""
    if has_previous_orders(conn, user_id, ip_address):
        return 0.0, 0.0
    pct = FIRST_ORDER_DISCOUNT_PCT
    amount = round(base_price * pct / 100, 2)
    return pct, amount

def apply_referral_credit(conn, referral_code: str | None, user_id: str | None) -> tuple[str | None, float]:
    """Returns (applied_code, credit_amount)"""
    if not referral_code:
        return None, 0.0
    code = referral_code.strip().upper()
    ref = conn.execute("SELECT code FROM referrals WHERE code=?", (code,)).fetchone()
    if not ref:
        return None, 0.0
    return code, REFERRAL_CREDIT_EGP

def apply_promo_code(conn, promo_code: str | None) -> tuple[str | None, float, float]:
    """Returns (applied_code, discount_pct, discount_amount) — pct calculated later"""
    if not promo_code:
        return None, 0.0, 0.0
    code = promo_code.strip().upper()
    row = conn.execute("SELECT code, discount_pct, max_uses, times_used, is_active, expires_at FROM promo_codes WHERE code=?", (code,)).fetchone()
    if not row or not row["is_active"]:
        return None, 0.0, 0.0
    if row["max_uses"] >= 0 and row["times_used"] >= row["max_uses"]:
        return None, 0.0, 0.0
    if row["expires_at"]:
        try:
            exp = datetime.fromisoformat(row["expires_at"])
            if datetime.now(timezone.utc) > exp:
                return None, 0.0, 0.0
        except: pass
    return code, row["discount_pct"], 0.0  # amount calculated at order time

# ── Health ──────────────────────────────────────────────────────────────────
@app.get("/health")
def health(): return {"ok": True, "service": "catalog-api", "version": app.version, "courses": len(COURSES), "branches": len(BRANCHES)}

# ════════════════════════════════════════════════════════════════════════════
# AUTH ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════

@app.post("/api/auth/register")
def auth_register(body: RegisterIn):
    email = body.email.strip().lower()
    with db_connect() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="email_already_registered")
        user_id = f"USR-{uuid.uuid4().hex[:12].upper()}"
        ref_code = generate_referral_code()
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "INSERT INTO users (id,name,email,password_hash,provider,referral_code,created_at,last_login) VALUES (?,?,?,?,?,?,?,?)",
            (user_id, body.name.strip(), email, hash_password(body.password), "email", ref_code, now, now)
        )
        conn.execute("INSERT INTO referrals (code,owner_user_id,owner_name,created_at) VALUES (?,?,?,?)",
                     (ref_code, user_id, body.name.strip(), now))
        conn.commit()
    token = create_token(user_id)
    with db_connect() as conn:
        user = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    return {"ok": True, "token": token, "user": user_public(user)}

@app.post("/api/auth/login")
def auth_login(body: LoginIn):
    email = body.email.strip().lower()
    with db_connect() as conn:
        user = conn.execute("SELECT * FROM users WHERE email=? AND provider='email'", (email,)).fetchone()
    if not user or not check_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="invalid_credentials")
    if user["is_banned"]:
        raise HTTPException(status_code=403, detail="account_banned")
    now = datetime.now(timezone.utc).isoformat()
    with db_connect() as conn:
        conn.execute("UPDATE users SET last_login=? WHERE id=?", (now, user["id"]))
        conn.commit()
    token = create_token(user["id"])
    return {"ok": True, "token": token, "user": user_public(user)}

@app.post("/api/auth/google")
def auth_google(body: GoogleLoginIn):
    email = body.email.strip().lower()
    name = body.name or email.split("@")[0]
    avatar = body.avatar_url
    with db_connect() as conn:
        user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        now = datetime.now(timezone.utc).isoformat()
        if user:
            if user["is_banned"]:
                raise HTTPException(status_code=403, detail="account_banned")
            conn.execute("UPDATE users SET last_login=? WHERE id=?", (now, user["id"]))
            conn.commit()
            token = create_token(user["id"])
            user = conn.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone()
            return {"ok": True, "token": token, "user": user_public(user), "isNew": False}
        user_id = f"USR-{uuid.uuid4().hex[:12].upper()}"
        ref_code = generate_referral_code()
        conn.execute(
            "INSERT INTO users (id,name,email,provider,provider_id,avatar_url,referral_code,created_at,last_login) VALUES (?,?,?,?,?,?,?,?,?)",
            (user_id, name, email, "google", body.token[:32], avatar, ref_code, now, now)
        )
        conn.execute("INSERT INTO referrals (code,owner_user_id,owner_name,created_at) VALUES (?,?,?,?)",
                     (ref_code, user_id, name, now))
        conn.commit()
    token = create_token(user_id)
    with db_connect() as conn:
        user = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    return {"ok": True, "token": token, "user": user_public(user), "isNew": True}

@app.get("/api/auth/me")
def auth_me(user_id: str = Depends(require_user)):
    with db_connect() as conn:
        user = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")
    return {"ok": True, "user": user_public(user)}

@app.put("/api/auth/profile")
def auth_update_profile(body: UpdateProfileIn, user_id: str = Depends(require_user)):
    with db_connect() as conn:
        if body.name:
            conn.execute("UPDATE users SET name=? WHERE id=?", (body.name.strip(), user_id))
        conn.commit()
        user = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    return {"ok": True, "user": user_public(user)}

# ════════════════════════════════════════════════════════════════════════════
# USER ORDER HISTORY
# ════════════════════════════════════════════════════════════════════════════

@app.get("/api/user/orders")
def user_orders(user_id: str = Depends(require_user)):
    with db_connect() as conn:
        rows = conn.execute(
            "SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC", (user_id,)
        ).fetchall()
    orders = []
    for r in rows:
        course = COURSE_BY_CODE.get(r["course_code"].lower(), {})
        orders.append({
            "id": r["id"], "course_code": r["course_code"],
            "course_title": course.get("title", ""),
            "service_type": r["service_type"],
            "customer_name": r["customer_name"],
            "currency": r["currency"], "price_egp": r["price_egp"],
            "deposit_amount": r["deposit_amount"], "deposit_paid": bool(r["deposit_paid"]),
            "remaining_amount": r["remaining_amount"],
            "status": r["status"], "created_at": r["created_at"],
            "payment_method": r["payment_method"],
            "branch_code": r["branch_code"],
        })
    return {"ok": True, "count": len(orders), "orders": orders}

@app.get("/api/user/orders/{order_id}")
def user_order_detail(order_id: str, user_id: str = Depends(require_user)):
    with db_connect() as conn:
        r = conn.execute("SELECT * FROM orders WHERE id=? AND user_id=?", (order_id, user_id)).fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="order_not_found")
    course = COURSE_BY_CODE.get(r["course_code"].lower(), {})
    return {
        "ok": True, "order": {
            "id": r["id"], "course_code": r["course_code"],
            "course_title": course.get("title", ""),
            "service_type": r["service_type"],
            "customer_name": r["customer_name"], "contact": r["contact"],
            "email": r["email"], "notes": r["notes"],
            "currency": r["currency"], "price_egp": r["price_egp"],
            "deposit_amount": r["deposit_amount"], "deposit_paid": bool(r["deposit_paid"]),
            "remaining_amount": r["remaining_amount"],
            "status": r["status"], "created_at": r["created_at"],
            "payment_method": r["payment_method"],
            "branch_code": r["branch_code"],
            "first_order_discount_pct": r["first_order_discount_pct"],
            "promo_code": r["promo_code"], "promo_discount_pct": r["promo_discount_pct"],
            "referral_code": r["referral_code"],
            "referral_credit_applied": r["referral_credit_applied"],
        }
    }

# ════════════════════════════════════════════════════════════════════════════
# USER REFERRAL INFO
# ════════════════════════════════════════════════════════════════════════════

@app.get("/api/user/referral")
def user_referral(user_id: str = Depends(require_user)):
    with db_connect() as conn:
        user = conn.execute("SELECT referral_code, credit_egp FROM users WHERE id=?", (user_id,)).fetchone()
        if not user or not user["referral_code"]:
            raise HTTPException(status_code=404, detail="no_referral_code")
        ref = conn.execute("SELECT * FROM referrals WHERE code=?", (user["referral_code"],)).fetchone()
    credit = user["credit_egp"] or 0
    if not ref:
        return {"ok": True, "code": user["referral_code"], "credit_per_referral": REFERRAL_CREDIT_EGP, "total_uses": 0, "total_credit_given": 0, "balance": credit}
    return {"ok": True, "code": ref["code"], "credit_per_referral": REFERRAL_CREDIT_EGP, "total_uses": ref["total_uses"], "total_credit_given": ref["total_credit_given"], "balance": credit}

# ════════════════════════════════════════════════════════════════════════════
# CATALOG + META
# ════════════════════════════════════════════════════════════════════════════

@app.get("/api/meta")
def meta():
    faculties = sorted({c["faculty"] for c in COURSES}); semesters = sorted({c["semester"] for c in COURSES})
    return {"courseCount": len(COURSES), "facultyCount": len(faculties), "faculties": faculties, "semesters": semesters, "baseCurrency": "EGP", "branchCount": len(BRANCHES), "branches": BRANCHES, "currencies": sorted(FIAT_CURRENCIES), "paymentCurrencies": ["EGP", "USDT"]}

@app.get("/api/branches")
def branch_list(): return {"count": len(BRANCHES), "items": BRANCHES}

@app.get("/api/payment-methods")
def payment_methods(): return {"count": len(PAYMENT_MANIFEST), "items": [payment_public(x) for x in PAYMENT_MANIFEST]}

@app.get("/api/courses")
def courses(q: str = Query(default="", max_length=160), faculty: str = Query(default="all", max_length=80)):
    query = q.casefold().strip(); result = [c for c in COURSES if (faculty == "all" or c["faculty"] == faculty) and (not query or query in f"{c['code']} {c.get('title') or ''} {c.get('description') or ''} {c['faculty']} {c['facultyAr']}".casefold())]
    return {"count": len(result), "items": result}

@app.get("/api/courses/{code}")
def course(code: str):
    item = COURSE_BY_CODE.get(code.casefold().strip())
    if not item: raise HTTPException(status_code=404, detail="course_not_found")
    return item

@app.get("/api/service-prices")
def service_prices(branch: str = Query(default="EG", max_length=2)):
    with db_connect() as conn:
        prices = {}
        for st in ["TMA", "QUIZ", "ASSIGNMENT"]:
            prices[st] = get_service_price(conn, st, branch.upper())
    return {"ok": True, "branch": branch.upper(), "prices": prices}

# ════════════════════════════════════════════════════════════════════════════
# REFERRAL
# ════════════════════════════════════════════════════════════════════════════

@app.post("/api/referral/validate")
def validate_referral(body: ReferralValidateIn):
    code = body.code.strip().upper()
    with db_connect() as conn:
        row = conn.execute("SELECT code, total_uses FROM referrals WHERE code=?", (code,)).fetchone()
    if not row: raise HTTPException(status_code=404, detail="invalid_referral_code")
    return {"ok": True, "code": row["code"], "credit_amount": REFERRAL_CREDIT_EGP, "total_uses": row["total_uses"]}

@app.get("/api/referral/{code}")
def referral_info(code: str):
    code = code.strip().upper()
    with db_connect() as conn:
        row = conn.execute("SELECT code, total_uses, total_credit_given FROM referrals WHERE code=?", (code,)).fetchone()
    if not row: raise HTTPException(status_code=404, detail="referral_not_found")
    return {"ok": True, "code": row["code"], "credit_amount": REFERRAL_CREDIT_EGP, "total_uses": row["total_uses"], "total_credit_given": row["total_credit_given"]}

# ════════════════════════════════════════════════════════════════════════════
# PROMO CODE VALIDATION
# ════════════════════════════════════════════════════════════════════════════

@app.post("/api/promo/validate")
def validate_promo(code: str = Query(..., min_length=2, max_length=20)):
    code = code.strip().upper()
    with db_connect() as conn:
        row = conn.execute("SELECT code, discount_pct, max_uses, times_used, is_active, expires_at FROM promo_codes WHERE code=?", (code,)).fetchone()
    if not row or not row["is_active"]:
        raise HTTPException(status_code=404, detail="invalid_promo_code")
    if row["max_uses"] >= 0 and row["times_used"] >= row["max_uses"]:
        raise HTTPException(status_code=410, detail="promo_code_exhausted")
    if row["expires_at"]:
        try:
            exp = datetime.fromisoformat(row["expires_at"])
            if datetime.now(timezone.utc) > exp:
                raise HTTPException(status_code=410, detail="promo_code_expired")
        except HTTPException: raise
        except: pass
    return {"ok": True, "code": row["code"], "discount_pct": row["discount_pct"]}

# ════════════════════════════════════════════════════════════════════════════
# COMPLAINTS
# ════════════════════════════════════════════════════════════════════════════

@app.post("/api/complaints", status_code=201)
def create_complaint(body: ComplaintIn, user_id: str | None = Depends(get_current_user)):
    comp_id = f"COMP-{datetime.now(timezone.utc):%Y%m%d}-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.now(timezone.utc).isoformat()
    with db_connect() as conn:
        conn.execute("INSERT INTO complaints (id,user_id,name,email,type,subject,description,created_at) VALUES (?,?,?,?,?,?,?,?)",
                     (comp_id, user_id, body.name.strip(), body.email, body.type, body.subject, body.description, now))
        conn.commit()
    return {"ok": True, "id": comp_id, "status": "open", "created_at": now}

# ════════════════════════════════════════════════════════════════════════════
# ORDERS (guest + authenticated) — with deposit flow
# ════════════════════════════════════════════════════════════════════════════

@app.post("/api/orders", response_model=OrderOut, status_code=201)
def create_order(order: OrderIn, request: Request, user_id: str | None = Depends(get_current_user)):
    course_item = COURSE_BY_CODE.get(order.course_code.casefold())
    if not course_item: raise HTTPException(status_code=404, detail="course_not_found")
    branch = BRANCH_BY_CODE[order.branch_code]
    ip = get_client_ip(request)
    now = datetime.now(timezone.utc); order_id = f"AOU-{now:%Y%m%d}-{uuid.uuid4().hex[:6].upper()}"
    status = "deposit_pending"
    with db_connect() as conn:
        base_price = get_service_price(conn, order.service_type, order.branch_code)
        # First order discount (only for registered users, NOT guests)
        first_disc_pct, first_disc_amt = 0.0, 0.0
        if user_id:
            first_disc_pct, first_disc_amt = apply_first_order_discount(conn, user_id, ip, base_price)
        # Promo code
        promo_code_applied, promo_pct, _ = apply_promo_code(conn, order.promo_code)
        promo_disc_amt = round(base_price * promo_pct / 100, 2) if promo_pct > 0 else 0
        # Referral credit (fixed 15 EGP)
        ref_code_applied, ref_credit = apply_referral_credit(conn, order.referral_code, user_id)
        # QUIZ: no discounts, deposit = full price, no remaining
        is_quiz = order.service_type == "QUIZ"
        if is_quiz:
            first_disc_pct, first_disc_amt, promo_pct, promo_disc_amt, ref_credit = 0.0, 0.0, 0.0, 0.0, 0.0
            promo_code_applied, ref_code_applied = None, None
        # Total discount
        total_discount = first_disc_amt + promo_disc_amt + ref_credit
        final_price = max(base_price - total_discount, 0)
        deposit = base_price if is_quiz else DEPOSIT_EGP
        remaining = 0 if is_quiz else max(final_price - DEPOSIT_EGP, 0)
        # Increment promo uses
        if promo_code_applied:
            conn.execute("UPDATE promo_codes SET times_used=times_used+1 WHERE code=?", (promo_code_applied,))
        # Record referral redemption
        if ref_code_applied and ref_credit > 0:
            redemption_id = f"REF-{now:%Y%m%d}-{uuid.uuid4().hex[:6].upper()}"
            conn.execute("INSERT INTO referral_redemptions (id,referral_code,order_id,user_id,credit_amount,redeemed_at) VALUES (?,?,?,?,?,?)",
                         (redemption_id, ref_code_applied, order_id, user_id, ref_credit, now.isoformat()))
            conn.execute("UPDATE referrals SET total_uses=total_uses+1, total_credit_given=total_credit_given+? WHERE code=?", (ref_credit, ref_code_applied))
            # Credit the referrer
            ref_owner = conn.execute("SELECT owner_user_id FROM referrals WHERE code=?", (ref_code_applied,)).fetchone()
            if ref_owner and ref_owner["owner_user_id"]:
                conn.execute("UPDATE users SET credit_egp = credit_egp + ? WHERE id=?", (ref_credit, ref_owner["owner_user_id"]))
        # Insert order
        conn.execute("""INSERT INTO orders (id,user_id,course_code,customer_name,contact,email,notes,currency,price_egp,status,service_type,branch_code,payment_method,payment_reference,deposit_amount,deposit_paid,remaining_amount,ip_address,first_order_discount_pct,promo_code,promo_discount_pct,referral_code,referral_credit_applied,lms_username,lms_password,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                     (order_id, user_id, course_item["code"], order.customer_name, order.contact, order.email, order.notes, order.currency, base_price, status, order.service_type, order.branch_code, order.payment_method, order.payment_reference, deposit, 0, remaining, ip, first_disc_pct if first_disc_pct > 0 else None, promo_code_applied, promo_pct if promo_pct > 0 else None, ref_code_applied, ref_credit if ref_credit > 0 else None, order.lms_username, order.lms_password, now.isoformat()))
        conn.commit()
    return OrderOut(ok=True, order_id=order_id, status="deposit_pending", deposit_amount=deposit, created_at=now.isoformat())

@app.post("/api/orders/pay-deposit")
def pay_deposit(body: DepositProofIn, user_id: str | None = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    with db_connect() as conn:
        order = conn.execute("SELECT * FROM orders WHERE id=?", (body.order_id,)).fetchone()
        if not order: raise HTTPException(status_code=404, detail="order_not_found")
        if order["deposit_paid"]: raise HTTPException(status_code=409, detail="deposit_already_paid")
        payment_id = f"PAY-{uuid.uuid4().hex[:12].upper()}"
        conn.execute("INSERT INTO payments (id,order_id,user_id,amount,currency,payment_method,proof_url,tx_hash,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                     (payment_id, body.order_id, user_id, order["deposit_amount"], order["currency"], body.payment_method, body.proof_url, body.tx_hash, "pending", now))
        conn.execute("UPDATE orders SET deposit_proof_url=?, deposit_tx_hash=?, payment_method=COALESCE(?,payment_method), updated_at=? WHERE id=?",
                     (body.proof_url, body.tx_hash, body.payment_method, now, body.order_id))
        conn.commit()
    return {"ok": True, "payment_id": payment_id, "status": "pending", "message": "Deposit proof submitted. Awaiting admin confirmation."}

# ════════════════════════════════════════════════════════════════════════════
# ADMIN ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════

@app.get("/api/admin/stats")
def admin_stats(admin: str = Depends(require_admin)):
    with db_connect() as conn:
        total_orders = conn.execute("SELECT COUNT(*) as c FROM orders").fetchone()["c"]
        month_orders = conn.execute("SELECT COUNT(*) as c FROM orders WHERE created_at >= date('now','start of month')").fetchone()["c"]
        total_students = conn.execute("SELECT COUNT(*) as c FROM users WHERE provider != 'admin'").fetchone()["c"]
        total_teachers = conn.execute("SELECT COUNT(*) as c FROM users WHERE provider='admin'").fetchone()["c"]
        total_revenue = conn.execute("SELECT COALESCE(SUM(deposit_amount),0) as s FROM orders WHERE deposit_paid=1").fetchone()["s"]
        open_complaints = conn.execute("SELECT COUNT(*) as c FROM complaints WHERE status='open'").fetchone()["c"]
        active_promos = conn.execute("SELECT COUNT(*) as c FROM promo_codes WHERE is_active=1").fetchone()["c"]
        pending_deposits = conn.execute("SELECT COUNT(*) as c FROM payments WHERE status='pending'").fetchone()["c"]
        banned_users = conn.execute("SELECT COUNT(*) as c FROM users WHERE is_banned=1").fetchone()["c"]
    return {"ok": True, "stats": {
        "total_orders": total_orders, "month_orders": month_orders,
        "total_students": total_students, "total_teachers": total_teachers,
        "total_revenue_egp": total_revenue, "open_complaints": open_complaints,
        "active_promos": active_promos, "pending_deposits": pending_deposits,
        "banned_users": banned_users, "course_count": len(COURSES),
    }}

@app.get("/api/admin/orders")
def admin_orders(status: str | None = None, limit: int = 50, offset: int = 0, admin: str = Depends(require_admin)):
    with db_connect() as conn:
        if status:
            rows = conn.execute("SELECT * FROM orders WHERE status=? ORDER BY created_at DESC LIMIT ? OFFSET ?", (status, limit, offset)).fetchall()
            total = conn.execute("SELECT COUNT(*) as c FROM orders WHERE status=?", (status,)).fetchone()["c"]
        else:
            rows = conn.execute("SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?", (limit, offset)).fetchall()
            total = conn.execute("SELECT COUNT(*) as c FROM orders").fetchone()["c"]
    orders = []
    for r in rows:
        course = COURSE_BY_CODE.get(r["course_code"].lower(), {})
        orders.append({
            "id": r["id"], "course_code": r["course_code"],
            "course_title": course.get("title", ""),
            "service_type": r["service_type"],
            "customer_name": r["customer_name"], "contact": r["contact"],
            "email": r["email"], "currency": r["currency"],
            "price_egp": r["price_egp"], "deposit_amount": r["deposit_amount"],
            "deposit_paid": bool(r["deposit_paid"]), "remaining_amount": r["remaining_amount"],
            "status": r["status"], "branch_code": r["branch_code"],
            "first_order_discount_pct": r["first_order_discount_pct"],
            "promo_code": r["promo_code"], "promo_discount_pct": r["promo_discount_pct"],
            "referral_code": r["referral_code"], "admin_notes": r["admin_notes"],
            "ip_address": r["ip_address"], "created_at": r["created_at"],
        })
    return {"ok": True, "total": total, "count": len(orders), "orders": orders}

@app.put("/api/admin/orders/{order_id}")
def admin_update_order(order_id: str, body: AdminUpdateOrderIn, admin: str = Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    with db_connect() as conn:
        order = conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
        if not order: raise HTTPException(status_code=404, detail="order_not_found")
        updates = []
        params = []
        if body.status:
            updates.append("status=?"); params.append(body.status)
        if body.admin_notes is not None:
            updates.append("admin_notes=?"); params.append(body.admin_notes)
        if body.price_egp is not None:
            updates.append("price_egp=?"); params.append(body.price_egp)
            updates.append("remaining_amount=?"); params.append(max(body.price_egp - (order["deposit_amount"] if order["deposit_paid"] else 0), 0))
        updates.append("updated_at=?"); params.append(now)
        params.append(order_id)
        conn.execute(f"UPDATE orders SET {','.join(updates)} WHERE id=?", params)
        conn.commit()
    return {"ok": True, "message": "Order updated"}

@app.get("/api/admin/users")
def admin_users(limit: int = 50, offset: int = 0, admin: str = Depends(require_admin)):
    with db_connect() as conn:
        rows = conn.execute("SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?", (limit, offset)).fetchall()
        total = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    users = [user_public(r) for r in rows]
    return {"ok": True, "total": total, "count": len(users), "users": users}

@app.post("/api/admin/users/ban")
def admin_ban_user(body: AdminBanUserIn, admin: str = Depends(require_admin)):
    with db_connect() as conn:
        conn.execute("UPDATE users SET is_banned=? WHERE id=?", (1 if body.ban else 0, body.user_id))
        conn.commit()
    return {"ok": True, "banned": body.ban}

@app.get("/api/admin/payments")
def admin_payments(status: str | None = None, limit: int = 50, offset: int = 0, admin: str = Depends(require_admin)):
    with db_connect() as conn:
        if status:
            rows = conn.execute("SELECT * FROM payments WHERE status=? ORDER BY created_at DESC LIMIT ? OFFSET ?", (status, limit, offset)).fetchall()
            total = conn.execute("SELECT COUNT(*) as c FROM payments WHERE status=?", (status,)).fetchone()["c"]
        else:
            rows = conn.execute("SELECT * FROM payments ORDER BY created_at DESC LIMIT ? OFFSET ?", (limit, offset)).fetchall()
            total = conn.execute("SELECT COUNT(*) as c FROM payments").fetchone()["c"]
    return {"ok": True, "total": total, "count": len(rows), "payments": [dict(r) for r in rows]}

@app.put("/api/admin/payments/{payment_id}")
def admin_update_payment(payment_id: str, status: str = Query(...), admin: str = Depends(require_admin)):
    if status not in ("approved", "rejected"):
        raise HTTPException(status_code=422, detail="invalid_status")
    now = datetime.now(timezone.utc).isoformat()
    with db_connect() as conn:
        payment = conn.execute("SELECT * FROM payments WHERE id=?", (payment_id,)).fetchone()
        if not payment: raise HTTPException(status_code=404, detail="payment_not_found")
        conn.execute("UPDATE payments SET status=? WHERE id=?", (status, payment_id))
        if status == "approved":
            conn.execute("UPDATE orders SET deposit_paid=1, status='deposit_paid', updated_at=? WHERE id=?", (now, payment["order_id"]))
        elif status == "rejected":
            conn.execute("UPDATE orders SET status='deposit_rejected', updated_at=? WHERE id=?", (now, payment["order_id"]))
        conn.commit()
    return {"ok": True, "status": status}

@app.get("/api/admin/complaints")
def admin_complaints(status: str | None = None, limit: int = 50, offset: int = 0, admin: str = Depends(require_admin)):
    with db_connect() as conn:
        if status:
            rows = conn.execute("SELECT * FROM complaints WHERE status=? ORDER BY created_at DESC LIMIT ? OFFSET ?", (status, limit, offset)).fetchall()
            total = conn.execute("SELECT COUNT(*) as c FROM complaints WHERE status=?", (status,)).fetchone()["c"]
        else:
            rows = conn.execute("SELECT * FROM complaints ORDER BY created_at DESC LIMIT ? OFFSET ?", (limit, offset)).fetchall()
            total = conn.execute("SELECT COUNT(*) as c FROM complaints").fetchone()["c"]
    return {"ok": True, "total": total, "count": len(rows), "complaints": [dict(r) for r in rows]}

@app.get("/api/admin/promos")
def admin_promos(admin: str = Depends(require_admin)):
    with db_connect() as conn:
        rows = conn.execute("SELECT * FROM promo_codes ORDER BY created_at DESC").fetchall()
    return {"ok": True, "count": len(rows), "promos": [dict(r) for r in rows]}

@app.post("/api/admin/promos", status_code=201)
def admin_create_promo(body: AdminPromoIn, admin: str = Depends(require_admin)):
    code = body.code.strip().upper()
    now = datetime.now(timezone.utc).isoformat()
    with db_connect() as conn:
        existing = conn.execute("SELECT code FROM promo_codes WHERE code=?", (code,)).fetchone()
        if existing: raise HTTPException(status_code=409, detail="promo_code_exists")
        conn.execute("INSERT INTO promo_codes (code,discount_pct,max_uses,created_at,expires_at) VALUES (?,?,?,?,?)",
                     (code, body.discount_pct, body.max_uses, now, body.expires_at))
        conn.commit()
    return {"ok": True, "code": code}

@app.put("/api/admin/promos/{code}")
def admin_update_promo(code: str, is_active: bool | None = None, max_uses: int | None = None, admin: str = Depends(require_admin)):
    code = code.strip().upper()
    with db_connect() as conn:
        updates = []; params = []
        if is_active is not None:
            updates.append("is_active=?"); params.append(1 if is_active else 0)
        if max_uses is not None:
            updates.append("max_uses=?"); params.append(max_uses)
        if not updates: raise HTTPException(status_code=422, detail="nothing_to_update")
        params.append(code)
        conn.execute(f"UPDATE promo_codes SET {','.join(updates)} WHERE code=?", params)
        conn.commit()
    return {"ok": True, "code": code}

@app.delete("/api/admin/promos/{code}")
def admin_delete_promo(code: str, admin: str = Depends(require_admin)):
    code = code.strip().upper()
    with db_connect() as conn:
        conn.execute("DELETE FROM promo_codes WHERE code=?", (code,))
        conn.commit()
    return {"ok": True, "code": code}

@app.put("/api/admin/prices")
def admin_update_prices(body: AdminUpdatePriceIn, admin: str = Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    pid = f"PRICE-{uuid.uuid4().hex[:8].upper()}"
    with db_connect() as conn:
        conn.execute("INSERT INTO price_overrides (id,service_type,branch_code,price_egp,created_at) VALUES (?,?,?,?,?)",
                     (pid, body.service_type, body.branch_code, body.price_egp, now))
        conn.commit()
    return {"ok": True, "id": pid, "service_type": body.service_type, "price_egp": body.price_egp}

# ── Admin Course Management ────────────────────────────────────────────────

class AdminCourseIn(BaseModel):
    code: str
    title_ar: str = ""
    title_en: str = ""
    description_ar: str = ""
    description_en: str = ""
    faculty: str = ""
    base_price_egp: float = 150
    is_onsite: bool = False
    is_active: bool = True
    aliases: str = ""
    study_video_url: str = ""
    study_files: str = ""

class AdminCoursePriceOverride(BaseModel):
    branch_code: str = ""
    price_egp: float = 150

@app.get("/api/admin/courses")
def admin_list_courses(admin: str = Depends(require_admin)):
    with db_connect() as conn:
        rows = conn.execute("SELECT * FROM course_overrides ORDER BY code").fetchall()
    courses = [dict(r) for r in rows] if rows else []
    return {"ok": True, "courses": courses, "total": len(courses)}

@app.post("/api/admin/courses", status_code=201)
def admin_create_course(body: AdminCourseIn, admin: str = Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    cid = f"CRS-{uuid.uuid4().hex[:8].upper()}"
    with db_connect() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS course_overrides (
            id TEXT PRIMARY KEY, code TEXT UNIQUE, title_ar TEXT, title_en TEXT,
            description_ar TEXT, description_en TEXT, faculty TEXT,
            base_price_egp REAL, is_onsite INTEGER, is_active INTEGER,
            aliases TEXT, study_video_url TEXT, study_files TEXT,
            created_at TEXT, updated_at TEXT
        )""")
        conn.execute("""INSERT INTO course_overrides
            (id,code,title_ar,title_en,description_ar,description_en,faculty,
             base_price_egp,is_onsite,is_active,aliases,study_video_url,study_files,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (cid, body.code, body.title_ar, body.title_en, body.description_ar, body.description_en,
             body.faculty, body.base_price_egp, 1 if body.is_onsite else 0, 1 if body.is_active else 0,
             body.aliases, body.study_video_url, body.study_files, now, now))
        conn.commit()
    return {"ok": True, "id": cid, "code": body.code}

@app.put("/api/admin/courses/{code}")
def admin_update_course(code: str, body: AdminCourseIn, admin: str = Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    with db_connect() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS course_overrides (
            id TEXT PRIMARY KEY, code TEXT UNIQUE, title_ar TEXT, title_en TEXT,
            description_ar TEXT, description_en TEXT, faculty TEXT,
            base_price_egp REAL, is_onsite INTEGER, is_active INTEGER,
            aliases TEXT, study_video_url TEXT, study_files TEXT,
            created_at TEXT, updated_at TEXT
        )""")
        existing = conn.execute("SELECT id FROM course_overrides WHERE code=?", (code,)).fetchone()
        if existing:
            conn.execute("""UPDATE course_overrides SET title_ar=?,title_en=?,description_ar=?,description_en=?,
                faculty=?,base_price_egp=?,is_onsite=?,is_active=?,aliases=?,study_video_url=?,study_files=?,updated_at=?
                WHERE code=?""",
                (body.title_ar, body.title_en, body.description_ar, body.description_en,
                 body.faculty, body.base_price_egp, 1 if body.is_onsite else 0, 1 if body.is_active else 0,
                 body.aliases, body.study_video_url, body.study_files, now, code))
        else:
            cid = f"CRS-{uuid.uuid4().hex[:8].upper()}"
            conn.execute("""INSERT INTO course_overrides
                (id,code,title_ar,title_en,description_ar,description_en,faculty,
                 base_price_egp,is_onsite,is_active,aliases,study_video_url,study_files,created_at,updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (cid, code, body.title_ar, body.title_en, body.description_ar, body.description_en,
                 body.faculty, body.base_price_egp, 1 if body.is_onsite else 0, 1 if body.is_active else 0,
                 body.aliases, body.study_video_url, body.study_files, now, now))
        conn.commit()
    return {"ok": True, "code": code}

@app.delete("/api/admin/courses/{code}")
def admin_delete_course(code: str, admin: str = Depends(require_admin)):
    with db_connect() as conn:
        conn.execute("DELETE FROM course_overrides WHERE code=?", (code,))
        conn.commit()
    return {"ok": True, "code": code}

@app.put("/api/admin/courses/{code}/toggle")
def admin_toggle_course(code: str, admin: str = Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    with db_connect() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS course_overrides (
            id TEXT PRIMARY KEY, code TEXT UNIQUE, title_ar TEXT, title_en TEXT,
            description_ar TEXT, description_en TEXT, faculty TEXT,
            base_price_egp REAL, is_onsite INTEGER, is_active INTEGER,
            aliases TEXT, study_video_url TEXT, study_files TEXT,
            created_at TEXT, updated_at TEXT
        )""")
        row = conn.execute("SELECT is_active FROM course_overrides WHERE code=?", (code,)).fetchone()
        if row:
            new_val = 0 if row["is_active"] else 1
            conn.execute("UPDATE course_overrides SET is_active=?, updated_at=? WHERE code=?", (new_val, now, code))
        conn.commit()
    return {"ok": True, "code": code}

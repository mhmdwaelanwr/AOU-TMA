from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
import json, os, sqlite3, uuid

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

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

def db_connect():
    conn = sqlite3.connect(DB_PATH); conn.row_factory = sqlite3.Row; return conn

def ensure_column(conn, table, name, ddl):
    if name not in {r["name"] for r in conn.execute(f"PRAGMA table_info({table})")}:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db_connect() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, course_code TEXT NOT NULL, customer_name TEXT NOT NULL, contact TEXT NOT NULL, notes TEXT, currency TEXT NOT NULL, price_egp REAL NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL)""")
        for name, ddl in [("payment_method","TEXT"),("payment_reference","TEXT"),("branch_code","TEXT"),("claim_type","TEXT"),("quoted_local_amount","REAL"),("quoted_local_currency","TEXT"),("quoted_usdt_amount","REAL")]:
            ensure_column(conn,"orders",name,ddl)
        conn.commit()

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db(); yield

app = FastAPI(title="AOU TMA Hub API", version="5.0.0", description="Branch-aware catalog, payment rules and free on-site study-pack claims.", lifespan=lifespan)
allowed_origins=[o.strip() for o in os.getenv("CORS_ORIGINS","*").split(",") if o.strip()]
app.add_middleware(CORSMiddleware,allow_origins=allowed_origins,allow_credentials=False if allowed_origins==["*"] else True,allow_methods=["GET","POST","OPTIONS"],allow_headers=["Content-Type","Authorization"])

class OrderIn(BaseModel):
    course_code:str=Field(min_length=2,max_length=32)
    customer_name:str=Field(min_length=2,max_length=80)
    contact:str=Field(min_length=3,max_length=80)
    notes:str|None=Field(default=None,max_length=1000)
    currency:str=Field(default="EGP",min_length=3,max_length=4)
    branch_code:str=Field(default="EG",min_length=2,max_length=2)
    claim_type:Literal["paid","free_onsite"]="paid"
    quoted_local_amount:float|None=Field(default=None,ge=0)
    quoted_local_currency:str|None=Field(default=None,min_length=3,max_length=3)
    quoted_usdt_amount:float|None=Field(default=None,ge=0)
    payment_method:str|None=Field(default=None,max_length=40)
    payment_reference:str|None=Field(default=None,max_length=120)

    @field_validator("course_code","customer_name","contact",mode="before")
    @classmethod
    def strip_required(cls,v): return v.strip() if isinstance(v,str) else v

    @field_validator("currency")
    @classmethod
    def validate_currency(cls,v):
        n=v.upper().strip()
        if n not in ORDER_CURRENCIES: raise ValueError("unsupported currency")
        return n

    @field_validator("branch_code")
    @classmethod
    def validate_branch(cls,v):
        n=v.upper().strip()
        if n not in BRANCH_BY_CODE: raise ValueError("unsupported branch")
        return n

    @field_validator("quoted_local_currency")
    @classmethod
    def validate_local_currency(cls,v):
        if v is None: return None
        n=v.upper().strip()
        if n not in FIAT_CURRENCIES: raise ValueError("unsupported local currency")
        return n

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls,v):
        if v is None or not v.strip(): return None
        n=v.strip()
        if n not in {x["id"] for x in PAYMENT_MANIFEST}: raise ValueError("unsupported payment method")
        return n

class OrderOut(BaseModel):
    ok:bool; order_id:str; status:Literal["received"]; created_at:str

def payment_public(item):
    destination=os.getenv(item["env"],"").strip(); configured=bool(destination)
    instructions=None
    if configured:
        instructions=(f"Send only {item['currency']} using {item.get('network','the selected network')} to this address." if item["group"]=="crypto" else "Send the exact amount and keep the transfer reference.")
    return {"id":item["id"],"group":item["group"],"label":item["label"],"currency":item["currency"],"network":item.get("network"),"icon":item["icon"],"configured":configured,"destination":destination if configured else None,"instructions":instructions}

@app.get("/health")
def health(): return {"ok":True,"service":"catalog-api","version":app.version,"courses":len(COURSES),"branches":len(BRANCHES),"onsiteCourses":sum(1 for c in COURSES if c.get("onsite"))}

@app.get("/api/meta")
def meta():
    faculties=sorted({c["faculty"] for c in COURSES}); semesters=sorted({c["semester"] for c in COURSES})
    return {"courseCount":len(COURSES),"facultyCount":len(faculties),"faculties":faculties,"semesters":semesters,"baseCurrency":"EGP","branchCount":len(BRANCHES),"branches":BRANCHES,"verifiedTitleCount":sum(1 for c in COURSES if c.get("title")),"verifiedDescriptionCount":sum(1 for c in COURSES if c.get("descriptionStatus")=="verified"),"pendingDescriptionCount":sum(1 for c in COURSES if c.get("descriptionStatus")=="pending_official_sync"),"currencies":sorted(FIAT_CURRENCIES),"paymentCurrencies":["EGP","USDT"]}

@app.get("/api/branches")
def branch_list(): return {"count":len(BRANCHES),"items":BRANCHES}

@app.get("/api/payment-methods")
def payment_methods(): return {"count":len(PAYMENT_MANIFEST),"items":[payment_public(x) for x in PAYMENT_MANIFEST]}

@app.get("/api/courses")
def courses(q:str=Query(default="",max_length=160),faculty:str=Query(default="all",max_length=80)):
    query=q.casefold().strip(); result=[c for c in COURSES if (faculty=="all" or c["faculty"]==faculty) and (not query or query in f"{c['code']} {c.get('title') or ''} {c.get('description') or ''} {c['faculty']} {c['facultyAr']}".casefold())]
    return {"count":len(result),"items":result}

@app.get("/api/courses/{code}")
def course(code:str):
    item=COURSE_BY_CODE.get(code.casefold().strip())
    if not item: raise HTTPException(status_code=404,detail="course_not_found")
    return item

@app.post("/api/orders",response_model=OrderOut,status_code=201)
def create_order(order:OrderIn):
    course_item=COURSE_BY_CODE.get(order.course_code.casefold())
    if not course_item: raise HTTPException(status_code=404,detail="course_not_found")
    branch=BRANCH_BY_CODE[order.branch_code]
    free=order.claim_type=="free_onsite"
    if free and not course_item.get("onsite"): raise HTTPException(status_code=422,detail="course_is_not_onsite")
    method=next((x for x in PAYMENT_MANIFEST if x["id"]==order.payment_method),None) if order.payment_method else None
    if not free:
        if order.branch_code=="EG" and order.currency!="EGP": raise HTTPException(status_code=422,detail="egypt_requires_egp")
        if order.branch_code!="EG" and order.currency!="USDT": raise HTTPException(status_code=422,detail="international_requires_usdt")
        if method and order.branch_code=="EG" and method["group"]=="crypto": raise HTTPException(status_code=422,detail="egypt_payment_method_mismatch")
        if method and order.branch_code!="EG" and method["group"]!="crypto": raise HTTPException(status_code=422,detail="international_payment_method_mismatch")
    now=datetime.now(timezone.utc); order_id=f"AOU-{now:%Y%m%d}-{uuid.uuid4().hex[:6].upper()}"; status="received"
    with db_connect() as conn:
        conn.execute("""INSERT INTO orders (id,course_code,customer_name,contact,notes,currency,price_egp,status,created_at,payment_method,payment_reference,branch_code,claim_type,quoted_local_amount,quoted_local_currency,quoted_usdt_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",(order_id,course_item["code"],order.customer_name,order.contact,order.notes,order.currency,float(course_item["priceEgp"]),status,now.isoformat(),None if free else order.payment_method,None if free else order.payment_reference,order.branch_code,order.claim_type,0 if free else order.quoted_local_amount,order.quoted_local_currency or branch["currency"],0 if free else order.quoted_usdt_amount)); conn.commit()
    return OrderOut(ok=True,order_id=order_id,status="received",created_at=now.isoformat())

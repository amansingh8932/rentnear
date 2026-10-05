from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import create_engine, Column, Integer, String, Float, or_, Text, text, Boolean, func
from sqlalchemy.orm import sessionmaker, declarative_base
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import os, shutil, json, hashlib, random
from pydantic import BaseModel
from typing import List, Optional

SECRET_KEY = os.getenv("SECRET_KEY", "rentnear-secret-v18-full")
ALGORITHM = "HS256"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'rentnear.db')}")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String, default="", index=True)
    hashed_password = Column(String)
    role = Column(String, default="renter")
    full_name = Column(String, default="")
    avatar_url = Column(String, default="")
    bio = Column(String, default="")
    location_city = Column(String, default="Lucknow")
    occupation = Column(String, default="")
    company = Column(String, default="")
    auth_provider = Column(String, default="email")
    provider_id = Column(String, default="")
    is_verified = Column(Boolean, default=False)
    is_profile_complete = Column(Boolean, default=False)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    last_login = Column(String, default=lambda: datetime.utcnow().isoformat())

class Property(Base):
    __tablename__ = "properties"
    id = Column(Integer, primary_key=True)
    title = Column(String)
    location = Column(String)
    price = Column(Float)
    description = Column(String)
    image_url = Column(String)
    images = Column(Text, default="[]")
    contact = Column(String, default="")
    bhk = Column(String, default="2BHK")
    house_type = Column(String, default="Flat")
    furnishing = Column(String, default="Semi-Furnished")
    property_age = Column(String, default="0-1 year")
    facing = Column(String, default="East")
    floor_number = Column(String, default="")
    total_floors = Column(String, default="")
    area_sqft = Column(String, default="")
    pg_sharing_type = Column(String, default="")
    pg_available_for = Column(String, default="")
    pg_food_included = Column(String, default="")
    pg_food_type = Column(String, default="")
    pg_rules = Column(Text, default="[]")
    plot_area = Column(String, default="")
    parking = Column(String, default="")
    garden = Column(String, default="")
    lift_available = Column(String, default="")
    gated_society = Column(String, default="")
    business_suitable = Column(String, default="")
    washroom = Column(String, default="")
    owner_id = Column(Integer, default=1)
    owner_email = Column(String, default="")
    maintenance = Column(Float, default=0)
    electricity = Column(Float, default=0)
    water = Column(Float, default=0)
    deposit = Column(Float, default=0)
    brokerage_percent = Column(Float, default=15)
    amenities = Column(Text, default="[]")
    nearby_places = Column(Text, default="[]")
    renter_email = Column(String, default="")
    is_occupied = Column(Boolean, default=False)
    extra_details = Column(Text, default="{}")
    latitude = Column(String, default="26.8467")
    longitude = Column(String, default="80.9462")
    map_address = Column(String, default="")

class PropertyView(Base):
    __tablename__ = "property_views"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer, index=True)
    property_title = Column(String, default="")
    owner_email = Column(String, default="")
    viewer_email = Column(String, default="")
    viewer_hash = Column(String, default="")
    viewed_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    ip_hash = Column(String, default="")

class OTP(Base):
    __tablename__ = "otps"
    id = Column(Integer, primary_key=True)
    identifier = Column(String, index=True)
    otp_code = Column(String)
    purpose = Column(String, default="login")
    expires_at = Column(String)
    is_used = Column(Boolean, default=False)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer)
    property_title = Column(String, default="")
    owner_email = Column(String)
    renter_email = Column(String)
    amount = Column(Float)
    base_rent = Column(Float, default=0)
    maintenance = Column(Float, default=0)
    electricity = Column(Float, default=0)
    water = Column(Float, default=0)
    extra_charges = Column(Float, default=0)
    discount = Column(Float, default=0)
    late_fee = Column(Float, default=0)
    month = Column(Integer)
    year = Column(Integer)
    due_date = Column(String, default="")
    paid_date = Column(String, default="")
    status = Column(String, default="due")
    payment_method = Column(String, default="")
    transaction_id = Column(String, default="")
    notes = Column(String, default="")
    bill_number = Column(String, default="")
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())

class Complaint(Base):
    __tablename__ = "complaints"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer)
    property_title = Column(String, default="")
    renter_email = Column(String)
    owner_email = Column(String)
    title = Column(String)
    description = Column(String)
    category = Column(String, default="general")
    priority = Column(String, default="medium")
    status = Column(String, default="open")
    owner_response = Column(String, default="")
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.utcnow().isoformat())

class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer, index=True)
    property_title = Column(String, default="")
    reviewer_email = Column(String)
    reviewer_name = Column(String, default="")
    owner_email = Column(String, default="")
    rating = Column(Integer, default=5)
    comment = Column(String, default="")
    pros = Column(String, default="")
    cons = Column(String, default="")
    is_verified = Column(Boolean, default=False)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer, default=0)
    property_title = Column(String, default="")
    sender_email = Column(String)
    receiver_email = Column(String)
    message = Column(String)
    is_read = Column(Boolean, default=False)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())

class Visit(Base):
    __tablename__ = "visits"
    id = Column(Integer, primary_key=True)
    user_email = Column(String, default="")
    visited_at = Column(String, default=lambda: datetime.utcnow().isoformat())

# --- Pydantic ---
class ComplaintCreate(BaseModel):
    property_id: int
    title: str
    description: str
    category: str = "general"
    priority: str = "medium"

class ReviewCreate(BaseModel):
    property_id: int
    rating: int
    comment: str
    pros: str = ""
    cons: str = ""

class MessageCreate(BaseModel):
    property_id: int = 0
    receiver_email: str
    message: str

class PaymentCreate(BaseModel):
    property_id: int
    renter_email: str
    amount: float
    month: int
    year: int
    base_rent: float = 0
    maintenance: float = 0
    electricity: float = 0
    water: float = 0
    extra_charges: float = 0
    notes: str = ""

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_ip(s): return hashlib.sha256(s.encode()).hexdigest()[:16]
def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def get_user_from_header(auth_header: Optional[str], db):
    if not auth_header: return None
    try:
        token = auth_header.replace("Bearer ","")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email: return None
        return db.query(User).filter(User.email==email).first()
    except: return None

def get_property_views_stats(prop_id, db):
    total = db.query(PropertyView).filter(PropertyView.property_id==prop_id).count()
    week_ago = (datetime.utcnow()-timedelta(days=7)).isoformat()
    weekly = db.query(PropertyView).filter(PropertyView.property_id==prop_id, PropertyView.viewed_at>=week_ago).count()
    return {"total": total, "weekly": weekly}

SEED_HOUSES = [
    {"title":"2BHK Flat - Gomti Nagar Modern","location":"Gomti Nagar, Lucknow","price":18000,"bhk":"2BHK","house_type":"Flat","description":"Spacious 2BHK flat with balcony, Lucknowi chikankari curtains, modular kitchen.","contact":"9876543210","furnishing":"Semi-Furnished","area_sqft":"1100","floor_number":"2","total_floors":"4","parking":"1 Car","amenities":["WiFi","AC","Lift","Parking","Security","Water Purifier"],"nearby_places":["City Montessori School - 0.5km","Phoenix Palassio - 1km"],"latitude":"26.8467","longitude":"80.9462"},
    {"title":"Independent House - Indira Nagar","location":"Indira Nagar, Lucknow","price":25000,"bhk":"3BHK","house_type":"Independent House","description":"Independent 3BHK house with small garden, mango tree, car parking.","contact":"9876543211","furnishing":"Furnished","area_sqft":"1500","plot_area":"1200 sqft","garden":"Yes","parking":"1 Car","amenities":["Garden","Parking","Water Purifier","Gated Society"],"nearby_places":["Indira Nagar Market - 0.3km"],"latitude":"26.8510","longitude":"80.9900"},
    {"title":"Luxury Villa - Sultanpur Road","location":"Sushant Golf City, Lucknow","price":60000,"bhk":"4BHK","house_type":"Villa","description":"4BHK luxury villa with private pool, garden, 2 car parking.","contact":"9876543212","furnishing":"Fully-Furnished","area_sqft":"3200","plot_area":"4000 sqft","garden":"Yes","parking":"2 Car","amenities":["Pool","Garden","AC","Parking","Clubhouse","Gym"],"nearby_places":["Medanta Hospital - 2km"],"latitude":"26.8000","longitude":"81.0000"},
    {"title":"Builder Floor - Alambagh","location":"Alambagh, Lucknow","price":12000,"bhk":"2BHK","house_type":"Builder Floor","description":"2BHK builder floor near Alambagh bus stand, easy transport.","contact":"9876543213","furnishing":"Semi-Furnished","area_sqft":"950","floor_number":"1","total_floors":"3","amenities":["Lift","Parking","Water Purifier"],"nearby_places":["Alambagh Bus Stand - 0.5km"],"latitude":"26.8167","longitude":"80.9000"},
    {"title":"PG Single Room - Near BBD University","location":"BBD University, Lucknow","price":7000,"bhk":"1RK","house_type":"PG","description":"Single sharing PG for students, food included, WiFi.","contact":"9876543214","pg_sharing_type":"Single Sharing","pg_available_for":"Boys","pg_food_included":"Yes","pg_food_type":"Veg","pg_rules":["No Smoking","No Guests after 10PM"],"amenities":["WiFi","Food","Laundry","Water Purifier","AC"],"nearby_places":["BBD University - 0.2km"],"latitude":"26.9000","longitude":"81.0000"},
    {"title":"PG Double Sharing - Hazratganj for Girls","location":"Hazratganj, Lucknow","price":8000,"bhk":"1RK","house_type":"PG","description":"Double sharing PG for girls in Hazratganj, safe and secure.","contact":"9876543215","pg_sharing_type":"Double Sharing","pg_available_for":"Girls","pg_food_included":"Yes","pg_food_type":"Both (Veg/Non-Veg)","pg_rules":["Girls Only","No Smoking"],"amenities":["WiFi","Food","Security","AC","Laundry"],"nearby_places":["Hazratganj Market - 0.1km"],"latitude":"26.8560","longitude":"80.9450"},
    {"title":"Boys Hostel Single Room - Near BBD University","location":"BBD University, Lucknow","price":6000,"bhk":"1RK","house_type":"Hostel","description":"Hostel for BBD students, single room, affordable.","contact":"9876543216","pg_sharing_type":"Single Sharing","pg_available_for":"Boys","pg_food_included":"Yes","amenities":["WiFi","Food","Laundry"],"nearby_places":["BBD - 0.1km"],"latitude":"26.9005","longitude":"81.0010"},
    {"title":"Studio - Patrakar Puram Modern","location":"Patrakar Puram, Lucknow","price":9000,"bhk":"1RK","house_type":"Studio","description":"Modern studio apartment for working professionals, compact and stylish.","contact":"9876543217","furnishing":"Fully-Furnished","area_sqft":"450","amenities":["WiFi","AC","Lift","Fridge"],"nearby_places":["Patrakar Puram Market - 0.3km"],"latitude":"26.8700","longitude":"80.9800"},
    {"title":"Farmhouse Weekend Getaway - Mohan Road","location":"Mohan Road, Lucknow","price":35000,"bhk":"2BHK","house_type":"Farmhouse","description":"Farmhouse with mango orchard, tubewell, weekend party space.","contact":"9876543218","furnishing":"Semi-Furnished","area_sqft":"2000","plot_area":"1 acre","garden":"Yes","amenities":["Garden","Parking","Tubewell","Mango Orchard"],"nearby_places":["Mohan Road - 0km"],"latitude":"26.7500","longitude":"80.8500"},
    {"title":"Shop 200sqft - Hazratganj Main Market","location":"Hazratganj, Lucknow","price":25000,"bhk":"Shop","house_type":"Shop","description":"200 sqft shop in Hazratganj main market, high footfall.","contact":"9876543219","area_sqft":"200","business_suitable":"Retail, Boutique","amenities":["Main Road","High Footfall","Parking"],"nearby_places":["Hazratganj Market - 0km"],"latitude":"26.8570","longitude":"80.9460"},
    {"title":"Office Space 800sqft - Gomti Nagar Business Hub","location":"Gomti Nagar, Lucknow","price":30000,"bhk":"Office","house_type":"Office","description":"Office space 800 sqft in Gomti Nagar business tower, furnished with AC, cabins, lift, parking.","contact":"9876543220","area_sqft":"800","business_suitable":"IT, Startup","amenities":["AC","Lift","Parking","Security","Power Backup","Washroom","Conference Room"],"nearby_places":["Gomti Nagar Business Hub - 0km"],"latitude":"26.8460","longitude":"80.9470"},
]

def seed_db():
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email=="test@testgmail.com").first() is None:
            u = User(email="test@testgmail.com", phone="9876543210", hashed_password=pwd_context.hash("123456"), role="landlord", full_name="Test User", bio="Landlord in Lucknow - 10 properties", location_city="Lucknow", occupation="Real Estate Owner", is_verified=True, is_profile_complete=True)
            db.add(u); db.commit()
        if db.query(Property).count()==0:
            owner = db.query(User).filter(User.email=="test@testgmail.com").first()
            for h in SEED_HOUSES:
                imgs = []
                ht = h["house_type"].lower().replace(" ","_")
                for i in range(1,4):
                    fn = f"{ht}_{i}.webp"
                    fp = os.path.join(UPLOAD_DIR, fn)
                    if not os.path.exists(fp):
                        src_dir = os.path.join(BASE_DIR, "house_images")
                        if os.path.exists(src_dir):
                            for ext in [".webp",".jpg",".png"]:
                                s = os.path.join(src_dir, f"{ht}{ext}")
                                if os.path.exists(s):
                                    shutil.copy(s, fp)
                                    break
                h_copy = h.copy()
                amenities = h_copy.pop("amenities", [])
                nearby = h_copy.pop("nearby_places", [])
                pg_rules = h_copy.pop("pg_rules", [])
                lat = h_copy.pop("latitude","26.8467")
                lng = h_copy.pop("longitude","80.9462")
                # Ensure all list/dict fields are JSON strings for SQLite
                if isinstance(pg_rules, list): pg_rules = json.dumps(pg_rules)
                if isinstance(amenities, list): amenities = json.dumps(amenities)
                if isinstance(nearby, list): nearby = json.dumps(nearby)
                # Ensure other fields that might be list are stringified
                for k in list(h_copy.keys()):
                    if isinstance(h_copy[k], (list, dict)):
                        h_copy[k] = json.dumps(h_copy[k])
                p = Property(**h_copy, owner_id=owner.id if owner else 1, owner_email="test@testgmail.com", images=json.dumps(imgs) if imgs else "[]", amenities=amenities if isinstance(amenities, str) else json.dumps(amenities), nearby_places=nearby if isinstance(nearby, str) else json.dumps(nearby), pg_rules=pg_rules if isinstance(pg_rules, str) else json.dumps(pg_rules), latitude=str(lat), longitude=str(lng), maintenance=1500, electricity=1200, water=300, deposit=30000, brokerage_percent=15)
                db.add(p)
            db.commit()
            print(f"Seeded {len(SEED_HOUSES)} houses")
    finally: db.close()

Base.metadata.create_all(bind=engine)
seed_db()

app = FastAPI(title="RentNear v18 Full Features")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
def home(): return {"status": "RentNear v18 Full - Chat + Reviews + Payments + Maps", "version": "18.0", "houses": len(SEED_HOUSES)}

@app.post("/register")
def register(payload: dict, db=Depends(get_db)):
    email = payload.get("email")
    if db.query(User).filter(User.email==email).first(): raise HTTPException(400, "User exists")
    u = User(email=email, phone=payload.get("phone",""), hashed_password=pwd_context.hash(payload.get("password","123456")), role=payload.get("role","renter"), full_name=payload.get("full_name",""), bio=payload.get("bio",""), location_city=payload.get("city","Lucknow"), is_verified=True)
    db.add(u); db.commit(); db.refresh(u)
    token = jwt.encode({"sub": u.email, "role": u.role, "exp": datetime.utcnow()+timedelta(days=7)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "email": u.email, "role": u.role, "full_name": u.full_name, "profile": {"email": u.email, "full_name": u.full_name, "role": u.role, "phone": u.phone, "bio": u.bio, "city": u.location_city, "avatar": u.avatar_url}}

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    user = db.query(User).filter(User.email==form_data.username).first()
    if not user or not pwd_context.verify(form_data.password, user.hashed_password): raise HTTPException(401, "Invalid credentials")
    user.last_login = datetime.utcnow().isoformat(); db.commit()
    token = jwt.encode({"sub": user.email, "role": user.role, "exp": datetime.utcnow()+timedelta(days=7)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "email": user.email, "role": user.role, "full_name": user.full_name, "profile": {"email": user.email, "full_name": user.full_name, "role": user.role, "phone": user.phone, "bio": user.bio, "city": user.location_city, "avatar": user.avatar_url, "occupation": user.occupation, "company": user.company}}

@app.get("/profile/me")
def get_profile(authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    return {"email": user.email, "full_name": user.full_name, "role": user.role, "phone": user.phone, "bio": user.bio, "city": user.location_city, "avatar": user.avatar_url, "occupation": user.occupation, "company": user.company, "is_verified": user.is_verified, "created_at": user.created_at}

@app.put("/profile/me")
def update_profile(payload: dict, authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    user.full_name = payload.get("full_name", user.full_name)
    user.phone = payload.get("phone", user.phone)
    user.bio = payload.get("bio", user.bio)
    user.location_city = payload.get("city", user.location_city)
    user.occupation = payload.get("occupation", user.occupation)
    user.company = payload.get("company", user.company)
    user.avatar_url = payload.get("avatar_url", user.avatar_url)
    user.is_profile_complete = True
    db.commit()
    return {"msg": "Updated", "profile": {"email": user.email, "full_name": user.full_name, "phone": user.phone, "bio": user.bio, "city": user.location_city, "occupation": user.occupation, "company": user.company, "avatar": user.avatar_url}}

@app.get("/properties")
def list_properties(search: str="", bhk: str="", location: str="", house_type: str="", owner_only: bool=False, authorization: Optional[str]=Header(None), db=Depends(get_db)):
    q = db.query(Property)
    if search: q = q.filter(or_(Property.title.ilike(f"%{search}%"), Property.location.ilike(f"%{search}%"), Property.description.ilike(f"%{search}%")))
    if bhk and bhk!="All": q = q.filter(Property.bhk==bhk)
    if location and location!="All": q = q.filter(Property.location.ilike(f"%{location}%"))
    if house_type and house_type!="All": q = q.filter(Property.house_type==house_type)
    if owner_only:
        user = get_user_from_header(authorization, db)
        if not user: raise HTTPException(401, "Login required")
        q = q.filter(Property.owner_email==user.email)
    props = q.order_by(Property.id.desc()).all()
    out=[]
    for p in props:
        out.append({"id": p.id, "title": p.title, "location": p.location, "price": p.price, "description": p.description, "images": json.loads(p.images) if p.images else [], "contact": p.contact, "bhk": p.bhk, "house_type": p.house_type, "furnishing": p.furnishing, "area_sqft": p.area_sqft, "owner_email": p.owner_email, "amenities": json.loads(p.amenities) if p.amenities else [], "nearby_places": json.loads(p.nearby_places) if p.nearby_places else [], "maintenance": p.maintenance, "electricity": p.electricity, "water": p.water, "deposit": p.deposit, "latitude": p.latitude, "longitude": p.longitude, "map_address": p.map_address})
    return out

@app.get("/properties/{prop_id}")
def get_property(prop_id: int, db=Depends(get_db)):
    p = db.query(Property).filter(Property.id==prop_id).first()
    if not p: raise HTTPException(404, "Not found")
    return {"id": p.id, "title": p.title, "location": p.location, "price": p.price, "description": p.description, "images": json.loads(p.images) if p.images else [], "contact": p.contact, "bhk": p.bhk, "house_type": p.house_type, "furnishing": p.furnishing, "property_age": p.property_age, "facing": p.facing, "floor_number": p.floor_number, "total_floors": p.total_floors, "area_sqft": p.area_sqft, "pg_sharing_type": p.pg_sharing_type, "pg_available_for": p.pg_available_for, "pg_food_included": p.pg_food_included, "pg_food_type": p.pg_food_type, "pg_rules": json.loads(p.pg_rules) if p.pg_rules else [], "parking": p.parking, "garden": p.garden, "lift_available": p.lift_available, "gated_society": p.gated_society, "business_suitable": p.business_suitable, "washroom": p.washroom, "owner_email": p.owner_email, "maintenance": p.maintenance, "electricity": p.electricity, "water": p.water, "deposit": p.deposit, "brokerage_percent": p.brokerage_percent, "amenities": json.loads(p.amenities) if p.amenities else [], "nearby_places": json.loads(p.nearby_places) if p.nearby_places else [], "latitude": p.latitude, "longitude": p.longitude, "map_address": p.map_address, "extra_details": json.loads(p.extra_details) if p.extra_details else {}}

@app.post("/properties")
def create_property(title: str=Form(...), price: float=Form(...), location: str=Form(...), description: str=Form(""), contact: str=Form(""), bhk: str=Form("2BHK"), house_type: str=Form("Flat"), furnishing: str=Form("Semi-Furnished"), property_age: str=Form("0-1 year"), facing: str=Form("East"), floor_number: str=Form(""), total_floors: str=Form(""), area_sqft: str=Form(""), pg_sharing_type: str=Form(""), pg_available_for: str=Form(""), pg_food_included: str=Form(""), pg_food_type: str=Form(""), pg_rules: str=Form("[]"), parking: str=Form(""), garden: str=Form(""), lift_available: str=Form(""), gated_society: str=Form(""), business_suitable: str=Form(""), washroom: str=Form(""), maintenance: str=Form("1500"), electricity: str=Form("1200"), water: str=Form("300"), deposit: str=Form("30000"), brokerage_percent: str=Form("15"), amenities: str=Form("[]"), nearby_places: str=Form("[]"), latitude: str=Form("26.8467"), longitude: str=Form("80.9462"), map_address: str=Form(""), extra_details: str=Form("{}"), images: List[UploadFile]=File([]), authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    if user.role!="landlord": raise HTTPException(403, "Only landlords")
    img_list=[]
    for img in images:
        if img.filename:
            fn = f"{datetime.utcnow().timestamp()}_{img.filename}"
            fp = os.path.join(UPLOAD_DIR, fn)
            with open(fp,"wb") as f: shutil.copyfileobj(img.file, f)
            img_list.append(f"uploads/{fn}")
    prop = Property(title=title, price=price, location=location, description=description, contact=contact, bhk=bhk, house_type=house_type, furnishing=furnishing, property_age=property_age, facing=facing, floor_number=floor_number, total_floors=total_floors, area_sqft=area_sqft, pg_sharing_type=pg_sharing_type, pg_available_for=pg_available_for, pg_food_included=pg_food_included, pg_food_type=pg_food_type, pg_rules=pg_rules, parking=parking, garden=garden, lift_available=lift_available, gated_society=gated_society, business_suitable=business_suitable, washroom=washroom, owner_id=user.id, owner_email=user.email, maintenance=float(maintenance or 0), electricity=float(electricity or 0), water=float(water or 0), deposit=float(deposit or 0), brokerage_percent=float(brokerage_percent or 15), images=json.dumps(img_list), amenities=amenities, nearby_places=nearby_places, latitude=latitude, longitude=longitude, map_address=map_address, extra_details=extra_details)
    db.add(prop); db.commit(); db.refresh(prop)
    return {"msg": "Created", "id": prop.id}

@app.put("/properties/{prop_id}")
def update_property(prop_id: int, title: str=Form(...), price: float=Form(...), location: str=Form(...), description: str=Form(""), contact: str=Form(""), bhk: str=Form("2BHK"), house_type: str=Form("Flat"), furnishing: str=Form("Semi-Furnished"), property_age: str=Form("0-1 year"), facing: str=Form("East"), floor_number: str=Form(""), total_floors: str=Form(""), area_sqft: str=Form(""), pg_sharing_type: str=Form(""), pg_available_for: str=Form(""), pg_food_included: str=Form(""), pg_food_type: str=Form(""), pg_rules: str=Form("[]"), parking: str=Form(""), garden: str=Form(""), lift_available: str=Form(""), gated_society: str=Form(""), business_suitable: str=Form(""), washroom: str=Form(""), maintenance: str=Form("1500"), electricity: str=Form("1200"), water: str=Form("300"), deposit: str=Form("30000"), brokerage_percent: str=Form("15"), amenities: str=Form("[]"), nearby_places: str=Form("[]"), latitude: str=Form("26.8467"), longitude: str=Form("80.9462"), map_address: str=Form(""), extra_details: str=Form("{}"), images: List[UploadFile]=File([]), authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    prop = db.query(Property).filter(Property.id==prop_id).first()
    if not prop: raise HTTPException(404, "Not found")
    if prop.owner_email!=user.email: raise HTTPException(403, "Not owner")
    prop.title=title; prop.price=price; prop.location=location; prop.description=description; prop.contact=contact; prop.bhk=bhk; prop.house_type=house_type; prop.furnishing=furnishing; prop.property_age=property_age; prop.facing=facing; prop.floor_number=floor_number; prop.total_floors=total_floors; prop.area_sqft=area_sqft; prop.pg_sharing_type=pg_sharing_type; prop.pg_available_for=pg_available_for; prop.pg_food_included=pg_food_included; prop.pg_food_type=pg_food_type; prop.pg_rules=pg_rules; prop.parking=parking; prop.garden=garden; prop.lift_available=lift_available; prop.gated_society=gated_society; prop.business_suitable=business_suitable; prop.washroom=washroom; prop.maintenance=float(maintenance or 0); prop.electricity=float(electricity or 0); prop.water=float(water or 0); prop.deposit=float(deposit or 0); prop.brokerage_percent=float(brokerage_percent or 15); prop.amenities=amenities; prop.nearby_places=nearby_places; prop.latitude=latitude; prop.longitude=longitude; prop.map_address=map_address; prop.extra_details=extra_details
    if images and images[0].filename:
        img_list=[]
        for img in images:
            if img.filename:
                fn = f"{datetime.utcnow().timestamp()}_{img.filename}"
                fp = os.path.join(UPLOAD_DIR, fn)
                with open(fp,"wb") as f: shutil.copyfileobj(img.file, f)
                img_list.append(f"uploads/{fn}")
        prop.images=json.dumps(img_list)
    db.commit(); return {"msg": "Updated"}

@app.delete("/properties/{prop_id}")
def delete_property(prop_id: int, authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    prop = db.query(Property).filter(Property.id==prop_id).first()
    if not prop: raise HTTPException(404, "Not found")
    if prop.owner_email!=user.email: raise HTTPException(403, "Not owner")
    db.delete(prop); db.commit(); return {"msg": "Deleted"}

@app.post("/properties/{prop_id}/view")
def view_property(prop_id: int, request: Request, authorization: Optional[str]=Header(None), db=Depends(get_db)):
    prop = db.query(Property).filter(Property.id==prop_id).first()
    if not prop: raise HTTPException(404, "Not found")
    user = get_user_from_header(authorization, db)
    viewer_email = user.email if user else "anonymous"
    ip = request.client.host if request.client else "0.0.0.0"
    vh = hash_ip(f"{viewer_email}_{ip}")
    pv = PropertyView(property_id=prop_id, property_title=prop.title, owner_email=prop.owner_email, viewer_email=viewer_email, viewer_hash=vh, viewed_at=datetime.utcnow().isoformat(), ip_hash=hash_ip(ip))
    db.add(pv); db.commit(); return {"msg": "Viewed"}

@app.get("/analytics/owner")
def owner_analytics(authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    props = db.query(Property).filter(Property.owner_email==user.email).all()
    total_views=0
    for p in props: total_views+=db.query(PropertyView).filter(PropertyView.property_id==p.id).count()
    return {"total_properties": len(props), "total_views_all": total_views, "properties": [{"id": p.id, "title": p.title, "views": db.query(PropertyView).filter(PropertyView.property_id==p.id).count()} for p in props]}

# Payments
@app.get("/payments")
def get_payments(authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    if user.role=="landlord": pays = db.query(Payment).filter(Payment.owner_email==user.email).order_by(Payment.created_at.desc()).all()
    else: pays = db.query(Payment).filter(Payment.renter_email==user.email).order_by(Payment.created_at.desc()).all()
    return pays

@app.post("/payments")
def create_payment(payload: PaymentCreate, authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    if user.role!="landlord": raise HTTPException(403, "Only landlords can create bills")
    prop = db.query(Property).filter(Property.id==payload.property_id).first()
    if not prop: raise HTTPException(404, "Property not found")
    pay = Payment(property_id=payload.property_id, property_title=prop.title, owner_email=user.email, renter_email=payload.renter_email, amount=payload.amount, base_rent=payload.base_rent, maintenance=payload.maintenance, electricity=payload.electricity, water=payload.water, extra_charges=payload.extra_charges, month=payload.month, year=payload.year, status="due", notes=payload.notes, bill_number=f"BILL-{random.randint(10000,99999)}", due_date=(datetime.utcnow()+timedelta(days=7)).isoformat(), created_at=datetime.utcnow().isoformat())
    db.add(pay); db.commit(); db.refresh(pay); return pay

@app.post("/payments/{pay_id}/pay")
def pay_bill(pay_id: int, authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    pay = db.query(Payment).filter(Payment.id==pay_id).first()
    if not pay: raise HTTPException(404, "Not found")
    pay.status="paid"; pay.paid_date=datetime.utcnow().isoformat(); pay.payment_method="UPI"; pay.transaction_id=f"TXN{random.randint(10000000,99999999)}"; db.commit(); return {"msg": "Paid"}

# Complaints
@app.get("/complaints")
def get_complaints(authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    if user.role=="landlord": comps = db.query(Complaint).filter(Complaint.owner_email==user.email).order_by(Complaint.created_at.desc()).all()
    else: comps = db.query(Complaint).filter(Complaint.renter_email==user.email).order_by(Complaint.created_at.desc()).all()
    return comps

@app.post("/complaints")
def create_complaint(payload: ComplaintCreate, authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    prop = db.query(Property).filter(Property.id==payload.property_id).first()
    if not prop: raise HTTPException(404, "Not found")
    complaint = Complaint(property_id=payload.property_id, property_title=prop.title, renter_email=user.email, owner_email=prop.owner_email, title=payload.title, description=payload.description, category=payload.category, priority=payload.priority, status="open", created_at=datetime.utcnow().isoformat(), updated_at=datetime.utcnow().isoformat())
    db.add(complaint); db.commit(); db.refresh(complaint); return complaint

# Reviews
@app.get("/reviews/{property_id}")
def get_reviews(property_id: int, db=Depends(get_db)):
    revs = db.query(Review).filter(Review.property_id==property_id).order_by(Review.created_at.desc()).all()
    avg = sum([r.rating for r in revs])/len(revs) if revs else 0
    return {"reviews": revs, "average": round(avg,1), "count": len(revs)}

@app.post("/reviews")
def create_review(payload: ReviewCreate, authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    prop = db.query(Property).filter(Property.id==payload.property_id).first()
    if not prop: raise HTTPException(404, "Not found")
    rev = Review(property_id=payload.property_id, property_title=prop.title, reviewer_email=user.email, reviewer_name=user.full_name or user.email.split("@")[0], owner_email=prop.owner_email, rating=payload.rating, comment=payload.comment, pros=payload.pros, cons=payload.cons, created_at=datetime.utcnow().isoformat())
    db.add(rev); db.commit(); db.refresh(rev); return rev

@app.get("/reviews")
def get_all_reviews(authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    if user.role=="landlord": revs = db.query(Review).filter(Review.owner_email==user.email).order_by(Review.created_at.desc()).all()
    else: revs = db.query(Review).filter(Review.reviewer_email==user.email).order_by(Review.created_at.desc()).all()
    return revs

# Messages - Direct Chat Owner-Renter
@app.get("/messages")
def get_messages(authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    msgs = db.query(Message).filter(or_(Message.sender_email==user.email, Message.receiver_email==user.email)).order_by(Message.created_at.desc()).all()
    return msgs

@app.get("/messages/conversations")
def get_conversations(authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    msgs = db.query(Message).filter(or_(Message.sender_email==user.email, Message.receiver_email==user.email)).order_by(Message.created_at.desc()).all()
    conv_dict={}
    for m in msgs:
        other = m.receiver_email if m.sender_email==user.email else m.sender_email
        if other not in conv_dict:
            conv_dict[other] = {"other_email": other, "property_id": m.property_id, "property_title": m.property_title, "last_message": m.message, "last_time": m.created_at, "unread": 0, "messages": []}
        conv_dict[other]["messages"].append(m)
        if m.receiver_email==user.email and not m.is_read:
            conv_dict[other]["unread"]+=1
    return list(conv_dict.values())

@app.post("/messages")
def send_message(payload: MessageCreate, authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    prop = None
    if payload.property_id:
        prop = db.query(Property).filter(Property.id==payload.property_id).first()
    msg = Message(property_id=payload.property_id, property_title=prop.title if prop else "", sender_email=user.email, receiver_email=payload.receiver_email, message=payload.message, is_read=False, created_at=datetime.utcnow().isoformat())
    db.add(msg); db.commit(); db.refresh(msg); return msg

@app.put("/messages/read/{other_email}")
def mark_read(other_email: str, authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    db.query(Message).filter(Message.sender_email==other_email, Message.receiver_email==user.email, Message.is_read==False).update({"is_read": True})
    db.commit(); return {"msg": "Marked read"}

@app.post("/seed/reset")
def reset_seed(db=Depends(get_db)):
    db.query(Property).delete(); db.commit(); seed_db(); return {"msg": "Reseeded 10 houses", "login": "test@testgmail.com / 123456"}

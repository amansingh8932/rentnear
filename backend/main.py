import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, Integer, String, Float, or_, Text, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import os, shutil, json, hashlib, random
from pydantic import BaseModel
from typing import List, Optional
import cloudinary
import cloudinary.uploader

SECRET_KEY = os.getenv("SECRET_KEY", "rentnear-secret-v18-full")
ALGORITHM = "HS256"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IS_VERCEL = os.getenv("VERCEL") == "1" or os.getenv("VERCEL_ENV") is not None
UPLOAD_DIR = "/tmp/uploads" if IS_VERCEL else os.path.join(BASE_DIR, "uploads")
DB_PATH = os.path.join("/tmp" if IS_VERCEL else BASE_DIR, "rentnear.db")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "reviews"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "complaints"), exist_ok=True)

# --- CLOUDINARY CONFIG - PERMANENT IMAGES ---
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

def upload_to_cloudinary(file_bytes, filename="img.jpg"):
    if not os.getenv("CLOUDINARY_CLOUD_NAME"):
        return None
    try:
        import io, uuid
        result = cloudinary.uploader.upload(
            io.BytesIO(file_bytes),
            folder="rentnear",
            public_id=f"{uuid.uuid4().hex}_{filename}",
            resource_type="auto"  # <-- PHOTO + VIDEO both!
        )
        return result["secure_url"]
    except Exception as e:
        print(f"Cloudinary failed: {e}")
        return None

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
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
    created_at = Column(String, default=lambda: datetime.now().isoformat())
    last_login = Column(String, default=lambda: datetime.now().isoformat())

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
    gas = Column(Float, default=400)
    internet = Column(Float, default=500)
    wifi_charges = Column(Float, default=500)

class PropertyView(Base):
    __tablename__ = "property_views"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer, index=True)
    property_title = Column(String, default="")
    owner_email = Column(String, default="")
    viewer_email = Column(String, default="")
    viewer_hash = Column(String, default="")
    viewed_at = Column(String, default=lambda: datetime.now().isoformat())
    ip_hash = Column(String, default="")

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
    created_at = Column(String, default=lambda: datetime.now().isoformat())

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
    photo = Column(String, default="")
    video = Column(String, default="")
    created_at = Column(String, default=lambda: datetime.now().isoformat())
    updated_at = Column(String, default=lambda: datetime.now().isoformat())

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
    photo = Column(String, default="")
    video = Column(String, default="")
    created_at = Column(String, default=lambda: datetime.now().isoformat())

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer, default=0)
    property_title = Column(String, default="")
    sender_email = Column(String)
    receiver_email = Column(String)
    message = Column(String)
    is_read = Column(Boolean, default=False)
    created_at = Column(String, default=lambda: datetime.now().isoformat())

class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, nullable=False)
    property_title = Column(String, default="")
    property_location = Column(String, default="")
    renter_email = Column(String, nullable=False)
    owner_email = Column(String, nullable=False)
    message = Column(String, default="")
    check_in_date = Column(String, default="")
    status = Column(String, default="Pending")
    created_at = Column(String, default=lambda: datetime.now().isoformat())
    updated_at = Column(String, default=lambda: datetime.now().isoformat())

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

SEED_HOUSES = [
    {"title":"2BHK Premium Flat - Gomti Nagar","location":"Gomti Nagar, Lucknow","price":18500,"bhk":"2BHK","house_type":"Flat","description":"Spacious 2BHK with modular kitchen, balcony with Gomti Nagar view, semi-furnished. Basic charges included in bill breakdown.","contact":"9876543210","furnishing":"Semi-Furnished","area_sqft":"1150","floor_number":"3","total_floors":"5","parking":"1 Car","garden":"No","amenities":["WiFi","AC","Lift","Parking","Security","Water Purifier","Balcony"],"nearby_places":["Patrakarpuram Market - 0.4km","Phoenix Palassio - 1.2km"],"latitude":"26.8467","longitude":"80.9462","maintenance":1800,"electricity":1500,"water":400,"gas":450,"internet":600,"wifi_charges":600},
    {"title":"1RK Cozy Studio - Hazratganj","location":"Hazratganj, Lucknow","price":9500,"bhk":"1RK","house_type":"Flat","description":"Perfect for students/professionals near Hazratganj metro, furnished. All basic charges transparent.","contact":"9876543211","furnishing":"Furnished","area_sqft":"350","floor_number":"2","total_floors":"4","amenities":["WiFi","AC","Furnished","Water Purifier"],"nearby_places":["Hazratganj Metro - 0.2km"],"latitude":"26.8555","longitude":"80.9429","maintenance":800,"electricity":800,"water":300,"gas":350,"internet":500,"wifi_charges":500},
    {"title":"Independent Villa - Mahanagar","location":"Mahanagar, Lucknow","price":35000,"bhk":"3BHK","house_type":"Villa","description":"Luxury 3BHK villa with private garden, parking, 24x7 security, map enabled.","contact":"9876543212","furnishing":"Furnished","area_sqft":"2200","plot_area":"1800 sqft","garden":"Yes","parking":"2 Cars","gated_society":"Yes","amenities":["Garden","Parking","AC","WiFi","Security","Gym","Power Backup"],"nearby_places":["Mahanagar Market - 0.5km"],"latitude":"26.8650","longitude":"80.9490","maintenance":2500,"electricity":2000,"water":500,"gas":600,"internet":700,"wifi_charges":700},
    {"title":"PG for Girls - Indira Nagar","location":"Indira Nagar, Lucknow","price":8500,"bhk":"1BHK","house_type":"PG","description":"Safe PG for girls, food included, WiFi, AC, near Bhootnath market. Role-based secure.","contact":"9876543213","furnishing":"Furnished","pg_sharing_type":"Single","pg_available_for":"Girls","pg_food_included":"Yes","pg_food_type":"Veg","amenities":["WiFi","AC","Food","Laundry","Security","Water Purifier","Furnished"],"nearby_places":["Bhootnath Market - 0.3km"],"latitude":"26.8510","longitude":"80.9900","maintenance":0,"electricity":0,"water":0,"gas":0,"internet":0,"wifi_charges":0},
    {"title":"Builder Floor - Alambagh","location":"Alambagh, Lucknow","price":14000,"bhk":"2BHK","house_type":"Builder Floor","description":"2nd floor builder floor, park facing, well ventilated, basic charges included.","contact":"9876543214","furnishing":"Semi-Furnished","area_sqft":"1000","floor_number":"2","total_floors":"3","amenities":["Parking","Lift","Security","Balcony"],"nearby_places":["Alambagh Metro - 0.6km"],"latitude":"26.8290","longitude":"80.9210","maintenance":1200,"electricity":1200,"water":350,"gas":400,"internet":500,"wifi_charges":500},
    {"title":"Office Space - Gomti Nagar","location":"Gomti Nagar, Lucknow","price":28000,"bhk":"Office","house_type":"Office","description":"Commercial office 800 sqft, lift, power backup, conference room, map location available.","contact":"9876543215","furnishing":"Furnished","area_sqft":"800","business_suitable":"IT, Startup","amenities":["Lift","AC","WiFi","Power Backup","Security","Parking"],"nearby_places":["Gomti Nagar Corporate Hub - 0.2km"],"latitude":"26.8500","longitude":"80.9500","maintenance":2000,"electricity":2500,"water":400,"gas":0,"internet":800,"wifi_charges":800},
    {"title":"1BHK Budget Flat - Aliganj","location":"Aliganj, Lucknow","price":11000,"bhk":"1BHK","house_type":"Flat","description":"Affordable 1BHK for small family, near Purania crossing, transparent billing.","contact":"9876543216","furnishing":"Semi-Furnished","area_sqft":"650","amenities":["Lift","Parking","Water Purifier"],"nearby_places":["Purania Market - 0.4km"],"latitude":"26.8940","longitude":"80.9410","maintenance":1000,"electricity":1000,"water":300,"gas":350,"internet":500,"wifi_charges":500},
    {"title":"Shop - Hazratganj Main","location":"Hazratganj, Lucknow","price":22000,"bhk":"Shop","house_type":"Shop","description":"Prime shop on main road, high footfall, suitable for boutique/cafe, map visible.","contact":"9876543217","furnishing":"Unfurnished","area_sqft":"300","business_suitable":"Retail","amenities":["Security","Power Backup"],"nearby_places":["Hazratganj Main Road"],"latitude":"26.8560","longitude":"80.9450","maintenance":1000,"electricity":1500,"water":200,"gas":0,"internet":600,"wifi_charges":600},
    {"title":"2BHK Family Flat - Gomti Nagar Extension","location":"Gomti Nagar, Lucknow","price":16500,"bhk":"2BHK","house_type":"Flat","description":"Family preferred, gated society, clubhouse, pool access, basic charges breakdown in bill.","contact":"9876543218","furnishing":"Semi-Furnished","area_sqft":"1050","amenities":["Lift","Pool","Gym","Garden","Security","Clubhouse","Parking"],"nearby_places":["Patrakarpuram - 0.5km"],"latitude":"26.8400","longitude":"80.9550","maintenance":1800,"electricity":1300,"water":400,"gas":450,"internet":600,"wifi_charges":600},
    {"title":"Hostel for Boys - Indira Nagar","location":"Indira Nagar, Lucknow","price":6000,"bhk":"1BHK","house_type":"Hostel","description":"Boys hostel with study table, WiFi, food 2 times, near engineering colleges.","contact":"9876543219","furnishing":"Furnished","amenities":["WiFi","Food","Study Table","Laundry","Security"],"nearby_places":["Engineering College - 0.8km"],"latitude":"26.8600","longitude":"80.9950","maintenance":0,"electricity":0,"water":0,"gas":0,"internet":0,"wifi_charges":0},
    {"title":"3BHK Independent House - Jankipuram","location":"Jankipuram, Lucknow","price":20000,"bhk":"3BHK","house_type":"Independent House","description":"Independent house with terrace, 2 parking, small garden, map integration for renters.","contact":"9876543220","furnishing":"Semi-Furnished","area_sqft":"1600","plot_area":"1400 sqft","garden":"Yes","parking":"2 Cars","amenities":["Garden","Parking","Water Purifier","Balcony","Terrace"],"nearby_places":["Jankipuram Market - 0.3km"],"latitude":"26.9200","longitude":"80.9300","maintenance":1500,"electricity":1500,"water":400,"gas":500,"internet":600,"wifi_charges":600},
    {"title":"Luxury 4BHK Villa - Sushant Golf City","location":"Sushant Golf City, Lucknow","price":55000,"bhk":"4BHK","house_type":"Villa","description":"Premium 4BHK villa inside gated township, golf course view, pool, clubhouse, transparent charges.","contact":"9876543221","furnishing":"Furnished","area_sqft":"3200","garden":"Yes","gated_society":"Yes","amenities":["Pool","Gym","Garden","Clubhouse","Security","AC","Parking","WiFi"],"nearby_places":["Golf Course - 0.2km"],"latitude":"26.8100","longitude":"81.0200","maintenance":3500,"electricity":3000,"water":600,"gas":700,"internet":800,"wifi_charges":800},
    {"title":"1BHK PG - Mahanagar Boys","location":"Mahanagar, Lucknow","price":7000,"bhk":"1BHK","house_type":"PG","description":"PG for working professionals, single occupancy, food optional, role-based access.","contact":"9876543222","furnishing":"Furnished","pg_available_for":"Boys","pg_food_included":"Optional","amenities":["WiFi","AC","Furnished","Water Purifier"],"nearby_places":["Mahanagar Market - 0.2km"],"latitude":"26.8660","longitude":"80.9480","maintenance":0,"electricity":0,"water":0,"gas":0,"internet":0,"wifi_charges":0},
    {"title":"2BHK Flat - Chowk Old Lucknow","location":"Chowk, Lucknow","price":12000,"bhk":"2BHK","house_type":"Flat","description":"Traditional Lucknow house near Chowk, heritage feel, spacious rooms, basic charges explained.","contact":"9876543223","furnishing":"Semi-Furnished","area_sqft":"900","amenities":["Water Purifier","Balcony"],"nearby_places":["Chowk Market - 0.1km"],"latitude":"26.8790","longitude":"80.9020","maintenance":1000,"electricity":1100,"water":300,"gas":400,"internet":500,"wifi_charges":500},
    {"title":"Builder Floor - Rajajipuram","location":"Rajajipuram, Lucknow","price":13500,"bhk":"2BHK","house_type":"Builder Floor","description":"First floor, east facing, good sunlight, near main road, map visible to renters.","contact":"9876543224","furnishing":"Semi-Furnished","area_sqft":"950","facing":"East","amenities":["Parking","Water Purifier","Balcony"],"nearby_places":["Rajajipuram Market - 0.4km"],"latitude":"26.8320","longitude":"80.8850","maintenance":1200,"electricity":1200,"water":350,"gas":400,"internet":500,"wifi_charges":500},
    {"title":"Commercial Office - Hazratganj","location":"Hazratganj, Lucknow","price":32000,"bhk":"Office","house_type":"Office","description":"2000 sqft office, central location, suitable for corporate, transparent billing.","contact":"9876543225","furnishing":"Furnished","area_sqft":"2000","amenities":["Lift","AC","WiFi","Power Backup","Security"],"nearby_places":["Hazratganj - 0.1km"],"latitude":"26.8570","longitude":"80.9440","maintenance":2500,"electricity":3000,"water":500,"gas":0,"internet":1000,"wifi_charges":1000},
    {"title":"2BHK Flat - Patrakarpuram","location":"Gomti Nagar, Lucknow","price":17500,"bhk":"2BHK","house_type":"Flat","description":"Well maintained flat near Patrakarpuram, family preferred, park facing, map enabled.","contact":"9876543226","furnishing":"Semi-Furnished","area_sqft":"1100","amenities":["Lift","Parking","Garden","Security","Balcony"],"nearby_places":["Patrakarpuram Park - 0.2km"],"latitude":"26.8450","longitude":"80.9600","maintenance":1500,"electricity":1300,"water":350,"gas":450,"internet":600,"wifi_charges":600},
    {"title":"1RK Studio - Gomti Nagar Students","location":"Gomti Nagar, Lucknow","price":8000,"bhk":"1RK","house_type":"Flat","description":"Studio apartment for students, near CMS, affordable, basic charges included.","contact":"9876543227","furnishing":"Furnished","area_sqft":"300","amenities":["WiFi","Furnished","Water Purifier"],"nearby_places":["CMS Gomti Nagar - 0.5km"],"latitude":"26.8420","longitude":"80.9480","maintenance":600,"electricity":700,"water":250,"gas":300,"internet":500,"wifi_charges":500},
    {"title":"3BHK Flat - Indira Nagar C Block","location":"Indira Nagar, Lucknow","price":22000,"bhk":"3BHK","house_type":"Flat","description":"Spacious 3BHK, 3rd floor, lift, covered parking, near Lekhraj, map for renters.","contact":"9876543228","furnishing":"Semi-Furnished","area_sqft":"1400","floor_number":"3","total_floors":"4","amenities":["Lift","Parking","Security","Balcony","Water Purifier"],"nearby_places":["Lekhraj Market - 0.4km"],"latitude":"26.8520","longitude":"80.9920","maintenance":1800,"electricity":1600,"water":400,"gas":500,"internet":600,"wifi_charges":600},
    {"title":"PG Unisex - Alambagh Metro","location":"Alambagh, Lucknow","price":7500,"bhk":"1BHK","house_type":"PG","description":"Unisex PG, metro connectivity, food 3 times, laundry included, professional management.","contact":"9876543229","furnishing":"Furnished","pg_available_for":"Unisex","pg_food_included":"Yes","amenities":["Food","WiFi","AC","Laundry","Security"],"nearby_places":["Alambagh Metro - 0.3km"],"latitude":"26.8250","longitude":"80.9220","maintenance":0,"electricity":0,"water":0,"gas":0,"internet":0,"wifi_charges":0},
]

def seed_db():
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email=="test@testgmail.com").first() is None:
            u = User(email="test@testgmail.com", phone="9876543210", hashed_password=pwd_context.hash("123456"), role="landlord", full_name="Test Landlord", bio="Professional landlord - 20 properties in Lucknow", location_city="Lucknow", occupation="Real Estate", is_verified=True, is_profile_complete=True)
            db.add(u)
        if db.query(User).filter(User.email=="test@gmail.com").first() is None:
            u = User(email="test@gmail.com", phone="9876543210", hashed_password=pwd_context.hash("123456"), role="landlord", full_name="Test Owner", location_city="Lucknow", is_verified=True, is_profile_complete=True)
            db.add(u)
        for em, role, name in [("renter@gmail.com","renter","Renter User"), ("owner@gmail.com","landlord","Owner Demo")]:
            if db.query(User).filter(User.email==em).first() is None:
                u = User(email=em, phone="9876543210", hashed_password=pwd_context.hash("123456"), role=role, full_name=name, location_city="Lucknow", is_verified=True, is_profile_complete=True)
                db.add(u)
        db.commit()
        if db.query(Property).count()==0:
            owner = db.query(User).filter(User.email=="test@testgmail.com").first()
            owner_email = "test@testgmail.com"
            owner_id = owner.id if owner else 1
            for h in SEED_HOUSES:
                h_copy = h.copy()
                amenities = json.dumps(h_copy.pop("amenities", []))
                nearby = json.dumps(h_copy.pop("nearby_places", []))
                lat = h_copy.pop("latitude","26.8467")
                lng = h_copy.pop("longitude","80.9462")
                maint = h_copy.pop("maintenance",1500)
                elec = h_copy.pop("electricity",1200)
                wat = h_copy.pop("water",300)
                gas = h_copy.pop("gas",400)
                internet = h_copy.pop("internet",500)
                wifi = h_copy.pop("wifi_charges",500)
                title = h_copy.pop("title")
                location = h_copy.pop("location")
                price = h_copy.pop("price")
                desc = h_copy.pop("description")
                bhk = h_copy.pop("bhk","2BHK")
                ht = h_copy.pop("house_type","Flat")
                p = Property(title=title, location=location, price=price, description=desc, bhk=bhk, house_type=ht, owner_id=owner_id, owner_email=owner_email, images="[]", image_url="", amenities=amenities, nearby_places=nearby, latitude=str(lat), longitude=str(lng), maintenance=float(maint), electricity=float(elec), water=float(wat), gas=float(gas), internet=float(internet), wifi_charges=float(wifi), deposit=30000, brokerage_percent=15, **h_copy)
                db.add(p)
            db.commit()
    finally: db.close()

Base.metadata.create_all(bind=engine)
seed_db()


app = FastAPI(title="RentNear v19 - Professional Role Based")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://rentnear-delta.vercel.app",
        "https://rentnear-r3hk13soz-aman-singh8.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000"
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
def home(): return {"status": "RentNear v19 - Professional - 20 houses - Role based + Cloudinary Permanent", "version": "19.1-cloudinary", "login": "test@testgmail.com / 123456"}

@app.post("/register")
def register(payload: dict, db=Depends(get_db)):
    email = payload.get("email")
    if db.query(User).filter(User.email==email).first(): raise HTTPException(400, "User already exists")
    u = User(email=email, phone=payload.get("phone",""), hashed_password=pwd_context.hash(payload.get("password","123456")), role=payload.get("role","renter"), full_name=payload.get("full_name",""), bio=payload.get("bio",""), location_city=payload.get("city","Lucknow"), is_verified=True)
    db.add(u); db.commit(); db.refresh(u)
    token = jwt.encode({"sub": u.email, "role": u.role, "exp": datetime.now()+timedelta(days=7)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "email": u.email, "role": u.role, "full_name": u.full_name, "profile": {"email": u.email, "full_name": u.full_name, "role": u.role, "phone": u.phone, "bio": u.bio, "city": u.location_city, "avatar": u.avatar_url}}

@app.post("/auth/register-professional")
async def register_professional_alias(request: Request, db=Depends(get_db)):
    try: data = await request.json()
    except:
        form = await request.form()
        data = dict(form)
    email = data.get("email")
    if not email: raise HTTPException(400, "Email required")
    if db.query(User).filter(User.email==email).first(): raise HTTPException(400, "User already exists")
    u = User(email=email, phone=data.get("phone",""), hashed_password=pwd_context.hash(data.get("password","123456")), role=data.get("role","renter"), full_name=data.get("full_name",""), bio="", location_city=data.get("location_city","Lucknow"), is_verified=True, is_profile_complete=True)
    db.add(u); db.commit(); db.refresh(u)
    token = jwt.encode({"sub": u.email, "role": u.role, "exp": datetime.now()+timedelta(days=7)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "email": u.email, "role": u.role, "full_name": u.full_name, "profile": {"email": u.email, "full_name": u.full_name, "role": u.role}}

@app.post("/login")
async def login(request: Request, db=Depends(get_db)):
    username = None
    password = None
    try:
        data = await request.json()
        username = data.get("username") or data.get("email")
        password = data.get("password")
    except: pass
    if not username:
        try:
            form = await request.form()
            username = form.get("username") or form.get("email")
            password = form.get("password")
        except: pass
    if not username or not password:
        raise HTTPException(400, "Username and password required")
    user = db.query(User).filter(User.email==username).first()
    if not user and "test" in username.lower():
        user = db.query(User).filter(User.email.ilike("%test%")).first()
    if not user or not pwd_context.verify(password, user.hashed_password):
        raise HTTPException(400, "Invalid credentials")
    user.last_login = datetime.now().isoformat(); db.commit()
    token = jwt.encode({"sub": user.email, "role": user.role, "exp": datetime.now()+timedelta(days=7)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "email": user.email, "role": user.role, "full_name": user.full_name, "profile": {"email": user.email, "full_name": user.full_name, "role": user.role, "phone": user.phone, "bio": user.bio, "city": user.location_city, "avatar": user.avatar_url, "occupation": user.occupation, "company": user.company}}

@app.get("/profile/me")
def get_profile(authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Please login")
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
    return {"msg": "Profile updated successfully"}

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
        try: imgs = json.loads(p.images) if p.images else []
        except: imgs = [p.image_url] if p.image_url else []
        if not imgs and p.image_url: imgs = [p.image_url]
        out.append({"id": p.id, "title": p.title, "location": p.location, "price": p.price, "description": p.description, "images": imgs, "image_url": p.image_url, "contact": p.contact, "bhk": p.bhk, "house_type": p.house_type, "furnishing": p.furnishing, "area_sqft": p.area_sqft, "owner_email": p.owner_email, "owner_id": p.owner_id, "amenities": json.loads(p.amenities) if p.amenities else [], "nearby_places": json.loads(p.nearby_places) if p.nearby_places else [], "maintenance": p.maintenance, "electricity": p.electricity, "water": p.water, "gas": getattr(p,"gas",400), "internet": getattr(p,"internet",500), "wifi_charges": getattr(p,"wifi_charges",500), "deposit": p.deposit, "latitude": p.latitude, "longitude": p.longitude, "map_address": p.map_address})
    return out

@app.get("/properties/{prop_id}")
def get_property(prop_id: int, db=Depends(get_db)):
    p = db.query(Property).filter(Property.id==prop_id).first()
    if not p: raise HTTPException(404, "Property not found")
    try: imgs = json.loads(p.images) if p.images else []
    except: imgs = [p.image_url] if p.image_url else []
    if not imgs and p.image_url: imgs = [p.image_url]
    return {"id": p.id, "title": p.title, "location": p.location, "price": p.price, "description": p.description, "images": imgs, "image_url": p.image_url, "contact": p.contact, "bhk": p.bhk, "house_type": p.house_type, "furnishing": p.furnishing, "property_age": p.property_age, "facing": p.facing, "floor_number": p.floor_number, "total_floors": p.total_floors, "area_sqft": p.area_sqft, "pg_sharing_type": p.pg_sharing_type, "pg_available_for": p.pg_available_for, "pg_food_included": p.pg_food_included, "pg_food_type": p.pg_food_type, "pg_rules": json.loads(p.pg_rules) if p.pg_rules else [], "parking": p.parking, "garden": p.garden, "lift_available": p.lift_available, "gated_society": p.gated_society, "business_suitable": p.business_suitable, "washroom": p.washroom, "owner_email": p.owner_email, "owner_id": p.owner_id, "maintenance": p.maintenance, "electricity": p.electricity, "water": p.water, "gas": getattr(p,"gas",400), "internet": getattr(p,"internet",500), "wifi_charges": getattr(p,"wifi_charges",500), "deposit": p.deposit, "brokerage_percent": p.brokerage_percent, "amenities": json.loads(p.amenities) if p.amenities else [], "nearby_places": json.loads(p.nearby_places) if p.nearby_places else [], "latitude": p.latitude, "longitude": p.longitude, "map_address": p.map_address, "extra_details": json.loads(p.extra_details) if p.extra_details else {}}

@app.post("/properties")
def create_property(title: str=Form(...), price: float=Form(...), location: str=Form(...), description: str=Form(""), contact: str=Form(""), bhk: str=Form("2BHK"), house_type: str=Form("Flat"), furnishing: str=Form("Semi-Furnished"), property_age: str=Form("0-1 year"), facing: str=Form("East"), floor_number: str=Form(""), total_floors: str=Form(""), area_sqft: str=Form(""), pg_sharing_type: str=Form(""), pg_available_for: str=Form(""), pg_food_included: str=Form(""), pg_food_type: str=Form(""), pg_rules: str=Form("[]"), parking: str=Form(""), garden: str=Form(""), lift_available: str=Form(""), gated_society: str=Form(""), business_suitable: str=Form(""), washroom: str=Form(""), maintenance: str=Form("1500"), electricity: str=Form("1200"), water: str=Form("300"), gas: str=Form("400"), internet: str=Form("500"), wifi_charges: str=Form("500"), deposit: str=Form("30000"), brokerage_percent: str=Form("15"), amenities: str=Form("[]"), nearby_places: str=Form("[]"), latitude: str=Form("26.8467"), longitude: str=Form("80.9462"), map_address: str=Form(""), extra_details: str=Form("{}"), images: List[UploadFile]=File([]), authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    if user.role!="landlord": raise HTTPException(403, "Only property owners can list properties")
    img_list=[]
    for img in images:
        if img.filename:
            url = upload_to_cloudinary(img, folder="rentnear/properties")
            if url:
                img_list.append(url)
    prop = Property(title=title, price=price, location=location, description=description, contact=contact, bhk=bhk, house_type=house_type, furnishing=furnishing, property_age=property_age, facing=facing, floor_number=floor_number, total_floors=total_floors, area_sqft=area_sqft, pg_sharing_type=pg_sharing_type, pg_available_for=pg_available_for, pg_food_included=pg_food_included, pg_food_type=pg_food_type, pg_rules=pg_rules, parking=parking, garden=garden, lift_available=lift_available, gated_society=gated_society, business_suitable=business_suitable, washroom=washroom, owner_id=user.id, owner_email=user.email, maintenance=float(maintenance or 0), electricity=float(electricity or 0), water=float(water or 0), gas=float(gas or 400), internet=float(internet or 500), wifi_charges=float(wifi_charges or 500), deposit=float(deposit or 0), brokerage_percent=float(brokerage_percent or 15), images=json.dumps(img_list), image_url=img_list[0] if img_list else "", amenities=amenities, nearby_places=nearby_places, latitude=latitude, longitude=longitude, map_address=map_address, extra_details=extra_details)
    db.add(prop); db.commit(); db.refresh(prop)
    return {"msg": "Property listed successfully with permanent Cloudinary images", "id": prop.id, "images": img_list}

@app.put("/properties/{prop_id}")
def update_property(prop_id: int, title: str=Form(...), price: float=Form(...), location: str=Form(...), description: str=Form(""), contact: str=Form(""), bhk: str=Form("2BHK"), house_type: str=Form("Flat"), furnishing: str=Form("Semi-Furnished"), property_age: str=Form("0-1 year"), facing: str=Form("East"), floor_number: str=Form(""), total_floors: str=Form(""), area_sqft: str=Form(""), pg_sharing_type: str=Form(""), pg_available_for: str=Form(""), pg_food_included: str=Form(""), pg_food_type: str=Form(""), pg_rules: str=Form("[]"), parking: str=Form(""), garden: str=Form(""), lift_available: str=Form(""), gated_society: str=Form(""), business_suitable: str=Form(""), washroom: str=Form(""), maintenance: str=Form("1500"), electricity: str=Form("1200"), water: str=Form("300"), gas: str=Form("400"), internet: str=Form("500"), wifi_charges: str=Form("500"), deposit: str=Form("30000"), brokerage_percent: str=Form("15"), amenities: str=Form("[]"), nearby_places: str=Form("[]"), latitude: str=Form("26.8467"), longitude: str=Form("80.9462"), map_address: str=Form(""), extra_details: str=Form("{}"), images: List[UploadFile]=File([]), authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    prop = db.query(Property).filter(Property.id==prop_id).first()
    if not prop: raise HTTPException(404, "Property not found")
    if prop.owner_email!=user.email: raise HTTPException(403, "You can only edit your own properties")
    prop.title=title; prop.price=price; prop.location=location; prop.description=description; prop.contact=contact; prop.bhk=bhk; prop.house_type=house_type; prop.furnishing=furnishing; prop.property_age=property_age; prop.facing=facing; prop.floor_number=floor_number; prop.total_floors=total_floors; prop.area_sqft=area_sqft; prop.pg_sharing_type=pg_sharing_type; prop.pg_available_for=pg_available_for; prop.pg_food_included=pg_food_included; prop.pg_food_type=pg_food_type; prop.pg_rules=pg_rules; prop.parking=parking; prop.garden=garden; prop.lift_available=lift_available; prop.gated_society=gated_society; prop.business_suitable=business_suitable; prop.washroom=washroom; prop.maintenance=float(maintenance or 0); prop.electricity=float(electricity or 0); prop.water=float(water or 0); prop.gas=float(gas or 0); prop.internet=float(internet or 0); prop.wifi_charges=float(wifi_charges or 0); prop.deposit=float(deposit or 0); prop.brokerage_percent=float(brokerage_percent or 15); prop.amenities=amenities; prop.nearby_places=nearby_places; prop.latitude=latitude; prop.longitude=longitude; prop.map_address=map_address; prop.extra_details=extra_details
    if images and images[0].filename:
        img_list=[]
        for img in images:
            if img.filename:
                url = upload_to_cloudinary(img, folder="rentnear/properties")
                if url:
                    img_list.append(url)
        if img_list:
            prop.images=json.dumps(img_list)
            prop.image_url=img_list[0]
    db.commit(); return {"msg": "Property updated successfully with permanent images"}

@app.delete("/properties/{prop_id}")
def delete_property(prop_id: int, authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    prop = db.query(Property).filter(Property.id==prop_id).first()
    if not prop: raise HTTPException(404, "Not found")
    if prop.owner_email!=user.email: raise HTTPException(403, "Not owner")
    db.delete(prop); db.commit(); return {"msg": "Property deleted successfully"}

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
    if user.role!="landlord": raise HTTPException(403, "Only owners can generate bills")
    prop = db.query(Property).filter(Property.id==payload.property_id).first()
    if not prop: raise HTTPException(404, "Property not found")
    pay = Payment(property_id=payload.property_id, property_title=prop.title, owner_email=user.email, renter_email=payload.renter_email, amount=payload.amount, base_rent=payload.base_rent, maintenance=payload.maintenance, electricity=payload.electricity, water=payload.water, extra_charges=payload.extra_charges, month=payload.month, year=payload.year, status="due", notes=payload.notes, bill_number=f"BILL-{random.randint(10000,99999)}", due_date=(datetime.now()+timedelta(days=7)).isoformat(), created_at=datetime.now().isoformat())
    db.add(pay); db.commit(); db.refresh(pay); return pay

@app.post("/payments/{pay_id}/pay")
def pay_bill(pay_id: int, authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    pay = db.query(Payment).filter(Payment.id==pay_id).first()
    if not pay: raise HTTPException(404, "Bill not found")
    if pay.renter_email.lower()!=user.email.lower():
        raise HTTPException(403, "You can only pay your own bills")
    pay.paid_date=datetime.now().isoformat(); pay.payment_method="UPI"; pay.transaction_id=f"TXN{random.randint(10000000,99999999)}"; db.commit(); return {"msg": "Payment successful"}

@app.get("/complaints")
def get_complaints(authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    if user.role=="landlord": comps = db.query(Complaint).filter(Complaint.owner_email==user.email).order_by(Complaint.created_at.desc()).all()
    else: comps = db.query(Complaint).filter(Complaint.renter_email==user.email).order_by(Complaint.created_at.desc()).all()
    return [{"id": c.id, "property_id": c.property_id, "property_title": c.property_title, "renter_email": c.renter_email, "owner_email": c.owner_email, "title": c.title, "description": c.description, "category": c.category, "status": c.status, "photo": c.photo, "video": c.video, "created_at": c.created_at, "owner_response": c.owner_response} for c in comps]

@app.post("/complaints")
def create_complaint(property_id: int = Form(...), title: str = Form(...), description: str = Form(...), category: str = Form("general"), priority: str = Form("medium"), photo: UploadFile = File(None), video: UploadFile = File(None), authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    prop = db.query(Property).filter(Property.id==property_id).first()
    if not prop: raise HTTPException(404, "Property not found")
    photo_url = ""; video_url = ""
    if photo and photo.filename:
        photo_url = upload_to_cloudinary(photo, folder="rentnear/complaints")
    if video and video.filename:
        video_url = upload_to_cloudinary(video, folder="rentnear/complaints")
    complaint = Complaint(property_id=property_id, property_title=prop.title, renter_email=user.email, owner_email=prop.owner_email, title=title, description=description, category=category, priority=priority, status="open", photo=photo_url, video=video_url, created_at=datetime.now().isoformat(), updated_at=datetime.now().isoformat())
    db.add(complaint); db.commit(); db.refresh(complaint); return complaint

@app.put("/complaints/{complaint_id}")
def update_complaint_status(complaint_id: int, status: str = Form(...), owner_response: str = Form(""), authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    comp = db.query(Complaint).filter(Complaint.id==complaint_id).first()
    if not comp: raise HTTPException(404, "Complaint not found")
    allowed = ["open","in_progress","resolved","closed"]
    if status.lower() not in allowed: raise HTTPException(400, "Invalid status")
    if user.role=="landlord" and comp.owner_email.lower()!=user.email.lower(): raise HTTPException(403, "Not your property")
    if user.role=="renter" and comp.renter_email.lower()!=user.email.lower(): raise HTTPException(403, "Not your complaint")
    comp.status = status.lower()
    if owner_response: comp.owner_response = owner_response
    comp.updated_at = datetime.now().isoformat()
    db.commit(); db.refresh(comp)
    return comp

@app.get("/reviews/{property_id}")
def get_reviews(property_id: int, db=Depends(get_db)):
    revs = db.query(Review).filter(Review.property_id==property_id).order_by(Review.created_at.desc()).all()
    avg = sum([r.rating for r in revs])/len(revs) if revs else 0
    return {"reviews": [{"id": r.id, "property_id": r.property_id, "rating": r.rating, "comment": r.comment, "reviewer_email": r.reviewer_email, "photo": r.photo, "video": r.video, "created_at": r.created_at} for r in revs], "average": round(avg,1), "count": len(revs)}

@app.post("/reviews")
def create_review(property_id: int = Form(...), rating: int = Form(...), comment: str = Form(...), pros: str = Form(""), cons: str = Form(""), photo: UploadFile = File(None), video: UploadFile = File(None), authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    if user.role!="renter": raise HTTPException(403, "Only renters can write reviews")
    prop = db.query(Property).filter(Property.id==property_id).first()
    if not prop: raise HTTPException(404, "Property not found")
    photo_url = ""; video_url = ""
    if photo and photo.filename:
        photo_url = upload_to_cloudinary(photo, folder="rentnear/reviews")
    if video and video.filename:
        video_url = upload_to_cloudinary(video, folder="rentnear/reviews")
    rev = Review(property_id=property_id, property_title=prop.title, reviewer_email=user.email, reviewer_name=user.full_name or user.email.split("@")[0], owner_email=prop.owner_email, rating=rating, comment=comment, pros=pros, cons=cons, photo=photo_url, video=video_url, created_at=datetime.now().isoformat())
    db.add(rev); db.commit(); db.refresh(rev); return rev

@app.get("/reviews")
def get_all_reviews(authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    if user.role=="landlord": revs = db.query(Review).filter(Review.owner_email==user.email).order_by(Review.created_at.desc()).all()
    else: revs = db.query(Review).filter(Review.reviewer_email==user.email).order_by(Review.created_at.desc()).all()
    return [{"id": r.id, "property_id": r.property_id, "property_title": r.property_title, "rating": r.rating, "comment": r.comment, "reviewer_email": r.reviewer_email, "owner_email": r.owner_email, "photo": r.photo, "video": r.video, "created_at": r.created_at} for r in revs]

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
    all_msgs = db.query(Message).filter(or_(Message.sender_email==user.email, Message.receiver_email==user.email)).order_by(Message.created_at.desc()).all()
    conv_dict = {}
    for m in all_msgs:
        other = m.receiver_email if m.sender_email == user.email else m.sender_email
        if other.lower() == user.email.lower(): continue
        prop_title = "General Chat"
        if m.property_id!=0:
            prop = db.query(Property).filter(Property.id==m.property_id).first()
            if prop: prop_title = prop.title
        key = other.lower()
        if key not in conv_dict:
            conv_dict[key] = {"other_email": other, "property_id": m.property_id, "property_title": prop_title, "last_message": m.message, "last_time": m.created_at, "unread": 0}
        if m.receiver_email == user.email and not m.is_read:
            conv_dict[key]["unread"] += 1
    return list(conv_dict.values())

@app.get("/messages/chat/{other_email}")
def get_chat_with_user(other_email: str, property_id: int = 0, authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    if other_email.lower() == user.email.lower(): return []
    q = db.query(Message).filter(or_((Message.sender_email==user.email) & (Message.receiver_email==other_email), (Message.sender_email==other_email) & (Message.receiver_email==user.email)))
    if property_id!=0:
        q = q.filter(Message.property_id==property_id)
    msgs = q.order_by(Message.created_at.asc()).all()
    db.query(Message).filter(Message.sender_email==other_email, Message.receiver_email==user.email, Message.is_read==False).update({"is_read": True})
    db.commit()
    return msgs

@app.post("/messages")
def send_message(payload: MessageCreate, authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    prop = None
    if payload.property_id: prop = db.query(Property).filter(Property.id==payload.property_id).first()
    msg = Message(property_id=payload.property_id, property_title=prop.title if prop else "", sender_email=user.email, receiver_email=payload.receiver_email, message=payload.message, is_read=False, created_at=datetime.now().isoformat())
    db.add(msg); db.commit(); db.refresh(msg); return msg

@app.post("/bookings")
def create_booking(property_id: int = Form(...), message: str = Form(""), check_in_date: str = Form(""), authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    if user.role != "renter": raise HTTPException(403, "Only renters can request bookings")
    prop = db.query(Property).filter(Property.id==property_id).first()
    if not prop: raise HTTPException(404, "Property not found")
    if prop.owner_email.lower() == user.email.lower():
        raise HTTPException(400, "You cannot book your own property")
    existing = db.query(Booking).filter(Booking.property_id==property_id, Booking.renter_email==user.email, Booking.status.in_(["Pending","Accepted"])).first()
    if existing:
        raise HTTPException(400, f"You already have a {existing.status} booking for this property")
    booking = Booking(property_id=property_id, property_title=prop.title, property_location=prop.location, renter_email=user.email, owner_email=prop.owner_email, message=message or f"Requesting to book {prop.title} from {check_in_date}", check_in_date=check_in_date, status="Pending")
    db.add(booking); db.commit(); db.refresh(booking)
    return booking

@app.get("/bookings")
def get_bookings(authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    if user.role == "landlord":
        return db.query(Booking).filter(Booking.owner_email==user.email).order_by(Booking.created_at.desc()).all()
    else:
        return db.query(Booking).filter(Booking.renter_email==user.email).order_by(Booking.created_at.desc()).all()

@app.put("/bookings/{booking_id}")
def update_booking_status(booking_id: int, status: str = Form(...), authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    booking = db.query(Booking).filter(Booking.id==booking_id).first()
    if not booking: raise HTTPException(404, "Booking not found")
    if status in ["Accepted","Rejected"]:
        if user.role != "landlord" or booking.owner_email.lower() != user.email.lower():
            raise HTTPException(403, "Only property owner can accept or reject bookings")
    if status == "Cancelled":
        if booking.renter_email.lower() != user.email.lower():
            raise HTTPException(403, "Only renter can cancel booking")
    booking.status = status
    booking.updated_at = datetime.now().isoformat()
    db.commit(); db.refresh(booking)
    return booking

@app.put("/bookings/{booking_id}/accept-and-bill")
def accept_booking_and_auto_bill(booking_id: int, authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    if user.role != "landlord": raise HTTPException(403, "Only property owners can accept bookings")
    booking = db.query(Booking).filter(Booking.id==booking_id).first()
    if not booking: raise HTTPException(404, "Booking not found")
    if booking.owner_email.lower() != user.email.lower(): raise HTTPException(403, "Not your booking")
    booking.status = "Accepted"
    booking.updated_at = datetime.now().isoformat()
    db.commit()
    prop = db.query(Property).filter(Property.id==booking.property_id).first()
    if prop:
        existing_bill = db.query(Payment).filter(Payment.property_id==booking.property_id, Payment.renter_email==booking.renter_email, Payment.status=="due").first()
        if not existing_bill:
            total = float(prop.price) + float(getattr(prop,"maintenance",1500) or 0) + float(getattr(prop,"electricity",1200) or 0) + float(getattr(prop,"water",300) or 0) + float(getattr(prop,"gas",400) or 0) + float(getattr(prop,"internet",500) or 0)
            bill = Payment(
                property_id=prop.id,
                property_title=prop.title,
                owner_email=booking.owner_email,
                renter_email=booking.renter_email,
                amount=total,
                base_rent=float(prop.price),
                maintenance=float(getattr(prop,"maintenance",1500) or 0),
                electricity=float(getattr(prop,"electricity",1200) or 0),
                water=float(getattr(prop,"water",300) or 0),
                extra_charges=float(getattr(prop,"gas",400) or 0) + float(getattr(prop,"internet",500) or 0),
                month=datetime.now().month,
                year=datetime.now().year,
                status="due",
                bill_number=f"BILL-{random.randint(100000,999999)}",
                due_date=(datetime.now()+timedelta(days=7)).isoformat(),
                created_at=datetime.now().isoformat(),
                notes=f"Rent: ₹{prop.price} | Maintenance: ₹{getattr(prop,'maintenance',1500)} | Electricity: ₹{getattr(prop,'electricity',1200)} | Water: ₹{getattr(prop,'water',300)} | Gas: ₹{getattr(prop,'gas',400)} | Internet/WiFi: ₹{getattr(prop,'internet',500)} | Check-in: {booking.check_in_date}"
            )
            db.add(bill); db.commit(); db.refresh(bill)
            return {"booking": booking, "bill": bill, "msg": "Booking accepted and first month bill generated with basic charges breakdown"}
    return {"booking": booking, "msg": "Booking accepted"}

@app.get("/properties/{prop_id}/is-booked")
def check_is_booked(prop_id: int, db=Depends(get_db)):
    booked = db.query(Booking).filter(Booking.property_id==prop_id, Booking.status=="Accepted").first()
    return {"is_booked": bool(booked), "booking": booked}

@app.get("/bookings/check/{property_id}")
def check_booking_status(property_id: int, authorization: Optional[str]=Header(None), db=Depends(get_db)):
    user = get_user_from_header(authorization, db)
    if not user: raise HTTPException(401, "Login required")
    accepted = db.query(Booking).filter(Booking.property_id==property_id, Booking.status=="Accepted").first()
    my_booking = db.query(Booking).filter(Booking.property_id==property_id, Booking.renter_email==user.email).order_by(Booking.created_at.desc()).first()
    return {"is_booked": bool(accepted), "accepted_booking": accepted, "my_booking": my_booking, "my_status": my_booking.status if my_booking else None, "booked_button": True if accepted else False, "show_book_now": False if accepted else True}

@app.post("/seed/reset")
def reset_seed(db=Depends(get_db)):
    db.query(Property).delete(); db.commit(); seed_db(); return {"msg": "Database reseeded with 20 professional properties", "login": "test@testgmail.com / 123456"}

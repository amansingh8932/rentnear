from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import models, database, auth
from pydantic import BaseModel
import os, shutil

# Create tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# Static folder for images - IMPORTANT: app banne ke BAAD
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserCreate(BaseModel):
    email: str
    password: str
    role: str = "tenant"

class UserLogin(BaseModel):
    email: str
    password: str

@app.post("/register")
def register(user: UserCreate, db: Session = Depends(database.get_db)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = models.User(
        email=user.email, 
        hashed_password=auth.get_password_hash(user.password), 
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"msg": "User created", "email": new_user.email, "role": new_user.role}

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    # Swagger username bhejta hai, hum email samajh ke check karenge
    db_user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not db_user or not auth.verify_password(form_data.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = auth.create_access_token(data={"sub": db_user.email})
    return {"access_token": token, "token_type": "bearer", "role": db_user.role}

@app.post("/properties")
def create_property(
    title: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    location: str = Form(...),
    image: UploadFile = File(None),
    current_user = Depends(auth.get_current_user), 
    db: Session = Depends(database.get_db)
):
    if current_user.role != "owner": 
        raise HTTPException(status_code=403, detail="Only owners can add property")
    
    image_url = None
    if image:
        file_path = f"uploads/{image.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        image_url = f"/uploads/{image.filename}"

    new_prop = models.Property(
        title=title, 
        description=description, 
        price=price, 
        location=location, 
        image_url=image_url, 
        owner_id=current_user.id
    )
    db.add(new_prop)
    db.commit()
    db.refresh(new_prop)
    return new_prop

@app.get("/properties")
def list_properties(db: Session = Depends(database.get_db)):
    return db.query(models.Property).all()

@app.get("/")
def root():
    return {"msg": "RentNear API running with Images"}
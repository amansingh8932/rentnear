from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models, database, auth
from pydantic import BaseModel

models.Base.metadata.create_all(bind=database.engine)
app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class UserCreate(BaseModel):
    email: str
    password: str
    role: str = "tenant"

class UserLogin(BaseModel):
    email: str
    password: str

class PropertyCreate(BaseModel):
    title: str
    description: str
    price: float
    location: str

@app.post("/register")
def register(user: UserCreate, db: Session = Depends(database.get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = models.User(email=user.email, hashed_password=auth.get_password_hash(user.password), role=user.role)
    db.add(new_user); db.commit(); db.refresh(new_user)
    return {"msg": "User created"}

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not auth.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = auth.create_access_token(data={"sub": db_user.email})
    return {"access_token": token, "token_type": "bearer", "role": db_user.role}

@app.post("/properties")
def create_property(prop: PropertyCreate, current_user = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if current_user.role != "owner": raise HTTPException(status_code=403, detail="Only owners can add property")
    new_prop = models.Property(**prop.dict(), owner_id=current_user.id)
    db.add(new_prop); db.commit(); db.refresh(new_prop)
    return new_prop

@app.get("/properties")
def list_properties(db: Session = Depends(database.get_db)):
    return db.query(models.Property).all()

@app.get("/")
def root(): return {"msg": "RentNear API running"}
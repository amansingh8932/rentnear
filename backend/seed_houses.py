import os, shutil, glob, sqlite3, uuid, json

# Yeh script jahan hai, usi folder se house_images dhoondhega
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = SCRIPT_DIR  # backend folder hi hai
DB_PATH = os.path.join(BASE_DIR, "rentnear.db")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

# house_images folder - zip se aayega, ya gallery folder se
POSSIBLE_IMAGE_DIRS = [
    os.path.join(SCRIPT_DIR, "house_images"),
    os.path.join(SCRIPT_DIR, "..", "house_images"),
    os.path.join(BASE_DIR, "house_images"),
    r"C:\Users\aman singh\OneDrive\Desktop\coding\project-rent\rentnear\backend\house_images",
    "/mnt/data/gallery"
]

IMAGE_DIR = None
images = []
for d in POSSIBLE_IMAGE_DIRS:
    d = os.path.abspath(d)
    if os.path.exists(d):
        found = glob.glob(os.path.join(d, "*.webp")) + glob.glob(os.path.join(d, "*.jpg")) + glob.glob(os.path.join(d, "*.png"))
        if found:
            IMAGE_DIR = d
            images = sorted(found)
            break

if not images:
    print("❌ No images found! Checked:")
    for d in POSSIBLE_IMAGE_DIRS:
        print(" -", d)
    print("\nSolution: Is script ko backend folder me rakho aur saath me 'house_images' folder bhi rakho")
    print("house_images folder me .webp images hone chahiye")
    exit(1)

print(f"✅ Found {len(images)} images in: {IMAGE_DIR}")

os.makedirs(UPLOAD_DIR, exist_ok=True)

# 10 houses data
houses = [
    {"title": "2BHK Modern Flat - Gomti Nagar", "location": "Patrakarpuram, Gomti Nagar", "price": 15000, "description": "2BHK semi-furnished, 2nd floor, parking, near City Mall. 1100 sqft, 2 balcony.", "contact": "9876543210"},
    {"title": "3BHK Luxury Villa - Indira Nagar", "location": "Indira Nagar, Sector 18", "price": 35000, "description": "3BHK independent villa with garden, modular kitchen, 24x7 water.", "contact": "9123456789"},
    {"title": "1BHK Cozy Studio - Hazratganj", "location": "Hazratganj, Near Sahu Cinema", "price": 9500, "description": "1BHK heritage look, modern interior, perfect for students.", "contact": "9988776655"},
    {"title": "3BHK Family Home - Alambagh", "location": "Alambagh, Near Phoenix Mall", "price": 18000, "description": "1300 sqft, 3 balconies, lift, 5 mins from metro.", "contact": "9001122334"},
    {"title": "2BHK Garden View - Patrakarpuram", "location": "Vineet Khand, Patrakarpuram", "price": 16500, "description": "2BHK with attached balcony garden, peaceful colony.", "contact": "9455667788"},
    {"title": "2BHK Nawabi Style - Chowk", "location": "Chowk, Near Akbari Gate", "price": 12000, "description": "Nawabi architecture with chikankari curtains, AC installed.", "contact": "9333444555"},
    {"title": "1BHK Student Flat - Aliganj", "location": "Aliganj, Sector E", "price": 7500, "description": "Budget 1BHK for students, study table, wifi.", "contact": "9112233445"},
    {"title": "4BHK Luxury Bungalow - Gomti Nagar Ext", "location": "Gomti Nagar Extension, Sector 7", "price": 60000, "description": "4BHK luxury bungalow with parking, garden, servant quarter.", "contact": "9888777666"},
    {"title": "2BHK Green Balcony - Mahanagar", "location": "Mahanagar, Near Gol Market", "price": 14000, "description": "2BHK with green balcony, good ventilation, family home.", "contact": "9223344556"},
    {"title": "Studio WFH - Sultanpur IT Park", "location": "Sultanpur Road, Near HCL IT City", "price": 11000, "description": "Studio ideal for IT professionals, work from home setup.", "contact": "9554433221"},
]

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Create table if needed for multi-image
try:
    cur.execute("SELECT images FROM properties LIMIT 1")
except:
    print("Creating new table for multi-image...")
    cur.execute("DROP TABLE IF EXISTS properties")
    cur.execute("""
    CREATE TABLE properties (
        id INTEGER PRIMARY KEY,
        title TEXT,
        location TEXT,
        price REAL,
        description TEXT,
        image_url TEXT,
        images TEXT DEFAULT '[]',
        contact TEXT DEFAULT '',
        owner_id INTEGER DEFAULT 1
    )
    """)
    conn.commit()

cur.execute("DELETE FROM properties")
conn.commit()

for idx, house in enumerate(houses):
    saved_urls = []
    for j in range(3):
        src_idx = (idx * 3 + j) % len(images)
        src_img = images[src_idx]
        ext = os.path.splitext(src_img)[1] or ".webp"
        new_name = f"house{idx+1}_{j+1}_{uuid.uuid4().hex[:6]}{ext}"
        dest_path = os.path.join(UPLOAD_DIR, new_name)
        shutil.copy(src_img, dest_path)
        saved_urls.append(f"/uploads/{new_name}")
    
    cur.execute("""
        INSERT INTO properties (title, location, price, description, image_url, images, contact, owner_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    """, (house["title"], house["location"], house["price"], house["description"], saved_urls[0], json.dumps(saved_urls), house["contact"]))

conn.commit()
count = cur.execute("SELECT COUNT(*) FROM properties").fetchone()[0]
conn.close()

print(f"✅ DONE! Added {count} houses with 3 images each = {count*3} photos")
print(f"📁 Uploads: {UPLOAD_DIR}")
print("Ab backend restart karo: python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000")

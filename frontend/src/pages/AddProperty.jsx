import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AddProperty() {
  const [form, setForm] = useState({ title: "", location: "", price: "", description: "", owner_phone: "9876543210" });
  const [image, setImage] = useState(null);
  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) { alert("Pehle login karo!"); nav("/login"); return; }

    const data = new FormData();
    data.append("title", form.title);
    data.append("location", form.location);
    data.append("price", form.price);
    data.append("description", form.description);
    data.append("owner_phone", form.owner_phone);
    data.append("image", image);

    const res = await fetch("http://127.0.0.1:8000/properties", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });
    if (res.ok) { alert("Property Added!"); nav("/"); } else alert("Failed - Login again");
  };

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", padding: 25, border: "1px solid #eee", borderRadius: 16 }}>
      <h2>Add New Property</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 15 }}>
        <input placeholder="Title e.g. 2BHK Gomti Nagar" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} required style={{ padding: 12, borderRadius: 8, border: "1px solid #ddd" }} />
        <input placeholder="Location e.g. Gomti Nagar, Lucknow" value={form.location} onChange={e=>setForm({...form, location:e.target.value})} required style={{ padding: 12, borderRadius: 8, border: "1px solid #ddd" }} />
        <input placeholder="Price" type="number" value={form.price} onChange={e=>setForm({...form, price:e.target.value})} required style={{ padding: 12, borderRadius: 8, border: "1px solid #ddd" }} />
        <input placeholder="Owner Phone" value={form.owner_phone} onChange={e=>setForm({...form, owner_phone:e.target.value})} style={{ padding: 12, borderRadius: 8, border: "1px solid #ddd" }} />
        <textarea placeholder="Description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} style={{ padding: 12, borderRadius: 8, border: "1px solid #ddd" }} />
        <input type="file" onChange={e=>setImage(e.target.files[0])} required accept="image/*" />
        <button type="submit" style={{ padding: 14, background: "#ff385c", color: "white", border: "none", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}>Add Property</button>
      </form>
    </div>
  );
}
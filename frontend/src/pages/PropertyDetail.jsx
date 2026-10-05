import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

export default function PropertyDetail() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/properties/${id}`)
      .then(r => r.json())
      .then(setP);
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure? Ye property permanently delete ho jayegi.")) return;
    const token = localStorage.getItem("token");
    const res = await fetch(`http://127.0.0.1:8000/properties/${p.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      alert("Property deleted ✅");
      navigate("/");
    } else {
      alert("Delete failed - Login again");
    }
  };

  if (!p) return <div style={{ padding: 60, textAlign: "center", color: "#6B7280" }}>Loading amazing place... 🏠</div>;

  return (
    <div style={{ maxWidth: 1100, margin: "auto", padding: "20px 24px", fontFamily: "Inter, sans-serif" }}>
      <Link to="/" style={{ textDecoration: "none", color: "#4B5563", fontWeight: 500, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6 }}>
        ← Back to Search
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: 32, marginTop: 20 }}>
        {/* LEFT */}
        <div>
          <div style={{ position: "relative" }}>
            <img
              src={`http://127.0.0.1:8000${p.image_url}`}
              alt={p.title}
              style={{ width: "100%", height: 480, objectFit: "cover", borderRadius: 20, border: "1px solid #E5E7EB" }}
            />
            <span style={{ position: "absolute", top: 16, left: 16, background: "white", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              ✨ Verified
            </span>
          </div>

          <div style={{ marginTop: 22 }}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>{p.title}</h1>
            <p style={{ marginTop: 8, color: "#6B7280", fontSize: 16, display: "flex", alignItems: "center", gap: 6 }}>
              📍 {p.location}
            </p>

            <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
              <span style={{ background: "#F3F4F6", padding: "6px 12px", borderRadius: 20, fontSize: 13, color: "#374151" }}>🏠 2BHK</span>
              <span style={{ background: "#F3F4F6", padding: "6px 12px", borderRadius: 20, fontSize: 13, color: "#374151" }}>🛁 2 Bath</span>
              <span style={{ background: "#F3F4F6", padding: "6px 12px", borderRadius: 20, fontSize: 13, color: "#374151" }}>📏 1200 sqft</span>
            </div>

            <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid #E5E7EB" }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#111827" }}>About this place</h3>
              <p style={{ marginTop: 10, lineHeight: 1.7, color: "#4B5563", fontSize: 15 }}>
                {p.description || "Spacious and well-ventilated property in prime location. Natural light, modular kitchen, near market, school and metro. Perfect for family & working professionals."}
              </p>
            </div>

            <div style={{ marginTop: 28 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#111827" }}>Location</h3>
              <div style={{ marginTop: 12, borderRadius: 16, overflow: "hidden", border: "1px solid #E5E7EB" }}>
                <iframe
                  title="map"
                  width="100%"
                  height="260"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(p.location + " Lucknow")}&z=14&output=embed`}
                ></iframe>
              </div>
              <p style={{ marginTop: 8, fontSize: 13, color: "#6B7280" }}>{p.location}, Lucknow - 2 mins from main road</p>
            </div>
          </div>
        </div>

        {/* RIGHT - Booking Card */}
        <div style={{ border: "1px solid #E5E7EB", borderRadius: 20, padding: 22, height: "fit-content", background: "white", boxShadow: "0 10px 40px rgba(0,0,0,0.06)", position: "sticky", top: 80 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#111827" }}>
              ₹{p.price} <span style={{ fontWeight: 400, fontSize: 14, color: "#6B7280" }}>/ month</span>
            </h2>
            <span style={{ fontSize: 13, color: "#10B981", fontWeight: 600 }}>● Available</span>
          </div>

          <div style={{ marginTop: 20, padding: 14, background: "#F8FAFC", borderRadius: 12, border: "1px solid #F1F5F9" }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#111827" }}>Owner Details</p>
            <p style={{ margin: "8px 0 0 0", fontSize: 15, color: "#111827", fontWeight: 500 }}>📞 {p.owner_phone || "98765 43210"}</p>
            <p style={{ margin: "4px 0 0 0", color: "#6B7280", fontSize: 12 }}>Usually responds in ~1 hour • Speaks Hindi, English</p>
          </div>

          <button
            onClick={() => window.open(`tel:${p.owner_phone || "9876543210"}`)}
            style={{
              background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
              color: "white",
              padding: "14px",
              border: "none",
              borderRadius: 12,
              width: "100%",
              marginTop: 20,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(79, 70, 229, 0.25)",
            }}
          >
            Contact Owner
          </button>

          <button
            style={{
              background: "white",
              color: "#111827",
              padding: "13px",
              border: "1px solid #E5E7EB",
              borderRadius: 12,
              width: "100%",
              marginTop: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            ♡ Save Property
          </button>

          {localStorage.getItem("token") && (
            <>
              <div style={{ marginTop: 18, borderTop: "1px solid #F1F5F9", paddingTop: 18 }}>
                <p style={{ margin: 0, fontSize: 12, color: "#6B7280", textAlign: "center", marginBottom: 10 }}>Owner actions</p>
                <button
                  onClick={handleDelete}
                  style={{
                    background: "#FEF2F2",
                    color: "#DC2626",
                    padding: "11px",
                    border: "1px solid #FECACA",
                    borderRadius: 10,
                    width: "100%",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  🗑️ Delete My Property
                </button>
              </div>
            </>
          )}

          <p style={{ marginTop: 16, fontSize: 11, color: "#9CA3AF", textAlign: "center" }}>No brokerage • Direct owner • RentNear protected</p>
        </div>
      </div>
    </div>
  );
} 
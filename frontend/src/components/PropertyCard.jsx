import { Link } from "react-router-dom";

export default function PropertyCard({ p }) {
  return (
    <Link to={`/property/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{
        border: "1px solid #E5E7EB",
        borderRadius: 18,
        overflow: "hidden",
        background: "white",
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        transition: "all 0.2s ease",
        cursor: "pointer"
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,0.10)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.05)";
      }}
      >
        <div style={{ position: "relative" }}>
          <img 
            src={`http://127.0.0.1:8000${p.image_url}`} 
            alt={p.title}
            style={{ width: "100%", height: 210, objectFit: "cover" }}
          />
          <span style={{ position: "absolute", top: 12, left: 12, background: "white", padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
            VERIFIED
          </span>
          <span style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.6)", color: "white", padding: "5px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            ₹{p.price}/mo
          </span>
        </div>

        <div style={{ padding: "14px 16px 16px 16px" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {p.title}
          </h3>
          <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#6B7280", display: "flex", alignItems: "center", gap: 4 }}>
            📍 {p.location}
          </p>
          
          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ background: "#F3F4F6", padding: "4px 8px", borderRadius: 8, fontSize: 11, color: "#374151" }}>2BHK</span>
              <span style={{ background: "#F3F4F6", padding: "4px 8px", borderRadius: 8, fontSize: 11, color: "#374151" }}>Furnished</span>
            </div>
            <span style={{ fontSize: 12, color: "#4F46E5", fontWeight: 600 }}>View →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
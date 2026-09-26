import { useEffect, useState } from "react"
const API = "http://127.0.0.1:8000"

export default function App() {
  const [properties, setProperties] = useState([])
  const [token, setToken] = useState(localStorage.getItem("token") || "")
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"))
  const [view, setView] = useState("home") // home | login | register | add
  const [search, setSearch] = useState("")
  const [form, setForm] = useState({ email: "", password: "", role: "owner" })
  const [propForm, setPropForm] = useState({ title: "", price: "", location: "Gomti Nagar, Lucknow", description: "" })
  const [file, setFile] = useState(null)

  const loadProps = async () => {
    try {
      const res = await fetch(`${API}/properties`)
      const data = await res.json()
      setProperties(data)
    } catch {}
  }

  useEffect(() => { loadProps() }, [])

  const handleAuth = async (type) => {
    try {
      let res
      if (type === "login") {
        // Backend OAuth2 - form data chahiye
        const fd = new URLSearchParams()
        fd.append("username", form.email)
        fd.append("password", form.password)
        res = await fetch(`${API}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: fd
        })
      } else {
        res = await fetch(`${API}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        })
      }

      const data = await res.json()
      if (!res.ok) {
        alert(JSON.stringify(data.detail || data, null, 2))
        return
      }

      if (type === "register") {
        alert("Registered! Ab login karo")
        setView("login")
        return
      }

      // login success
      localStorage.setItem("token", data.access_token)
      localStorage.setItem("user", JSON.stringify({ email: form.email }))
      setToken(data.access_token)
      setUser({ email: form.email })
      setView("home")
    } catch (e) {
      alert(e.message)
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!token) { alert("Pehle login karo"); setView("login"); return }
    if (!file) { alert("Image select karo"); return }

    const fd = new FormData()
    fd.append("title", propForm.title)
    fd.append("price", propForm.price)
    fd.append("location", propForm.location)
    fd.append("description", propForm.description)
    fd.append("image", file)

    const res = await fetch(`${API}/properties`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    })

    if (!res.ok) {
      const txt = await res.text()
      alert(txt)
      return
    }

    alert("Property added!")
    setView("home")
    setPropForm({ title: "", price: "", location: "Gomti Nagar, Lucknow", description: "" })
    setFile(null)
    loadProps()
  }

  const logout = () => {
    localStorage.clear()
    setToken("")
    setUser(null)
    setView("home")
  }

  const filtered = properties.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.location.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', background: "#f6f6f6", minHeight: "100vh" }}>
      {/* NAVBAR */}
      <nav style={{ background: "white", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", position: "sticky", top: 0, zIndex: 10 }}>
        <h3 style={{ margin: 0, cursor: "pointer" }} onClick={() => setView("home")}>RentNear - Lucknow 🏠</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input placeholder="Search location..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "7px 12px", borderRadius: 20, border: "1px solid #ccc", width: 150 }} />
          {!token? <>
            <button onClick={() => setView("login")} style={btn}>Login</button>
            <button onClick={() => setView("register")} style={{...btn, background: "#111", color: "#fff" }}>Register</button>
          </> : <>
            <span style={{ fontSize: 12 }}>{user?.email}</span>
            <button onClick={() => setView("add")} style={{...btn, background: "#111", color: "#fff" }}>+ Add</button>
            <button onClick={logout} style={btn}>Logout</button>
          </>}
        </div>
      </nav>

      <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
        {/* HOME */}
        {view === "home" && <>
          <h4 style={{ margin: "0 0 12px 0" }}>{filtered.length} Properties Found</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 }}>
            {filtered.map(p => (
              <div key={p.id} style={{ background: "white", borderRadius: 14, overflow: 'hidden', border: "1px solid #e9e9e9" }}>
                <img src={`${API}${encodeURI(p.image_url)}`} style={{ width: '100%', height: 180, objectFit: 'cover', background: "#eee" }} onError={e => e.target.src = "https://via.placeholder.com/400x250?text=No+Image"} />
                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{p.title}</div>
                  <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>₹{p.price}/mo • {p.location}</div>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && <p style={{ textAlign: "center", marginTop: 40, color: "#888" }}>No property found. Login karke + Add karo</p>}
        </>}

        {/* LOGIN / REGISTER */}
        {(view === "login" || view === "register") && (
          <div style={{ background: "white", padding: 24, borderRadius: 16, maxWidth: 360, margin: "30px auto", boxShadow: "0 4px 20px #0000000a" }}>
            <h3 style={{ marginTop: 0 }}>{view === "login"? "Login" : "Register as Owner"}</h3>
            <input placeholder="email - test@test.com" value={form.email} onChange={e => setForm({...form, email: e.target.value })} style={inp} />
            <input placeholder="password - 123456" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value })} style={inp} />
            <button onClick={() => handleAuth(view)} style={{...btn, background: "#111", color: "#fff", width: "100%", marginTop: 14, padding: "10px" }}>{view === "login"? "Login" : "Register"}</button>
            <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, cursor: "pointer", color: "#555" }} onClick={() => setView(view === "login"? "register" : "login")}>
              Switch to {view === "login"? "Register" : "Login"}
            </div>
          </div>
        )}

        {/* ADD PROPERTY */}
        {view === "add" && (
          <form onSubmit={handleAdd} style={{ background: "white", padding: 24, borderRadius: 16, maxWidth: 440, margin: "0 auto" }}>
            <h3 style={{ marginTop: 0 }}>Add New Property</h3>
            <input required placeholder="Title - 2BHK Gomti Nagar" value={propForm.title} onChange={e => setPropForm({...propForm, title: e.target.value })} style={inp} />
            <input required placeholder="Price - 15000" type="number" value={propForm.price} onChange={e => setPropForm({...propForm, price: e.target.value })} style={inp} />
            <input required placeholder="Location" value={propForm.location} onChange={e => setPropForm({...propForm, location: e.target.value })} style={inp} />
            <textarea placeholder="Description" value={propForm.description} onChange={e => setPropForm({...propForm, description: e.target.value })} style={{...inp, height: 70 }} />
            <input required type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} style={inp} />
            {file && <div style={{ fontSize: 12, marginTop: 6, color: "green" }}>Selected: {file.name}</div>}
            <button type="submit" style={{...btn, background: "#111", color: "#fff", width: "100%", marginTop: 14, padding: "10px" }}>Upload Property</button>
          </form>
        )}
      </div>
    </div>
  )
}

const btn = { padding: "7px 16px", borderRadius: 20, border: "1px solid #ddd", background: "white", cursor: "pointer", fontSize: 13 }
const inp = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", marginTop: 10, boxSizing: "border-box" }
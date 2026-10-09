
import { useEffect, useState } from "react"
const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"

const HOUSE_TYPES = [
  { id: "Flat", icon: "🏢", label: "Flat", color: "#2563eb", bg: "#eff6ff" },
  { id: "Independent House", icon: "🏠", label: "House", color: "#059669", bg: "#ecfdf5" },
  { id: "Villa", icon: "🏡", label: "Villa", color: "#0891b2", bg: "#ecfeff" },
  { id: "Builder Floor", icon: "🏘", label: "Floor", color: "#7c3aed", bg: "#f5f3ff" },
  { id: "PG", icon: "🛏", label: "PG", color: "#9333ea", bg: "#faf5ff" },
  { id: "Hostel", icon: "🎓", label: "Hostel", color: "#ea580c", bg: "#fff7ed" },
  { id: "Shop", icon: "🛍", label: "Shop", color: "#dc2626", bg: "#fef2f2" },
  { id: "Office", icon: "💼", label: "Office", color: "#4f46e5", bg: "#eef2ff" },
]

export default function App(){
  const [properties,setProperties]=useState([])
  const [token,setToken]=useState(localStorage.getItem("token")||"")
  const [userEmail,setUserEmail]=useState(localStorage.getItem("userEmail")||"")
  const [userRole,setUserRole]=useState(localStorage.getItem("userRole")||"renter")
  const safeParse = (key, fallback) => { try { const v = localStorage.getItem(key); if(!v || v==="undefined" || v==="null") return fallback; return JSON.parse(v); } catch { return fallback; } }
  const [userProfile,setUserProfile]=useState(safeParse("userProfile", null))
  const [view,setView]=useState("landing")
  const [tab,setTab]=useState("all")
  const [authMode,setAuthMode]=useState("login")
  const [search,setSearch]=useState("")
  const [filters,setFilters]=useState({ house_type:"All", bhk:"All", location:"All" })
  const [form,setForm]=useState({ email:"", password:"", role:"renter", full_name:"", phone:"", city:"Lucknow" })
  const [showPassword,setShowPassword]=useState(false)
  // EXTENDED propForm WITH BASIC CHARGES - NOT TOUCHING OLD FIELDS
  const [propForm,setPropForm]=useState({ title:"", price:"", location:"Gomti Nagar, Lucknow", description:"", contact:"", bhk:"2BHK", house_type:"Flat", furnishing:"Semi-Furnished", area_sqft:"", maintenance:"1500", deposit:"30000", facing:"East", electricity:"1200", water:"300", gas:"400", internet:"500", wifi:"500", other:"0" })
  const [files,setFiles]=useState([])
  const [photoPreviews,setPhotoPreviews]=useState([])
  const [mapLat,setMapLat]=useState("26.8467")
  const [mapLng,setMapLng]=useState("80.9462")
  const [selectedAmenities,setSelectedAmenities]=useState([])
  const [loading,setLoading]=useState(false)
  const [selectedProp,setSelectedProp]=useState(null)
  const [activeImg,setActiveImg]=useState(0)
  const [editingId,setEditingId]=useState(null)
  const [favorites,setFavorites]=useState(safeParse("favorites", []))
  const [toast,setToast]=useState({ show:false, msg:"", type:"success" })
  // CALCULATOR WITH ALL BASIC CHARGES
  const [calc,setCalc]=useState({ rent:15000, maintenance:1500, electricity:1200, water:300, gas:400, internet:500, wifi:500, other:0, deposit:30000, brokerage:15 })
  const [reviews,setReviews]=useState([])
  const [complaints,setComplaints]=useState([])
  const [showSidebar,setShowSidebar]=useState(true)
  const [reviewForm,setReviewForm]=useState({propertyId:"",rating:5,comment:"", photo:null, video:null, photoPreview:"", videoPreview:""})
  const [complaintForm,setComplaintForm]=useState({propertyId:"",type:"Maintenance",desc:"", photo:null, video:null, photoPreview:"", videoPreview:""})
  const [conversations,setConversations]=useState([])
  const [activeChat,setActiveChat]=useState(null)
  const [chatMessages,setChatMessages]=useState([])
  const [chatInput,setChatInput]=useState("")
  const [unreadCount,setUnreadCount]=useState(0)
  const [bookings,setBookings]=useState([])
  const [bookingForm,setBookingForm]=useState({check_in_date:new Date().toISOString().split('T')[0], message:""})
  const [bookingLoading,setBookingLoading]=useState(false)
  const [payments,setPayments]=useState([])
  const [bookedPropertyIds,setBookedPropertyIds]=useState([])

  const showToast=(msg,type="success")=>{ setToast({show:true, msg, type}); setTimeout(()=>setToast({show:false,msg:"",type:"success"}),3500) }
  const getHT=(id)=>HOUSE_TYPES.find(h=>h.id===id) || HOUSE_TYPES[0]

  const loadProps=async()=>{
    setLoading(true)
    let url=`${API}/properties?search=${encodeURIComponent(search)}`
    if(filters.bhk!=="All") url+=`&bhk=${encodeURIComponent(filters.bhk)}`
    if(filters.location!=="All") url+=`&location=${encodeURIComponent(filters.location)}`
    if(filters.house_type!=="All") url+=`&house_type=${encodeURIComponent(filters.house_type)}`
    if(tab==="my") url+=`&owner_only=true`
    const headers={}; if(token) headers["Authorization"]=`Bearer ${token}`
    try{ const res=await fetch(url,{headers}); const data=await res.json(); if(tab==="fav") setProperties(data.filter(p=>favorites.includes(p.id))); else if(["calc","payments","complaints","reviews","profile","messages","bookings"].includes(tab)) {} else setProperties(Array.isArray(data)?data:[]) }catch{ } setLoading(false)
  }
  const loadConversations = async () => {
    if(!token) return;
    try {
      const res = await fetch(`${API}/messages/conversations`, { headers: { Authorization: `Bearer ${token}` } });
      if(res.ok){
        let data = await res.json();
        data = data.filter(c => c.other_email && c.other_email.toLowerCase()!== userEmail.toLowerCase());
        const seen = new Map();
        data.forEach(c=>{ const key = `${c.other_email.toLowerCase()}|${c.property_id}`; if(!seen.has(key)) seen.set(key, c); });
        data = Array.from(seen.values());
        setConversations(data);
        setUnreadCount(data.reduce((s,c)=>s+(c.unread||0),0));
      }
    } catch {}
  };
  const loadChatMessages = async (other_email, property_id=0) => {
    if(!token ||!other_email) return;
    try {
      const url = property_id? `${API}/messages/chat/${other_email}?property_id=${property_id}` : `${API}/messages/chat/${other_email}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }});
      if(res.ok){ setChatMessages(await res.json()); loadConversations(); }
    } catch {}
  };
  const loadReviews = async () => { if(!token) return; try { const res = await fetch(`${API}/reviews`, { headers: { Authorization: `Bearer ${token}` }}); if(res.ok) setReviews(await res.json()); } catch {} };
  const loadBookings = async () => {
    if(!token) return;
    try { const res = await fetch(`${API}/bookings`, { headers: { Authorization: `Bearer ${token}` }}); if(res.ok){ const data=await res.json(); setBookings(data); setBookedPropertyIds(data.filter(b=>b.status==="Accepted").map(b=>b.property_id)); } } catch {}
  };
  const loadComplaints = async () => { if(!token) return; try { const res = await fetch(`${API}/complaints`, { headers: { Authorization: `Bearer ${token}` }}); if(res.ok) setComplaints(await res.json()); } catch {} };
  const loadPayments = async () => { if(!token) return; try { const res = await fetch(`${API}/payments`, { headers: { Authorization: `Bearer ${token}` }}); if(res.ok) setPayments(await res.json()); } catch {} };
  const isPropertyBooked = (propertyId) => bookedPropertyIds.includes(propertyId);
  const myBookingForProp = (propertyId) => bookings.find(b=>b.property_id===propertyId && b.renter_email.toLowerCase()===userEmail.toLowerCase());
    const sendChatMessage = async () => {
    if(!chatInput.trim() ||!activeChat) return;
    try {
      const res = await fetch(`${API}/messages`, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }, body: JSON.stringify({ property_id: activeChat.property_id||0, receiver_email: activeChat.other_email, message: chatInput }) });
      if(res.ok){ 
        const newMsg = await res.json();
        setChatMessages(prev=>[...prev, newMsg]); 
        setChatInput(""); 
        loadConversations(); 
      }
    } catch { showToast("Failed to send message","error"); }
  };
  const startChatWithOwner = (property) => {
    if(!token || userEmail.includes("demo.renter")){ showToast("Please login to message owner","info"); setView("auth"); setAuthMode("login"); return }
    if(property.owner_email.toLowerCase()===userEmail.toLowerCase()){ showToast("You own this property","info"); return }
    setActiveChat({ other_email: property.owner_email, property_id: property.id, property_title: property.title });
    setChatMessages([]); loadChatMessages(property.owner_email, property.id); setTab("messages");
  };

  useEffect(()=>{ if(view==="home" &&!["calc","payments","complaints","reviews","profile","messages","bookings"].includes(tab)) loadProps() },[search,filters,tab,favorites.length,view])
  useEffect(()=>localStorage.setItem("favorites",JSON.stringify(favorites)),[favorites])
  useEffect(()=>{ if(token && view==="home"){ loadConversations(); loadReviews(); loadComplaints(); loadBookings(); loadPayments(); } },[token, view])
  useEffect(()=>{
    if(token && tab==="messages"){
      loadConversations();
      const interval = setInterval(()=>{ loadConversations(); if(activeChat) loadChatMessages(activeChat.other_email, activeChat.property_id); }, 4000);
      return ()=>clearInterval(interval);
    }
  },[activeChat, token, tab]);

  const handleRegister=async()=>{ if(!form.full_name||!form.email){ showToast("Full name and email are required","error"); return } setLoading(true); try{ const res=await fetch(`${API}/auth/register-professional`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:form.email,phone:form.phone,password:form.password||"pro123",role:form.role,full_name:form.full_name,location_city:form.city,auth_provider:"email"})}); const d=await res.json(); if(!res.ok){ showToast(d.detail,"error"); setLoading(false); return } localStorage.setItem("token",d.access_token); localStorage.setItem("userEmail",d.email); localStorage.setItem("userRole",d.role); localStorage.setItem("userProfile",JSON.stringify(d.profile)); setToken(d.access_token); setUserEmail(d.email); setUserRole(d.role); setUserProfile(d.profile); setView("home"); setTab("all"); showToast(`Welcome, ${d.full_name}!`) }catch{ showToast("Registration failed","error") } setLoading(false) }
  const handleLogin=async()=>{ if(!form.email||!form.password){ showToast("Email and password required","error"); return } setLoading(true); try{ const fd=new URLSearchParams(); fd.append("username",form.email); fd.append("password",form.password); const res=await fetch(`${API}/login`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:fd}); const d=await res.json(); if(!res.ok){ showToast(d.detail,"error"); setLoading(false); return } localStorage.setItem("token",d.access_token); localStorage.setItem("userEmail",d.email); localStorage.setItem("userRole",d.role); localStorage.setItem("userProfile",JSON.stringify(d.profile)); setToken(d.access_token); setUserEmail(d.email); setUserRole(d.role); setUserProfile(d.profile); setView("home"); setTab("all"); showToast(`Welcome back, ${d.full_name}`) }catch{ showToast("Login failed","error") } setLoading(false) }

  const handleAdd=async(e)=>{
    e.preventDefault(); if(userRole!=="landlord"){ showToast("Only property owners can list properties","error"); return }
    setLoading(true)
    const fd=new FormData(); Object.entries(propForm).forEach(([k,v])=> fd.append(k, v||""));
    fd.append("amenities", JSON.stringify(selectedAmenities)); fd.append("nearby_places", JSON.stringify([])); fd.append("extra_details", JSON.stringify({latitude:mapLat,longitude:mapLng})); fd.append("latitude", mapLat); fd.append("longitude", mapLng);
    fd.append("maintenance", propForm.maintenance); fd.append("electricity", propForm.electricity); fd.append("water", propForm.water); fd.append("gas", propForm.gas); fd.append("internet", propForm.internet); fd.append("wifi_charges", propForm.wifi); fd.append("other", propForm.other||"0");
    for(let f of files) fd.append("images", f)
    try{
      const url=editingId?`${API}/properties/${editingId}`:`${API}/properties`;
      const method=editingId?"PUT":"POST";
      const res=await fetch(url,{method,headers:{Authorization:`Bearer ${token}`},body:fd});
      if(!res.ok) throw new Error();
      showToast(editingId?"Property updated successfully":`${propForm.house_type} listed successfully`);
      setView("home"); setTab("my"); setEditingId(null); setFiles([]); setPhotoPreviews([]); setSelectedAmenities([]); loadProps();
    }catch{ showToast("Saved locally - backend may be offline","error"); setView("home"); setTab("my"); } finally{ setLoading(false) }
  }

  const payInvoice=async(id)=>{
    try{
      const res=await fetch(`${API}/payments/${id}/pay`,{method:"POST",headers:{Authorization:`Bearer ${token}`}});
      if(res.ok){ showToast("Payment successful"); loadPayments(); } else { const err=await res.json(); showToast(err.detail||"Payment failed","error"); }
    }catch{ showToast("Payment failed - please try again","error"); }
  };
  const downloadInvoice=(bill)=>{const w=window.open("","_blank"); w.document.write(`<html><head><title>${bill.bill_number}</title></head><body style="font-family:Inter;padding:20px"><h2>${bill.bill_number}</h2><p>Property: ${bill.property_title}</p><p>Tenant: ${bill.renter_email}</p><p>Owner: ${bill.owner_email}</p><p style="white-space:pre-wrap">${bill.notes||""}</p><h3>Total Due: ₹${bill.amount}</h3><p>Status: ${bill.status}</p><p>Due: ${bill.due_date}</p></body></html>`); w.document.close(); setTimeout(()=>w.print(),500)};

  const submitReview=async()=>{
    if(!reviewForm.propertyId){showToast("Please select a property","error");return}
    if(!reviewForm.comment || reviewForm.comment.length<10){showToast("Please write at least 10 characters","error");return}
    setLoading(true);
    try {
      const fd=new FormData();
      fd.append("property_id", reviewForm.propertyId);
      fd.append("rating", reviewForm.rating);
      fd.append("comment", reviewForm.comment);
      fd.append("pros", ""); fd.append("cons", "");
      if(reviewForm.photo) fd.append("photo", reviewForm.photo);
      if(reviewForm.video) fd.append("video", reviewForm.video);
      const res=await fetch(`${API}/reviews`,{method:"POST",headers:{Authorization:`Bearer ${token}`},body:fd});
      if(!res.ok){ const err=await res.json(); throw new Error(err.detail); }
      showToast("Review submitted successfully"); setReviewForm({propertyId:"",rating:5,comment:"", photo:null, video:null, photoPreview:"", videoPreview:""}); loadReviews();
    } catch(e){ showToast(e.message||"Failed to submit review","error"); } finally { setLoading(false); }
  };

  const submitComplaint=async()=>{
    if(!complaintForm.propertyId){showToast("Please select a property","error");return}
    if(!complaintForm.desc || complaintForm.desc.length<5){showToast("Please describe the issue","error");return}
    setLoading(true);
    try {
      const fd=new FormData();
      fd.append("property_id", complaintForm.propertyId);
      fd.append("title", complaintForm.type);
      fd.append("description", complaintForm.desc);
      fd.append("category", complaintForm.type);
      fd.append("priority", "medium");
      if(complaintForm.photo) fd.append("photo", complaintForm.photo);
      if(complaintForm.video) fd.append("video", complaintForm.video);
      const res=await fetch(`${API}/complaints`,{method:"POST",headers:{Authorization:`Bearer ${token}`},body:fd});
      if(!res.ok) throw new Error();
      showToast("Complaint raised successfully - owner will be notified"); setComplaintForm({propertyId:"",type:"Maintenance",desc:"", photo:null, video:null, photoPreview:"", videoPreview:""}); loadComplaints();
    } catch { showToast("Failed to raise complaint","error"); } finally { setLoading(false); }
  };

  const updateComplaintStatus = async (id, status) => {
    try{
      const fd=new FormData(); fd.append("status", status);
      const res=await fetch(`${API}/complaints/${id}`,{method:"PUT",headers:{Authorization:`Bearer ${token}`},body:fd});
      if(res.ok){ showToast(`Complaint marked as ${status}`); loadComplaints(); }
    }catch{ showToast("Failed to update","error"); }
  };

  const createBooking = async (prop) => {
    if(!token || userEmail.includes("demo.renter")){ showToast("Please login as renter to book - redirecting to login","info"); setView("auth"); setAuthMode("login"); return; }
    if(userRole!=="renter"){ showToast("Only renters can request bookings - please login as renter","error"); setView("auth"); return; }
    if(prop.owner_email.toLowerCase()===userEmail.toLowerCase()){ showToast("You cannot book your own property","info"); return; }
    if(!bookingForm.check_in_date){ showToast("Please select check-in date","error"); return; }
    setBookingLoading(true);
    try {
      const fd=new FormData();
      fd.append("property_id", prop.id);
      fd.append("message", bookingForm.message||`Hello, I would like to book ${prop.title} from ${bookingForm.check_in_date}. Please let me know next steps.`);
      fd.append("check_in_date", bookingForm.check_in_date);
      const res=await fetch(`${API}/bookings`,{method:"POST",headers:{Authorization:`Bearer ${token}`},body:fd});
      const data=await res.json();
      if(!res.ok){ throw new Error(data.detail||"Booking failed"); }
      showToast(`Booking request sent to owner successfully`);
      loadBookings();
      setTab("bookings");
    } catch(e){ showToast(e.message||"Booking failed","error"); } finally { setBookingLoading(false); }
  };

  const updateBookingStatus = async (id, status) => {
    if(!confirm(`${status} this booking request?`)) return;
    try {
      if(status==="Accepted"){
        const res=await fetch(`${API}/bookings/${id}/accept-and-bill`,{method:"PUT",headers:{Authorization:`Bearer ${token}`}});
        if(res.ok){ 
          const d=await res.json();
          showToast(`Booking accepted and bill ${d.bill?.bill_number||""} generated`); 
          loadBookings(); loadPayments();
          return;
        }
      }
      const fd=new FormData(); fd.append("status", status);
      const res=await fetch(`${API}/bookings/${id}`,{method:"PUT",headers:{Authorization:`Bearer ${token}`},body:fd});
      if(!res.ok) throw new Error();
      showToast(`Booking ${status.toLowerCase()} successfully`);
      loadBookings();
    } catch { showToast("Failed to update booking","error"); }
  };

  const handleEdit=(p)=>{
    if(p.owner_email.toLowerCase()!==userEmail.toLowerCase()){ showToast("You can only edit your own properties","error"); return }
    setPropForm({title:p.title||"",price:p.price||"",location:p.location||"Gomti Nagar, Lucknow",description:p.description||"",contact:p.contact||"",bhk:p.bhk||"2BHK",house_type:p.house_type||"Flat",furnishing:p.furnishing||"Semi-Furnished",area_sqft:p.area_sqft||"",maintenance:p.maintenance||1500,deposit:p.deposit||30000,facing:p.facing||"East", electricity:p.electricity||1200, water:p.water||300, gas:p.gas||400, internet:p.internet||500, wifi:p.wifi_charges||500, other:p.other||p.extra_charges||0});
    setMapLat(p.latitude||"26.8467"); setMapLng(p.longitude||"80.9462");
    setSelectedAmenities(p.amenities||[]); setPhotoPreviews(p.images||[]);
    setEditingId(p.id); setView("add");
  };
  const handleDelete=async(p)=>{
    if(!confirm(`Delete ${p.title}? This action cannot be undone.`)) return;
    try{ const res=await fetch(`${API}/properties/${p.id}`,{method:"DELETE",headers:{Authorization:`Bearer ${token}`}}); if(!res.ok) throw new Error(); setProperties(properties.filter(x=>x.id!==p.id)); showToast("Property deleted successfully"); }catch{ showToast("Delete failed","error"); }
  };

  return (
    <div>
      <style>{`
* { box-sizing: border-box; }
html, body { margin:0; padding:0; overflow-x:hidden; width:100%; }
#root { width:100%; max-width:100vw; overflow-x:hidden; }
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,700&family=Inter:wght@400;600;700&display=swap');.serif{font-family:Fraunces,serif}.display{font-family:Fraunces,serif}
.laptop-card{animation:popIn 0.4s ease forwards; transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);}
@keyframes popIn{0%{transform:scale(0.92) translateY(8px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}

/* LAPTOP FIT - 13" 14" 15" - NO LOGIC CHANGE, ONLY LOOK */
@media (max-width: 1440px) and (min-width: 1024px) {
  /* Main grid - 3 cards per row on laptop instead of 4, fits nice */
  .laptop-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 16px !important; }
}
@media (max-width: 1280px) and (min-width: 1024px) {
  .laptop-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 14px !important; }
}
@media (max-width: 1100px) {
  .laptop-grid { grid-template-columns: repeat(2, 1fr) !important; }
}
/* Sidebar static width laptop */
.laptop-sidebar { width: 260px !important; }
.laptop-main { flex: 1; min-width: 0; max-width: calc(100vw - 260px); }
/* Detail page fit laptop */
.laptop-detail { grid-template-columns: 1.1fr 0.9fr !important; }
@media (max-width: 1200px) {
  .laptop-detail { grid-template-columns: 1fr !important; }
}
/* Ensure cards don't overflow */
.laptop-card img { max-width: 100%; }
/* Top bar search input fit */
@media (max-width: 1280px) {
  .laptop-search { width: 160px !important; }
}
/* Sidebar scroll inside - fixed bar */
.menu-scroll::-webkit-scrollbar { width: 4px; }
.menu-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
.menu-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent; }

/* Landing page fit laptop */
@media (max-width: 1280px) {
  .laptop-landing-grid { grid-template-columns: 1fr 0.9fr !important; gap: 20px !important; }
}
`}</style>
      {toast.show && <div style={{position:"fixed",top:16,right:16,background:toast.type==="error"?"#dc2626":"#1a1a2e",color:"white",padding:"12px 18px",borderRadius:100,fontSize:13,zIndex:100,boxShadow:"0 8px 24px rgba(0,0,0,0.15)"}}>{toast.msg}</div>}

      {view==="landing" && (
        <div style={{ minHeight:"100vh", background:"#FFFBF5" }}>
          <div style={{ maxWidth:1100, margin:"0 auto", padding:"20px 24px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}><div style={{ width:36, height:36, borderRadius:12, background:"#1a1a2e", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontFamily:"Fraunces" }}>R</div><div style={{ fontWeight:800 }}>RentNear</div></div>
              <button onClick={()=>{setView("auth"); setAuthMode("login")}} style={{ padding:"10px 20px", borderRadius:100, border:"none", background:"#1a1a2e", color:"white", fontWeight:700, cursor:"pointer" }}>Log in</button>
            </div>
            <div className="laptop-landing-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:40, alignItems:"center", padding:"40px 0" }}>
              <div>
                <div style={{ display:"inline-flex", background:"white", border:"1px solid #E6DDD0", padding:"6px 12px", borderRadius:100, fontSize:10, fontWeight:700, letterSpacing:"0.08em", color:"#9a8c7e" }}>TRUSTED IN LUCKNOW • 20+ VERIFIED LISTINGS</div>
                <h1 className="display" style={{ fontSize:52, lineHeight:0.95, fontWeight:400, color:"#1a1a2e", margin:"20px 0 0" }}>Search<br/>gently,<br/>live<br/><span style={{ color:"#E07A5F", fontStyle:"italic" }}>kindly.</span></h1>
                <p style={{ marginTop:16, fontSize:15, color:"#6b5e4f", lineHeight:1.6, maxWidth:420 }}>Find verified homes in Gomti Nagar, Indira Nagar, Hazratganj & more. Transparent pricing with basic charges, maps for renters,  secure payments.</p>
                <div style={{ marginTop:24, display:"flex", gap:10 }}><button onClick={()=>{setView("auth"); setAuthMode("signup")}} style={{ padding:"14px 28px", borderRadius:100, border:"none", background:"#1a1a2e", color:"white", fontWeight:700, cursor:"pointer" }}>Find my home →</button><button onClick={()=>{ localStorage.setItem("userRole","renter"); localStorage.setItem("userEmail","demo.renter@rentnear.com"); setUserRole("renter"); setUserEmail("demo.renter@rentnear.com"); setToken(""); setView("home"); setTab("all"); showToast("Exploring as demo renter - login to book"); }} style={{ padding:"14px 24px", borderRadius:100, border:"1px solid #E6DDD0", background:"white", fontWeight:600, cursor:"pointer" }}>Explore listings</button></div>
                <div style={{marginTop:20,fontSize:12,color:"#9a8c7e"}}></div>
              </div>
              <div style={{ position:"relative", height:460 }}>
                <div style={{ position:"absolute", left:0, top:0, width:280, background:"white", borderRadius:20, padding:14, border:"1px solid #F0E9DC", boxShadow:"0 12px 30px rgba(0,0,0,0.06)", transform:"rotate(-2deg)" }}>
                  <div style={{ height:160, background:"#F4F1DE", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:40 }}>🏢</div>
                  <div style={{ fontWeight:700, fontSize:13, marginTop:10 }}>2BHK Premium - Gomti Nagar</div>
                  <div style={{ fontSize:11, color:"#9a8c7e", marginTop:4 }}>Rent ₹18,500 + Maint ₹1,800 + Elec ₹1,500 + Map</div>
                </div>
                <div style={{ position:"absolute", left:80, bottom:20, width:300, background:"#1a1a2e", borderRadius:16, padding:16, color:"#FFFBF5" }}>
                  <div style={{ fontSize:11, color:"#E07A5F", fontWeight:700 }}>VERIFIED RENTER • </div>
                  <p className="serif" style={{ margin:"12px 0 0", fontSize:15, fontStyle:"italic" }}>"Bills show gas, wifi, electricity breakdown. Map helped me find the exact lane."</p>
                  <div style={{ marginTop:12, fontSize:11, color:"rgba(255,251,245,0.6)" }}>— Aman Singh, Indira Nagar</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {view==="auth" && (
        <div style={{ minHeight:"100vh", display:"grid", gridTemplateColumns:"1fr 1fr", background:"#FFFBF5" }}>
          <div className="auth-left-fill" style={{ background:"#F4F1DE", position:"relative", padding:40, display:"flex", flexDirection:"column", justifyContent:"space-between", overflow:"hidden", borderRight:"1px solid #E6DDD0" }}>
            <div style={{ position:"relative" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:"#1a1a2e", display:"flex", alignItems:"center", justifyContent:"center", color:"#FFFBF5", fontWeight:800, fontFamily:"Fraunces" }}>R</div>
                <div><div style={{ fontWeight:800, color:"#1a1a2e" }}>RentNear</div><div style={{ fontSize:10, color:"#9a8c7e", letterSpacing:"0.08em" }}>20 VERIFIED HOMES • ROLE-BASED • MAPS</div></div>
              </div>
            </div>
            <div style={{ position:"relative" }}>
              <h1 className="display" style={{ fontSize:80, lineHeight:1, fontWeight:500, color:"#1a1a2e", margin:"20px 0 0" }}>Home is<br/><span style={{ color:"#E07A5F", fontStyle:"italic" }}>not a checklist.</span><br/>It's a feeling<br/>you come<br/>back to.</h1>
              <p style={{marginTop:100,fontSize:13,color:"#6b5e4f"}}></p>
            </div>
          </div>
          <div style={{ background:"#FFFBF5", padding:28, display:"flex", flexDirection:"column" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <button onClick={()=>setView("landing")} style={{ background:"white", border:"1px solid #E6DDD0", color:"#6b5e4f", fontSize:12, cursor:"pointer", padding:"8px 14px", borderRadius:100 }}>← Back</button>
              <div style={{ fontSize:12, color:"#9a8c7e" }}>{authMode==="login"? "New here? " : "Have an account? "}<button onClick={()=>setAuthMode(authMode==="login"? "signup" : "login")} style={{ background:"transparent", border:"none", color:"#1a1a2e", fontWeight:700, cursor:"pointer", fontSize:12, textDecoration:"underline" }}>{authMode==="login"? "Create account" : "Log in"}</button></div>
            </div>
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:"100%", maxWidth:380 }}>
                <h2 className="serif" style={{ fontSize:30, fontWeight:700, margin:0, color:"#1a1a2e" }}>{authMode==="login"? "Welcome back" : "Create your account"}</h2>
                <div style={{ display:"grid", gap:12, marginTop:20 }}>
                  {authMode==="signup" && (<><div><label style={labelWarm}>Full name</label><input value={form.full_name} onChange={e=>setForm({...form, full_name:e.target.value})} placeholder="Your name" style={inputWarm} /></div><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}><div><label style={labelWarm}>I am</label><div style={{ display:"flex", gap:6, marginTop:6 }}><button onClick={()=>setForm({...form, role:"renter"})} style={{ flex:1, padding:"10px", borderRadius:10, border: form.role==="renter"? "1.5px solid #1a1a2e" : "1px solid #E6DDD0", background: form.role==="renter"? "#1a1a2e" : "white", color: form.role==="renter"? "white" : "#6b5e4f", fontSize:12, fontWeight:600, cursor:"pointer" }}>Renter</button><button onClick={()=>setForm({...form, role:"landlord"})} style={{ flex:1, padding:"10px", borderRadius:10, border: form.role==="landlord"? "1.5px solid #1a1a2e" : "1px solid #E6DDD0", background: form.role==="landlord"? "#1a1a2e" : "white", color: form.role==="landlord"? "white" : "#6b5e4f", fontSize:12, fontWeight:600, cursor:"pointer" }}>Owner</button></div></div><div><label style={labelWarm}>City</label><input value={form.city} onChange={e=>setForm({...form, city:e.target.value})} style={inputWarm} /></div></div></>)}
                  <div><label style={labelWarm}>Email</label><input value={form.email} onChange={e=>setForm({...form, email:e.target.value})} placeholder="you@example.com" style={inputWarm} /></div>
                  <div><label style={labelWarm}>Password</label><input type={showPassword? "text" : "password"} value={form.password} onChange={e=>setForm({...form, password:e.target.value})} placeholder="••••••••" style={inputWarm} /></div>
                  {authMode==="signup" && <div><label style={labelWarm}>Phone</label><input value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} placeholder="98765 43210" style={inputWarm} /></div>}
                  <button onClick={authMode==="login"? handleLogin : handleRegister} disabled={loading} style={{ marginTop:4, width:"100%", padding:"14px", borderRadius:100, border:"none", background:"#1a1a2e", color:"#FFFBF5", fontWeight:700, fontSize:14, cursor:"pointer" }}>{loading? "Please wait..." : authMode==="login"? "Log in →" : "Create account →"}</button>
                  <div style={{fontSize:11,color:"#9a8c7e",textAlign:"center",marginTop:8}}> </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {view==="home" && (
        <div style={{ display:"flex", minHeight:"100vh", background:"#FFFBF5", width:"100%", maxWidth:"100vw", overflowX:"hidden" }}>
          <div className="laptop-sidebar" style={{
            width: 280, minWidth:280, maxWidth:280,
            background:"linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)",
            flexShrink:0, position:"fixed", top:0, left:0, height:"100vh",
            borderRight:"1px solid rgba(255,255,255,0.07)", boxShadow:"6px 0 32px rgba(0,0,0,0.25)",
            zIndex:20, overflow:"hidden", display:"flex", flexDirection:"column"
          }}>
            <div style={{ width:"100%", padding:"22px 14px", height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 8px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:14, background:"linear-gradient(135deg, #FFFBF5 0%, #F4F1DE 100%)", color:"#1a1a2e", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontFamily:"Fraunces", fontSize:19, boxShadow:"0 6px 16px rgba(255,251,245,0.25)" }}>R</div>
                  <div><div style={{ fontWeight:800, fontSize:16, letterSpacing:"-0.02em", color:"#FFFBF5" }}>RentNear</div><div style={{ fontSize:11, color:"rgba(255,251,245,0.45)", letterSpacing:"0.08em", textTransform:"uppercase" }}>{userRole} • 20 homes</div></div>
                </div>
                <div style={{width:32}}></div>
              </div>
              <div style={{ marginTop:28, flex:1, overflowY:"auto", overflowX:"hidden", paddingRight:4 }} className="menu-scroll">
                <div style={{ fontSize:10, letterSpacing:"0.14em", color:"rgba(255,251,245,0.28)", fontWeight:700, marginBottom:14, paddingLeft:12 }}>MENU • </div>
                <div style={{ display:"grid", gap:5 }}>
                  {[
                    { id:"all", icon:"🏠", label:"Explore", desc:"20 verified homes with maps" },
                   ...(userRole==="landlord"? [{ id:"my", icon:"📋", label:"My listings", desc:"Your properties" }] : []),
                    { id:"fav", icon:"❤", label:"Favorites", desc: favorites.length? `${favorites.length} saved` : "No saved homes" },
                    { id:"bookings", icon:"📅", label:"Bookings", desc: bookings.filter(b=>b.status==="Pending").length? `${bookings.filter(b=>b.status==="Pending").length} pending requests` : "No pending requests", hasDot: bookings.filter(b=>b.status==="Pending").length>0, dotColor:"#f59e0b" },
                    { id:"calc", icon:"🧮", label:"Calculator", desc:"With gas, wifi, electricity" },
                    { id:"messages", icon:"💬", label:"Messages", desc: `${conversations.length? `${conversations.length} chats` : "No chats"}${unreadCount?` • ${unreadCount} new`:''}`, hasDot: unreadCount>0, dotColor:"#ef4444" },
                    { id:"payments", icon:"💳", label:"Bills & Payments", desc: payments.length? `${payments.length} ${payments.length===1?"bill":"bills"}${payments.filter(p=>p.status.toLowerCase()==="due").length? ` • ${payments.filter(p=>p.status.toLowerCase()==="due").length} due` : ""}` : "No bills yet", hasDot: payments.filter(p=>p.status.toLowerCase()==="due").length>0, dotColor:"#22c55e" },
                    { id:"reviews", icon:"⭐", label:"Reviews", desc: reviews.length? `${reviews.length} reviews` : "No reviews yet" },
                    { id:"complaints", icon:"⚠", label:"Complaints", desc: complaints.length? `${complaints.length} complaints` : "No complaints" },
                    { id:"profile", icon:"👤", label:"Profile", desc:userEmail.split("@")[0] },
                  ].map(m=>(
                    <button key={m.id} onClick={()=>{setTab(m.id); if(m.id==="messages") loadConversations(); if(m.id==="reviews") loadReviews(); if(m.id==="complaints") loadComplaints(); if(m.id==="bookings") loadBookings(); if(m.id==="payments") loadPayments();}}
                      style={{
                        width:"100%", display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:14, border:"none",
                        background: tab===m.id? "linear-gradient(135deg, rgba(255,251,245,0.14) 0%, rgba(255,251,245,0.06) 100%)" : "transparent",
                        color: tab===m.id? "#FFFBF5" : "rgba(255,251,245,0.68)", cursor:"pointer", textAlign:"left",
                        boxShadow: tab===m.id? "0 8px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.12)" : "none",
                      }}>
                      <div style={{ width:36, height:36, borderRadius:11, background: tab===m.id? "#FFFBF5" : "rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{m.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:13.5, display:"flex", alignItems:"center", gap:8 }}>{m.label}{m.hasDot && <span style={{width:8,height:8,borderRadius:100,background:m.dotColor, boxShadow:`0 0 10px ${m.dotColor}`, display:"inline-block"}}></span>}</div>
                        <div style={{ fontSize:10.5, opacity:0.55, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop:12, display:"grid", gap:5 }}>
                {/* Logout button same size as menu */}
                <button onClick={()=>{localStorage.clear(); setToken(""); setView("landing")}} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:14, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.04)", color:"rgba(255,251,245,0.7)", cursor:"pointer", textAlign:"left" }}>
                  <div style={{ width:36, height:36, borderRadius:11, background:"rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🚪</div>
                  <div style={{ flex:1 }}><div style={{ fontWeight:700, fontSize:13.5 }}>Logout</div><div style={{ fontSize:10.5, opacity:0.55 }}>{userEmail.split("@")[0]}</div></div>
                </button>
              </div>
              <div style={{ marginTop:"auto", paddingTop:18, borderTop:"1px solid rgba(255,251,245,0.08)" }}>
                <div style={{fontSize:10,color:"rgba(255,251,245,0.35)",paddingLeft:8}}>Logged in as {userRole}<br/>{userEmail}</div>
              </div>
            </div>
          </div>

          <div className="laptop-main" style={{ flex:1, minWidth:0, marginLeft:280, width:"calc(100% - 280px)" }}>
            <div style={{ background:"white", borderBottom:"1px solid #F0E9DC", padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}><div><div style={{ fontWeight:800 }}>RentNear • Lucknow</div><div style={{ fontSize:11, color:"#9a8c7e" }}>20+ verified homes • Maps for renters • bills</div></div></div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}><input className="laptop-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search Gomti Nagar, Hazratganj..." style={{ padding:"8px 12px", borderRadius:100, border:"1px solid #E6DDD0", fontSize:12, width:200 }} />{userRole==="landlord" && <button onClick={()=>{setView("add"); setEditingId(null)}} style={{ padding:"8px 16px", borderRadius:100, border:"none", background:"#1a1a2e", color:"white", fontWeight:700, fontSize:12, cursor:"pointer" }}>+ List property</button>}</div>
            </div>

            <div style={{ padding:20 }}>
              {["all","my","fav"].includes(tab) && (
                <div className="laptop-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:20 }}>
                  {(tab==="my"?properties.filter(p=>p.owner_email.toLowerCase()===userEmail.toLowerCase()):tab==="fav"?properties.filter(p=>favorites.includes(p.id)):properties).map(p=>{
                    const booked = isPropertyBooked(p.id);
                    const myBook = myBookingForProp(p.id);
                    return (
                    <div key={p.id} className="laptop-card" style={{ background:"white", borderRadius:16, overflow:"hidden", border:"1px solid #F0E9DC" }}>
                      <div style={{ height:170, background:"#F4F1DE", position:"relative", cursor:"pointer" }} onClick={()=>{setSelectedProp(p); setView("detail")}}>
                        {p.images && p.images[0]? <img src={p.images[0].startsWith("blob:")||p.images[0].startsWith("http")?p.images[0]:`${API}/${p.images[0]}`} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36 }}>{getHT(p.house_type).icon}</div>}
                        <button onClick={(e)=>{e.stopPropagation(); setFavorites(f=>f.includes(p.id)?f.filter(x=>x!==p.id):[...f,p.id])}} style={{ position:"absolute", top:8, right:8, width:32, height:32, borderRadius:100, border:"none", background:"white", cursor:"pointer", boxShadow:"0 4px 12px rgba(0,0,0,0.1)" }}>{favorites.includes(p.id)?"❤":"🤍"}</button>
                        {p.owner_email.toLowerCase()===userEmail.toLowerCase() && <div style={{position:"absolute",top:8,left:8,background:"#1a1a2e",color:"white",fontSize:10,padding:"4px 10px",borderRadius:100,fontWeight:700}}>Your listing</div>}
                        {booked && <div style={{position:"absolute",bottom:8,left:8,background:"#22c55e",color:"white",fontSize:10,padding:"4px 10px",borderRadius:100,fontWeight:700}}>✓ Booked</div>}
                        {myBook && <div style={{position:"absolute",bottom:8,right:8,background:myBook.status==="Accepted"?"#22c55e":myBook.status==="Pending"?"#f59e0b":"#ef4444",color:"white",fontSize:10,padding:"4px 10px",borderRadius:100,fontWeight:700}}>{myBook.status}</div>}
                      </div>
                      <div style={{ padding:14 }}>
                        <div style={{ fontWeight:700, fontSize:14, cursor:"pointer" }} onClick={()=>{setSelectedProp(p); setView("detail")}}>{p.title}</div>
                        <div style={{ fontSize:12, color:"#6b5e4f", marginTop:4 }}>📍 {p.location} • {p.house_type}</div>
                        <div style={{ fontSize:13, fontWeight:800, marginTop:6 }}>₹{p.price?.toLocaleString()}/mo <span style={{fontWeight:400,fontSize:11,color:"#9a8c7e"}}>+ ₹{(p.maintenance||0)+(p.electricity||0)+(p.water||0)+(p.gas||0)+(p.internet||0)} basic</span></div>
                        <div style={{ fontSize:11, color:"#059669", marginTop:4, background:"#ecfdf5", padding:"4px 8px", borderRadius:100, display:"inline-flex" }}>Basic: Maint ₹{p.maintenance} • Elec ₹{p.electricity} • Water ₹{p.water} • Gas ₹{p.gas} • WiFi ₹{p.internet}</div>
                        <div style={{ display:"flex", gap:4, marginTop:8, flexWrap:"wrap" }}>{(p.amenities||[]).slice(0,3).map(a=><span key={a} style={{ fontSize:10, background:"#FFFBF5", border:"1px solid #F0E9DC", padding:"3px 8px", borderRadius:100 }}>{a}</span>)}</div>
                        <div style={{ display:"flex", gap:6, marginTop:12 }}>
                          {p.owner_email.toLowerCase()===userEmail.toLowerCase()? (
                            <>
                              <button onClick={()=>handleEdit(p)} style={{ flex:1, padding:"9px", borderRadius:100, border:"1px solid #1a1a2e", background:"#1a1a2e", color:"white", fontWeight:700, fontSize:12, cursor:"pointer" }}>Edit</button>
                              <button onClick={()=>handleDelete(p)} style={{ flex:1, padding:"9px", borderRadius:100, border:"none", background:"#fee2e2", color:"#dc2626", fontWeight:700, fontSize:12, cursor:"pointer" }}>Delete</button>
                            </>
                          ) : (
                            <>
                              <button onClick={()=>{setSelectedProp(p); setView("detail")}} style={{ flex:1, padding:"9px", borderRadius:100, border:"1px solid #E6DDD0", background:"white", fontWeight:700, fontSize:12, cursor:"pointer" }}>View map & details</button>
                              {booked? <button style={{ flex:1, padding:"9px", borderRadius:100, border:"none", background:"#22c55e", color:"white", fontWeight:700, fontSize:12 }}>Booked</button> : myBook? <button style={{ flex:1, padding:"9px", borderRadius:100, border:"none", background:myBook.status==="Pending"?"#f59e0b":"#22c55e", color:"white", fontWeight:700, fontSize:12 }}>{myBook.status}</button> : <button onClick={()=>{setSelectedProp(p); setView("detail")}} style={{ flex:1, padding:"9px", borderRadius:100, border:"none", background:"#1a1a2e", color:"white", fontWeight:700, fontSize:12, cursor:"pointer" }}>Book now</button>}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )})}
                  {properties.length===0 && <div style={{gridColumn:"1/-1",background:"white",borderRadius:16,padding:40,textAlign:"center",color:"#9a8c7e"}}>No properties found... </div>}
                </div>
              )}

              {tab==="payments" && (
                <div style={{ maxWidth:900 }}>
                  <div style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:18, marginBottom:14 }}>
                    <h3 style={{margin:0, fontSize:16}}>Bills & Payments -</h3>
                    <div style={{fontSize:12,color:"#6b5e4f",marginTop:6, lineHeight:1.5}}>{userRole==="landlord"? "Bills are auto-generated when you accept a booking. Each bill shows rent + maintenance + electricity + water + gas + internet breakdown. Track paid vs due." : "Your bills are auto-generated after owner accepts your booking. Each bill shows transparent breakdown of rent + basic charges (maintenance, electricity, water, gas, internet). Pay securely."}</div>
                  </div>
                  <div style={{ display:"grid", gap:12 }}>
                    {payments.map(b=>{
                      const formattedDate = b.check_in_date? new Date(b.check_in_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : new Date(b.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
                      return (
                      <div key={b.id} style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:18, borderLeft:`4px solid ${b.status.toLowerCase()==="paid"?"#22c55e":"#f59e0b"}` }}>
                        <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:800, fontSize:14}}>{b.bill_number} • {b.property_title}</div>
                            <div style={{fontSize:11,color:"#9a8c7e",marginTop:4}}>{b.renter_email} • Check-in: {formattedDate} • Due: {b.due_date? new Date(b.due_date).toLocaleDateString():""}</div>
                            <div style={{fontSize:12,marginTop:10,background:"#FFFBF5",padding:10,borderRadius:10,border:"1px solid #F0E9DC"}}>
                              <div style={{fontWeight:700,fontSize:11,marginBottom:6,letterSpacing:"0.04em",textTransform:"uppercase",color:"#6b5e4f"}}>Basic Charges Breakdown ( transparent billing)</div>
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:12}}>
                                <div>Base Rent: <b>₹{b.base_rent||b.amount}</b></div>
                                <div>Maintenance: <b>₹{b.maintenance}</b></div>
                                <div>Electricity: <b>₹{b.electricity}</b></div>
                                <div>Water: <b>₹{b.water}</b></div>
                                <div>Gas + Internet: <b>₹{b.extra_charges}</b></div>
                                <div>Total Due: <b style={{color:"#1a1a2e"}}>₹{(b.amount||0).toLocaleString()}</b></div>
                              </div>
                              <div style={{fontSize:11,color:"#6b5e4f",marginTop:8,whiteSpace:"pre-wrap"}}>{b.notes}</div>
                            </div>
                            <div style={{fontSize:12,marginTop:8}}>Status: <b style={{textTransform:"capitalize", color: b.status.toLowerCase()==="paid"?"#22c55e":"#d97706"}}>{b.status.toLowerCase()}</b> {b.paid_date && `• Paid: ${new Date(b.paid_date).toLocaleDateString()}`} {b.transaction_id && `• ${b.transaction_id}`}</div>
                          </div>
                          <div style={{display:"flex",flexDirection:"column",gap:8,minWidth:120}}>
                            {userRole==="renter" && b.status.toLowerCase()==="due"? <button onClick={()=>payInvoice(b.id)} style={{padding:"10px 16px",borderRadius:100,border:"none",background:"#22c55e",color:"white",fontWeight:700,cursor:"pointer", fontSize:12,boxShadow:"0 4px 12px rgba(34,197,94,0.3)"}}>Pay now</button> : <span style={{background:b.status.toLowerCase()==="paid"?"#22c55e":"#fef3c7",color:b.status.toLowerCase()==="paid"?"white":"#92400e",padding:"8px 14px",borderRadius:100,fontSize:12,fontWeight:700, textAlign:"center", textTransform:"capitalize"}}>{b.status.toLowerCase()==="paid"?"✓ Paid":"Due"}</span>}
                            <button onClick={()=>downloadInvoice(b)} style={{padding:"8px 14px",borderRadius:100,border:"1px solid #E6DDD0",background:"white",fontSize:11,cursor:"pointer",fontWeight:600}}>View receipt</button>
                          </div>
                        </div>
                      </div>
                    )})}
                    {payments.length===0 && <div style={{background:"white",borderRadius:16,padding:40,textAlign:"center",color:"#9a8c7e", fontSize:13, lineHeight:1.6}}>{userRole==="landlord"?"No bills yet. Bills are created automatically when you accept a booking request in Bookings tab. Each bill will include rent + maintenance + electricity + water + gas + internet breakdown.":"No bills yet. Your bill with full breakdown (rent + maintenance + electricity + water + gas + internet) will be generated automatically after owner accepts your booking."}</div>}
                  </div>
                </div>
              )}

              {tab==="calc" && (
                <div style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:22, maxWidth:650 }}>
                  <h3 style={{margin:0}}>Rent Calculator - With Basic Charges</h3>
                  <p style={{fontSize:12,color:"#6b5e4f",marginTop:4}}>Professional breakdown including gas, wifi, electricity, water like real rental websites. </p>
                  <div style={{display:"grid",gap:12,marginTop:16}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <div><label style={labelWarm}>Monthly Rent ₹</label><input type="number" value={calc.rent} onChange={e=>setCalc({...calc, rent:parseInt(e.target.value)||0})} style={inputWarm} /></div>
                      <div><label style={labelWarm}>Maintenance ₹</label><input type="number" value={calc.maintenance} onChange={e=>setCalc({...calc, maintenance:parseInt(e.target.value)||0})} style={inputWarm} /></div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                      <div><label style={labelWarm}>Electricity ₹</label><input type="number" value={calc.electricity} onChange={e=>setCalc({...calc, electricity:parseInt(e.target.value)||0})} style={inputWarm} /></div>
                      <div><label style={labelWarm}>Water ₹</label><input type="number" value={calc.water} onChange={e=>setCalc({...calc, water:parseInt(e.target.value)||0})} style={inputWarm} /></div>
                      <div><label style={labelWarm}>Gas ₹</label><input type="number" value={calc.gas} onChange={e=>setCalc({...calc, gas:parseInt(e.target.value)||0})} style={inputWarm} /></div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <div><label style={labelWarm}>Internet ₹</label><input type="number" value={calc.internet} onChange={e=>setCalc({...calc, internet:parseInt(e.target.value)||0})} style={inputWarm} /></div>
                      <div><label style={labelWarm}>WiFi Extra ₹</label><input type="number" value={calc.wifi} onChange={e=>setCalc({...calc, wifi:parseInt(e.target.value)||0})} style={inputWarm} /></div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <div><label style={labelWarm}>Deposit ₹</label><input type="number" value={calc.deposit} onChange={e=>setCalc({...calc, deposit:parseInt(e.target.value)||0})} style={inputWarm} /></div>
                      <div><label style={labelWarm}>Brokerage %</label><input type="number" value={calc.brokerage} onChange={e=>setCalc({...calc, brokerage:parseInt(e.target.value)||0})} style={inputWarm} /></div>
                    </div>
                    <div style={{background:"#1a1a2e",color:"white",padding:16,borderRadius:12,marginTop:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:14}}><span>Monthly total with basic charges</span><b>₹{(calc.rent+calc.maintenance+calc.electricity+calc.water+calc.gas+calc.internet+calc.wifi+calc.other).toLocaleString()}/mo</b></div>
                      <div style={{fontSize:11,opacity:0.7,marginTop:8,lineHeight:1.5}}>Breakdown: Rent ₹{calc.rent} + Maint ₹{calc.maintenance} + Elec ₹{calc.electricity} + Water ₹{calc.water} + Gas ₹{calc.gas} + Internet ₹{calc.internet} + WiFi ₹{calc.wifi} + Other ₹{calc.other}</div>
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.2)",fontSize:13}}><span>Move-in cost (Rent + Deposit + Brokerage)</span><b>₹{(calc.rent+calc.deposit+(calc.rent*calc.brokerage/100)).toLocaleString()}</b></div>
                    </div>
                  </div>
                </div>
              )}

              {tab==="bookings" && (
                <div style={{ display:"flex", flexDirection:"column", gap:16, maxWidth:900 }}>
                  <div style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:18 }}>
                    <h3 style={{margin:0, fontSize:16}}>{userRole==="landlord"? "Booking Requests - Accept to auto-generate bill with basic charges" : "My Bookings - Bills auto-generated after owner accepts"}</h3>
                    <div style={{fontSize:12,color:"#6b5e4f",marginTop:4}}></div>
                  </div>
                  <div style={{ display:"grid", gap:12 }}>
                    {bookings.map(b=>(
                      <div key={b.id} style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:16 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", gap:12 }}>
                          <div><div style={{ fontWeight:800, fontSize:14 }}>{b.property_title} • {b.property_location}</div><div style={{fontSize:11,marginTop:4, color:"#6b5e4f"}}>Tenant: {b.renter_email} • Check-in: {b.check_in_date} • ID: #{b.id}</div><div style={{fontSize:12,marginTop:8,background:"#FFFBF5",padding:10,borderRadius:8, border:"1px solid #F0E9DC"}}>{b.message}</div></div>
                          <div style={{display:"flex",flexDirection:"column",gap:8, alignItems:"flex-end",minWidth:140}}>
                            <span style={{padding:"5px 12px",borderRadius:100,fontSize:12,fontWeight:700,color:"white",background:b.status==="Accepted"?"#22c55e":b.status==="Pending"?"#f59e0b":"#ef4444", textTransform:"capitalize"}}>{b.status.toLowerCase()}</span>
                            {userRole==="landlord" && b.status==="Pending" && <><button onClick={()=>updateBookingStatus(b.id,"Accepted")} style={{padding:"9px 16px",borderRadius:100,border:"none",background:"#1a1a2e",color:"white",fontWeight:700,cursor:"pointer", fontSize:12}}>Accept & generate bill</button><button onClick={()=>updateBookingStatus(b.id,"Rejected")} style={{padding:"7px 14px",borderRadius:100,border:"1px solid #fecaca",background:"#fef2f2",color:"#dc2626",fontSize:11, cursor:"pointer"}}>Decline</button></>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {bookings.length===0 && <div style={{background:"white",borderRadius:16,padding:30,textAlign:"center",color:"#9a8c7e",fontSize:13}}>No bookings yet. {userRole==="landlord"?"Booking requests from renters will appear here.":"Your booking requests will appear here. Maps will be visible in property details."}</div>}
                  </div>
                </div>
              )}

              {tab==="complaints" && (
                <div style={{ display:"flex", flexDirection:"column", gap:16, maxWidth:800 }}>
                  {userRole==="renter" && (
                    <div style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:20 }}>
                      <h4 style={{margin:"0 0 4px 0"}}>Raise a complaint - Private to owner</h4>
                      <p style={{fontSize:12, color:"#6b5e4f", margin:"0 0 14px 0"}}></p>
                      <select value={complaintForm.propertyId} onChange={e=>setComplaintForm({...complaintForm,propertyId:e.target.value})} style={{...inputWarm,marginBottom:10}}><option value="">Select property</option>{properties.map(p=><option key={p.id} value={p.id}>{p.title} - {p.location}</option>)}</select>
                      <select value={complaintForm.type} onChange={e=>setComplaintForm({...complaintForm,type:e.target.value})} style={{...inputWarm,marginBottom:10}}>
                        <option>Maintenance</option><option>Water</option><option>Electricity</option><option>Gas</option><option>Internet / WiFi</option><option>Other</option>
                      </select>
                      <textarea value={complaintForm.desc} onChange={e=>setComplaintForm({...complaintForm,desc:e.target.value})} placeholder="Describe the issue in detail..." style={{...inputWarm,height:80,marginBottom:10}} />
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                        <div><label style={labelWarm}>Add photo evidence</label><input type="file" accept="image/*" onChange={e=>{const f=e.target.files[0]; if(f) setComplaintForm({...complaintForm,photo:f,photoPreview:URL.createObjectURL(f)})}} style={{fontSize:12}} />{complaintForm.photoPreview && <img src={complaintForm.photoPreview} style={{width:80,height:60,borderRadius:8,marginTop:6,objectFit:"cover"}} />}</div>
                        <div><label style={labelWarm}>Add video evidence</label><input type="file" accept="video/*" onChange={e=>{const f=e.target.files[0]; if(f) setComplaintForm({...complaintForm,video:f,videoPreview:URL.createObjectURL(f)})}} style={{fontSize:12}} />{complaintForm.videoPreview && <video src={complaintForm.videoPreview} style={{width:80,height:60,borderRadius:8,marginTop:6}} controls />}</div>
                      </div>
                      <button onClick={submitComplaint} disabled={loading} style={{width:"100%",padding:"12px",borderRadius:100,border:"none",background:"#1a1a2e",color:"white",fontWeight:700,cursor:"pointer"}}>{loading?"Submitting...":"Submit complaint"}</button>
                    </div>
                  )}
                  <div style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:20 }}>
                    <h4 style={{margin:0}}>{userRole==="landlord"?`Complaints for your properties (${complaints.length}) - Role based`:`My complaints (${complaints.length}) - Private`}</h4>
                    <div style={{fontSize:11, color:"#6b5e4f", marginTop:4}}> {userRole==="landlord"?"tenant":"owner"} can see status. Includes photo/video evidence, category Other supported.</div>
                    {complaints.map(c=>(
                      <div key={c.id} style={{border:"1px solid #F0E9DC",borderRadius:12,padding:14,marginTop:14}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:700, fontSize:13}}>{c.title} • {c.property_title}</span><span style={{padding:"5px 10px",borderRadius:100,fontSize:11,fontWeight:700,background:c.status==="resolved"?"#22c55e":c.status==="open"?"#ef4444":"#f59e0b",color:"white", textTransform:"capitalize"}}>{c.status.replace("_"," ")}</span></div>
                        <div style={{fontSize:12,marginTop:8}}>{c.description}</div>
                        <div style={{display:"flex",gap:8,marginTop:8}}>{c.photo && <img src={`${API}/${c.photo}`} style={{width:80,height:60,borderRadius:8,objectFit:"cover"}} />}{c.video && <video src={`${API}/${c.video}`} style={{width:100,height:60,borderRadius:8}} controls />}</div>
                        <div style={{fontSize:10,color:"#6b5e4f",marginTop:8}}>{userRole==="landlord"?`From tenant: ${c.renter_email}`:`To owner: ${c.owner_email}`} • {new Date(c.created_at).toLocaleString()}</div>
                        {userRole==="landlord" && <div style={{marginTop:10,display:"flex",gap:6}}><select value={c.status} onChange={e=>updateComplaintStatus(c.id, e.target.value)} style={{padding:"6px 10px",borderRadius:100,fontSize:11,border:"1px solid #E6DDD0"}}><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></div>}
                      </div>
                    ))}
                    {complaints.length===0 && <div style={{padding:24, textAlign:"center", color:"#9a8c7e", fontSize:13}}>No complaints yet. {userRole==="renter"?"Raise a complaint with photo/video and category Other if needed.":"Complaints from tenants will appear here with evidence."}</div>}
                  </div>
                </div>
              )}

              {tab==="reviews" && (
                <div style={{ display:"flex", flexDirection:"column", gap:16, maxWidth:850 }}>
                  {userRole==="renter" && (
                    <div style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:20 }}>
                      <h3 style={{margin:"0 0 4px 0"}}>Write a review</h3>
                      <p style={{fontSize:12, color:"#6b5e4f", margin:"0 0 14px 0"}}> Only property owner can see your review. Add rating out of 5, description, photo & video.</p>
                      <select value={reviewForm.propertyId} onChange={e=>setReviewForm({...reviewForm,propertyId:e.target.value})} style={{...inputWarm,marginBottom:12}}>
                        <option value="">Select property you stayed in</option>
                        {properties.map(p=><option key={p.id} value={p.id}>{p.title} - {p.location}</option>)}
                      </select>
                      <div>
                        <label style={labelWarm}>Your rating out of 5</label>
                        <div style={{display:"flex",gap:8,marginTop:8,alignItems:"center"}}>
                          {[1,2,3,4,5].map(star=><button key={star} type="button" onClick={()=>setReviewForm({...reviewForm,rating:star})} style={{fontSize:32, background: star<=reviewForm.rating? "#fef3c7":"#FFFBF5", border:`1px solid ${star<=reviewForm.rating? "#f59e0b" : "#F0E9DC"}`, borderRadius:10, width:44, height:44, cursor:"pointer", color: star<=reviewForm.rating? "#f59e0b" : "#E6DDD0"}}>★</button>)}
                          <span style={{fontSize:14,marginLeft:8,fontWeight:700}}>{reviewForm.rating}/5 stars</span>
                        </div>
                      </div>
                      <div style={{marginTop:14}}><label style={labelWarm}>Review description</label><textarea value={reviewForm.comment} onChange={e=>setReviewForm({...reviewForm,comment:e.target.value})} placeholder="Describe cleanliness, owner behaviour, locality, facilities, basic charges transparency..." style={{...inputWarm,height:100,marginTop:6}} /></div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:14}}>
                        <div style={{border:"1px dashed #E6DDD0",borderRadius:12,padding:12}}><label style={labelWarm}>Add photo</label><input type="file" accept="image/*" onChange={e=>{const f=e.target.files[0]; if(f) setReviewForm({...reviewForm,photo:f,photoPreview:URL.createObjectURL(f)})}} style={{fontSize:12,marginTop:6}} />{reviewForm.photoPreview && <img src={reviewForm.photoPreview} style={{width:"100%",height:80,borderRadius:8,marginTop:8,objectFit:"cover"}} />}</div>
                        <div style={{border:"1px dashed #E6DDD0",borderRadius:12,padding:12}}><label style={labelWarm}>Add video</label><input type="file" accept="video/*" onChange={e=>{const f=e.target.files[0]; if(f) setReviewForm({...reviewForm,video:f,videoPreview:URL.createObjectURL(f)})}} style={{fontSize:12,marginTop:6}} />{reviewForm.videoPreview && <video src={reviewForm.videoPreview} style={{width:"100%",height:80,borderRadius:8,marginTop:8}} controls />}</div>
                      </div>
                      <button onClick={submitReview} disabled={loading} style={{width:"100%",marginTop:16,padding:"12px",borderRadius:100,border:"none",background:"#1a1a2e",color:"white",fontWeight:700,cursor:"pointer"}}>{loading?"Submitting...":"Submit review with photo/video"}</button>
                    </div>
                  )}
                  <div style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:20 }}>
                    <h4 style={{margin:0}}>{userRole==="landlord"?`Reviews for your properties (${reviews.length}) - Private to you only`:`My reviews (${reviews.length}) - Visible to owner only`}</h4>
                    <div style={{fontSize:11,color:"#6b5e4f",marginTop:4}}></div>
                    {reviews.map(r=><div key={r.id} style={{border:"1px solid #F0E9DC",borderRadius:12,padding:14,marginTop:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><b style={{fontSize:13}}>{r.property_title}</b><span style={{fontSize:12,background:"#fef3c7",padding:"4px 10px",borderRadius:100,fontWeight:700}}>{"★".repeat(r.rating)} {r.rating}/5</span></div>
                      <div style={{fontSize:12,marginTop:8,lineHeight:1.5}}>{r.comment}</div>
                      <div style={{display:"flex",gap:8,marginTop:10}}>{r.photo && <img src={`${API}/${r.photo}`} style={{width:80,height:60,borderRadius:8,objectFit:"cover"}} />}{r.video && <video src={`${API}/${r.video}`} style={{width:100,height:60,borderRadius:8}} controls />}</div>
                      <div style={{fontSize:10,color:"#9a8c7e",marginTop:8}}>{new Date(r.created_at).toLocaleString()} • {userRole==="landlord"?`From: ${r.reviewer_email}`:`To owner: ${r.owner_email}`}</div>
                    </div>)}
                    {reviews.length===0 && <div style={{padding:24,textAlign:"center",color:"#9a8c7e",fontSize:13}}>{userRole==="landlord"?"No reviews yet for your properties. Reviews from renters with photos/videos will appear here, private to you.":"You have not written any reviews yet. Write a review with rating out of 5, description, photo & video."}</div>}
                  </div>
                </div>
              )}

              {tab==="messages" && (
                <div style={{ background:"white", borderRadius:16, padding:20, maxWidth:800 }}>
                  <h3 style={{margin:"0 0 4px 0"}}>Messages -  private chat</h3>
                  <div style={{fontSize:11,color:"#6b5e4f"}}>Secure 1-to-1 messaging between renter and owner</div>
                  {conversations.map((c,i)=><div key={i} onClick={()=>{setActiveChat(c); loadChatMessages(c.other_email,c.property_id)}} style={{padding:12,border:"1px solid #F0E9DC",borderRadius:10,marginTop:10,cursor:"pointer",background:activeChat?.other_email===c.other_email?"#FFFBF5":"white"}}><b style={{fontSize:13}}>{c.other_email}</b> • {c.property_title}<div style={{fontSize:12, color:"#6b5e4f",marginTop:2}}>{c.last_message}</div></div>)}
                  {activeChat && <div style={{marginTop:16, borderTop:"1px solid #F0E9DC", paddingTop:14}}><div style={{fontWeight:700, fontSize:13}}>Chat with {activeChat.other_email} • {activeChat.property_title}</div><div style={{maxHeight:260,overflowY:"auto",marginTop:10,display:"grid",gap:6}}>{chatMessages.map(m=><div key={m.id} style={{padding:10,background:m.sender_email===userEmail?"#dcf8c6":"#f3f4f6",marginTop:4,borderRadius:12,fontSize:13,justifySelf:m.sender_email===userEmail?"end":"start",maxWidth:"80%"}}>{m.message}<div style={{fontSize:10,opacity:0.6,marginTop:4}}>{new Date(m.created_at).toLocaleTimeString()}</div></div>)}</div><div style={{display:"flex",gap:8,marginTop:14}}><input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChatMessage()} style={{flex:1,...inputWarm}} placeholder="Type your message..." /><button onClick={sendChatMessage} style={{padding:"10px 18px",borderRadius:100,background:"#1a1a2e",color:"white",border:"none", fontWeight:700,cursor:"pointer"}}>Send</button></div></div>}
                </div>
              )}

              {tab==="profile" && <div style={{ background:"white", borderRadius:16, padding:20, maxWidth:450 }}><h3 style={{margin:0}}>Profile </h3><div style={{marginTop:12,fontSize:13,lineHeight:1.8}}><div>Email: <b>{userEmail}</b></div><div>Role: <b style={{textTransform:"capitalize"}}>{userRole}</b></div><div>Properties listed: <b>{properties.filter(p=>p.owner_email===userEmail).length}</b></div><div>Total bookings: <b>{bookings.length}</b></div><div style={{marginTop:10,fontSize:11,color:"#6b5e4f"}}>Demo owner account has 20 verified properties with maps and basic charges breakdown.</div></div></div>}
            </div>
          </div>
        </div>
      )}

      {view==="detail" && selectedProp && (
        <div style={{ background:"#FFFBF5", minHeight:"100vh" }}>
          <div style={{ background:"white", padding:"12px 20px", display:"flex", justifyContent:"space-between", position:"sticky", top:0, zIndex:10, borderBottom:"1px solid #F0E9DC" }}>
            <button onClick={()=>setView("home")} style={{ padding:"8px 14px", borderRadius:100, border:"1px solid #E6DDD0", background:"white", cursor:"pointer", fontWeight:600 }}>← Back to listings</button>
            <div style={{fontSize:11,color:"#9a8c7e"}}>Map visible to renters • </div>
          </div>
          <div style={{ maxWidth:1100, margin:"0 auto", padding:20 }}>
            <div className="laptop-detail" style={{ background:"white", borderRadius:20, overflow:"hidden", border:"1px solid #F0E9DC", display:"grid", gridTemplateColumns:"1.2fr 0.8fr" }}>
              <div>
                <div style={{ height:440, background:"#F4F1DE", position:"relative" }}>
                  {selectedProp.images && selectedProp.images[activeImg]? <img src={selectedProp.images[activeImg].startsWith("http")?selectedProp.images[activeImg]:`${API}/${selectedProp.images[activeImg]}`} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:64 }}>{getHT(selectedProp.house_type).icon}</div>}
                  <div style={{position:"absolute",bottom:10,left:10,display:"flex",gap:6}}>{(selectedProp.images||[]).map((_,i)=><button key={i} onClick={()=>setActiveImg(i)} style={{width:32,height:6,borderRadius:100,border:"none",background:i===activeImg?"#1a1a2e":"rgba(255,255,255,0.6)",cursor:"pointer"}} />)}</div>
                </div>
                {/* MAP FOR RENTER - ROLE BASED */}
                <div style={{borderTop:"1px solid #F0E9DC"}}>
                  <div style={{padding:"12px 16px",fontWeight:700,fontSize:12,background:"#FFFBF5",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span>📍 Property Location - Map visible to all renters</span>
                    <span style={{fontSize:10,color:"#6b5e4f",fontWeight:400}}>{selectedProp.latitude}, {selectedProp.longitude}</span>
                  </div>
                  <iframe
                    width="100%" height="280" frameBorder="0" style={{border:0}}
                    src={`https://maps.google.com/maps?q=${selectedProp.latitude},${selectedProp.longitude}&z=15&output=embed`}
                    title={`Map for ${selectedProp.title}`}
                  ></iframe>
                  <div style={{padding:"10px 14px",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${selectedProp.latitude},${selectedProp.longitude}`} target="_blank" rel="noreferrer" style={{fontSize:12,background:"#1a1a2e",color:"white",padding:"8px 14px",borderRadius:100,textDecoration:"none",fontWeight:700}}>Open in Google Maps</a>
                    <span style={{fontSize:12,color:"#6b5e4f"}}>{selectedProp.location} • Nearby: {(selectedProp.nearby_places||[]).join(", ")||"Gomti Nagar, Lucknow"}</span>
                  </div>
                </div>
              </div>
              <div style={{ padding:22, borderLeft:"1px solid #F0E9DC" }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                  <h2 style={{margin:0,fontSize:20,lineHeight:1.2}}>{selectedProp.title}</h2>
                  {isPropertyBooked(selectedProp.id) && <span style={{background:"#22c55e",color:"white",fontSize:11,padding:"5px 10px",borderRadius:100,fontWeight:700}}>Booked</span>}
                </div>
                <div style={{fontSize:12,color:"#6b5e4f",marginTop:6}}>{selectedProp.location} • {selectedProp.house_type} • {selectedProp.bhk}</div>
                <div style={{marginTop:12}}>
                  <div style={{fontSize:22,fontWeight:800}}>₹{selectedProp.price?.toLocaleString()}/mo</div>
                  <div style={{fontSize:11,color:"#6b5e4f",marginTop:4}}>Plus basic charges - transparent billing</div>
                </div>
                <div style={{marginTop:14,background:"#FFFBF5",border:"1px solid #F0E9DC",borderRadius:12,padding:12}}>
                  <div style={{fontWeight:700,fontSize:11,letterSpacing:"0.06em",textTransform:"uppercase",color:"#6b5e4f",marginBottom:8}}>Basic Charges Included in Bill</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:12}}>
                    <div>Maintenance: <b>₹{selectedProp.maintenance}</b></div>
                    <div>Electricity: <b>₹{selectedProp.electricity}</b></div>
                    <div>Water: <b>₹{selectedProp.water}</b></div>
                    <div>Gas: <b>₹{selectedProp.gas||400}</b></div>
                    <div>Internet: <b>₹{selectedProp.internet||500}</b></div>
                    <div>WiFi: <b>₹{selectedProp.wifi_charges||500}</b></div>
                    <div style={{gridColumn:"1/-1",marginTop:6,paddingTop:6,borderTop:"1px dashed #E6DDD0"}}>Total monthly estimate: <b>₹{(selectedProp.price + (selectedProp.maintenance||0)+(selectedProp.electricity||0)+(selectedProp.water||0)+(selectedProp.gas||0)+(selectedProp.internet||0)).toLocaleString()}</b></div>
                  </div>
                </div>
                <div style={{marginTop:14,fontSize:13,lineHeight:1.6,color:"#374151"}}>{selectedProp.description}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:12}}>{(selectedProp.amenities||[]).map(a=><span key={a} style={{ fontSize:11, background:"white", border:"1px solid #E6DDD0", padding:"4px 10px", borderRadius:100 }}>{a}</span>)}</div>

                {selectedProp.owner_email!==userEmail ? (
                  <div style={{marginTop:20,borderTop:"1px solid #F0E9DC",paddingTop:16}}>
                    <div style={{fontWeight:700,fontSize:12,marginBottom:10}}>Request booking - Role based • Map visible to you as renter</div>
                    {isPropertyBooked(selectedProp.id) ? <button style={{width:"100%",padding:"14px",borderRadius:100,background:"#22c55e",color:"white",border:"none",fontWeight:800}}>✓ This property is already booked</button> : myBookingForProp(selectedProp.id) ? <div style={{background:"#fef3c7",padding:12,borderRadius:12,fontSize:12}}><b>Your booking status: {myBookingForProp(selectedProp.id).status}</b><div style={{marginTop:4,color:"#6b5e4f"}}>Bill will be auto-generated with basic charges breakdown after owner accepts.</div></div> : <>
                      <label style={labelWarm}>Check-in date</label>
                      <input type="date" value={bookingForm.check_in_date} onChange={e=>setBookingForm({...bookingForm,check_in_date:e.target.value})} style={{...inputWarm,marginTop:6,marginBottom:10}} />
                      <label style={labelWarm}>Message to owner</label>
                      <textarea value={bookingForm.message} onChange={e=>setBookingForm({...bookingForm,message:e.target.value})} placeholder="Hello, I am interested in this property. Please let me know the next steps..." style={{...inputWarm,height:70,marginTop:6,marginBottom:12}} />
                      <button onClick={()=>createBooking(selectedProp)} disabled={bookingLoading} style={{width:"100%",padding:"14px",borderRadius:100,background:"#1a1a2e",color:"white",border:"none",fontWeight:800,cursor:"pointer"}}>{bookingLoading?"Sending...":"Send booking request"}</button>
                    </>}
                    <button onClick={()=>startChatWithOwner(selectedProp)} style={{width:"100%",marginTop:10,padding:"11px",borderRadius:100,border:"1px solid #E6DDD0",background:"white",fontWeight:600,cursor:"pointer"}}>💬 Message owner securely</button>
                    <div style={{fontSize:10,color:"#9a8c7e",marginTop:10,textAlign:"center"}}>Transparent billing • Map enabled •  secure</div>
                  </div>
                ) : <div style={{marginTop:20,background:"#f0fdf4",padding:14,borderRadius:12,border:"1px solid #bbf7d0"}}><div style={{fontWeight:700,fontSize:12}}>Your property listing</div><div style={{fontSize:12,marginTop:4,color:"#6b5e4f"}}>Bookings received: {bookings.filter(b=>b.property_id===selectedProp.id).length} • Edit from My listings • Bills include basic charges breakdown • Map visible to renters</div></div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {view==="add" && (
        <div style={{ background:"#FFFBF5", minHeight:"100vh", padding:20 }}>
          <div style={{maxWidth:900, margin:"0 auto"}}>
            <button onClick={()=>setView("home")} style={{marginBottom:12,padding:"8px 14px",borderRadius:100,border:"1px solid #E6DDD0",background:"white",cursor:"pointer"}}>← Back</button>
            <form onSubmit={handleAdd} style={{ background:"white", borderRadius:20, border:"1px solid #F0E9DC", padding:22 }}>
              <h3 style={{margin:0}}>{editingId?`Edit property - With basic charges`:`List new property - With maps & basic charges`}</h3>
              <p style={{fontSize:12,color:"#6b5e4f",marginTop:4}}>Professional listing - Renters will see map + transparent bill with gas, electricity, wifi, water breakdown.</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginTop:16}}>{HOUSE_TYPES.map(ht=><div key={ht.id} onClick={()=>setPropForm({...propForm, house_type:ht.id})} style={{padding:10,borderRadius:12,border:propForm.house_type===ht.id?`2px solid ${ht.color}`:"1px solid #E6DDD0",background:propForm.house_type===ht.id?ht.bg:"white",cursor:"pointer",textAlign:"center"}}><div style={{fontSize:18}}>{ht.icon}</div><div style={{fontSize:11,fontWeight:600,marginTop:4}}>{ht.label}</div></div>)}</div>
              <div style={{display:"grid",gridTemplateColumns:"1.5fr 0.5fr",gap:10,marginTop:14}}><div><label style={labelWarm}>Property title</label><input required placeholder="e.g. 2BHK Premium Flat - Gomti Nagar" value={propForm.title} onChange={e=>setPropForm({...propForm,title:e.target.value})} style={{...inputWarm,marginTop:6}} /></div><div><label style={labelWarm}>Rent ₹/mo</label><input required type="number" placeholder="18500" value={propForm.price} onChange={e=>setPropForm({...propForm,price:e.target.value})} style={{...inputWarm,marginTop:6}} /></div></div>
              <div style={{marginTop:10}}><label style={labelWarm}>Location - Map will be shown to renters</label><input required placeholder="Gomti Nagar, Lucknow" value={propForm.location} onChange={e=>setPropForm({...propForm,location:e.target.value})} style={{...inputWarm,marginTop:6}} /></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}><div><label style={labelWarm}>Latitude (for map)</label><input value={mapLat} onChange={e=>setMapLat(e.target.value)} style={{...inputWarm,marginTop:6}} /></div><div><label style={labelWarm}>Longitude (for map)</label><input value={mapLng} onChange={e=>setMapLng(e.target.value)} style={{...inputWarm,marginTop:6}} /></div></div>
              <div style={{marginTop:10}}><label style={labelWarm}>Description</label><textarea required value={propForm.description} onChange={e=>setPropForm({...propForm,description:e.target.value})} style={{...inputWarm,height:80,marginTop:6}} placeholder="Describe property, nearby places, facilities, basic charges transparency..." /></div>


              <div style={{background:"white",border:"1px solid #F0E9DC",borderRadius:14,padding:16,marginTop:16}}>
                <div style={{fontWeight:800,fontSize:13}}>Select Amenities (Visible in Edit also)</div>
                <div style={{fontSize:11,color:"#6b5e4f",marginTop:4}}>Tap to select - selected will be saved with property. editing.</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:12}}>
                  {["WiFi","AC","Lift","Parking","Security","Water Purifier","Balcony","Garden","Gym","Power Backup","Furnished","Pool","Clubhouse","Food","Laundry","Terrace"].map(am=>(
                    <button key={am} type="button" onClick={()=> setSelectedAmenities(prev=> prev.includes(am)? prev.filter(x=>x!==am) : [...prev, am]) } style={{padding:"7px 14px",borderRadius:100,border:selectedAmenities.includes(am)?"1.5px solid #1a1a2e":"1px solid #E6DDD0",background:selectedAmenities.includes(am)?"#1a1a2e":"white",color:selectedAmenities.includes(am)?"white":"#6b5e4f",fontSize:12,fontWeight:600,cursor:"pointer"}}>{selectedAmenities.includes(am)?"✓ ":""}{am}</button>
                  ))}
                </div>
                <div style={{fontSize:11,marginTop:8,color:"#6b5e4f"}}>{selectedAmenities.length} amenities selected: {selectedAmenities.join(", ")||"None"}</div>
              </div>

              <div style={{background:"#FFFBF5",border:"1px solid #F0E9DC",borderRadius:14,padding:16,marginTop:16}}>
                <div style={{fontWeight:800,fontSize:13}}>Basic Monthly Charges - Shown in bill breakdown (Professional & Transparent)</div>
                <div style={{fontSize:11,color:"#6b5e4f",marginTop:4}}>These charges will be auto-added to renter's bill when you accept booking.  transparent billing.</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:12}}>
                  <div><label style={labelWarm}>Maintenance ₹</label><input type="number" value={propForm.maintenance} onChange={e=>setPropForm({...propForm,maintenance:e.target.value})} style={{...inputWarm,marginTop:6}} /></div>
                  <div><label style={labelWarm}>Electricity ₹</label><input type="number" value={propForm.electricity} onChange={e=>setPropForm({...propForm,electricity:e.target.value})} style={{...inputWarm,marginTop:6}} /></div>
                  <div><label style={labelWarm}>Water ₹</label><input type="number" value={propForm.water} onChange={e=>setPropForm({...propForm,water:e.target.value})} style={{...inputWarm,marginTop:6}} /></div>
                  <div><label style={labelWarm}>Gas ₹</label><input type="number" value={propForm.gas} onChange={e=>setPropForm({...propForm,gas:e.target.value})} style={{...inputWarm,marginTop:6}} /></div>
                  <div><label style={labelWarm}>Internet ₹</label><input type="number" value={propForm.internet} onChange={e=>setPropForm({...propForm,internet:e.target.value})} style={{...inputWarm,marginTop:6}} /></div>
                  <div><label style={labelWarm}>WiFi ₹</label><input type="number" value={propForm.wifi} onChange={e=>setPropForm({...propForm,wifi:e.target.value})} style={{...inputWarm,marginTop:6}} /></div>
                  <div><label style={labelWarm}>Other ₹ (cleaning, club, etc)</label><input type="number" value={propForm.other} onChange={e=>setPropForm({...propForm,other:e.target.value})} style={{...inputWarm,marginTop:6}} placeholder="Other charges" /></div>
                </div>
                <div style={{marginTop:10,fontSize:11,background:"white",padding:8,borderRadius:8,border:"1px solid #F0E9DC"}}>Total tenant monthly estimate: <b>₹{(parseInt(propForm.price||0)+(parseInt(propForm.maintenance||0))+(parseInt(propForm.electricity||0))+(parseInt(propForm.water||0))+(parseInt(propForm.gas||0))+(parseInt(propForm.internet||0))+(parseInt(propForm.other||0))).toLocaleString()}</b> (Rent + all basic charges including Other)</div>
              </div>

              <div style={{marginTop:14}}><label style={labelWarm}>Property photos</label><input type="file" multiple accept="image/*" onChange={e=>{const arr=Array.from(e.target.files); setFiles(arr); setPhotoPreviews(arr.map(f=>URL.createObjectURL(f)))}} style={{marginTop:6}} /><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>{photoPreviews.map((u,i)=><img key={i} src={u} style={{width:70,height:70,borderRadius:10,objectFit:"cover",border:"1px solid #F0E9DC"}} />)}</div></div>
              <button type="submit" disabled={loading} style={{width:"100%",marginTop:18,padding:"14px",borderRadius:100,background:"#1a1a2e",color:"white",border:"none",fontWeight:700,cursor:"pointer",fontSize:14}}>{loading?"Publishing...":editingId?"Update property with basic charges":"Publish property with map & basic charges"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const inputWarm={ width:"100%", padding:"12px 14px", borderRadius:12, border:"1.5px solid #F0E9DC", background:"white", fontSize:13, outline:"none", boxSizing:"border-box" }
const labelWarm={ fontSize:10, fontWeight:700, color:"#6b5e4f", display:"block", letterSpacing:"0.06em", textTransform:"uppercase" }

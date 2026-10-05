
import { useEffect, useState } from "react"
const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"

const HOUSE_TYPES = [
  { id: "Flat", icon: "🏢", label: "Flat", color: "#2563eb", bg: "#eff6ff" },
  { id: "Independent House", icon: "🏠", label: "House", color: "#059669", bg: "#ecfdf5" },
  { id: "Villa", icon: "🏡", label: "Villa", color: "#0891b2", bg: "#ecfeff" },
  { id: "Builder Floor", icon: "🏘️", label: "Floor", color: "#7c3aed", bg: "#f5f3ff" },
  { id: "PG", icon: "🛏️", label: "PG", color: "#9333ea", bg: "#faf5ff" },
  { id: "Hostel", icon: "🎓", label: "Hostel", color: "#ea580c", bg: "#fff7ed" },
  { id: "Shop", icon: "🛍️", label: "Shop", color: "#dc2626", bg: "#fef2f2" },
  { id: "Office", icon: "💼", label: "Office", color: "#4f46e5", bg: "#eef2ff" },
]
const LOCATIONS = ["Gomti Nagar, Lucknow","Indira Nagar, Lucknow","Hazratganj, Lucknow","Alambagh, Lucknow","Aliganj, Lucknow","Mahanagar, Lucknow"]
const AMENITIES_LIST = ["WiFi","AC","Lift","Parking","Security","Water Purifier","Gym","Pool","Garden","Clubhouse","Power Backup","Gas Pipeline","Laundry","Food","Furnished","Balcony","Terrace","Washing Machine","Fridge","TV","Geyser","Sofa","Bed","Microwave","Study"]

export default function App(){
  const [properties,setProperties]=useState([])
  const [token,setToken]=useState(localStorage.getItem("token")||"")
  const [userEmail,setUserEmail]=useState(localStorage.getItem("userEmail")||"")
  const [userRole,setUserRole]=useState(localStorage.getItem("userRole")||"renter")
  const [userProfile,setUserProfile]=useState(JSON.parse(localStorage.getItem("userProfile")||"null"))
  const [view,setView]=useState("landing") // FIX: Always start from landing page, not auto-login as landlord
  const [tab,setTab]=useState("all")
  const [authMode,setAuthMode]=useState("login")
  const [search,setSearch]=useState("")
  const [filters,setFilters]=useState({ house_type:"All", bhk:"All", location:"All" })
  const [form,setForm]=useState({ email:"", password:"", role:"renter", full_name:"", phone:"", city:"Lucknow" })
  const [showPassword,setShowPassword]=useState(false)
  const [propForm,setPropForm]=useState({ title:"", price:"", location:"Gomti Nagar, Lucknow", description:"", contact:"", bhk:"2BHK", house_type:"Flat", furnishing:"Semi-Furnished", area_sqft:"", maintenance:"1500", deposit:"30000", facing:"East" })
  const [files,setFiles]=useState([])
  const [photoPreviews,setPhotoPreviews]=useState([])
  const [mapLat,setMapLat]=useState("26.8467")
  const [mapLng,setMapLng]=useState("80.9462")
  const [selectedAmenities,setSelectedAmenities]=useState([])
  const [loading,setLoading]=useState(false)
  const [selectedProp,setSelectedProp]=useState(null)
  const [activeImg,setActiveImg]=useState(0)
  const [editingId,setEditingId]=useState(null)
  const [favorites,setFavorites]=useState(JSON.parse(localStorage.getItem("favorites")||"[]"))
  const [toast,setToast]=useState({ show:false, msg:"", type:"success" })
  const [calc,setCalc]=useState({ rent:15000, maintenance:1500, electricity:1200, water:300, deposit:30000, brokerage:15 })
  const [invoices,setInvoices]=useState(JSON.parse(localStorage.getItem("rentnear_invoices")||"[]"))
  const [reviews,setReviews]=useState(JSON.parse(localStorage.getItem("rentnear_reviews")||"[]"))
  const [complaints,setComplaints]=useState(JSON.parse(localStorage.getItem("rentnear_complaints")||"[]"))
  const [showSidebar,setShowSidebar]=useState(false)
  const [invoiceForm,setInvoiceForm]=useState({propertyId:"",renterName:"",renterEmail:"",month:new Date().getMonth()+1,year:new Date().getFullYear(),base:0,maintenance:0,electricity:0,water:0,gas:0,internet:0,extra:0,discount:0})
  const [reviewForm,setReviewForm]=useState({propertyId:"",rating:5,comment:""})
  const [complaintForm,setComplaintForm]=useState({propertyId:"",type:"Maintenance",desc:""})
  const [messages,setMessages]=useState(JSON.parse(localStorage.getItem("rentnear_messages")||"[]"))
  const [messageText,setMessageText]=useState("")
  const [selectedChat,setSelectedChat]=useState(null)

  const showToast=(msg,type="success")=>{ setToast({show:true, msg, type}); setTimeout(()=>setToast({show:false,msg:"",type:"success"}),3000) }
  const getHT=(id)=>HOUSE_TYPES.find(h=>h.id===id) || HOUSE_TYPES[0]
  const waLink=(p)=>`https://wa.me/${p.contact}?text=Hi interested in ${encodeURIComponent(p.title)}`

  const loadProps=async()=>{
    setLoading(true)
    let url=`${API}/properties?search=${encodeURIComponent(search)}`
    if(filters.bhk!=="All") url+=`&bhk=${encodeURIComponent(filters.bhk)}`
    if(filters.location!=="All") url+=`&location=${encodeURIComponent(filters.location)}`
    if(filters.house_type!=="All") url+=`&house_type=${encodeURIComponent(filters.house_type)}`
    if(tab==="my") url+=`&owner_only=true`
    const headers={}; if(token) headers["Authorization"]=`Bearer ${token}`
    try{ const res=await fetch(url,{headers}); const data=await res.json(); if(tab==="fav") setProperties(data.filter(p=>favorites.includes(p.id))); else if(["calc","payments","complaints","reviews","profile"].includes(tab)) {} else setProperties(Array.isArray(data)?data:[]) }catch{ } setLoading(false)
  }
  useEffect(()=>{ if(view==="home" && !["calc","payments","complaints","reviews","profile"].includes(tab)) loadProps() },[search,filters,tab,favorites.length,view])
  useEffect(()=>localStorage.setItem("favorites",JSON.stringify(favorites)),[favorites])
  useEffect(()=>localStorage.setItem("rentnear_invoices",JSON.stringify(invoices)),[invoices])
  useEffect(()=>localStorage.setItem("rentnear_reviews",JSON.stringify(reviews)),[reviews])
  useEffect(()=>localStorage.setItem("rentnear_complaints",JSON.stringify(complaints)),[complaints])
  useEffect(()=>localStorage.setItem("rentnear_messages",JSON.stringify(messages)),[messages])

  const handleRegister=async()=>{ if(!form.full_name||!form.email){ showToast("Name & Email required","error"); return } setLoading(true); try{ const res=await fetch(`${API}/auth/register-professional`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:form.email,phone:form.phone,password:form.password||"pro123",role:form.role,full_name:form.full_name,location_city:form.city,auth_provider:"email"})}); const d=await res.json(); if(!res.ok){ showToast(d.detail,"error"); setLoading(false); return } localStorage.setItem("token",d.access_token); localStorage.setItem("userEmail",d.email); localStorage.setItem("userRole",d.role); localStorage.setItem("userProfile",JSON.stringify(d.profile)); setToken(d.access_token); setUserEmail(d.email); setUserRole(d.role); setUserProfile(d.profile); setView("home"); setTab("all"); showToast(`Welcome ${d.full_name}!`) }catch{ showToast("Failed","error") } setLoading(false) }
  const handleLogin=async()=>{ if(!form.email||!form.password){ showToast("Email & Password","error"); return } setLoading(true); try{ const fd=new URLSearchParams(); fd.append("username",form.email); fd.append("password",form.password); const res=await fetch(`${API}/login`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:fd}); const d=await res.json(); if(!res.ok){ showToast(d.detail,"error"); setLoading(false); return } localStorage.setItem("token",d.access_token); localStorage.setItem("userEmail",d.email); localStorage.setItem("userRole",d.role); localStorage.setItem("userProfile",JSON.stringify(d.profile)); setToken(d.access_token); setUserEmail(d.email); setUserRole(d.role); setUserProfile(d.profile); setView("home"); setTab("all"); showToast(`Welcome ${d.full_name}`) }catch{ showToast("Login failed","error") } setLoading(false) }

  const handleAdd=async(e)=>{
    e.preventDefault(); if(userRole!=="landlord"){ showToast("Only landlords","error"); return } 
    setLoading(true)
    const fd=new FormData(); Object.entries(propForm).forEach(([k,v])=> fd.append(k, v||"")); 
    fd.append("amenities", JSON.stringify(selectedAmenities)); fd.append("nearby_places", JSON.stringify([])); fd.append("extra_details", JSON.stringify({latitude:mapLat,longitude:mapLng})); fd.append("latitude", mapLat); fd.append("longitude", mapLng);
    for(let f of files) fd.append("images", f)
    try{ 
      const url=editingId?`${API}/properties/${editingId}`:`${API}/properties`; 
      const method=editingId?"PUT":"POST"; 
      const res=await fetch(url,{method,headers:{Authorization:`Bearer ${token}`},body:fd}); 
      if(!res.ok){ throw new Error("backend fail") } 
      showToast(editingId?"Updated ✅":`${propForm.house_type} Published ✅`); 
      if(editingId){
        setProperties(properties.map(p=>p.id===editingId?{...p,title:propForm.title,price:parseInt(propForm.price)||0,location:propForm.location,description:propForm.description,house_type:propForm.house_type,bhk:propForm.bhk,amenities:selectedAmenities,latitude:mapLat,longitude:mapLng,images:photoPreviews.length?photoPreviews:p.images}:p));
      }
      setView("home"); setTab("my"); setEditingId(null); setFiles([]); setPhotoPreviews([]); setSelectedAmenities([]); 
    }catch{
      if(editingId){
        // OFFLINE EDIT - update existing property
        setProperties(properties.map(p=>p.id===editingId?{...p,title:propForm.title||"New Title",price:parseInt(propForm.price)||p.price,location:propForm.location||p.location,description:propForm.description||p.description,house_type:propForm.house_type||p.house_type,bhk:propForm.bhk||p.bhk,amenities:selectedAmenities.length?selectedAmenities:p.amenities,latitude:mapLat,longitude:mapLng,images:photoPreviews.length?photoPreviews:p.images,contact:propForm.contact||p.contact}:p));
        showToast(`${propForm.house_type} Updated ✅ (offline)`);
      } else {
        const np={id:Date.now(),title:propForm.title||"New Property",location:propForm.location,price:parseInt(propForm.price)||0,house_type:propForm.house_type,bhk:propForm.bhk||"2BHK",owner_email:userEmail,amenities:selectedAmenities,description:propForm.description,contact:propForm.contact||"9876543210",maintenance:parseInt(propForm.maintenance)||1500,electricity:1200,water:300,deposit:parseInt(propForm.deposit)||30000,latitude:mapLat,longitude:mapLng,renter_email:"",images:photoPreviews,video:"",furnishing:propForm.furnishing};
        setProperties([np,...properties]); showToast(`${propForm.house_type} Published with Photos + Map + Amenities ✅ (offline)`);
      }
      setView("home"); setTab("my"); setEditingId(null); setFiles([]); setPhotoPreviews([]);
    } finally{ setLoading(false) }
  }

  const generateInvoice=()=>{
    if(!invoiceForm.propertyId){showToast("Select property","error"); return}
    const prop=properties.find(p=>p.id==invoiceForm.propertyId);
    if(!prop){showToast("Not found","error"); return}
    if(!invoiceForm.renterEmail){showToast("Enter tenant email","error"); return}
    const total=(parseInt(invoiceForm.base)||0)+(parseInt(invoiceForm.maintenance)||0)+(parseInt(invoiceForm.electricity)||0)+(parseInt(invoiceForm.water)||0)+(parseInt(invoiceForm.gas)||0)+(parseInt(invoiceForm.internet)||0)+(parseInt(invoiceForm.extra)||0)-(parseInt(invoiceForm.discount)||0);
    const bill={id:Date.now(),bill_number:`BILL-${Math.floor(100000+Math.random()*900000)}`,property_id:parseInt(invoiceForm.propertyId),property_title:prop.title,property_location:prop.location,owner_email:userEmail,renter_name:invoiceForm.renterName||"Tenant",renter_email:invoiceForm.renterEmail,month:invoiceForm.month,year:invoiceForm.year,bill_date:new Date().toISOString(),base_rent:parseInt(invoiceForm.base)||0,maintenance:parseInt(invoiceForm.maintenance)||0,electricity:parseInt(invoiceForm.electricity)||0,water:parseInt(invoiceForm.water)||0,gas:parseInt(invoiceForm.gas)||0,internet:parseInt(invoiceForm.internet)||0,extra:parseInt(invoiceForm.extra)||0,discount:parseInt(invoiceForm.discount)||0,total,status:"DUE"};
    setInvoices([bill,...invoices]); showToast(`Invoice ${bill.bill_number} generated!`);
  };
  const payInvoice=(id)=>{setInvoices(invoices.map(b=>b.id===id?{...b,status:"PAID"}:b)); showToast("Paid!")};
  const downloadInvoice=(bill)=>{const w=window.open("","_blank"); w.document.write(`<html><body><h2>${bill.bill_number}</h2><div>${bill.property_title} - ${bill.property_location}</div><div>Tenant: ${bill.renter_email}</div><h3>Total: ₹${bill.total}</h3></body></html>`); w.document.close(); setTimeout(()=>w.print(),500)};
  const submitReview=()=>{if(!reviewForm.propertyId){showToast("Select property","error");return} if(!reviewForm.comment){showToast("Write review","error");return} const prop=properties.find(p=>p.id==reviewForm.propertyId); const rv={id:Date.now(),propertyId:parseInt(reviewForm.propertyId),property_title:prop?.title||"",user_email:userEmail,owner_email:prop?.owner_email||"",rating:reviewForm.rating,comment:reviewForm.comment,created_at:new Date().toISOString()}; setReviews([rv,...reviews]); showToast("Review submitted!"); setReviewForm({propertyId:"",rating:5,comment:""})};
  const submitComplaint=()=>{if(!complaintForm.propertyId){showToast("Select property","error");return} if(!complaintForm.desc){showToast("Describe","error");return} const prop=properties.find(p=>p.id==complaintForm.propertyId); const cp={id:Date.now(),propertyId:parseInt(complaintForm.propertyId),property_title:prop?.title||"",user_email:userEmail,owner_email:prop?.owner_email||"",title:complaintForm.type,category:complaintForm.type,description:complaintForm.desc,status:"Pending",created_at:new Date().toISOString()}; setComplaints([cp,...complaints]); showToast("Complaint raised!"); setComplaintForm({propertyId:"",type:"Maintenance",desc:""})};

  // OWNER EDIT - FIX
  const handleEdit=(p)=>{
    if(p.owner_email!==userEmail && userRole!=="landlord"){ showToast("Only owner can edit","error"); return }
    setPropForm({title:p.title||"",price:p.price||"",location:p.location||"Gomti Nagar, Lucknow",description:p.description||"",contact:p.contact||"",bhk:p.bhk||"2BHK",house_type:p.house_type||"Flat",furnishing:p.furnishing||"Semi-Furnished",area_sqft:p.area_sqft||"",maintenance:p.maintenance||1500,deposit:p.deposit||30000,facing:p.facing||"East"});
    setMapLat(p.latitude||"26.8467"); setMapLng(p.longitude||"80.9462");
    setSelectedAmenities(p.amenities||[]); setPhotoPreviews(p.images||[]);
    setEditingId(p.id); setView("add"); showToast(`Editing ${p.house_type} #${p.id} ✏️`);
  };
  const handleDelete=async(p)=>{
    if(!confirm(`Delete ${p.title}?`)) return;
    try{
      const res=await fetch(`${API}/properties/${p.id}`,{method:"DELETE",headers:{Authorization:`Bearer ${token}`}});
      if(!res.ok) throw new Error("fail");
      setProperties(properties.filter(x=>x.id!==p.id)); showToast("Deleted ✅");
    }catch{
      // offline fallback
      setProperties(properties.filter(x=>x.id!==p.id)); showToast("Deleted ✅ (offline)");
    }
  };
  // RENTER MESSAGE TO OWNER - FIX
  const sendMessage=async(prop)=>{
    if(!token){ showToast("Login to message","info"); setView("auth"); return }
    if(!messageText.trim()){ showToast("Type message","error"); return }
    const recv = prop.owner_email;
    if(recv===userEmail){ showToast("You own this","info"); return }
    const msgObj={id:Date.now(),property_id:prop.id,property_title:prop.title,sender_email:userEmail,receiver_email:recv,message:messageText,is_read:false,created_at:new Date().toISOString()};
    try{
      const res=await fetch(`${API}/messages`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({property_id:prop.id,receiver_email:recv,message:messageText})});
      if(!res.ok) throw new Error("offline");
      showToast("Message sent to owner! 💬 Check Messages tab");
    }catch{
      // offline fallback - save locally
      setMessages([msgObj,...messages]); showToast("Message sent to owner! 💬 (offline saved)");
    }
    setMessageText(""); setTab("messages");
  };
  const sendQuickMessage=async(prop, text)=>{
    if(!token){ showToast("Login to message","info"); setView("auth"); return }
    const recv = prop.owner_email;
    if(recv===userEmail){ showToast("You own this","info"); return }
    const msgObj={id:Date.now(),property_id:prop.id,property_title:prop.title,sender_email:userEmail,receiver_email:recv,message:text,is_read:false,created_at:new Date().toISOString()};
    try{
      await fetch(`${API}/messages`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({property_id:prop.id,receiver_email:recv,message:text})});
    }catch{}
    setMessages([msgObj,...messages]); showToast("Message sent to owner! 💬");
  };


  return (
    <div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,700&family=Inter:wght@400;600;700&display=swap'); .serif{font-family:Fraunces,serif} .display{font-family:Fraunces,serif}`}</style>
      {toast.show && <div style={{position:"fixed",top:16,right:16,background:toast.type==="error"?"#dc2626":"#1a1a2e",color:"white",padding:"10px 16px",borderRadius:100,fontSize:12,zIndex:100}}>{toast.msg}</div>}

      {/* LANDING - EXACT V15 WARM */}
      {view==="landing" && (
        <div style={{ minHeight:"100vh", background:"#FFFBF5" }}>
          <div style={{ maxWidth:1100, margin:"0 auto", padding:"20px 24px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}><div style={{ width:36, height:36, borderRadius:12, background:"#1a1a2e", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontFamily:"Fraunces" }}>R</div><div style={{ fontWeight:800 }}>RentNear</div></div>
              <button onClick={()=>{setView("auth"); setAuthMode("login")}} style={{ padding:"10px 20px", borderRadius:100, border:"none", background:"#1a1a2e", color:"white", fontWeight:700, cursor:"pointer" }}>Log in</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:40, alignItems:"center", padding:"40px 0" }}>
              <div>
                <div style={{ display:"inline-flex", background:"white", border:"1px solid #E6DDD0", padding:"6px 12px", borderRadius:100, fontSize:10, fontWeight:700, letterSpacing:"0.08em", color:"#9a8c7e" }}>A CALMER WAY TO SEARCH • LUCKNOW</div>
                <h1 className="display" style={{ fontSize:52, lineHeight:0.95, fontWeight:400, color:"#1a1a2e", margin:"20px 0 0" }}>Search<br/>gently,<br/>live<br/><span style={{ color:"#E07A5F", fontStyle:"italic" }}>kindly.</span></h1>
                <p style={{ marginTop:16, fontSize:15, color:"#6b5e4f", lineHeight:1.6, maxWidth:400 }}>Find a place that feels like you already live there. PGs, flats, villas in Gomti Nagar, Indira Nagar, Hazratganj & more.</p>
                <div style={{ marginTop:24, display:"flex", gap:10 }}><button onClick={()=>{setView("auth"); setAuthMode("signup")}} style={{ padding:"14px 28px", borderRadius:100, border:"none", background:"#1a1a2e", color:"white", fontWeight:700, cursor:"pointer" }}>Find my home →</button><button onClick={()=>{setView("home"); setTab("all")}} style={{ padding:"14px 24px", borderRadius:100, border:"1px solid #E6DDD0", background:"white", fontWeight:600, cursor:"pointer" }}>Explore</button></div>
              </div>
              <div style={{ position:"relative", height:460 }}>
                <div style={{ position:"absolute", left:0, top:0, width:280, background:"white", borderRadius:20, padding:14, border:"1px solid #F0E9DC", boxShadow:"0 12px 30px rgba(0,0,0,0.06)", transform:"rotate(-2deg)" }}>
                  <div style={{ height:160, background:"#F4F1DE", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:40 }}>🏢</div>
                  <div style={{ fontWeight:700, fontSize:13, marginTop:10 }}>2BHK Flat - Gomti Nagar Modern</div>
                  <div style={{ fontSize:11, color:"#9a8c7e", marginTop:4 }}>For Girls • Food included • AC</div>
                </div>
                <div style={{ position:"absolute", left:80, bottom:20, width:300, background:"#1a1a2e", borderRadius:16, padding:16, color:"#FFFBF5" }}>
                  <div style={{ fontSize:11, color:"#E07A5F", fontWeight:700 }}>QUOTE • REAL RENTER</div>
                  <p className="serif" style={{ margin:"12px 0 0", fontSize:15, fontStyle:"italic" }}>"I stopped doom-scrolling at 2am. RentNear shows only what's real."</p>
                  <div style={{ marginTop:12, fontSize:11, color:"rgba(255,251,245,0.6)" }}>— Ayesha, Indira Nagar</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUTH - EXACT V15 WARM BUT NO OTP/GOOGLE/GITHUB - ONLY EMAIL/PASSWORD */}
      {view==="auth" && (
        <div style={{ minHeight:"100vh", display:"grid", gridTemplateColumns:"1fr 1fr", background:"#FFFBF5" }}>
          <div style={{ background:"#F4F1DE", position:"relative", padding:40, display:"flex", flexDirection:"column", justifyContent:"space-between", overflow:"hidden", borderRight:"1px solid #E6DDD0" }}>
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(500px circle at 20% 10%, rgba(224,122,95,0.12), transparent 60%), radial-gradient(400px circle at 80% 80%, rgba(129,178,154,0.15), transparent 60%)" }} />
            <div style={{ position:"relative" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:"#1a1a2e", display:"flex", alignItems:"center", justifyContent:"center", color:"#FFFBF5", fontWeight:800, fontFamily:"Fraunces" }}>R</div>
                <div><div style={{ fontWeight:800, color:"#1a1a2e" }}>RentNear</div><div style={{ fontSize:10, color:"#9a8c7e", letterSpacing:"0.08em" }}>HOMES THAT FIT REAL LIFE</div></div>
              </div>
            </div>
            <div style={{ position:"relative" }}>
              <div style={{ display:"inline-flex", background:"white", border:"1px solid #E6DDD0", padding:"6px 12px", borderRadius:100, fontSize:10, fontWeight:700, letterSpacing:"0.08em", color:"#9a8c7e" }}>A CALMER WAY TO SEARCH</div>
              <h1 className="display" style={{ fontSize:48, lineHeight:0.95, fontWeight:400, color:"#1a1a2e", margin:"20px 0 0" }}>
                Home is<br/>
                <span style={{ color:"#E07A5F", fontStyle:"italic" }}>not a checklist.</span><br/>
                It's a feeling<br/>
                you come<br/>
                back to.
              </h1>
              <p style={{ marginTop:16, fontSize:14, color:"#6b5e4f", lineHeight:1.6, maxWidth:380 }}>
                Missed a listing? That's okay. We help you pick up where you left off — with sharing type, food, and budget that actually matters in Lucknow.
              </p>
              <div style={{ marginTop:28, display:"flex", gap:12 }}>
                <div style={{ width:72, height:72, borderRadius:20, background:"white", border:"1px solid #E6DDD0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, transform:"rotate(-4deg)" }}>🏠</div>
                <div style={{ width:72, height:72, borderRadius:20, background:"#1a1a2e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, transform:"rotate(3deg)", color:"white" }}>🛏️</div>
                <div style={{ width:72, height:72, borderRadius:20, background:"#E07A5F", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, transform:"rotate(-2deg)", color:"white" }}>✨</div>
              </div>
            </div>
            <div style={{ position:"relative" }}>
              <div style={{ background:"white", border:"1px solid #E6DDD0", borderRadius:16, padding:16, maxWidth:380, boxShadow:"0 8px 24px rgba(26,26,46,0.06)" }}>
                <div style={{ display:"flex", gap:2, color:"#E07A5F", fontSize:12 }}>★★★★★</div>
                <p className="serif" style={{ margin:"10px 0 0", fontSize:13.5, color:"#1a1a2e", lineHeight:1.5, fontStyle:"italic" }}>"Progress isn't about seeing 100 flats. It's about finding the one where you can breathe. RentNear got that."</p>
                <div style={{ marginTop:10, fontSize:11, color:"#9a8c7e" }}>— Aman, Indira Nagar • 2BHK Flat</div>
              </div>
            </div>
          </div>
          <div style={{ background:"#FFFBF5", padding:28, display:"flex", flexDirection:"column" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <button onClick={()=>setView("landing")} style={{ background:"white", border:"1px solid #E6DDD0", color:"#6b5e4f", fontSize:12, cursor:"pointer", padding:"8px 14px", borderRadius:100 }}>← Back</button>
              <div style={{ fontSize:12, color:"#9a8c7e" }}>
                {authMode==="login" ? "New here? " : "Have an account? "}
                <button onClick={()=>setAuthMode(authMode==="login" ? "signup" : "login")} style={{ background:"transparent", border:"none", color:"#1a1a2e", fontWeight:700, cursor:"pointer", fontSize:12, textDecoration:"underline" }}>
                  {authMode==="login" ? "Create account" : "Log in"}
                </button>
              </div>
            </div>
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:"100%", maxWidth:380 }}>
                <div style={{ marginBottom:20 }}>
                  <h2 className="serif" style={{ fontSize:30, fontWeight:700, margin:0, color:"#1a1a2e" }}>{authMode==="login" ? "Welcome back" : "Create your account"}</h2>
                  <p style={{ marginTop:6, fontSize:13, color:"#9a8c7e" }}>{authMode==="login" ? "Sign in to see PGs, flats, villas in Lucknow" : "Start searching with sharing & food filters"}</p>
                </div>
                <div style={{ display:"grid", gap:12 }}>
                  {authMode==="signup" && (
                    <>
                      <div><label style={labelWarm}>Full name</label><input value={form.full_name} onChange={e=>setForm({...form, full_name:e.target.value})} placeholder="Your name" style={inputWarm} /></div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                        <div>
                          <label style={labelWarm}>I am</label>
                          <div style={{ display:"flex", gap:6, marginTop:6 }}>
                            <button onClick={()=>setForm({...form, role:"renter"})} style={{ flex:1, padding:"10px", borderRadius:10, border: form.role==="renter" ? "1.5px solid #1a1a2e" : "1px solid #E6DDD0", background: form.role==="renter" ? "#1a1a2e" : "white", color: form.role==="renter" ? "white" : "#6b5e4f", fontSize:12, fontWeight:600, cursor:"pointer" }}>Renter</button>
                            <button onClick={()=>setForm({...form, role:"landlord"})} style={{ flex:1, padding:"10px", borderRadius:10, border: form.role==="landlord" ? "1.5px solid #1a1a2e" : "1px solid #E6DDD0", background: form.role==="landlord" ? "#1a1a2e" : "white", color: form.role==="landlord" ? "white" : "#6b5e4f", fontSize:12, fontWeight:600, cursor:"pointer" }}>Landlord</button>
                          </div>
                        </div>
                        <div><label style={labelWarm}>City</label><input value={form.city} onChange={e=>setForm({...form, city:e.target.value})} style={inputWarm} placeholder="Lucknow" /></div>
                      </div>
                    </>
                  )}
                  <div><label style={labelWarm}>Email</label><input value={form.email} onChange={e=>setForm({...form, email:e.target.value})} placeholder="you@example.com" style={inputWarm} /></div>
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <label style={labelWarm}>Password</label>
                      <button type="button" onClick={()=>setShowPassword(!showPassword)} style={{ background:"transparent", border:"none", color:"#9a8c7e", fontSize:11, cursor:"pointer" }}>{showPassword ? "Hide" : "Show"}</button>
                    </div>
                    <input type={showPassword ? "text" : "password"} value={form.password} onChange={e=>setForm({...form, password:e.target.value})} placeholder="••••••••" style={inputWarm} />
                  </div>
                  {authMode==="signup" && <div><label style={labelWarm}>Phone</label><input value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} placeholder="98765 43210" style={inputWarm} /></div>}
                  <button onClick={authMode==="login" ? handleLogin : handleRegister} disabled={loading} style={{ marginTop:4, width:"100%", padding:"14px", borderRadius:100, border:"none", background:"#1a1a2e", color:"#FFFBF5", fontWeight:700, fontSize:14, cursor:"pointer" }}>
                    {loading ? "Please wait..." : authMode==="login" ? "Log in →" : "Create account →"}
                  </button>
                  <div style={{ textAlign:"center", fontSize:11, color:"#9a8c7e", marginTop:4, background:"#FFFBF5", padding:8, borderRadius:8, border:"1px dashed #F0E9DC" }}>Demo: test@testgmail.com / 123456 (owner) • renter@gmail.com / 123456 (renter)</div>
                </div>
              </div>
            </div>
            <div style={{ textAlign:"center", fontSize:10, color:"#9a8c7e" }}>© 2026 RentNear • Lucknow • Built for real life • No OTP/Google/GitHub</div>
          </div>
        </div>
      )}

      {/* HOME */}
      {view==="home" && (
        <div style={{ display:"flex", minHeight:"100vh", background:"#FFFBF5" }}>
          <div style={{ width: showSidebar ? 268 : 0, transition:"width 0.3s", overflow:"hidden", background:"#1a1a2e", color:"#FFFBF5", flexShrink:0, position:"sticky", top:0, height:"100vh", borderRight:"1px solid #2a2a4a" }}>
            <div style={{ width:268, padding:22, height:"100%", display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}><div style={{ width:32, height:32, borderRadius:10, background:"#FFFBF5", color:"#1a1a2e", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontFamily:"Fraunces" }}>R</div><div><div style={{ fontWeight:800, fontSize:14 }}>RentNear</div><div style={{ fontSize:10, color:"#9a8c7e" }}>{userRole}</div></div></div>
                <button onClick={()=>setShowSidebar(false)} style={{ background:"rgba(255,251,245,0.08)", border:"1px solid rgba(255,251,245,0.1)", color:"#FFFBF5", width:28, height:28, borderRadius:8, cursor:"pointer" }}>✕</button>
              </div>
              <div style={{ marginTop:26 }}>
                <div style={{ fontSize:10, letterSpacing:"0.12em", color:"rgba(255,251,245,0.4)", fontWeight:700, marginBottom:12 }}>MENU</div>
                <div style={{ display:"grid", gap:4 }}>
                  {[
                    { id:"all", icon:"🏠", label:"Explore", desc:"All homes" },
                    ...(userRole==="landlord" ? [{ id:"my", icon:"📋", label:"My listings", desc:"Your houses" }] : []),
                    { id:"fav", icon:"❤️", label:"Favorites", desc:`${favorites.length} saved` },
                    { id:"calc", icon:"🧮", label:"Calculator", desc:"Total cost" },
                    { id:"messages", icon:"💬", label:"Messages", desc:`${messages.length} chats` },
                    { id:"payments", icon:"💳", label:"Bills & Payments", desc:`${invoices.length} bills` },
                    { id:"reviews", icon:"⭐", label:"Reviews", desc:`${reviews.length} reviews` },
                    { id:"complaints", icon:"⚠️", label:"Complaints", desc:`${complaints.length} complaints` },
                    { id:"profile", icon:"👤", label:"Profile", desc:userEmail.split("@")[0] },
                  ].map(m=>(
                    <button key={m.id} onClick={()=>{setTab(m.id); setShowSidebar(false)}} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, border:"none", background: tab===m.id ? "#FFFBF5" : "transparent", color: tab===m.id ? "#1a1a2e" : "rgba(255,251,245,0.7)", cursor:"pointer", textAlign:"left" }}>
                      <span>{m.icon}</span><div style={{ flex:1 }}><div style={{ fontWeight:700, fontSize:13 }}>{m.label}</div><div style={{ fontSize:10, opacity:0.6 }}>{m.desc}</div></div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop:"auto", paddingTop:20, borderTop:"1px solid rgba(255,251,245,0.1)" }}>
                <button onClick={()=>{localStorage.clear(); setToken(""); setView("landing")}} style={{ width:"100%", padding:"10px", borderRadius:10, border:"1px solid rgba(255,251,245,0.1)", background:"transparent", color:"white", cursor:"pointer" }}>Logout →</button>
              </div>
            </div>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ background:"white", borderBottom:"1px solid #F0E9DC", padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                {!showSidebar && <button onClick={()=>setShowSidebar(true)} style={{ width:32, height:32, borderRadius:8, border:"1px solid #E6DDD0", background:"white", cursor:"pointer" }}>☰</button>}
                <div><div style={{ fontWeight:800 }}>RentNear</div><div style={{ fontSize:11, color:"#9a8c7e" }}>Discover homes that fit you</div></div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search Lucknow..." style={{ padding:"8px 12px", borderRadius:100, border:"1px solid #E6DDD0", fontSize:12, width:180 }} />
                {userRole==="landlord" && <button onClick={()=>{setView("add"); setEditingId(null)}} style={{ padding:"8px 16px", borderRadius:100, border:"none", background:"#1a1a2e", color:"white", fontWeight:700, fontSize:12, cursor:"pointer" }}>+ List Property</button>}
              </div>
            </div>

            <div style={{ padding:20 }}>
              {["all","my","fav"].includes(tab) && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px,1fr))", gap:14 }}>
                  {(tab==="my"?properties.filter(p=>p.owner_email===userEmail):tab==="fav"?properties.filter(p=>favorites.includes(p.id)):properties).map(p=>(
                    <div key={p.id} style={{ background:"white", borderRadius:16, overflow:"hidden", border:"1px solid #F0E9DC" }}>
                      <div style={{ height:160, background:"#F4F1DE", position:"relative", cursor:"pointer" }} onClick={()=>{setSelectedProp(p); setView("detail")}}>
                        {p.images && p.images[0] ? <img src={p.images[0].startsWith("blob:")||p.images[0].startsWith("http")?p.images[0]:`${API}/${p.images[0]}`} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>{getHT(p.house_type).icon}</div>}
                        <button onClick={(e)=>{e.stopPropagation(); setFavorites(f=>f.includes(p.id)?f.filter(x=>x!==p.id):[...f,p.id])}} style={{ position:"absolute", top:8, right:8, width:28, height:28, borderRadius:100, border:"none", background:"white", cursor:"pointer" }}>{favorites.includes(p.id)?"❤️":"🤍"}</button>
                        {p.owner_email===userEmail && <div style={{position:"absolute",top:8,left:8,background:"#1a1a2e",color:"white",fontSize:9,padding:"3px 8px",borderRadius:100,fontWeight:700}}>YOURS</div>}
                      </div>
                      <div style={{ padding:12 }}>
                        <div style={{ fontWeight:700, fontSize:13, cursor:"pointer" }} onClick={()=>{setSelectedProp(p); setView("detail")}}>{p.title}</div>
                        <div style={{ fontSize:11, color:"#9a8c7e", marginTop:4 }}>📍 {p.location.split(",")[0]} • {p.house_type} • ₹{p.price?.toLocaleString()}/mo</div>
                        <div style={{ display:"flex", gap:4, marginTop:6, flexWrap:"wrap" }}>{(p.amenities||[]).slice(0,3).map(a=><span key={a} style={{ fontSize:9, background:"#FFFBF5", border:"1px solid #F0E9DC", padding:"2px 6px", borderRadius:100 }}>{a}</span>)}</div>
                        {/* OWNER EDIT / DELETE + RENTER MESSAGE BUTTONS - FIXED */}
                        <div style={{ display:"flex", gap:6, marginTop:10 }}>
                          {p.owner_email===userEmail ? (
                            <>
                              <button onClick={()=>handleEdit(p)} style={{ flex:1, padding:"8px", borderRadius:100, border:"1px solid #E6DDD0", background:"white", fontWeight:700, fontSize:11, cursor:"pointer" }}>✏️ Edit</button>
                              <button onClick={()=>handleDelete(p)} style={{ flex:1, padding:"8px", borderRadius:100, border:"none", background:"#fee2e2", color:"#dc2626", fontWeight:700, fontSize:11, cursor:"pointer" }}>🗑️ Delete</button>
                            </>
                          ) : (
                            <>
                              <button onClick={()=>{setSelectedProp(p); setView("detail")}} style={{ flex:1, padding:"8px", borderRadius:100, border:"1px solid #E6DDD0", background:"white", fontWeight:700, fontSize:11, cursor:"pointer" }}>👁️ View</button>
                              <button onClick={(e)=>{e.stopPropagation(); sendQuickMessage(p, `Hi, I'm interested in ${p.title} at ${p.location}. Is it available?`)}} style={{ flex:1, padding:"8px", borderRadius:100, border:"none", background:"#1a1a2e", color:"white", fontWeight:700, fontSize:11, cursor:"pointer" }}>💬 Message Owner</button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab==="messages" && (
                <div style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:16, maxWidth:700 }}>
                  <h3 style={{margin:"0 0 12px"}}>💬 Messages - Direct Chat Owner ↔ Renter</h3>
                  {messages.length===0 ? (
                    <div style={{textAlign:"center",padding:40,color:"#9a8c7e"}}><div style={{fontSize:32}}>💬</div><div style={{marginTop:8,fontWeight:600}}>No messages yet</div><div style={{fontSize:11,marginTop:4}}>When renter clicks Message Owner, it appears here</div></div>
                  ) : (
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {messages.map(m=>(
                        <div key={m.id} style={{border:"1px solid #F0E9DC",borderRadius:12,padding:12,background:m.sender_email===userEmail?"#eff6ff":"#FFFBF5"}}>
                          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,fontSize:12}}>{m.property_title} • {m.sender_email===userEmail?"You → "+m.receiver_email.split("@")[0]:m.sender_email.split("@")[0]+" → You"}</span><span style={{fontSize:10,color:"#9a8c7e"}}>{new Date(m.created_at).toLocaleString()}</span></div>
                          <div style={{fontSize:13,marginTop:6}}>{m.message}</div>
                          <div style={{display:"flex",gap:6,marginTop:8}}>
                            <a href={`https://wa.me/${properties.find(p=>p.id===m.property_id)?.contact||"9876543210"}?text=${encodeURIComponent(m.message)}`} target="_blank" style={{padding:"6px 10px",borderRadius:100,background:"#25D366",color:"white",textDecoration:"none",fontSize:11,fontWeight:700}}>WhatsApp</a>
                            <a href={`tel:${properties.find(p=>p.id===m.property_id)?.contact||"9876543210"}`} style={{padding:"6px 10px",borderRadius:100,background:"#1a1a2e",color:"white",textDecoration:"none",fontSize:11,fontWeight:700}}>Call Owner</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab==="calc" && (
                <div style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:20, maxWidth:600 }}>
                  <h3>🧮 Calculator</h3>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:12 }}>
                    {Object.keys(calc).map(k=><div key={k}><label style={labelWarm}>{k}</label><input type="number" value={calc[k]} onChange={e=>setCalc({...calc,[k]:parseInt(e.target.value)||0})} style={inputWarm} /></div>)}
                  </div>
                  <div style={{ marginTop:16, background:"#1a1a2e", color:"white", borderRadius:12, padding:14 }}>
                    Monthly: <b>₹{(calc.rent+calc.maintenance+calc.electricity+calc.water).toLocaleString()}</b> • First month: <b>₹{(calc.rent+calc.maintenance+calc.electricity+calc.water+calc.deposit+(calc.rent*calc.brokerage/100)).toLocaleString()}</b>
                  </div>
                </div>
              )}

              {tab==="payments" && (
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  {userRole==="landlord" && (
                    <div style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:20 }}>
                      <h3 style={{margin:"0 0 12px"}}>Generate Rent Invoice 💳</h3>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                        <select value={invoiceForm.propertyId} onChange={e=>{const prop=properties.find(p=>p.id==e.target.value); setInvoiceForm({...invoiceForm,propertyId:e.target.value,base:prop?.price||0})}} style={inputWarm}><option value="">Select Property</option>{properties.filter(p=>p.owner_email===userEmail).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select>
                        <input value={invoiceForm.renterEmail} onChange={e=>setInvoiceForm({...invoiceForm,renterEmail:e.target.value})} placeholder="Tenant Email *" style={inputWarm} />
                        <input value={invoiceForm.renterName} onChange={e=>setInvoiceForm({...invoiceForm,renterName:e.target.value})} placeholder="Tenant Name" style={inputWarm} />
                        <input type="number" value={invoiceForm.base} onChange={e=>setInvoiceForm({...invoiceForm,base:e.target.value})} placeholder="Base Rent" style={inputWarm} />
                        <input type="number" value={invoiceForm.maintenance} onChange={e=>setInvoiceForm({...invoiceForm,maintenance:e.target.value})} placeholder="Maintenance" style={inputWarm} />
                        <input type="number" value={invoiceForm.electricity} onChange={e=>setInvoiceForm({...invoiceForm,electricity:e.target.value})} placeholder="Electricity" style={inputWarm} />
                        <input type="number" value={invoiceForm.water} onChange={e=>setInvoiceForm({...invoiceForm,water:e.target.value})} placeholder="Water" style={inputWarm} />
                        <input type="number" value={invoiceForm.extra} onChange={e=>setInvoiceForm({...invoiceForm,extra:e.target.value})} placeholder="Extra" style={inputWarm} />
                      </div>
                      <div style={{marginTop:12,background:"#FFFBF5",padding:10,borderRadius:10,display:"flex",justifyContent:"space-between"}}><b>Total</b><b>₹{((parseInt(invoiceForm.base)||0)+(parseInt(invoiceForm.maintenance)||0)+(parseInt(invoiceForm.electricity)||0)+(parseInt(invoiceForm.water)||0)+(parseInt(invoiceForm.extra)||0)).toLocaleString()}</b></div>
                      <button onClick={generateInvoice} style={{marginTop:12,width:"100%",padding:"12px",borderRadius:10,border:"none",background:"#1a1a2e",color:"white",fontWeight:700,cursor:"pointer"}}>Generate Invoice</button>
                    </div>
                  )}
                  <div style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:16 }}>
                    <h4 style={{margin:"0 0 12px"}}>{userRole==="landlord"?"All Invoices":"My Invoices"} ({invoices.filter(b=>userRole==="landlord"?true:b.renter_email?.toLowerCase()===userEmail.toLowerCase()).length})</h4>
                    {invoices.filter(b=>userRole==="landlord"?true:b.renter_email?.toLowerCase()===userEmail.toLowerCase()).map(b=>(
                      <div key={b.id} style={{border:"1px solid #F0E9DC",borderRadius:10,padding:12,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,background:b.status==="PAID"?"#f0fdf4":"white"}}>
                        <div><div style={{fontWeight:700,fontSize:12}}>{b.bill_number} • {b.property_title}</div><div style={{fontSize:11,color:"#9a8c7e"}}>{b.renter_email} • ₹{b.total} • <span style={{background:b.status==="PAID"?"#22c55e":"#f59e0b",color:"white",padding:"2px 6px",borderRadius:100,fontSize:10}}>{b.status}</span></div></div>
                        <div style={{display:"flex",gap:6}}><button onClick={()=>downloadInvoice(b)} style={{padding:"6px 10px",borderRadius:100,border:"1px solid #E6DDD0",background:"white",cursor:"pointer",fontSize:11}}>PDF</button>{b.status!=="PAID"&&<button onClick={()=>payInvoice(b.id)} style={{padding:"6px 10px",borderRadius:100,border:"none",background:"#1a1a2e",color:"white",cursor:"pointer",fontSize:11}}>Pay</button>}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab==="reviews" && (
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  {userRole==="renter" && (
                    <div style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:16 }}>
                      <h4>Write Review (only where you live)</h4>
                      <select value={reviewForm.propertyId} onChange={e=>setReviewForm({...reviewForm,propertyId:e.target.value})} style={{...inputWarm,marginBottom:8}}><option value="">Select property</option>{properties.slice(0,10).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select>
                      <div style={{display:"flex",gap:6,marginBottom:8}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setReviewForm({...reviewForm,rating:n})} style={{width:32,height:32,borderRadius:8,border:reviewForm.rating>=n?"1.5px solid #f59e0b":"1px solid #E6DDD0",background:reviewForm.rating>=n?"#fef3c7":"white",cursor:"pointer"}}>⭐</button>)}</div>
                      <textarea value={reviewForm.comment} onChange={e=>setReviewForm({...reviewForm,comment:e.target.value})} placeholder="Your review..." style={{...inputWarm,height:60,marginBottom:8}} />
                      <button onClick={submitReview} style={{width:"100%",padding:"10px",borderRadius:10,border:"none",background:"#1a1a2e",color:"white",fontWeight:700,cursor:"pointer"}}>Submit Review</button>
                    </div>
                  )}
                  <div style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:16 }}>
                    <h4>{userRole==="landlord"?"Reviews for your properties (only view)":"My Reviews"} ({reviews.length})</h4>
                    {reviews.map(r=><div key={r.id} style={{border:"1px solid #F0E9DC",borderRadius:10,padding:10,marginTop:8}}><div style={{fontWeight:600,fontSize:12}}>{r.property_title} • {"⭐".repeat(r.rating)}</div><div style={{fontSize:12,marginTop:4}}>{r.comment}</div></div>)}
                    {reviews.length===0 && <div style={{color:"#9a8c7e",textAlign:"center",padding:20}}>No reviews yet</div>}
                  </div>
                </div>
              )}

              {tab==="complaints" && (
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  {userRole==="renter" && (
                    <div style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:16 }}>
                      <h4>Raise Complaint (only where you live)</h4>
                      <select value={complaintForm.propertyId} onChange={e=>setComplaintForm({...complaintForm,propertyId:e.target.value})} style={{...inputWarm,marginBottom:8}}><option value="">Select property</option>{properties.slice(0,10).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select>
                      <select value={complaintForm.type} onChange={e=>setComplaintForm({...complaintForm,type:e.target.value})} style={{...inputWarm,marginBottom:8}}><option>Maintenance</option><option>Water</option><option>Electricity</option><option>Rent</option></select>
                      <textarea value={complaintForm.desc} onChange={e=>setComplaintForm({...complaintForm,desc:e.target.value})} placeholder="Describe issue..." style={{...inputWarm,height:60,marginBottom:8}} />
                      <button onClick={submitComplaint} style={{width:"100%",padding:"10px",borderRadius:10,border:"none",background:"#dc2626",color:"white",fontWeight:700,cursor:"pointer"}}>Raise Complaint</button>
                    </div>
                  )}
                  <div style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:16 }}>
                    <h4>Complaints ({complaints.length}) - {userRole==="landlord"?"Update status to Resolved":"Track status"}</h4>
                    {complaints.map(c=>(
                      <div key={c.id} style={{border:"1px solid #F0E9DC",borderRadius:10,padding:12,marginTop:8,background:c.status==="Resolved"?"#f0fdf4":"white"}}>
                        <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,fontSize:12}}>{c.title} • {c.property_title}</span><span style={{padding:"2px 8px",borderRadius:100,fontSize:10,fontWeight:700,background:c.status==="Resolved"?"#22c55e":c.status==="In Progress"?"#f59e0b":"#ef4444",color:"white"}}>{c.status}</span></div>
                        <div style={{fontSize:12,marginTop:6}}>{c.description}</div>
                        {userRole==="landlord" && <div style={{marginTop:8,display:"flex",gap:6}}><button onClick={()=>setComplaints(complaints.map(x=>x.id===c.id?{...x,status:"In Progress"}:x))} style={{padding:"4px 8px",borderRadius:100,border:"1px solid #fde68a",background:"#fef3c7",cursor:"pointer",fontSize:10}}>In Progress</button><button onClick={()=>setComplaints(complaints.map(x=>x.id===c.id?{...x,status:"Resolved"}:x))} style={{padding:"4px 8px",borderRadius:100,border:"none",background:"#22c55e",color:"white",cursor:"pointer",fontSize:10}}>Resolved</button></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab==="profile" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  <div style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:20 }}>
                    <h3>👤 Profile - Enhanced</h3>
                    <div style={{display:"flex",gap:12,alignItems:"center",marginTop:12}}><div style={{width:48,height:48,background:"#1a1a2e",borderRadius:100,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800}}>{userEmail[0]?.toUpperCase()}</div><div><div style={{fontWeight:700}}>{userEmail.split("@")[0]}</div><div style={{fontSize:11,color:"#9a8c7e"}}>{userRole} • {userEmail}</div></div></div>
                    <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:8}}><input defaultValue={userEmail.split("@")[0]} style={inputWarm} placeholder="Full Name" /><input defaultValue="Lucknow" style={inputWarm} placeholder="City" /><input placeholder="Phone" style={inputWarm} /></div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {userRole==="landlord" ? (
                      <>
                        <div style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:16 }}>
                          <div style={{fontWeight:700,fontSize:13}}>📊 Your Business Stats</div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
                            <div style={{background:"#FFFBF5",borderRadius:10,padding:12,textAlign:"center"}}><div style={{fontWeight:800,fontSize:18}}>{properties.filter(p=>p.owner_email===userEmail).length}</div><div style={{fontSize:10,color:"#9a8c7e"}}>Your Listings</div></div>
                            <div style={{background:"#f0fdf4",borderRadius:10,padding:12,textAlign:"center"}}><div style={{fontWeight:800,fontSize:18,color:"#059669"}}>{invoices.filter(b=>b.status==="DUE").length}</div><div style={{fontSize:10,color:"#9a8c7e"}}>Pending Bills</div></div>
                            <div style={{background:"#eff6ff",borderRadius:10,padding:12,textAlign:"center"}}><div style={{fontWeight:800,fontSize:18,color:"#2563eb"}}>{reviews.length}</div><div style={{fontSize:10,color:"#9a8c7e"}}>Reviews</div></div>
                            <div style={{background:"#fef3c7",borderRadius:10,padding:12,textAlign:"center"}}><div style={{fontWeight:800,fontSize:18,color:"#d97706"}}>{complaints.length}</div><div style={{fontSize:10,color:"#9a8c7e"}}>Complaints</div></div>
                          </div>
                        </div>
                        <div style={{background:"#1a1a2e",color:"white",borderRadius:16,padding:16}}><div style={{fontWeight:700,fontSize:13}}>💡 Owner Tips</div><div style={{fontSize:11,color:"#b8b8cc",marginTop:8,lineHeight:1.7}}>• Add map location - 3x visibility<br/>• Add 5+ amenities to rank higher<br/>• Reply fast - get verified badge<br/>• Generate bills monthly<br/>• Ask for tenant reviews</div></div>
                      </>
                    ) : (
                      <>
                        <div style={{ background:"white", borderRadius:16, border:"1px solid #F0E9DC", padding:16 }}>
                          <div style={{fontWeight:700,fontSize:13}}>🏠 My Rental Journey</div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
                            <div style={{background:"#eff6ff",borderRadius:10,padding:12,textAlign:"center"}}><div style={{fontWeight:800,fontSize:18,color:"#2563eb"}}>0</div><div style={{fontSize:10}}>My Homes</div></div>
                            <div style={{background:"#f0fdf4",borderRadius:10,padding:12,textAlign:"center"}}><div style={{fontWeight:800,fontSize:18,color:"#059669"}}>{favorites.length}</div><div style={{fontSize:10}}>Wishlist</div></div>
                            <div style={{background:"#fef3c7",borderRadius:10,padding:12,textAlign:"center"}}><div style={{fontWeight:800,fontSize:18,color:"#d97706"}}>{invoices.filter(b=>b.renter_email===userEmail).length}</div><div style={{fontSize:10}}>My Bills</div></div>
                            <div style={{background:"#fdf2f8",borderRadius:10,padding:12,textAlign:"center"}}><div style={{fontWeight:800,fontSize:18,color:"#db2777"}}>{reviews.filter(r=>r.user_email===userEmail).length}</div><div style={{fontSize:10}}>My Reviews</div></div>
                          </div>
                        </div>
                        <div style={{background:"linear-gradient(135deg,#7c3aed,#a855f7)",color:"white",borderRadius:16,padding:16}}><div style={{fontWeight:700,fontSize:13}}>✨ Renter Tips</div><div style={{fontSize:11,color:"#e9d5ff",marginTop:8,lineHeight:1.7}}>🏠 Verify owner before token<br/>📸 Photos on move-in day<br/>💬 Use in-app messages<br/>🧾 Always ask for invoice<br/>⭐ Review honestly</div></div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view==="detail" && selectedProp && (
        <div style={{ background:"#FFFBF5", minHeight:"100vh" }}>
          <div style={{ background:"white", borderBottom:"1px solid #F0E9DC", padding:"12px 20px", display:"flex", justifyContent:"space-between", position:"sticky", top:0, zIndex:10 }}>
            <button onClick={()=>setView("home")} style={{ padding:"8px 14px", borderRadius:100, border:"1px solid #E6DDD0", background:"white", cursor:"pointer" }}>← Back</button>
            <div style={{ display:"flex", gap:8 }}><a href={waLink(selectedProp)} target="_blank" style={{ padding:"10px 18px", borderRadius:100, background:"#25D366", color:"white", textDecoration:"none", fontWeight:700, fontSize:13 }}>WhatsApp</a><a href={`tel:${selectedProp.contact}`} style={{ padding:"10px 18px", borderRadius:100, background:"#1a1a2e", color:"white", textDecoration:"none", fontWeight:700, fontSize:13 }}>Call</a></div>
          </div>
          <div style={{ maxWidth:1000, margin:"0 auto", padding:20 }}>
            <div style={{ background:"white", borderRadius:20, overflow:"hidden", border:"1px solid #F0E9DC", display:"grid", gridTemplateColumns:"1.2fr 0.8fr" }}>
              <div><div style={{ height:420, background:"#F4F1DE" }}>{selectedProp.images && selectedProp.images[activeImg] ? <img src={selectedProp.images[activeImg].startsWith("blob:")||selectedProp.images[activeImg].startsWith("http")?selectedProp.images[activeImg]:`${API}/${selectedProp.images[activeImg]}`} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:56 }}>{getHT(selectedProp.house_type).icon}</div>}</div><div style={{ display:"flex", gap:8, padding:10, overflowX:"auto" }}>{selectedProp.images?.map((img,i)=><img key={i} src={img.startsWith("blob:")||img.startsWith("http")?img:`${API}/${img}`} onClick={()=>setActiveImg(i)} style={{ width:64, height:48, objectFit:"cover", borderRadius:8, cursor:"pointer", border: i===activeImg ? "2px solid #1a1a2e" : "1px solid #F0E9DC" }} />)}</div></div>
              <div style={{ padding:20, borderLeft:"1px solid #FFFBF5", display:"flex", flexDirection:"column", gap:12 }}>
                <div>
                  <h2 style={{ margin:0, fontSize:18, fontWeight:800 }}>{selectedProp.title}</h2><div style={{ fontSize:12, color:"#9a8c7e", marginTop:4 }}>📍 {selectedProp.location}</div><div style={{ fontSize:24, fontWeight:800, marginTop:12 }}>₹{selectedProp.price.toLocaleString()}<span style={{ fontSize:12, fontWeight:400, color:"#9a8c7e" }}>/mo</span></div>
                  <div style={{ marginTop:12, fontSize:13, lineHeight:1.6, color:"#4a3f35" }}>{selectedProp.description}</div>
                  <div style={{ marginTop:12 }}><div style={{ fontWeight:700, fontSize:11 }}>✨ Amenities ({(selectedProp.amenities||[]).length})</div><div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:6 }}>{(selectedProp.amenities||[]).map(a=><span key={a} style={{ background:"#FFFBF5", border:"1px solid #F0E9DC", padding:"4px 8px", borderRadius:100, fontSize:11 }}>{a}</span>)}</div></div>
                  {selectedProp.latitude && <div style={{ marginTop:12 }}><div style={{ fontWeight:700, fontSize:11 }}>📍 Map Location</div><div style={{ marginTop:6, borderRadius:10, overflow:"hidden", border:"1px solid #F0E9DC", height:160 }}><iframe width="100%" height="160" frameBorder="0" src={`https://www.openstreetmap.org/export/embed.html?bbox=${(parseFloat(selectedProp.longitude)||80.9462)-0.01}%2C${(parseFloat(selectedProp.latitude)||26.8467)-0.01}%2C${(parseFloat(selectedProp.longitude)||80.9462)+0.01}%2C${(parseFloat(selectedProp.latitude)||26.8467)+0.01}&layer=mapnik&marker=${selectedProp.latitude}%2C${selectedProp.longitude}`} style={{border:0}}></iframe></div><div style={{ fontSize:10, color:"#9a8c7e", marginTop:4 }}>{selectedProp.latitude}, {selectedProp.longitude}</div></div>}
                </div>
                {/* MESSAGE BOX FOR RENTER - DIRECT TO OWNER */}
                {selectedProp.owner_email!==userEmail ? (
                  <div style={{ marginTop:"auto", background:"#FFFBF5", border:"1px solid #F0E9DC", borderRadius:12, padding:12 }}>
                    <div style={{ fontWeight:700, fontSize:12, marginBottom:8 }}>💬 Message Owner Directly - Renter Feature</div>
                    <textarea value={messageText} onChange={e=>setMessageText(e.target.value)} placeholder={`Hi, I'm interested in ${selectedProp.title}. Is it available?`} style={{...inputWarm, height:70}} />
                    <button onClick={()=>sendMessage(selectedProp)} style={{ width:"100%", marginTop:8, padding:"10px", borderRadius:100, border:"none", background:"#1a1a2e", color:"white", fontWeight:700, cursor:"pointer", fontSize:12 }}>Send Message to Owner →</button>
                    <div style={{ fontSize:10, color:"#9a8c7e", marginTop:6, textAlign:"center" }}>Owner gets notification • Reply in Messages tab</div>
                  </div>
                ) : (
                  <div style={{ marginTop:"auto", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:12, padding:12 }}>
                    <div style={{ fontWeight:700, fontSize:12 }}>🏠 This is YOUR property</div>
                    <div style={{ fontSize:11, color:"#6b7280", marginTop:4 }}>You can edit or delete it. Renters can message you via Message Owner button.</div>
                    <div style={{ display:"flex", gap:6, marginTop:8 }}>
                      <button onClick={()=>handleEdit(selectedProp)} style={{ flex:1, padding:"8px", borderRadius:100, border:"1px solid #bbf7d0", background:"white", fontWeight:700, fontSize:11, cursor:"pointer" }}>✏️ Edit</button>
                      <button onClick={()=>{setTab("messages"); setView("home")}} style={{ flex:1, padding:"8px", borderRadius:100, border:"none", background:"#1a1a2e", color:"white", fontWeight:700, fontSize:11, cursor:"pointer" }}>💬 View Messages</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {view==="add" && (
        <div style={{ background:"#FFFBF5", minHeight:"100vh", padding:20 }}>
          <form onSubmit={handleAdd} style={{ background:"white", borderRadius:20, border:"1px solid #F0E9DC", maxWidth:900, margin:"0 auto", overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid #F0E9DC", display:"flex", justifyContent:"space-between", alignItems:"center" }}><h3 style={{ margin:0, fontWeight:800 }}>{editingId ? `Edit ${propForm.house_type} ✏️` : `List ${propForm.house_type} + 📸 Photo + 🎥 Video + 📍 Map + ✨ Amenities`}</h3><button type="button" onClick={()=>setView("home")} style={{ padding:"6px 14px", borderRadius:100, border:"1px solid #E6DDD0", background:"white", cursor:"pointer" }}>✕ Close</button></div>
            <div style={{ padding:20 }}>
              <label style={labelWarm}>HOUSE TYPE *</label>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginTop:8 }}>{HOUSE_TYPES.map(ht=><div key={ht.id} onClick={()=>setPropForm({...propForm, house_type:ht.id})} style={{ padding:10, borderRadius:12, border: propForm.house_type===ht.id ? `2px solid ${ht.color}` : "1px solid #F0E9DC", background: propForm.house_type===ht.id ? ht.bg : "white", cursor:"pointer", textAlign:"center" }}><div style={{ fontSize:18 }}>{ht.icon}</div><div style={{ fontSize:11, fontWeight:600, marginTop:4 }}>{ht.label}</div></div>)}</div>

              <div style={{ display:"grid", gridTemplateColumns:"1.5fr 0.6fr 0.5fr", gap:10, marginTop:14 }}><input required placeholder="Title e.g. 2BHK Flat Gomti Nagar Modern" value={propForm.title} onChange={e=>setPropForm({...propForm, title:e.target.value})} style={inputWarm} /><input required type="number" placeholder="Rent ₹" value={propForm.price} onChange={e=>setPropForm({...propForm, price:e.target.value})} style={inputWarm} /><select value={propForm.bhk} onChange={e=>setPropForm({...propForm, bhk:e.target.value})} style={inputWarm}><option>1RK</option><option>1BHK</option><option>2BHK</option><option>3BHK</option></select></div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 }}><input placeholder="Contact 10-digit" value={propForm.contact} onChange={e=>setPropForm({...propForm, contact:e.target.value})} style={inputWarm} /><select value={propForm.location} onChange={e=>setPropForm({...propForm, location:e.target.value})} style={inputWarm}>{LOCATIONS.map(l=><option key={l}>{l}</option>)}</select></div>

              <div style={{marginTop:14,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:12,padding:12}}>
                <div style={{fontWeight:700,fontSize:12,marginBottom:8}}>📸 Photos & 🎥 Video Upload</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div><label style={labelWarm}>Photos (multiple)</label><input type="file" accept="image/*" multiple onChange={e=>{const filesArr=Array.from(e.target.files); setFiles(filesArr); const urls=filesArr.map(f=>URL.createObjectURL(f)); setPhotoPreviews(urls);}} style={{...inputWarm,padding:"8px",marginTop:4}} /><div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>{photoPreviews.map((u,i)=><img key={i} src={u} style={{width:60,height:60,borderRadius:8,objectFit:"cover",border:"1px solid #bbf7d0"}} />)}</div></div>
                  <div><label style={labelWarm}>Video Tour (optional)</label><input type="file" accept="video/*" onChange={e=>{if(e.target.files[0]) showToast(`Video ${e.target.files[0].name} added`)}} style={{...inputWarm,padding:"8px",marginTop:4}} /><div style={{fontSize:10,color:"#6b7280",marginTop:4}}>MP4 max 50MB</div></div>
                </div>
              </div>

              <div style={{marginTop:14,background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:12,padding:12}}>
                <div style={{fontWeight:700,fontSize:12,marginBottom:8}}>📍 Map Location - Live Preview</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <input placeholder="Latitude 26.8467" value={mapLat} onChange={e=>setMapLat(e.target.value)} style={inputWarm} />
                  <input placeholder="Longitude 80.9462" value={mapLng} onChange={e=>setMapLng(e.target.value)} style={inputWarm} />
                </div>
                <div style={{marginTop:10,borderRadius:10,overflow:"hidden",border:"1px solid #bfdbfe",height:180}}><iframe width="100%" height="180" frameBorder="0" src={`https://www.openstreetmap.org/export/embed.html?bbox=${(parseFloat(mapLng)||80.9462)-0.01}%2C${(parseFloat(mapLat)||26.8467)-0.01}%2C${(parseFloat(mapLng)||80.9462)+0.01}%2C${(parseFloat(mapLat)||26.8467)+0.01}&layer=mapnik&marker=${mapLat||"26.8467"}%2C${mapLng||"80.9462"}`} style={{border:0}}></iframe></div>
                <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                  <button type="button" onClick={()=>{setMapLat("26.8467"); setMapLng("80.9462")}} style={{padding:"6px 10px",borderRadius:100,border:"1px solid #bfdbfe",background:"white",fontSize:11,cursor:"pointer"}}>📍 Gomti Nagar</button>
                  <button type="button" onClick={()=>{setMapLat("26.8570"); setMapLng("80.9460")}} style={{padding:"6px 10px",borderRadius:100,border:"1px solid #bfdbfe",background:"white",fontSize:11,cursor:"pointer"}}>📍 Hazratganj</button>
                  <button type="button" onClick={()=>{setMapLat("26.8510"); setMapLng("80.9900")}} style={{padding:"6px 10px",borderRadius:100,border:"1px solid #bfdbfe",background:"white",fontSize:11,cursor:"pointer"}}>📍 Indira Nagar</button>
                </div>
              </div>

              <div style={{marginTop:14,background:"#FFFBF5",border:"1px solid #F0E9DC",borderRadius:12,padding:12}}>
                <div style={{fontWeight:700,fontSize:12,marginBottom:8}}>✨ Amenities - 25 options ({selectedAmenities.length} selected)</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                  {AMENITIES_LIST.map(am=>(
                    <label key={am} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 8px",borderRadius:8,border:selectedAmenities.includes(am)?"1.5px solid #1a1a2e":"1px solid #F0E9DC",background:selectedAmenities.includes(am)?"#1a1a2e":"white",color:selectedAmenities.includes(am)?"white":"#1a1a2e",cursor:"pointer",fontSize:11}}>
                      <input type="checkbox" checked={selectedAmenities.includes(am)} onChange={e=>{if(e.target.checked) setSelectedAmenities([...selectedAmenities,am]); else setSelectedAmenities(selectedAmenities.filter(x=>x!==am))}} style={{display:"none"}} />
                      <span>{am}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:14 }}>
                <select value={propForm.furnishing} onChange={e=>setPropForm({...propForm, furnishing:e.target.value})} style={inputWarm}><option>Unfurnished</option><option>Semi-Furnished</option><option>Fully-Furnished</option></select>
                <select value={propForm.facing} onChange={e=>setPropForm({...propForm, facing:e.target.value})} style={inputWarm}><option>East</option><option>West</option><option>North</option><option>South</option></select>
                <input placeholder="Area sqft" value={propForm.area_sqft} onChange={e=>setPropForm({...propForm, area_sqft:e.target.value})} style={inputWarm} />
                <input placeholder="Maintenance ₹" value={propForm.maintenance} onChange={e=>setPropForm({...propForm, maintenance:e.target.value})} style={inputWarm} />
                <input placeholder="Deposit ₹" value={propForm.deposit} onChange={e=>setPropForm({...propForm, deposit:e.target.value})} style={inputWarm} />
                <input placeholder="Floor e.g. 2/4" value={propForm.facing} onChange={e=>setPropForm({...propForm, facing:e.target.value})} style={inputWarm} />
              </div>
              <div style={{ marginTop:12 }}><textarea required value={propForm.description} onChange={e=>setPropForm({...propForm, description:e.target.value})} style={{...inputWarm, height:80}} placeholder="Describe property..." /></div>
              <div style={{ display:"flex", gap:10, marginTop:14 }}><button type="button" onClick={()=>setView("home")} style={{ flex:1, padding:"14px", borderRadius:100, border:"1px solid #F0E9DC", background:"white", cursor:"pointer" }}>Cancel</button><button type="submit" disabled={loading} style={{ flex:2, padding:"14px", borderRadius:100, border:"none", background:"#1a1a2e", color:"white", fontWeight:700, cursor:"pointer" }}>{loading ? "Publishing..." : `Publish ${propForm.house_type} + Photos + Map + Amenities ✅`}</button></div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

const inputWarm={ width:"100%", padding:"12px 14px", borderRadius:12, border:"1.5px solid #F0E9DC", background:"white", fontSize:13, outline:"none", boxSizing:"border-box" }
const labelWarm={ fontSize:10, fontWeight:700, color:"#9a8c7e", marginTop:12, display:"block", letterSpacing:"0.06em", textTransform:"uppercase" }

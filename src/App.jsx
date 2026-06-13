import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wxhzdoypscjsxkxvmhue.supabase.co'
const SUPABASE_KEY = 'sb_publishable_BPf810yZlx08DaaMMMp_5Q_68-E8dMH'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const BRAND = '#2F9E44'
const HCOLORS = ['yellow','green','blue','pink','orange']

export default function App(){
  const [dark,setDark]=useState(false)
  const [users,setUsers]=useState([])
  const [master,setMaster]=useState([])
  const [notebooks,setNotebooks]=useState({})
  const [current,setCurrent]=useState(null)
  const [view,setView]=useState('landing')
  const [adminBoot,setAdminBoot]=useState(false)
  const [coupons,setCoupons]=useState([])
  const [plans,setPlans]=useState({one:7,three:10,six:15})
  const [freeMonths,setFreeMonths]=useState([])
  const [loading,setLoading]=useState(false)

  // Load initial data
  useEffect(()=>{
    loadUsers()
    loadMaster()
    loadSettings()
  },[])

  async function loadUsers(){
    const {data}=await supabase.from('users').select('*')
    if(data){
      setUsers(data)
      setAdminBoot(data.some(u=>u.role==='admin'))
    }
  }

  async function loadMaster(){
    const {data}=await supabase.from('master_notes').select('*').order('id')
    if(data) setMaster(data)
  }

  async function loadSettings(){
    const {data}=await supabase.from('settings').select('*')
    if(data){
      data.forEach(s=>{
        if(s.key==='plans') setPlans(s.value)
        if(s.key==='free_months') setFreeMonths(s.value)
        if(s.key==='coupons') setCoupons(s.value)
      })
    }
  }

  async function loadNotebook(email){
    const {data}=await supabase.from('notebooks').select('*').eq('user_email',email).single()
    if(data){
      setNotebooks(n=>({...n,[email]:data}))
      return data
    }
    // create empty notebook
    const empty={user_email:email,saved:[],custom:[],highlights:{},paid:false}
    await supabase.from('notebooks').insert(empty)
    setNotebooks(n=>({...n,[email]:empty}))
    return empty
  }

  async function saveNotebook(email, patch){
    const nb={...notebooks[email],...patch}
    setNotebooks(n=>({...n,[email]:nb}))
    await supabase.from('notebooks').upsert({user_email:email,...nb})
  }

  // Auth
  async function signup({email,username,password}){
    if(!email||!username||!password) return alert('Fill all fields')
    const uname=username.trim()
    if(uname.toLowerCase()==='admin'){
      if(adminBoot) return alert('Admin already exists')
      const admin={email,username:'admin',password,role:'admin',created_at:Date.now()}
      const {error}=await supabase.from('users').insert(admin)
      if(error) return alert(error.message)
      await loadUsers()
      setCurrent(admin); setView('admin'); return
    }
    if(users.find(u=>u.email===email)) return alert('Email already exists')
    if(users.find(u=>u.username===username)) return alert('Username already exists')
    const user={email,username,password,role:'user',created_at:Date.now()}
    const {error}=await supabase.from('users').insert(user)
    if(error) return alert(error.message)
    await loadUsers()
    await loadNotebook(email)
    setCurrent(user); setView('dashboard')
  }

  async function login({identifier,password}){
    if(!identifier||!password) return alert('Fill fields')
    const u=users.find(x=>(x.email===identifier||x.username===identifier)&&x.password===password)
    if(!u) return alert('Invalid credentials')
    if(u.disabled) return alert('Account disabled')
    await supabase.from('users').update({last_login:Date.now()}).eq('email',u.email)
    await loadNotebook(u.email)
    setCurrent(u); setView(u.role==='admin'?'admin':'dashboard')
  }

  function logout(){ setCurrent(null); setView('landing') }

  // Master notes
  async function addMasterNote(){
    const n={id:Date.now(),section:1,text:''}
    await supabase.from('master_notes').insert(n)
    setMaster(m=>[...m,n])
  }

  async function updateMaster(id,patch){
    setMaster(m=>m.map(x=>x.id===id?{...x,...patch}:x))
    await supabase.from('master_notes').update(patch).eq('id',id)
  }

  async function deleteMaster(id){
    if(!confirm('Delete this note?')) return
    await supabase.from('master_notes').delete().eq('id',id)
    setMaster(m=>m.filter(x=>x.id!==id))
  }

  // Notebook
  async function toggleSave(userEmail,noteId){
    const nb=notebooks[userEmail]||{saved:[],custom:[],highlights:{}}
    const arr=nb.saved||[]
    const saved=arr.includes(noteId)?arr.filter(a=>a!==noteId):[...arr,noteId]
    await saveNotebook(userEmail,{saved})
  }

  async function addCustom(userEmail,text){
    const nb=notebooks[userEmail]||{saved:[],custom:[],highlights:{}}
    const note={id:Date.now(),text}
    const custom=[note,...(nb.custom||[])]
    await saveNotebook(userEmail,{custom})
  }

  async function editCustom(userEmail,id,newText){
    const nb=notebooks[userEmail]
    const custom=nb.custom.map(c=>c.id===id?{...c,text:newText}:c)
    await saveNotebook(userEmail,{custom})
  }

  async function deleteCustom(userEmail,id){
    const nb=notebooks[userEmail]
    const custom=nb.custom.filter(c=>c.id!==id)
    await saveNotebook(userEmail,{custom})
  }

  async function setHighlight(userEmail,key,color){
    const nb=notebooks[userEmail]||{saved:[],custom:[],highlights:{}}
    const highlights={...nb.highlights,[key]:color}
    await saveNotebook(userEmail,{highlights})
  }

  // Admin
  async function adminResetPassword(email){
    const p=prompt('New password for '+email)
    if(p){
      await supabase.from('users').update({password:p}).eq('email',email)
      await loadUsers()
    }
  }

  async function adminToggleDisable(email){
    const u=users.find(x=>x.email===email)
    await supabase.from('users').update({disabled:!u.disabled}).eq('email',email)
    await loadUsers()
  }

  async function grantFree(email){
    await supabase.from('users').update({free:true}).eq('email',email)
    await loadUsers()
  }

  async function createCoupon(code){
    const c={code,created_at:Date.now()}
    const newCoupons=[...coupons,c]
    setCoupons(newCoupons)
    await supabase.from('settings').upsert({key:'coupons',value:newCoupons})
  }

  async function updateFreeMonths(months){
    setFreeMonths(months)
    await supabase.from('settings').upsert({key:'free_months',value:months})
  }

  const totalUsers=users.length
  const activeUsers=users.filter(u=>u.last_login&&(Date.now()-u.last_login)<1000*60*60*24*30).length

  // UI
  if(view==='landing') return (
    <div className='app'>
      <div className='nav card'>
        <div className='brand'><div className='logo'/><div><div className='h1'>Avocado Bullets</div><div className='small'>Step 2 CK Notes Simplified</div></div></div>
        <div><button className='btn' onClick={()=>setView('login')}>Login / Signup</button></div>
      </div>
      <div className='app' style={{marginTop:20}}>
        <div className='card'>
          <h3>Welcome â€” quick features</h3>
          <ul>
            <li>Master notes by section (admin-editable)</li>
            <li>Personal notebook with highlights & custom notes</li>
            <li>Flashcard generator & AI assistant (mock)</li>
            <li>Light/Dark mode</li>
          </ul>
          <div className='footer'>First 3 months free configurable by admin</div>
        </div>
      </div>
    </div>
  )

  if(view==='login') return (
    <div className='app'>
      <div className='nav card'>
        <div className='brand'><div className='logo'/><div><div className='h1'>Avocado Bullets</div><div className='small'>Step 2 CK Notes Simplified</div></div></div>
        <div><button className='btn' onClick={()=>setDark(d=>!d)}>{dark?'Light':'Dark'}</button></div>
      </div>
      <div className='app' style={{marginTop:20}}>
        <div style={{maxWidth:720,margin:'0 auto'}}>
          <div className='card'>
            <h3>Login</h3>
            <LoginForm onLogin={async(data)=>{await login(data)}} onForgot={()=>alert('Reset link simulated. Admin can reset real password.')}/>
            <div style={{marginTop:10}} className='smallmuted'>Don't have an account? <button className='link' onClick={()=>setView('signup')}>Sign up</button></div>
          </div>
        </div>
      </div>
    </div>
  )

  if(view==='signup') return (
    <div className='app'>
      <div className='nav card'>
        <div className='brand'><div className='logo'/><div><div className='h1'>Avocado Bullets</div><div className='small'>Step 2 CK Notes Simplified</div></div></div>
        <div><button className='btn' onClick={()=>setDark(d=>!d)}>{dark?'Light':'Dark'}</button></div>
      </div>
      <div className='app' style={{marginTop:20}}>
        <div style={{maxWidth:720,margin:'0 auto'}}>
          <div className='card'>
            <h3>Create account</h3>
            <SignupForm onSignup={(d)=>signup(d)} adminBooted={adminBoot}/>
            <div style={{marginTop:10}} className='smallmuted'>Already have an account? <button className='link' onClick={()=>setView('login')}>Log in</button></div>
          </div>
        </div>
      </div>
    </div>
  )

  if(view==='dashboard'&&current) return (
    <div className='app'>
      <div className='nav card'>
        <div className='brand'><div className='logo'/><div><div className='h1'>Avocado Bullets</div><div className='small'>Step 2 CK Notes Simplified</div></div></div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div className='smallmuted'>{current.username}</div>
          <button className='btn' onClick={()=>setView('notebook')}>Notebook</button>
          <button className='link' onClick={logout}>Logout</button>
        </div>
      </div>
      <div className='container'>
        <div className='card'>
          <h3>Master Notes</h3>
          {master.length===0&&<div className='smallmuted'>No master notes yet. Ask admin to add.</div>}
          {master.map(m=>(
            <div key={m.id} className='note' style={{marginTop:8}}>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <div>{m.text||<em className='smallmuted'>(empty)</em>}</div>
                <div><input type='checkbox' onChange={()=>toggleSave(current.email,m.id)} checked={(notebooks[current.email]?.saved||[]).includes(m.id)}/></div>
              </div>
            </div>
          ))}
        </div>
        <aside className='card'>
          <h4>Account</h4>
          <div className='smallmuted'>Plan: {users.find(u=>u.email===current.email)?.free?'Free':'Trial/Unpaid'}</div>
          <div style={{marginTop:8}}><button className='btn' onClick={()=>setView('notebook')}>Open Notebook</button></div>
        </aside>
      </div>
    </div>
  )

  if(view==='notebook'&&current) return (
    <div className='app'>
      <div className='nav card'>
        <div className='brand'><div className='logo'/><div><div className='h1'>Avocado Bullets</div><div className='small'>Step 2 CK Notes Simplified</div></div></div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div className='smallmuted'>{current.username}</div>
          <button className='btn' onClick={()=>setView('dashboard')}>Back</button>
          <button className='link' onClick={logout}>Logout</button>
        </div>
      </div>
      <div className='container'>
        <div className='card'>
          <h3>My Notebook</h3>
          <AddCustom onAdd={(text)=>addCustom(current.email,text)}/>
          <div style={{marginTop:12}}>
            {(notebooks[current.email]?.custom||[]).map(c=>(
              <div key={c.id} className='note' style={{marginTop:8,background:notebooks[current.email]?.highlights?.['custom_'+c.id]?'yellow':undefined}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <div>{c.text}</div>
                  <div style={{display:'flex',gap:6}}>
                    {HCOLORS.map(col=><button key={col} className='link' onClick={()=>setHighlight(current.email,'custom_'+c.id,col)}>{col}</button>)}
                    <button className='link' onClick={()=>{const t=prompt('edit',c.text);if(t!==null)editCustom(current.email,c.id,t)}}>Edit</button>
                    <button className='link' onClick={()=>deleteCustom(current.email,c.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <aside className='card'>
          <h4>Highlights</h4>
          <div className='smallmuted'>Choose colors then select text (demo).</div>
          <div style={{marginTop:8}}>
            {HCOLORS.map(c=><span key={c} style={{display:'inline-block',padding:6,marginRight:6,background:c==='yellow'?'#FEF3C7':c==='green'?'#DCFCE7':c==='blue'?'#DBEAFE':c==='pink'?'#FCE7F3':'#FFF7ED',borderRadius:6}}>{c}</span>)}
          </div>
        </aside>
      </div>
    </div>
  )

  if(view==='admin'&&current&&current.role==='admin') return (
    <div className='app'>
      <div className='nav card'>
        <div className='brand'><div className='logo'/><div><div className='h1'>Avocado Bullets</div><div className='small'>Step 2 CK Notes Simplified</div></div></div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div className='smallmuted'>{current.username}</div>
          <button className='btn' onClick={()=>setView('admin')}>Dashboard</button>
          <button className='link' onClick={logout}>Logout</button>
        </div>
      </div>
      <div className='container'>
        <div className='card'>
          <h3>Admin â€” Master Notes</h3>
          <div style={{marginBottom:8}}><button className='btn' onClick={addMasterNote}>Add Note</button></div>
          {master.map(m=>(
            <div key={m.id} className='note' style={{marginTop:8}}>
              <div style={{display:'flex',gap:8}}>
                <input className='input' value={m.text} onChange={(e)=>updateMaster(m.id,{text:e.target.value})}/>
                <button className='link' onClick={()=>deleteMaster(m.id)}>Delete</button>
              </div>
            </div>
          ))}
          <hr style={{margin:'12px 0'}}/>
          <h4>Free months configuration</h4>
          <FreeMonthEditor months={freeMonths} onChange={(m)=>updateFreeMonths(m)}/>
          <hr style={{margin:'12px 0'}}/>
          <h4>Coupons</h4>
          <CouponEditor onCreate={(c)=>createCoupon(c)}/>
        </div>
        <aside className='card'>
          <h4>Users & Analytics</h4>
          <div className='smallmuted'>Total users: {totalUsers}</div>
          <div className='smallmuted'>Active (30d): {activeUsers}</div>
          <div style={{marginTop:8}}>
            {users.map(u=>(
              <div key={u.email} style={{padding:8,borderRadius:8,background:'#fff',marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontWeight:700}}>{u.username}{u.role==='admin'?' (admin)':''}</div>
                    <div className='smallmuted'>{u.email}</div>
                    <div className='smallmuted'>notes saved: {(notebooks[u.email]?.saved||[]).length}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {u.role!=='admin'&&<button className='link' onClick={()=>adminResetPassword(u.email)}>Reset PW</button>}
                    {u.role!=='admin'&&<button className='link' onClick={()=>adminToggleDisable(u.email)}>{u.disabled?'Enable':'Disable'}</button>}
                    <button className='link' onClick={()=>grantFree(u.email)}>Give Free</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )

  return <div className='app card'>Unknown view</div>
}

function LoginForm({onLogin,onForgot}){
  const [id,setId]=useState(''); const [pw,setPw]=useState('')
  return <div>
    <div style={{marginBottom:8}}><input className='input' placeholder='username or email' value={id} onChange={e=>setId(e.target.value)}/></div>
    <div style={{marginBottom:8}}><input className='input' placeholder='password' type='password' value={pw} onChange={e=>setPw(e.target.value)}/></div>
    <div style={{display:'flex',gap:8}}>
      <button className='btn' onClick={()=>onLogin({identifier:id,password:pw})}>Login</button>
      <button className='link' onClick={onForgot}>Forgot</button>
    </div>
  </div>
}

function SignupForm({onSignup,adminBooted}){
  const [email,setEmail]=useState(''); const [username,setUsername]=useState(''); const [pw,setPw]=useState('')
  return <div>
    <div style={{marginBottom:8}}><input className='input' placeholder='email' value={email} onChange={e=>setEmail(e.target.value)}/></div>
    <div style={{marginBottom:8}}><input className='input' placeholder='username (admin reserved)' value={username} onChange={e=>setUsername(e.target.value)}/></div>
    <div style={{marginBottom:8}}><input className='input' placeholder='password' type='password' value={pw} onChange={e=>setPw(e.target.value)}/></div>
    <button className='btn' onClick={()=>onSignup({email,username,password:pw})}>Create</button>
  </div>
}

function AddCustom({onAdd}){
  const [t,setT]=useState('')
  return <div>
    <div style={{display:'flex',gap:8}}>
      <input className='input' placeholder='write quick note' value={t} onChange={e=>setT(e.target.value)}/>
      <button className='btn' onClick={()=>{if(t.trim()){onAdd(t.trim());setT('')}}}>Add</button>
    </div>
  </div>
}

function FreeMonthEditor({months,onChange}){
  const [m,setM]=useState(months||[])
  function toggle(mon){const copy=[...m];const idx=copy.indexOf(mon);if(idx>-1)copy.splice(idx,1);else copy.push(mon);setM(copy);onChange(copy)}
  const all=['January','February','March','April','May','June','July','August','September','October','November','December']
  return <div>
    <div className='smallmuted'>Select months to make free after launch</div>
    <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
      {all.map(mon=><button key={mon} className='link' onClick={()=>toggle(mon)} style={{padding:6,borderRadius:6,background:m.includes(mon)?'#e6ffee':'transparent'}}>{mon}</button>)}
    </div>
  </div>
}

function CouponEditor({onCreate}){
  const [code,setCode]=useState('')
  return <div>
    <div style={{display:'flex',gap:8}}>
      <input className='input' placeholder='coupon code' value={code} onChange={e=>setCode(e.target.value)}/>
      <button className='btn' onClick={()=>{if(code.trim()){onCreate(code.trim());setCode('')}}}>Create</button>
    </div>
  </div>
}

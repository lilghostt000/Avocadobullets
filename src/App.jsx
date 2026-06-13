import React, { useEffect, useState } from 'react'

const BRAND = '#2F9E44'
const HCOLORS = ['yellow','green','blue','pink','orange']

function safeParse(key, fallback){ try{ const raw=localStorage.getItem(key); if(!raw) return fallback; const p=JSON.parse(raw); if(Array.isArray(fallback)) return Array.isArray(p)?p:fallback; return p ?? fallback }catch(e){return fallback} }
function writeJSON(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)) }catch(e){console.warn(e)} }

export default function App(){
  const [dark,setDark]=useState(safeParse('av_dark',false))
  const [users,setUsers]=useState(safeParse('av_users',[]))
  const [master,setMaster]=useState(safeParse('av_master',[]))
  const [notebooks,setNotebooks]=useState(safeParse('av_notebooks',{}))
  const [current,setCurrent]=useState(safeParse('av_current',null))
  const [view,setView]=useState(current? (current.role==='admin'?'admin':'dashboard') : 'landing')
  const [adminBoot, setAdminBoot]=useState(localStorage.getItem('av_admin')?true:false)
  useEffect(()=> writeJSON('av_dark',dark),[dark])
  useEffect(()=> writeJSON('av_users',users),[users])
  useEffect(()=> writeJSON('av_master',master),[master])
  useEffect(()=> writeJSON('av_notebooks',notebooks),[notebooks])
  useEffect(()=> writeJSON('av_current',current),[current])
  useEffect(()=> localStorage.setItem('av_admin', adminBoot?'1':'0'),[adminBoot])

  // Auth helpers
  function signup({email,username,password}){
    if(!email||!username||!password) return alert('fill all fields')
    const uname = username.trim()
    if(uname.toLowerCase()==='admin'){
      if(!adminBoot){
        const admin={email,username:'admin',password,role:'admin',createdAt:Date.now()}
        setUsers(u=>[...u,admin]); setCurrent(admin); setAdminBoot(true); setView('admin'); return
      } else return alert('admin exists')
    }
    if(users.find(u=>u.email===email)) return alert('email exists')
    if(users.find(u=>u.username===username)) return alert('username exists')
    const user={email,username,password,role:'user',createdAt:Date.now()}
    setUsers(u=>[...u,user]); setCurrent(user); setView('dashboard')
    // create notebook
    const nb = {...notebooks}; nb[email]={saved:[],custom:[],highlights:{}}; setNotebooks(nb)
  }
  function login({identifier,password}){
    if(!identifier||!password) return alert('fill fields')
    const u = users.find(x=> (x.email===identifier || x.username===identifier) && x.password===password)
    if(!u) return alert('invalid credentials')
    setCurrent(u); setView(u.role==='admin' ? 'admin' : 'dashboard')
  }
  function logout(){ setCurrent(null); setView('landing') }

  // Admin master note CRUD
  function addMasterNote(){ const n={id:Date.now(),section:1,text:''}; setMaster(m=>[...m,n]); }
  function updateMaster(id,patch){ setMaster(m=>m.map(x=> x.id===id? {...x,...patch}:x)) }
  function deleteMaster(id){ if(!confirm('delete?')) return; setMaster(m=>m.filter(x=>x.id!==id)) }

  // Notebook helpers
  function toggleSave(userEmail,noteId){
    const nb = {...notebooks}; if(!nb[userEmail]) nb[userEmail]={saved:[],custom:[],highlights:{}};
    const arr = nb[userEmail].saved||[]; if(arr.includes(noteId)) nb[userEmail].saved = arr.filter(a=>a!==noteId); else nb[userEmail].saved=[...arr,noteId]; setNotebooks(nb)
  }
  function addCustom(userEmail,text){ const nb={...notebooks}; const note={id:Date.now(),text}; nb[userEmail].custom=[note,...(nb[userEmail]?.custom||[])]; setNotebooks(nb) }
  function editCustom(userEmail,id,newText){ const nb={...notebooks}; nb[userEmail].custom = nb[userEmail].custom.map(c=> c.id===id? {...c,text:newText}:c); setNotebooks(nb) }
  function deleteCustom(userEmail,id){ const nb={...notebooks}; nb[userEmail].custom = nb[userEmail].custom.filter(c=>c.id!==id); setNotebooks(nb) }
  function setHighlight(userEmail,key,color){ const nb={...notebooks}; if(!nb[userEmail]) nb[userEmail]={saved:[],custom:[],highlights:{}}; nb[userEmail].highlights = {...nb[userEmail].highlights, [key]:color}; setNotebooks(nb) }

  // Admin functions for users
  function adminResetPassword(email){ const p = prompt('new password for '+email); if(p) setUsers(u=>u.map(x=> x.email===email? {...x,password:p}:x)) }
  function adminToggleDisable(email){ setUsers(u=>u.map(x=> x.email===email? {...x,disabled: !x.disabled}:x)) }
  function grantFree(email){ const usersMap = users.map(u=> u.email===email? {...u,free:true}:u); setUsers(usersMap) }

  // Coupons & plans (local config)
  const [coupons,setCoupons] = useState(safeParse('av_coupons',[]))
  const [plans,setPlans] = useState(safeParse('av_plans',{one:7,three:10,six:15}))
  const [freeMonths,setFreeMonths] = useState(safeParse('av_freeMonths',[]))

  useEffect(()=> writeJSON('av_coupons',coupons),[coupons])
  useEffect(()=> writeJSON('av_plans',plans),[plans])
  useEffect(()=> writeJSON('av_freeMonths',freeMonths),[freeMonths])

  function createCoupon(code){ setCoupons(c=>[...c,{code,createdAt:Date.now()}]) }
  function redeemCoupon(userEmail,code){ if(coupons.find(c=>c.code===code)){ const nb={...notebooks}; nb[userEmail].paid=true; setNotebooks(nb); alert('coupon applied') } else alert('invalid') }

  // simple analytics
  const totalUsers = users.length
  const activeUsers = users.filter(u=> u.lastLogin && (Date.now()-u.lastLogin)<1000*60*60*24*30).length

  // UI
  if(view==='landing') return (
    <div className='app'>
      <div className='nav card'>
        <div className='brand'><div className='logo'/> <div><div className='h1'>Avocado Bullets</div><div className='small'>Step 2 CK Notes Simplified</div></div></div>
        <div>
          <button className='btn' onClick={()=> setView('login')}>Login / Signup</button>
        </div>
      </div>
      <div className='app' style={{marginTop:20}}>
        <div className='card'>
          <h3>Welcome — quick features</h3>
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
        <div className='brand'><div className='logo'/> <div><div className='h1'>Avocado Bullets</div><div className='small'>Step 2 CK Notes Simplified</div></div></div>
        <div><button className='btn' onClick={()=> setDark(d=>!d)}>{dark? 'Light':'Dark'}</button></div>
      </div>
      <div className='app' style={{marginTop:20}}>
        <div style={{maxWidth:720,margin:'0 auto'}}>
          <div className='card'>
            <h3>Login</h3>
            <LoginForm onLogin={(data)=> { login(data); const u = users.find(x=> x.email===data.identifier || x.username===data.identifier); if(u) { u.lastLogin=Date.now(); setUsers([...users]); } }} onForgot={()=> { alert('Reset link simulated. Admin can reset real password.') }} />
            <div style={{marginTop:10}} className='smallmuted'>Don't have an account? <button className='link' onClick={()=> setView('signup')}>Sign up</button></div>
          </div>
        </div>
      </div>
    </div>
  )

  if(view==='signup') return (
    <div className='app'>
      <div className='nav card'>
        <div className='brand'><div className='logo'/> <div><div className='h1'>Avocado Bullets</div><div className='small'>Step 2 CK Notes Simplified</div></div></div>
        <div><button className='btn' onClick={()=> setDark(d=>!d)}>{dark? 'Light':'Dark'}</button></div>
      </div>
      <div className='app' style={{marginTop:20}}>
        <div style={{maxWidth:720,margin:'0 auto'}}>
          <div className='card'>
            <h3>Create account</h3>
            <SignupForm onSignup={(d)=> signup(d)} adminBooted={adminBoot} />
            <div style={{marginTop:10}} className='smallmuted'>Already have an account? <button className='link' onClick={()=> setView('login')}>Log in</button></div>
          </div>
        </div>
      </div>
    </div>
  )

  if(view==='dashboard' && current) return (
    <div className='app'>
      <div className='nav card'>
        <div className='brand'><div className='logo'/> <div><div className='h1'>Avocado Bullets</div><div className='small'>Step 2 CK Notes Simplified</div></div></div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div className='smallmuted'>{current.username}</div>
          <button className='btn' onClick={()=> setView('notebook')}>Notebook</button>
          <button className='link' onClick={()=> logout()}>Logout</button>
        </div>
      </div>
      <div className='container'>
        <div className='card'>
          <h3>Master Notes</h3>
          {master.length===0 && <div className='smallmuted'>No master notes yet. Ask admin to add.</div>}
          {master.map(m => (
            <div key={m.id} className='note' style={{marginTop:8}}>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <div>{m.text||<em className='smallmuted'>(empty)</em>}</div>
                <div><input type='checkbox' onChange={()=> toggleSave(current.email,m.id)} checked={(notebooks[current.email]?.saved||[]).includes(m.id)} /></div>
              </div>
            </div>
          ))}
        </div>
        <aside className='card'>
          <h4>Account</h4>
          <div className='smallmuted'>Plan: { (users.find(u=>u.email===current.email)?.free) ? 'Free' : 'Trial/Unpaid' }</div>
          <div style={{marginTop:8}}><button className='btn' onClick={()=> setView('notebook')}>Open Notebook</button></div>
        </aside>
      </div>
    </div>
  )

  if(view==='notebook' && current) return (
    <div className='app'>
      <div className='nav card'>
        <div className='brand'><div className='logo'/> <div><div className='h1'>Avocado Bullets</div><div className='small'>Step 2 CK Notes Simplified</div></div></div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div className='smallmuted'>{current.username}</div>
          <button className='btn' onClick={()=> setView('dashboard')}>Back</button>
          <button className='link' onClick={()=> logout()}>Logout</button>
        </div>
      </div>
      <div className='container'>
        <div className='card'>
          <h3>My Notebook</h3>
          <AddCustom onAdd={(text)=> { addCustom(current.email,text) }} />
          <div style={{marginTop:12}}>
            {(notebooks[current.email]?.custom||[]).map(c=> (
              <div key={c.id} className={'note'} style={{marginTop:8, background: notebooks[current.email]?.highlights?.['custom_'+c.id] ? 'yellow' : undefined }}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <div>{c.text}</div>
                  <div style={{display:'flex',gap:6}}>
                    {HCOLORS.map(col=> <button key={col} className='link' onClick={()=> setHighlight(current.email,'custom_'+c.id,col)}>{col}</button>)}
                    <button className='link' onClick={()=> { const t=prompt('edit',c.text); if(t!==null) editCustom(current.email,c.id,t) }}>Edit</button>
                    <button className='link' onClick={()=> deleteCustom(current.email,c.id)}>Delete</button>
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
            {HCOLORS.map(c=> <span key={c} style={{display:'inline-block',padding:6,marginRight:6,background:c==='yellow'? '#FEF3C7': c==='green'?'#DCFCE7':c==='blue'?'#DBEAFE':c==='pink'?'#FCE7F3':'#FFF7ED',borderRadius:6}}>{c}</span>)}
          </div>
        </aside>
      </div>
    </div>
  )

  if(view==='admin' && current && current.role==='admin') return (
    <div className='app'>
      <div className='nav card'>
        <div className='brand'><div className='logo'/> <div><div className='h1'>Avocado Bullets</div><div className='small'>Step 2 CK Notes Simplified</div></div></div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div className='smallmuted'>{current.username}</div>
          <button className='btn' onClick={()=> setView('admin')}>Dashboard</button>
          <button className='link' onClick={()=> logout()}>Logout</button>
        </div>
      </div>
      <div className='container'>
        <div className='card'>
          <h3>Admin — Master Notes</h3>
          <div style={{marginBottom:8}}><button className='btn' onClick={addMasterNote}>Add Note</button></div>
          {master.map(m => (
            <div key={m.id} className='note' style={{marginTop:8}}>
              <div style={{display:'flex',gap:8}}>
                <input className='input' value={m.text} onChange={(e)=> updateMaster(m.id,{text:e.target.value})} />
                <button className='link' onClick={()=> deleteMaster(m.id)}>Delete</button>
              </div>
            </div>
          ))}
          <hr style={{margin:'12px 0'}} />
          <h4>Free months configuration</h4>
          <FreeMonthEditor months={freeMonths} onChange={(m)=> setFreeMonths(m)} />
          <hr style={{margin:'12px 0'}} />
          <h4>Coupons</h4>
          <CouponEditor onCreate={(c)=> createCoupon(c)} />
        </div>
        <aside className='card'>
          <h4>Users & Analytics</h4>
          <div className='smallmuted'>Total users: {totalUsers}</div>
          <div className='smallmuted'>Active (30d): {activeUsers}</div>
          <div style={{marginTop:8}}>
            {users.map(u => (
              <div key={u.email} style={{padding:8, borderRadius:8, background:'#fff', marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontWeight:700}}>{u.username} {u.role==='admin'? '(admin)': ''}</div>
                    <div className='smallmuted'>{u.email}</div>
                    <div className='smallmuted'>notes saved: {(notebooks[u.email]?.saved||[]).length}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {u.role!=='admin' && <button className='link' onClick={()=> adminResetPassword(u.email)}>Reset PW</button>}
                    {u.role!=='admin' && <button className='link' onClick={()=> adminToggleDisable(u.email)}>Disable</button>}
                    <button className='link' onClick={()=> grantFree(u.email)}>Give Free</button>
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

// Small components

function LoginForm({onLogin,onForgot}){
  const [id,setId]=useState(''); const [pw,setPw]=useState('')
  return <div>
    <div style={{marginBottom:8}}><input className='input' placeholder='username or email' value={id} onChange={e=>setId(e.target.value)} /></div>
    <div style={{marginBottom:8}}><input className='input' placeholder='password' type='password' value={pw} onChange={e=>setPw(e.target.value)} /></div>
    <div style={{display:'flex',gap:8}}>
      <button className='btn' onClick={()=> onLogin({identifier:id,password:pw})}>Login</button>
      <button className='link' onClick={()=> onForgot()}>Forgot</button>
    </div>
  </div>
}

function SignupForm({onSignup,adminBooted}){
  const [email,setEmail]=useState(''); const [username,setUsername]=useState(''); const [pw,setPw]=useState('')
  return <div>
    <div style={{marginBottom:8}}><input className='input' placeholder='email' value={email} onChange={e=>setEmail(e.target.value)} /></div>
    <div style={{marginBottom:8}}><input className='input' placeholder="username (admin reserved)" value={username} onChange={e=>setUsername(e.target.value)} /></div>
    <div style={{marginBottom:8}}><input className='input' placeholder='password' type='password' value={pw} onChange={e=>setPw(e.target.value)} /></div>
    <div style={{display:'flex',gap:8}}>
      <button className='btn' onClick={()=> onSignup({email,username,password:pw})}>Create</button>
    </div>
  </div>
}

function AddCustom({onAdd}){
  const [t,setT]=useState('')
  return <div>
    <div style={{display:'flex',gap:8}}><input className='input' placeholder='write quick note' value={t} onChange={e=>setT(e.target.value)} /> <button className='btn' onClick={()=>{ if(t.trim()) { onAdd(t.trim()); setT('') }}}>Add</button></div>
  </div>
}

function FreeMonthEditor({months,onChange}){
  const [m,setM]=useState(months||[])
  function toggle(mon){ const copy=[...m]; const idx=copy.indexOf(mon); if(idx>-1) copy.splice(idx,1); else copy.push(mon); setM(copy); onChange(copy) }
  const all = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return <div>
    <div className='smallmuted'>Select months to make free after launch</div>
    <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
      {all.map(mon=> <button key={mon} className='link' onClick={()=> toggle(mon)} style={{padding:6, borderRadius:6, background:m.includes(mon)?'#e6ffee':'transparent'}}>{mon}</button>)}
    </div>
  </div>
}

function CouponEditor({onCreate}){
  const [code,setCode]=useState('')
  return <div>
    <div style={{display:'flex',gap:8}}><input className='input' placeholder='coupon code' value={code} onChange={e=>setCode(e.target.value)} /> <button className='btn' onClick={()=>{ if(code.trim()){ onCreate(code.trim()); setCode('') }}}>Create</button></div>
  </div>
}

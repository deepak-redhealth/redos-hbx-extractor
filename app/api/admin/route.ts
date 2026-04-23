// app/api/admin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { decodeToken } from '@/lib/auth';

interface User { id: string; email: string; name: string; passwordHash: string; role: string; enabled: boolean; createdAt: string; createdBy: string; lastLogin?: string; department?: string; allowedSources?: string[]; }

const BUILTIN: User = { id: '1', email: 'deepak.k@red.health', name: 'Deepak Kumar', passwordHash: '$2a$10$S7Zz0gSsxRqSHwLGv0r.XeH/JPiRmg2u1ouwVVlPW39xXF6YxI2BS', role: 'admin', enabled: true, createdAt: '2026-01-01T00:00:00.000Z', createdBy: 'system', department: 'Technology', allowedSources: ['both'] };
const PROJ = 'prj_9pNSvzrjQYroEle0pDA406OXK54I';
const TEAM = 'team_Ien3F9Xg4cWnh1JVBQC8gV9O';

async function readFromVercel(): Promise<User[] | null> {
  const t = process.env.VERCEL_TOKEN; if (!t) return null;
  try {
    const lr = await fetch(`https://api.vercel.com/v9/projects/${PROJ}/env?teamId=${TEAM}`, { headers: { Authorization: `Bearer ${t}` } });
    const ld = await lr.json();
    const ev = ld.envs?.find((e: any) => e.key === 'USERS_JSON'); if (!ev) return null;
    const vr = await fetch(`https://api.vercel.com/v9/projects/${PROJ}/env/${ev.id}?teamId=${TEAM}&decrypt=true`, { headers: { Authorization: `Bearer ${t}` } });
    const vd = await vr.json();
    if (vd.value?.startsWith('[')) return JSON.parse(vd.value);
  } catch {}
  return null;
}

async function getUsers(): Promise<User[]> {
  const all: User[] = [];
  if (process.env.NODE_ENV === 'production') { const v = await readFromVercel(); if (v?.length) all.push(...v); }
  if (!all.length) { try { const r = process.env.USERS_JSON?.trim(); if (r?.startsWith('[')) { const u = JSON.parse(r); if (u.length) all.push(...u); } } catch {} }
  if (!all.length) { try { const fs = require('fs'), path = require('path'), f = path.join(process.cwd(),'users.json'); if (fs.existsSync(f)) { const u = JSON.parse(fs.readFileSync(f,'utf8')); if (u.length) all.push(...u); } } catch {} }
  if (!all.some(u => u.email === BUILTIN.email)) all.push(BUILTIN);
  return all;
}

async function saveUsers(users: User[]): Promise<{ok:boolean;message?:string}> {
  const json = JSON.stringify(users);
  if (process.env.NODE_ENV !== 'production') { try { const fs=require('fs'),path=require('path'); fs.writeFileSync(path.join(process.cwd(),'users.json'),JSON.stringify(users,null,2)); return {ok:true}; } catch(e:any){return{ok:false,message:e.message};} }
  const t = process.env.VERCEL_TOKEN; if (!t) return {ok:false,message:'VERCEL_TOKEN not set'};
  try {
    const lr = await fetch(`https://api.vercel.com/v9/projects/${PROJ}/env?teamId=${TEAM}`,{headers:{Authorization:`Bearer ${t}`}});
    const ld = await lr.json(); const ex = ld.envs?.find((e:any)=>e.key==='USERS_JSON');
    if (ex) { const r = await fetch(`https://api.vercel.com/v9/projects/${PROJ}/env/${ex.id}?teamId=${TEAM}`,{method:'PATCH',headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json'},body:JSON.stringify({value:json})}); if(!r.ok) return{ok:false,message:'PATCH failed: '+await r.text()}; }
    else { const r = await fetch(`https://api.vercel.com/v10/projects/${PROJ}/env?teamId=${TEAM}`,{method:'POST',headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json'},body:JSON.stringify({key:'USERS_JSON',value:json,type:'encrypted',target:['production','preview','development']})}); if(!r.ok) return{ok:false,message:'POST failed: '+await r.text()}; }
    return {ok:true};
  } catch(e:any){return{ok:false,message:e.message};}
}

function requireAdmin(req: NextRequest): {email:string}|NextResponse {
  const t = req.headers.get('authorization')?.replace('Bearer ',''); if (!t) return NextResponse.json({error:'Unauthorized'},{status:401});
  const d = decodeToken(t); if (!d) return NextResponse.json({error:'Invalid token'},{status:401});
  return {email:d.email};
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req); if (auth instanceof NextResponse) return auth;
  const users = await getUsers();
  return NextResponse.json({ users: users.map(u=>({id:u.id,email:u.email,name:u.name,role:u.role,enabled:u.enabled,createdAt:u.createdAt,createdBy:u.createdBy,lastLogin:u.lastLogin,department:u.department,allowedSources:u.allowedSources})) });
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req); if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json(); const {action} = body; const users = await getUsers();
    if (action==='create') {
      const {email,name,password,role,department,allowedSources}=body;
      if (!email||!name||!password) return NextResponse.json({error:'Email, name, password required'},{status:400});
      if (users.find(u=>u.email.toLowerCase()===email.toLowerCase())) return NextResponse.json({error:'User already exists'},{status:400});
      users.push({id:Date.now().toString(),email:email.toLowerCase().trim(),name:name.trim(),passwordHash:await bcrypt.hash(password,10),role:role||'analyst',enabled:true,createdAt:new Date().toISOString(),createdBy:auth.email,department,allowedSources:allowedSources||['both']});
    } else if (action==='update') {
      const idx=users.findIndex(u=>u.id===body.id); if(idx===-1) return NextResponse.json({error:'User not found'},{status:404});
      const {action:_a,id:_i,...fields}=body; Object.assign(users[idx],fields);
    } else if (action==='reset_password') {
      const idx=users.findIndex(u=>u.id===body.id); if(idx===-1) return NextResponse.json({error:'User not found'},{status:404});
      if(!body.newPassword||body.newPassword.length<8) return NextResponse.json({error:'Password must be 8+ chars'},{status:400});
      users[idx].passwordHash=await bcrypt.hash(body.newPassword,10);
    } else if (action==='delete') {
      const idx=users.findIndex(u=>u.id===body.id); if(idx===-1) return NextResponse.json({error:'User not found'},{status:404}); users.splice(idx,1);
    } else return NextResponse.json({error:'Unknown action'},{status:400});
    const result=await saveUsers(users); if(!result.ok) return NextResponse.json({error:result.message},{status:500});
    return NextResponse.json({success:true});
  } catch(err:any){return NextResponse.json({error:err.message},{status:500});}
}

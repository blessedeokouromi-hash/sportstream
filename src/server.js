const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data', 'db.json');
const PORT = Number(process.env.PORT || 3000);
const ADMIN_KEY = process.env.ADMIN_KEY || 'dev-admin-change-me';

const initial = {
  matches: [
    {id:'m1',sport:'Football',league:'Premier League',home:'Arsenal',away:'Chelsea',kickoff:new Date(Date.now()+3600000).toISOString(),status:'upcoming',scoreHome:0,scoreAway:0,streamUrl:'',streamType:'hls',featured:true},
    {id:'m2',sport:'Football',league:'La Liga',home:'Barcelona',away:'Real Madrid',kickoff:new Date(Date.now()+7200000).toISOString(),status:'upcoming',scoreHome:0,scoreAway:0,streamUrl:'',streamType:'hls',featured:true},
    {id:'m3',sport:'Basketball',league:'NBA',home:'Lakers',away:'Warriors',kickoff:new Date(Date.now()+10800000).toISOString(),status:'upcoming',scoreHome:0,scoreAway:0,streamUrl:'',streamType:'hls',featured:false}
  ],
  ads: [
    {id:'a1',title:'Your brand belongs here',label:'Sponsored',placement:'banner',imageUrl:'',targetUrl:'#',active:true,impressions:0,clicks:0},
    {id:'a2',title:'Advertise on SportStream',label:'Advertisement',placement:'video',videoUrl:'',targetUrl:'#',active:true,impressions:0,clicks:0}
  ], users: [], favorites: [], events: []
};
function db(){ if(!fs.existsSync(DATA)){fs.writeFileSync(DATA,JSON.stringify(initial,null,2));} return JSON.parse(fs.readFileSync(DATA,'utf8')); }
function save(d){fs.writeFileSync(DATA,JSON.stringify(d,null,2));}
function send(res,status,obj){res.writeHead(status,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(obj));}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>s+=c);req.on('end',()=>{try{resolve(s?JSON.parse(s):{});}catch(e){reject(e);}});});}
function safe(s,max=300){return String(s??'').trim().slice(0,max);}
function admin(req,res){if(req.headers['x-admin-key']!==ADMIN_KEY){send(res,401,{error:'Admin authorization required'});return false;}return true;}
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type,X-Admin-Key','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS'});return res.end();}
  const url=new URL(req.url,'http://localhost'); const p=url.pathname;
  try {
    if(p.startsWith('/api/')){
      const d=db();
      if(req.method==='GET'&&p==='/api/health')return send(res,200,{ok:true,service:'SportStream API',version:'1.0.0'});
      if(req.method==='GET'&&p==='/api/matches')return send(res,200,d.matches.filter(m=>url.searchParams.get('sport')?m.sport.toLowerCase()===url.searchParams.get('sport').toLowerCase():true));
      if(req.method==='GET'&&p==='/api/ads')return send(res,200,d.ads.filter(a=>a.active));
      if(req.method==='POST'&&p.startsWith('/api/ads/')&&p.endsWith('/impression')){const id=p.split('/')[3],a=d.ads.find(x=>x.id===id);if(a)a.impressions++;save(d);return send(res,200,{ok:true});}
      if(req.method==='POST'&&p.startsWith('/api/ads/')&&p.endsWith('/click')){const id=p.split('/')[3],a=d.ads.find(x=>x.id===id);if(a)a.clicks++;save(d);return send(res,200,{ok:true});}
      if(req.method==='POST'&&p==='/api/favorites'){const b=await body(req);const userId=safe(b.userId,100),matchId=safe(b.matchId,100);if(!userId||!d.matches.some(m=>m.id===matchId))return send(res,400,{error:'Valid userId and matchId required'});const exists=d.favorites.some(f=>f.userId===userId&&f.matchId===matchId);d.favorites=exists?d.favorites.filter(f=>!(f.userId===userId&&f.matchId===matchId)):[...d.favorites,{userId,matchId}];save(d);return send(res,200,{favorited:!exists});}
      if(req.method==='POST'&&p==='/api/admin/matches'){if(!admin(req,res))return;const b=await body(req);if(!b.home||!b.away)return send(res,400,{error:'Home and away teams are required'});const m={id:crypto.randomUUID(),sport:safe(b.sport,40)||'Football',league:safe(b.league,80),home:safe(b.home,80),away:safe(b.away,80),kickoff:b.kickoff||new Date().toISOString(),status:['live','upcoming','finished'].includes(b.status)?b.status:'upcoming',scoreHome:Number(b.scoreHome)||0,scoreAway:Number(b.scoreAway)||0,streamUrl:safe(b.streamUrl,1000),streamType:'hls',featured:!!b.featured};d.matches.unshift(m);save(d);return send(res,201,m);}
      if(req.method==='PATCH'&&p.startsWith('/api/admin/matches/')){if(!admin(req,res))return;const id=p.split('/').pop(),m=d.matches.find(x=>x.id===id);if(!m)return send(res,404,{error:'Match not found'});const b=await body(req);for(const k of ['sport','league','home','away','kickoff','status','streamUrl'])if(b[k]!==undefined)m[k]=safe(b[k],1000);for(const k of ['scoreHome','scoreAway'])if(b[k]!==undefined)m[k]=Math.max(0,Number(b[k])||0);if(b.featured!==undefined)m.featured=!!b.featured;save(d);return send(res,200,m);}
      if(req.method==='DELETE'&&p.startsWith('/api/admin/matches/')){if(!admin(req,res))return;const id=p.split('/').pop();d.matches=d.matches.filter(m=>m.id!==id);save(d);return send(res,200,{ok:true});}
      if(req.method==='POST'&&p==='/api/admin/ads'){if(!admin(req,res))return;const b=await body(req);const a={id:crypto.randomUUID(),title:safe(b.title,120)||'Sponsored',label:safe(b.label,40)||'Advertisement',placement:['banner','video','sidebar'].includes(b.placement)?b.placement:'banner',imageUrl:safe(b.imageUrl,1000),videoUrl:safe(b.videoUrl,1000),targetUrl:safe(b.targetUrl,1000)||'#',active:b.active!==false,impressions:0,clicks:0};d.ads.unshift(a);save(d);return send(res,201,a);}
      if(req.method==='PATCH'&&p.startsWith('/api/admin/ads/')){if(!admin(req,res))return;const a=d.ads.find(x=>x.id===p.split('/').pop());if(!a)return send(res,404,{error:'Ad not found'});const b=await body(req);for(const k of ['title','label','placement','imageUrl','videoUrl','targetUrl'])if(b[k]!==undefined)a[k]=safe(b[k],1000);if(b.active!==undefined)a.active=!!b.active;save(d);return send(res,200,a);}
      if(req.method==='GET'&&p==='/api/admin/overview'){if(!admin(req,res))return;return send(res,200,{matches:d.matches.length,live:d.matches.filter(m=>m.status==='live').length,users:d.users.length,ads:d.ads.length,impressions:d.ads.reduce((n,a)=>n+a.impressions,0),clicks:d.ads.reduce((n,a)=>n+a.clicks,0),ads:d.ads,matchesList:d.matches});}
      return send(res,404,{error:'API route not found'});
    }
    let file=p==='/'?'/index.html':p;file=path.normalize(file).replace(/^([.][.][/\\])+/, '');const full=path.join(ROOT,'public',file);if(!full.startsWith(path.join(ROOT,'public')))return send(res,403,{error:'Forbidden'});fs.readFile(full,(e,data)=>{if(e){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream'});res.end(data);});
  } catch(e){send(res,500,{error:'Server error',detail:process.env.NODE_ENV==='production'?undefined:e.message});}
});
server.listen(PORT,()=>console.log(`SportStream running at http://localhost:${PORT}`));

// Páginas de compartilhar dos jogos aprovados: …/jogos/<id>/ com nome, descrição e miniatura (para o WhatsApp mostrar a foto).
// O site é estático: o WhatsApp lê só este HTML. A miniatura fica no próprio site, porque o servidor não entrega imagem sem chave.
// Uso no site publicado: node tools/jogos-share.mjs <pasta do site>.
// Gasto: 1 consulta da lista por vez; a miniatura só é baixada quando é nova ou mudou.
import fs from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';
const API="https://fguqnhjvfvneipaqnoce.supabase.co/functions/v1/academy",SITE='https://levelup.app.br/',KEY="sb_publishable_UCl41rKzbb90quPWEfyfng_Y4LPvMXn";
const ORIGIN='https://levelup.app.br';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const headers=key=>({apikey:key,Authorization:'Bearer '+key,Origin:ORIGIN});
const style=':root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#101015;color:#f5f4fa;font:16px/1.6 system-ui,sans-serif}header,main,footer{max-width:1080px;margin:auto;padding:24px}header{display:flex;justify-content:space-between;align-items:center;gap:20px}a{color:#d8c4ff}h1{font-size:clamp(28px,5vw,52px);line-height:1.12;margin:16px 0}p{max-width:70ch;white-space:pre-wrap}.hero{width:100%;max-height:480px;object-fit:cover;border-radius:18px}.play{display:inline-block;margin:18px 0;padding:14px 28px;background:#ffe000;color:#101015;border-radius:10px;font-weight:750;text-decoration:none}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px}.card{display:block;background:#1c1c25;border-radius:14px;overflow:hidden;text-decoration:none;color:inherit}.card img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}.card div{padding:18px}.card h2{font-size:22px;line-height:1.3;margin:0}footer{color:#b5b1c1}a:focus-visible{outline:3px solid #ffe000;outline-offset:4px}@media(prefers-reduced-motion:no-preference){a{transition:filter .15s}a:hover{filter:brightness(1.1)}}';
const header=()=>'<header><a href="'+SITE+'"><img src="'+SITE+'brand/wordmark-dark.png" alt="Level Up" width="175" height="50"></a><a href="'+SITE+'descobrir/">Explorar jogos</a></header>';
export function gamePage(g,image,site=SITE){
 const code=g.id.replace(/-/g,''),url=site+'jogos/'+code+'/',play=site+'?jogos&j='+encodeURIComponent(g.id);
 const description=String(g.description||'Jogo criado por '+g.author+' no Studio Up da Level Up.').trim();
 const art=image||site+'brand/share/principal-v1.jpg';
 return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(g.title)+' | Jogue na Level Up</title><meta name="description" content="'+esc(description.slice(0,155))+'"><link rel="canonical" href="'+esc(url)+'"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:site_name" content="Level Up"><meta property="og:locale" content="pt_BR"><meta property="og:url" content="'+esc(url)+'"><meta property="og:title" content="'+esc(g.title)+'"><meta property="og:description" content="'+esc(description.slice(0,155))+'"><meta property="og:image" content="'+esc(art)+'"><meta name="twitter:card" content="summary_large_image"><style>'+style+'</style></head><body>'+header()+'<main><img class="hero" src="'+esc(art)+'" alt="Imagem do jogo '+esc(g.title)+'"><h1>'+esc(g.title)+'</h1><p>Criação de '+esc(g.author||'aluno Level Up')+'</p><p>'+esc(description)+'</p><a class="play" href="'+esc(play)+'">Jogar '+esc(g.title)+'</a><p>Abra o jogo no navegador e conheça as criações dos alunos da Level Up.</p></main><footer><a href="'+site+'">Voltar para a plataforma de jogos</a></footer></body></html>';
}
export function gameSitemap(games,site=SITE){return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+[site+'descobrir/',...games.map(g=>site+'jogos/'+g.id.replace(/-/g,'')+'/')].map(url=>'<url><loc>'+esc(url)+'</loc></url>').join('')+'</urlset>\n'}
export async function run(site,key=KEY,api=API){
 const all=[];for(let offset=0;offset<2000;){
  const r=await fetch(api+'/platform',{method:'POST',headers:{...headers(key),'Content-Type':'application/json'},body:JSON.stringify({action:'games-list',sort:'recent',offset})});
  if(!r.ok)throw new Error('Lista dos jogos: '+r.status);const d=await r.json();all.push(...d.games);if(!d.more||!d.games.length)break;offset+=d.games.length}
 const root=path.join(site,'jogos');await fs.mkdir(root,{recursive:true});const keep=new Set(),published=[];
 for(const g of all){
  if(!/^[\w-]{1,80}$/.test(g.id))continue;const code=g.id.replace(/-/g,'');keep.add(code);const dir=path.join(root,code);await fs.mkdir(dir,{recursive:true});
  const v=/-([a-f0-9]{10})$/.exec(g.thumb||'')?.[1];let image='';
  if(v){const have=(await fs.readdir(dir)).find(n=>n.startsWith('capa-'+v+'.'));
   if(have)image=have;else{const r=await fetch(api+g.thumb,{headers:headers(key)});
    if(r.status===402||r.status===503)continue;
    if(r.ok){const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[r.headers.get('content-type')||'']||'jpg';image='capa-'+v+'.'+ext;
     for(const n of await fs.readdir(dir))if(n.startsWith('capa-'))await fs.rm(path.join(dir,n));await fs.writeFile(path.join(dir,image),new Uint8Array(await r.arrayBuffer()))}}}
  const imageUrl=image?SITE+'jogos/'+code+'/'+image:SITE+'brand/share/principal-v1.jpg';
  await fs.writeFile(path.join(dir,'index.html'),gamePage(g,imageUrl));
  published.push({...g,imageUrl});
 }
 // jogo que saiu do ar: a página sai junto
 for(const n of await fs.readdir(root,{withFileTypes:true}))if(n.isDirectory()&&!keep.has(n.name)&&/^[\w-]{1,80}$/.test(n.name))await fs.rm(path.join(root,n.name),{recursive:true,force:true});
 const discovery=path.join(site,'descobrir');await fs.mkdir(discovery,{recursive:true});
 const cards=published.map(g=>'<a class="card" href="'+SITE+'jogos/'+g.id.replace(/-/g,'')+'/"><img src="'+esc(g.imageUrl)+'" alt="" loading="lazy"><div><h2>'+esc(g.title)+'</h2><p>Por '+esc(g.author||'aluno Level Up')+'</p></div></a>').join('');
 await fs.writeFile(path.join(discovery,'index.html'),'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jogos dos alunos | Explore e jogue na Level Up</title><meta name="description" content="Descubra e jogue as criações dos alunos da Level Up. Escolha um jogo e abra no navegador."><link rel="canonical" href="'+SITE+'descobrir/"><style>'+style+'</style></head><body>'+header()+'<main><h1>Jogos feitos por quem está criando o futuro.</h1><p>Explore as criações dos alunos da Level Up e escolha sua próxima aventura.</p><div class="grid">'+cards+'</div></main><footer><a href="'+SITE+'">Abrir a plataforma de jogos</a></footer></body></html>');
 await fs.writeFile(path.join(site,'sitemap-jogos.xml'),gameSitemap(published));
 return published.length;
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){const n=await run(process.argv[2]||'.');console.log(`Páginas de compartilhar: ${n} jogo(s).`)}

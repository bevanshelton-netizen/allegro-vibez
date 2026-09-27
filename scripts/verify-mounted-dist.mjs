import { readFile, stat } from 'node:fs/promises'

const MOUNT='/functions/v1/allegro-vibez-live/'
const html=await readFile('dist/index.html','utf8')
const fail=(m)=>{console.error('MOUNTED_DIST_FAIL:',m);process.exitCode=2}

const rootEscapes=[
  /(?:src|href)=["']\/assets\//i,
  /(?:src|href)=["']\/av-hero\.webp/i,
  /url\(["']?\/av-hero\.webp/i,
]
for(const rx of rootEscapes) if(rx.test(html)) fail('root-escaping asset reference '+rx)

const assetMounted=
  html.includes(MOUNT+'assets/') ||
  /(?:src|href)=["']\.\/assets\//i.test(html)
if(!assetMounted) fail('compiled JS/CSS assets are not mount-safe')

const heroRef=
  html.includes(MOUNT+'av-hero.webp') ||
  html.includes('./av-hero.webp')
if(!heroRef) fail('hero reference is not mount-safe')

try{
  const s=await stat('dist/av-hero.webp')
  if(!s.isFile()||s.size<1) fail('dist/av-hero.webp is empty')
}catch{fail('dist/av-hero.webp is missing')}

for(const p of ['dist/terms.html','dist/privacy.html','dist/studio/index.html']){
  try{const s=await stat(p);if(!s.isFile()||s.size<1)fail(p+' is empty')}
  catch{fail(p+' is missing')}
}

if(!process.exitCode){
  console.log('ALLEGRO_MOUNTED_DIST=PASS mount='+MOUNT)
}

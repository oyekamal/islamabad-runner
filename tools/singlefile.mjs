// Bundle dist/ into one self-contained HTML (models inlined as data URIs) for easy sharing.
import fs from 'fs';
import path from 'path';
const dist = path.resolve('dist');
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const css = html.match(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/);
if (css) { const c = fs.readFileSync(path.join(dist, css[1]), 'utf8'); html = html.replace(css[0], () => `<style>${c}</style>`); }
const js = html.match(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/);
const models = {};
for (const f of fs.readdirSync(path.join(dist, 'models'))) {
  if (!f.endsWith('.glb')) continue;
  models[f.replace('.glb', '')] = 'data:model/gltf-binary;base64,' + fs.readFileSync(path.join(dist, 'models', f)).toString('base64');
}
const inject = `<script>window.__MODEL_URLS=${JSON.stringify(models)};</script>`;
if (js) { const code = fs.readFileSync(path.join(dist, js[1]), 'utf8').replace(/<\/script/g, '<\\/script'); html = html.replace(js[0], () => `${inject}<script type="module">${code}</script>`); }
html = html.replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n?/g, '');
html = html.replace("window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))", '');
fs.writeFileSync('islamabad-runner-3d.html', html);
console.log('single file:', (fs.statSync('islamabad-runner-3d.html').size / 1048576).toFixed(1), 'MB');

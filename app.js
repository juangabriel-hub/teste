const roomInput = document.getElementById('roomId');
const openLink = document.getElementById('openLink');
const copyBtn = document.getElementById('copyLink');
const newRoomBtn = document.getElementById('newRoom');
const nameInput = document.getElementById('nameInput');
const fileInput = document.getElementById('fileInput');
const drop = document.getElementById('drop');
const gallery = document.getElementById('gallery');
const cardTpl = document.getElementById('card-tpl');

function getRoomFromUrl(){
  const url = new URL(window.location.href);
  return url.searchParams.get('mural') || 'emau5-' + Math.random().toString(36).slice(2,8);
}
function setRoomToUrl(room){
  const url = new URL(window.location.href);
  url.searchParams.set('mural', room);
  history.replaceState(null, '', url);
}
let ROOM = getRoomFromUrl();
setRoomToUrl(ROOM);
roomInput.value = ROOM;
openLink.href = window.location.href;

const API = ''; // same origin (served by Express). If you separate, set base URL here.

async function fetchPhotos(){
  const res = await fetch(`${API}/api/photos?room=${encodeURIComponent(ROOM)}`);
  const data = await res.json();
  render(data);
}

function render(list){
  gallery.innerHTML = '';
  list.forEach(item => {
    const node = cardTpl.content.cloneNode(true);
    node.querySelector('.photo').src = item.url;
    node.querySelector('.name').textContent = item.name || 'Anônimo';
    const captionEl = node.querySelector('.caption');
    captionEl.value = item.caption || '';
    captionEl.addEventListener('change', async (e)=>{
      const caption = e.target.value;
      await fetch(`${API}/api/photos/${item.id}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ caption })
      });
    });
    node.querySelector('.when').textContent = new Date(item.created_at).toLocaleString();
    gallery.appendChild(node);
  });
}

async function uploadFile(file){
  const name = nameInput.value.trim();
  const form = new FormData();
  form.append('room', ROOM);
  form.append('name', name);
  form.append('file', file);
  const res = await fetch(`${API}/api/upload`, { method: 'POST', body: form });
  if (!res.ok) {
    const text = await res.text();
    alert('Falha no upload: ' + text);
    return;
  }
  await fetchPhotos();
}

fileInput.addEventListener('change', async (e)=>{
  const file = e.target.files[0];
  if (file) await uploadFile(file);
});

['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e=>{
  e.preventDefault(); drop.classList.add('drag');
}));
['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e=>{
  e.preventDefault(); drop.classList.remove('drag');
}));
drop.addEventListener('drop', e=>{
  const file = e.dataTransfer.files[0];
  if (file) uploadFile(file);
});

copyBtn.addEventListener('click', async ()=>{
  await navigator.clipboard.writeText(window.location.href);
  alert('Link copiado!');
});
newRoomBtn.addEventListener('click', ()=>{
  ROOM = 'emau5-' + Math.random().toString(36).slice(2,8);
  setRoomToUrl(ROOM);
  roomInput.value = ROOM;
  openLink.href = window.location.href;
  fetchPhotos();
});

fetchPhotos();

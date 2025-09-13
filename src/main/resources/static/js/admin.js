// ===== Config =====
const API_BASE    = window.location.origin; // http://localhost:8081
const PUBLIC_PATH = '/api/products';        // listar/buscar
const ADMIN_PATH  = '/api/products';        // CRUD real (crear/editar/eliminar)

// ===== Helpers UI =====
const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function toast(msg, type = 'success') {
  const alertBox = $('#alertBox');
  if (!alertBox) return alert(msg);
  const id = 'a' + Date.now();
  alertBox.innerHTML = `
    <div id="${id}" class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${msg}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;
  setTimeout(() => document.getElementById(id)?.remove(), 4000);
}

function formatPrice(v){ const n = Number(v || 0); return `S/ ${n.toFixed(2)}`; }

// Debounce helper (para búsqueda en tiempo real)
function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// ===== API =====
async function apiGet(path, { signal } = {}) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', signal });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
}

async function apiWrite(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include' // usa la sesión del login
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${method} ${path} -> ${res.status} ${t}`);
  }
  return res.status === 204 ? null : res.json();
}

// ===== Listado =====
let currentSearchController = null;

async function cargarProductos(q = '') {
  // cancela la búsqueda anterior si aún estaba en vuelo
  if (currentSearchController) currentSearchController.abort();
  currentSearchController = new AbortController();

  try {
    const data = q
      ? await apiGet(`${PUBLIC_PATH}/search?q=${encodeURIComponent(q)}`, { signal: currentSearchController.signal })
      : await apiGet(`${PUBLIC_PATH}`, { signal: currentSearchController.signal });
    renderTabla(data);
  } catch (e) {
    // Ignora cancelaciones (AbortError)
    if (e.name === 'AbortError') return;
    console.error(e);
    toast('Error al cargar productos', 'danger');
  }
}

function renderTabla(items){
  const tbody = $('#tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!Array.isArray(items) || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Sin resultados</td></tr>`;
    return;
  }
  for (const p of items) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.id ?? ''}</td>
      <td>${p.name ?? ''}</td>
      <td>${p.category ?? ''}</td>
      <td class="text-end">${formatPrice(p.price)}</td>
      <td class="text-end">${p.stock ?? 0}</td>
      <td>${p.imageUrl ? `<img src="${p.imageUrl}" alt="img" style="width:50px;height:50px;object-fit:cover;border-radius:6px">` : '<span class="text-muted">—</span>'}</td>
      <td>
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-primary" data-accion="edit" data-id="${p.id}">Editar</button>
          <button class="btn btn-outline-danger" data-accion="del" data-id="${p.id}">Eliminar</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  }
}

// ===== Form =====
function leerForm(){
  return {
    id: $('#prodId')?.value ? Number($('#prodId').value) : undefined,
    name: $('#name')?.value.trim(),
    category: $('#category')?.value,
    price: Number($('#price')?.value),
    stock: Number($('#stock')?.value),
    description: $('#description')?.value.trim(),
    imageUrl: $('#imageUrl')?.value.trim() || null,
  };
}

function validar(p){
  if (!p.name) return 'El nombre es obligatorio';
  if (!p.category) return 'Selecciona una categoría';
  if (isNaN(p.price) || p.price < 0) return 'Precio inválido';
  if (!Number.isInteger(p.stock) || p.stock < 0) return 'Stock inválido';
  return null;
}

function llenarForm(p){
  if ($('#prodId')) $('#prodId').value = p.id ?? '';
  if ($('#name')) $('#name').value = p.name ?? '';
  if ($('#category')) $('#category').value = p.category ?? '';
  if ($('#price')) $('#price').value = p.price ?? '';
  if ($('#stock')) $('#stock').value = p.stock ?? '';
  if ($('#description')) $('#description').value = p.description ?? '';
  if ($('#imageUrl')) $('#imageUrl').value = p.imageUrl ?? '';
  $('#name')?.focus();
}
function limpiarForm(){ llenarForm({}); }

// ===== Handlers de barra (Nuevo / Buscar / Refrescar / Live Search) =====
$('#btnNuevo')?.addEventListener('click', () => { 
  limpiarForm(); 
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
$('#btnBuscar')?.addEventListener('click', () => cargarProductos($('#q')?.value.trim() || ''));
$('#q')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); $('#btnBuscar')?.click(); }
});
$('#btnRefrescar')?.addEventListener('click', () => { if ($('#q')) $('#q').value=''; cargarProductos(); });
$('#btnLimpiar')?.addEventListener('click', limpiarForm);

// Live search con debounce (teclea y busca)
const doLiveSearch = debounce(() => {
  const q = $('#q')?.value.trim() || '';
  // si quieres evitar llamadas con 1 letra, descomenta:
  // if (q.length < 2) return cargarProductos('');
  cargarProductos(q);
}, 300);
$('#q')?.addEventListener('input', doLiveSearch);

// ===== Handlers de acciones en tabla =====
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-accion]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const tr = btn.closest('tr');

  if (btn.dataset.accion === 'edit') {
    const p = {
      id,
      name: tr.children[1].textContent,
      category: tr.children[2].textContent,
      price: Number(tr.children[3].textContent.replace('S/','').trim()),
      stock: Number(tr.children[4].textContent),
      imageUrl: tr.querySelector('img')?.getAttribute('src') || '',
      description: '' // si quieres, usa GET /api/products/{id} para traer descripción real
    };
    llenarForm(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (btn.dataset.accion === 'del') {
    const nombre = tr.children[1].textContent;
    const modalEl = document.getElementById('modalEliminar');
    if (modalEl && window.bootstrap) {
      const delNombre = document.getElementById('delNombre');
      const delId = document.getElementById('delId');
      if (delNombre) delNombre.textContent = nombre;
      if (delId) delId.textContent = String(id);

      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();

      const confirmBtn = document.getElementById('btnConfirmEliminar');
      if (!confirmBtn) return;
      const handler = async () => {
        confirmBtn.removeEventListener('click', handler);
        try {
          await apiWrite('DELETE', `${ADMIN_PATH}/${id}`);
          toast('Producto eliminado');
          cargarProductos($('#q')?.value.trim() || '');
          modal.hide();
        } catch (err) {
          console.error(err);
          toast('No se pudo eliminar', 'danger');
        }
      };
      confirmBtn.addEventListener('click', handler, { once: true });
    } else {
      if (!confirm(`¿Eliminar "${nombre}"?`)) return;
      try {
        await apiWrite('DELETE', `${ADMIN_PATH}/${id}`);
        toast('Producto eliminado');
        cargarProductos($('#q')?.value.trim() || '');
      } catch (err) {
        console.error(err);
        toast('No se pudo eliminar', 'danger');
      }
    }
  }
});

// ===== Submit del formulario (crear/actualizar) =====
$('#formProducto')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const p = leerForm();
  const error = validar(p);
  if (error) return toast(error, 'warning');

  try {
    if (p.id) {
      const { id, ...dto } = p;
      await apiWrite('PUT', `${ADMIN_PATH}/${id}`, dto);
      toast('Producto actualizado');
    } else {
      await apiWrite('POST', `${ADMIN_PATH}`, p);
      toast('Producto creado');
    }
    limpiarForm();
    cargarProductos($('#q')?.value.trim() || '');
  } catch (e) {
    console.error(e);
    toast('Error al guardar', 'danger');
  }
});

// ===== Init =====
(function init(){
  cargarProductos();
})();

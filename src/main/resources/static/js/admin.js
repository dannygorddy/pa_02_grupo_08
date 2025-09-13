const API_BASE = 'http://localhost:8081'; // ajusta si corresponde
if (!p.name) return 'El nombre es obligatorio';
if (!p.category) return 'Selecciona una categoría';
if (isNaN(p.price) || p.price < 0) return 'Precio inválido';
if (!Number.isInteger(p.stock) || p.stock < 0) return 'Stock inválido';
return null;

function llenarForm(p) {
$('#prodId').value = p.id ?? '';
$('#name').value = p.name ?? '';
$('#category').value = p.category ?? '';
$('#price').value = p.price ?? '';
$('#stock').value = p.stock ?? '';
$('#description').value = p.description ?? '';
$('#imageUrl').value = p.imageUrl ?? '';
$('#name').focus();
}


function limpiarForm() {
llenarForm({});
}


// === Handlers ===
$('#btnGuardarKey').addEventListener('click', saveAdminKey);
$('#btnBuscar').addEventListener('click', () => cargarProductos($('#q').value.trim()));
$('#btnRefrescar').addEventListener('click', () => { $('#q').value=''; cargarProductos(); });
$('#btnLimpiar').addEventListener('click', limpiarForm);


document.addEventListener('click', async (e) => {
const btn = e.target.closest('button[data-accion]');
if (!btn) return;
const id = Number(btn.dataset.id);
if (btn.dataset.accion === 'edit') {
// busca el producto desde la fila
const tr = btn.closest('tr');
const p = {
id,
name: tr.children[1].textContent,
category: tr.children[2].textContent,
price: Number(tr.children[3].textContent.replace('S/','').trim()),
stock: Number(tr.children[4].textContent),
imageUrl: tr.querySelector('img')?.getAttribute('src') || '',
description: '' // opcional: podrías traerlo con GET /api/products/{id}
};
llenarForm(p);
}
if (btn.dataset.accion === 'del') {
if (!confirm('¿Eliminar este producto?')) return;
try {
await apiAdmin('DELETE', `/api/admin/products/${id}`);
toast('Producto eliminado');
cargarProductos($('#q').value.trim());
} catch (err) {
console.error(err);
toast('No se pudo eliminar', 'danger');
}
}
});


$('#formProducto').addEventListener('submit', async (e) => {
e.preventDefault();
const p = leerForm();
const error = validar(p);
if (error) return toast(error, 'warning');


try {
if (p.id) {
// actualizar
const { id, ...dto } = p;
await apiAdmin('PUT', `/api/admin/products/${id}`, dto);
toast('Producto actualizado');
} else {
// crear
await apiAdmin('POST', '/api/admin/products', p);
toast('Producto creado');
}
limpiarForm();
cargarProductos($('#q').value.trim());
} catch (err) {
console.error(err);
toast('Error al guardar. Verifica tu X-ADMIN-KEY.', 'danger');
}
});


// === Init ===
(function init(){
preloadAdminKey();
cargarProductos();
})();
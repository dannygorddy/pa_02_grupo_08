// ==== API base ====
const API = '/api';

// ==== Reset de historial en recarga de página
/*(function resetHistorialOnReload() {
  try {
    const navEntry = performance.getEntriesByType?.('navigation')?.[0];
    const isReload = navEntry ? (navEntry.type === 'reload')
                              : (performance?.navigation?.type === 1); // fallback antiguo

    if (isReload) {
      // Borra todas las variantes de claves que puedas estar usando
      localStorage.removeItem('orders');      
      localStorage.removeItem('pedidos');     
      localStorage.removeItem('facturas');     
      localStorage.removeItem('lastOrderId'); 
     
      console.info('[reset] Historial de pedidos y facturas limpiado por recarga.');
    }
  } catch (e) {
    console.warn('[reset] No se pudo evaluar el tipo de navegación:', e);
  }
})(); */

// === Estado y helpers de categorías (FRONT) ===
const state = { productos: [], cat: 'Todas', q: '' };

function categoriasUnicas(arr){
  return ['Todas', ...Array.from(new Set(arr.map(p => (p.category || 'Otros'))))];
}

function renderTabs(cats) {
  const ul = document.getElementById('cat-tabs');
  if (!ul) return;
  ul.innerHTML = cats.map(c => `
    <li class="nav-item">
      <button class="btn btn-outline-primary ${state.cat===c?'active':''}" data-cat="${c}">${c}</button>
    </li>
  `).join('');

  // delegación: un solo handler para todos los botones
  ul.onclick = (e) => {
    const btn = e.target.closest('button[data-cat]');
    if (!btn) return;
    state.cat = btn.dataset.cat;
    applyFilters(state.q, state.cat);
    [...ul.querySelectorAll('button[data-cat]')]
      .forEach(b => b.classList.toggle('active', b === btn));
  };
}

function applyFilters(q, cat){
  state.q = (q || '').trim().toLowerCase();
  let data = state.productos.slice();

  if (cat && cat !== 'Todas') {
    data = data.filter(p => (p.category || '').toLowerCase() === cat.toLowerCase());
  }
  if (state.q) {
    data = data.filter(p =>
      (p.name || '').toLowerCase().includes(state.q) ||
      String(p.price ?? '').includes(state.q)
    );
  }

  renderProductos(data);
  const nr = document.getElementById('no-results');
  nr && (nr.hidden = data.length !== 0);
}

// ==== Utilidades y estado ====
const PEN = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

// ==== Helpers ====
const save = () => localStorage.setItem("carrito", JSON.stringify(carrito));
const totalItems = () => carrito.reduce((a, i) => a + i.cantidad, 0);
const totalMonto  = () => carrito.reduce((a, i) => a + i.precio * i.cantidad, 0);
const $ = (sel) => document.querySelector(sel);

function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
// ==== Productos: cargar / buscar desde el backend ====
async function cargarProductos() {
  const sp = document.getElementById('loading');
  const nr = document.getElementById('no-results');
  sp && (sp.hidden = false);
  nr && (nr.hidden = true);

  try {
    const r = await fetch(`${API}/products`);
    if (!r.ok) throw new Error('API /products no disponible');
    const productos = await r.json();

    // 👇 Nuevo: guardamos todo y construimos tabs
    state.productos = productos;
    renderTabs(categoriasUnicas(productos));

    // Arranca mostrando "Todas" (cámbialo por 'Abarrotes' si prefieres)
    state.cat = 'Todas';
    applyFilters('', state.cat);
  } catch (e) {
    console.warn('[API]', e.message);
    nr && (nr.hidden = false);
    document.querySelector('#lista-productos')?.replaceChildren();
  } finally {
    sp && (sp.hidden = true);
  }
}
// Click en tarjetas de categoría (filtra productos por categoría)
document.addEventListener('click', (e) => {
  const card = e.target.closest('.cat-card[data-cat-link]');
  if (!card) return;
  e.preventDefault();

  // 1) fijar categoría activa
  const cat = card.dataset.catLink;          // "Abarrotes" | "Juguetería" | "Oficina"
  state.cat = cat;

  // 2) aplicar filtros con la búsqueda actual (state.q)
  applyFilters(state.q, state.cat);

  // 3) marcar activo el tab correspondiente (si existe el #cat-tabs)
  const tabs = document.getElementById('cat-tabs');
  if (tabs) {
    [...tabs.querySelectorAll('button[data-cat]')]
      .forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  }

  // 4) hacer scroll suave a la lista de productos
  document.getElementById('lista-productos')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});




async function buscarProductos(q) {
  try {
    const r = await fetch(`${API}/products/search?q=${encodeURIComponent(q || '')}`);
    const data = await r.json();
    renderProductos(data);
  } catch (e) {
    console.error('Error en búsqueda:', e);
  }
}

function renderProductos(productos) {
  const cont = document.querySelector('#lista-productos');
  if (!cont) return; // si no estamos en tienda.html, no hace nada
  cont.innerHTML = productos.map(p => `
    <div class="col-md-4">
      <div class="card h-100 producto">
        <img src="${escapeHTML(p.imageUrl || 'img/placeholder.png')}" class="card-img-top" alt="${escapeHTML(p.name || '')}">
        <div class="card-body">
          <h5 class="card-title">${escapeHTML(p.name || '')}</h5>
          <p class="card-text">S/ ${Number(p.price ?? 0).toFixed(2)} — Stock: ${p.stock ?? 0}</p>
          <button class="btn btn-primary w-100 add-to-cart"
                  data-nombre="${escapeHTML(p.name || '')}"
                  data-precio="${Number(p.price ?? 0)}"
                  data-img="${escapeHTML(p.imageUrl || 'img/placeholder.png')}"
                  data-seller="CuscoStore">
            Agregar al carrito
          </button>
        </div>
      </div>
    </div>
  `).join('');
}


// === Checkout: impuestos/envío/cupón ===
const TAX_RATE = 0.18;
const SHIPPING_DELIVERY = 10.00;
const SHIPPING_RECOJO = 0.00;
let envioActual = SHIPPING_DELIVERY;
let descuentoActual = 0;

function calcularDesglose() {
 
  const sub = typeof totalMontoSeleccionado === "function" ? totalMontoSeleccionado() : totalMonto();
  const igv = sub * TAX_RATE;
  const total = sub + igv + envioActual - descuentoActual;
  return { sub, igv, envio: envioActual, descuento: descuentoActual, total: Math.max(total, 0) };
}
function aplicarCupon(code) {
  const sub = typeof totalMontoSeleccionado === "function" ? totalMontoSeleccionado() : totalMonto();
  descuentoActual = (code.trim().toUpperCase() === "AHORRO10" && sub > 0) ? sub * 0.10 : 0;
}

// === FAB Carrito (creación y actualización) ===
function createCartFAB() {
  // No mostrar FAB en la página de carrito
  if (location.pathname.endsWith("carrito.html")) return;

  if (document.getElementById("cart-fab")) return; // evita duplicados
  const a = document.createElement("a");
  a.id = "cart-fab";
  a.href = "carrito.html";
  a.className = "btn btn-primary position-fixed";
  a.setAttribute("aria-label", "Ir al carrito");
  a.innerHTML = `
    <span class="fab-icon" aria-hidden="true">🛒</span>
    <span class="badge bg-warning text-dark" id="fabCount">0</span>
  `;
  document.body.appendChild(a);
}
function updateCartFAB() {
  const fabCount = document.getElementById("fabCount");
  if (fabCount) fabCount.textContent = totalItems();
}
function pulseFAB() {
  const fab = document.getElementById("cart-fab");
  if (!fab) return;
  fab.classList.remove("pulse");
  void fab.offsetWidth;           // reflow para reiniciar animación
  fab.classList.add("pulse");
}

function pintarBadge() {
  const badge = $("#badgeCarrito");
  if (badge) badge.textContent = totalItems();
  updateCartFAB();

  const live = $("#cartLive");
  if (live) {
    live.textContent = `Carrito: ${totalItems()} artículo(s), total ${PEN.format(totalMonto())}`;
  }
}

// ==== Carrito: operaciones ====
function agregar(nombre, precio, img, seller) {
  const prod = carrito.find(p => p.nombre === nombre);
  if (prod) {
    prod.cantidad += 1;
    // completa datos si viniera de versiones anteriores
    if (!prod.img) prod.img = img || "img/placeholder.png";
    if (!prod.seller) prod.seller = seller || "MiTienda";
    if (typeof prod.selected === "undefined") prod.selected = true;
  } else {
    carrito.push({
      nombre,
      precio: +precio,
      cantidad: 1,
      img: img || "img/placeholder.png",
      seller: seller || "MiTienda",
      selected: true     // por defecto marcado
    });
  }
  save(); pintarBadge(); pulseFAB();
  pintarLista(); // para refrescar si estamos en carrito
}

function eliminar(nombre) {
  carrito = carrito.filter(p => p.nombre !== nombre);
  save(); pintarBadge(); pintarLista();
}

function cambiarCantidad(nombre, cantidad) {
  const prod = carrito.find(p => p.nombre === nombre);
  if (!prod) return;
  let q = parseInt(cantidad, 10);
  if (isNaN(q) || q < 1) q = 1;
  prod.cantidad = q;
  save(); pintarBadge(); pintarLista();
}

function vaciar() {
  carrito = [];
  save(); pintarBadge(); pintarLista();
}

// ==== Render: lista estilo marketplace (carrito.html) ====
function pintarLista() {
  const ul = $("#listaCarrito");
  if (!ul) return;

  ul.innerHTML = "";

  // Seleccionar todos (checkbox maestro)
  const selectAll = $("#selectAll");
  if (selectAll) {
    const allSelected = carrito.length > 0 && carrito.every(i => i.selected !== false);
    selectAll.checked = allSelected;
  }

  carrito.forEach(item => {
    const li = document.createElement("li");
    li.className = "list-group-item";
    const totalItem = item.precio * item.cantidad;

    li.innerHTML = `
      <div class="cart-line">
        <div>
          <input type="checkbox" class="form-check-input sel-item" ${item.selected === false ? "" : "checked"} aria-label="Seleccionar ${escapeHTML(item.nombre)}">
        </div>
        <div>
          <img src="${escapeHTML(item.img || "img/placeholder.png")}" alt="${escapeHTML(item.nombre)}" class="cart-thumb" loading="lazy">
        </div>
        <div>
          <p class="cart-title">${escapeHTML(item.nombre)}</p>
          <span class="cart-seller">${escapeHTML(item.seller || "MiTienda")}</span>
          <div class="d-flex align-items-center gap-2 mt-1">
            <div class="qty">
              <button class="qty-minus" aria-label="Quitar uno">−</button>
              <input type="number" min="1" value="${item.cantidad}" aria-label="Cantidad">
              <button class="qty-plus" aria-label="Agregar uno">+</button>
            </div>
            <button class="btn btn-sm btn-outline-danger ms-2 eliminar">Eliminar</button>
          </div>
        </div>
        <div class="cart-prices">
          <div class="cart-price-now">${PEN.format(totalItem)}</div>
          <div class="cart-price-old d-none">${PEN.format(totalItem * 1.2)}</div>
        </div>
      </div>
    `;

    // Handlers por ítem
    const sel = li.querySelector(".sel-item");
    sel.addEventListener("change", () => {
      item.selected = sel.checked;
      save(); actualizarTotalesSeleccion(); actualizarSelectAll();
    });

    const inputQty = li.querySelector("input[type='number']");
    li.querySelector(".qty-minus").addEventListener("click", () => {
      const q = Math.max(1, (parseInt(inputQty.value, 10) || 1) - 1);
      inputQty.value = q; cambiarCantidad(item.nombre, q);
    });
    li.querySelector(".qty-plus").addEventListener("click", () => {
      const q = Math.max(1, (parseInt(inputQty.value, 10) || 1) + 1);
      inputQty.value = q; cambiarCantidad(item.nombre, q);
    });
    inputQty.addEventListener("change", () => {
      const q = Math.max(1, parseInt(inputQty.value, 10) || 1);
      inputQty.value = q; cambiarCantidad(item.nombre, q);
    });

    li.querySelector(".eliminar").addEventListener("click", () => {
      eliminar(item.nombre);
    });

    ul.appendChild(li);
  });

  // Contador de seleccionados
  const selCount = $("#selCount");
  if (selCount) {
    const count = carrito.filter(i => i.selected !== false).length;
    selCount.textContent = `(${count} seleccionado${count === 1 ? "" : "s"})`;
  }

  actualizarTotalesSeleccion();
}

// ==== Selección y totales (tipo Falabella) ====
function countSelected() {
  return carrito.filter(i => i.selected !== false).length;
}

function actualizarSelectAll() {
  const selectAll = $("#selectAll");
  if (!selectAll) return;
  const allSelected = carrito.length > 0 && carrito.every(i => i.selected !== false);
  selectAll.checked = allSelected;
}

function totalMontoSeleccionado() {
  return carrito
    .filter(i => i.selected !== false)
    .reduce((acc, i) => acc + i.precio * i.cantidad, 0);
}

function actualizarTotalesSeleccion() {
  // Desglose con IGV + envío - descuento, usando los seleccionados
  const { sub, igv, envio, descuento, total } = calcularDesglose();

  // Total en barra inferior (muestra el total final)
  const totalBar = $("#totalResumen");
  if (totalBar) totalBar.textContent = PEN.format(total);

  // Fallback (por si tienes otro total visible)
  const totalEl = $("#total");
  if (totalEl) totalEl.textContent = PEN.format(total);

  // Si existen labels de desglose, los actualizamos
  const el = (id) => document.getElementById(id);
  el("subtotal") && (el("subtotal").textContent = PEN.format(sub));
  el("igv") && (el("igv").textContent = PEN.format(igv));
  el("envio") && (el("envio").textContent = PEN.format(envio));
  el("descuento") && (el("descuento").textContent = `- ${PEN.format(descuento)}`);

  // Contador “(n seleccionados)”
  const seleccionados = countSelected();
  const selCount = $("#selCount");
  if (selCount) selCount.textContent = `(${seleccionados} seleccionado${seleccionados === 1 ? "" : "s"})`;

  // Habilitar/deshabilitar botón “Continuar compra” y “Pagar ahora”
  const btnComprar = $("#comprar");
  if (btnComprar) btnComprar.disabled = seleccionados === 0;

  // Sincroniza el “Seleccionar todos”
  actualizarSelectAll();

  // Badge + live region
  pintarBadge();
}

// Listener “Seleccionar todos”
document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "selectAll") {
    const checked = e.target.checked;
    carrito.forEach(i => i.selected = checked);
    save();
    pintarLista();               // re-render
    actualizarTotalesSeleccion();
  }
});

/* ========= Factura (helpers + build) ========= */
function metodoPagoLabel(val) {
  switch (val) {
    case "visa": return "Tarjeta Visa";
    case "mastercard": return "Tarjeta MasterCard";
    case "yape": return "Yape";
    case "plin": return "Plin";
    case "efectivo": return "Efectivo contra entrega";
    case "tarjeta": return "Tarjeta";
    default: return "—";
  }
}

function generarOrderId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
  const rnd = Math.floor(Math.random()*9000)+1000;
  return `#PED-${ymd}-${rnd}`;
}

function buildOrderSummary() {
  // 1) Items seleccionados
  const itemsSel = carrito.filter(i => i.selected !== false);
  const tbody = document.getElementById("invBody");
  if (tbody) {
    tbody.innerHTML = "";
    itemsSel.forEach(i => {
      const tr = document.createElement("tr");
      const sub = i.precio * i.cantidad;
      tr.innerHTML = `
        <td>
          <div class="d-flex align-items-center gap-2">
            <img src="${escapeHTML(i.img || "img/placeholder.png")}" alt="${escapeHTML(i.nombre)}"
                 style="width:40px;height:40px;object-fit:contain;border:1px solid #eee;border-radius:8px;background:#fff;padding:4px">
            <div class="fw-semibold">${escapeHTML(i.nombre)}</div>
          </div>
        </td>
        <td class="text-center">${i.cantidad}</td>
        <td class="text-end">${PEN.format(i.precio)}</td>
        <td class="text-end">${PEN.format(sub)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 2) Totales
  const { sub, igv, envio, descuento, total } = calcularDesglose();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("invSub", PEN.format(sub));
  set("invIgv", PEN.format(igv));
  set("invEnv", PEN.format(envio));
  set("invDesc", `- ${PEN.format(descuento)}`);
  set("invTotal", PEN.format(total));

  // 3) Datos del cliente / entrega
  const nombre = document.getElementById("nombre")?.value?.trim() || "—";
  const email  = document.getElementById("email")?.value?.trim() || "—";
  const recojo = document.getElementById("entregaRecojo")?.checked;
  const dir    = document.getElementById("direccion")?.value?.trim() || "";
  const dist   = document.getElementById("distrito")?.value?.trim()  || "";
  const ref    = document.getElementById("referencia")?.value?.trim()|| "";
  const entregaTxt = recojo ? "Recojo en tienda" : [dir, dist, ref].filter(Boolean).join(" · ") || "Delivery (sin dirección)";

  const billName   = document.getElementById("billName");
  const billEmail  = document.getElementById("billEmail");
  const billEntrega= document.getElementById("billEntrega");
  billName  && (billName.textContent = nombre);
  billEmail && (billEmail.textContent = email);
  billEntrega && (billEntrega.textContent = entregaTxt);

  // 4) Método de pago (texto)
  const metodo = document.getElementById("pagoMetodo")?.value || "tarjeta";
  let pagoStr = metodoPagoLabel(metodo);
  if (metodo === "visa" || metodo === "mastercard") {
    const num = document.getElementById("cardNumber")?.value?.replace(/\s+/g, "") || "";
    if (num) pagoStr += ` •••• ${num.slice(-4)}`;
  } else if (metodo === "yape" || metodo === "plin") {
    const cel = document.getElementById("yapePhone")?.value || "";
    if (cel) pagoStr += ` (${cel})`;
  }

  // 5) ID de pedido
  const orderId = document.getElementById("orderId");
  orderId && (orderId.textContent = generarOrderId());
}

// === Imprimir factura ===
document.addEventListener("DOMContentLoaded", () => {
  const btnPrint = document.getElementById("printInvoice");
  if (btnPrint) {
    btnPrint.addEventListener("click", () => {
      window.print();
    });
  }
});

// ===== Helpers de pedidos/facturas =====
function getSelectedItems() {
  return carrito.filter(i => i.selected !== false).map(i => ({
    nombre: i.nombre,
    precio: i.precio,
    cantidad: i.cantidad,
    img: i.img || "img/placeholder.png",
    seller: i.seller || "MiTienda",
    subtotal: +(i.precio * i.cantidad).toFixed(2),
  }));
}

function crearPedido() {
  const { sub, igv, envio, descuento, total } = calcularDesglose();
  const items = getSelectedItems();
  const id = generarOrderId();

  // Datos cliente/entrega
  const nombre = document.getElementById("nombre")?.value?.trim() || "";
  const email  = document.getElementById("email")?.value?.trim() || "";
  const telefono = document.getElementById("telefono")?.value?.trim() || "";
  const recojo = document.getElementById("entregaRecojo")?.checked || false;
  const dir    = document.getElementById("direccion")?.value?.trim() || "";
  const dist   = document.getElementById("distrito")?.value?.trim()  || "";
  const ref    = document.getElementById("referencia")?.value?.trim()|| "";
  const entregaTxt = recojo ? "Recojo en tienda" : [dir, dist, ref].filter(Boolean).join(" · ");

  // Pago
  const metodo = document.getElementById("pagoMetodo")?.value || "tarjeta";
  let pagoStr = metodoPagoLabel(metodo);
  if (metodo === "visa" || metodo === "mastercard" || metodo === "tarjeta") {
    const num = document.getElementById("cardNumber")?.value?.replace(/\s+/g, "") || "";
    if (num) pagoStr += ` •••• ${num.slice(-4)}`;
  } else if (metodo === "yape" || metodo === "plin") {
    const cel = document.getElementById("yapePhone")?.value || "";
    if (cel) pagoStr += ` (${cel})`;
  }

  return {
    id,
    fechaISO: new Date().toISOString(),
    cliente: { nombre, email, telefono },
    entrega: { tipo: recojo ? "recojo" : "delivery", texto: entregaTxt },
    pago: { metodo, etiqueta: pagoStr },
    items,
    totales: {
      subtotal: +sub.toFixed(2),
      igv: +igv.toFixed(2),
      envio: +envio.toFixed(2),
      descuento: +descuento.toFixed(2),
      total: +total.toFixed(2),
    }
  };
}

function guardarPedido(pedido) {
  const key = "orders";
  const arr = JSON.parse(localStorage.getItem(key)) || [];
  arr.push(pedido);
  localStorage.setItem(key, JSON.stringify(arr));
  // También guardamos el último pedido para cargarlo directo en factura.html
  localStorage.setItem("lastOrderId", pedido.id);
}

// ==== Eventos por página ====
document.addEventListener("DOMContentLoaded", () => {
  pintarBadge();
  createCartFAB();
  updateCartFAB();

  // TIENDA: botones "Agregar" (con data-img y data-seller)
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-to-cart");
    if (!btn) return;
    const { nombre, precio, img, seller } = btn.dataset;
    if (!nombre || isNaN(parseFloat(precio))) return;
    agregar(nombre, parseFloat(precio), img, seller);
  });

  // CARRITO: botones y modal
  const btnVaciar = $("#vaciar");
  const btnComprar = $("#comprar");
  if (btnVaciar) btnVaciar.addEventListener("click", vaciar);

  // Render de lista si estamos en carrito.html
  pintarLista();

  // TIENDA: activar sección por hash (#abarrotes/#juguetes/#oficina)
  const hash = location.hash || "#abarrotes";
  const secciones = document.querySelectorAll(".categoria");
  secciones.forEach(sec => (sec.style.display = "none"));
  const activa = document.querySelector(hash);
  if (activa) activa.style.display = "block";

  // Navegación con pills (si existieran)
  const tabs = document.getElementById("tabs");
  if (tabs) {
    tabs.addEventListener("click", (e) => {
      const a = e.target.closest("a[href^='#']");
      if (!a) return;
      e.preventDefault();
      const dest = a.getAttribute("href");
      secciones.forEach(sec => (sec.style.display = "none"));
      const objetivo = document.querySelector(dest);
      if (objetivo) objetivo.style.display = "block";
      history.replaceState(null, "", dest);
    });
  }

  // Tarjetas de categoría (cat-card) con scroll suave
  document.body.addEventListener("click", (e) => {
    const link = e.target.closest("[data-cat-link]");
    if (!link) return;
    e.preventDefault();
    const dest = link.getAttribute("data-cat-link"); // ej: "#abarrotes"
    const secciones2 = document.querySelectorAll(".categoria");
    secciones2.forEach(sec => (sec.style.display = "none"));
    const objetivo = document.querySelector(dest);
    if (objetivo) {
      objetivo.style.display = "block";
      objetivo.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", dest);
    }
  });

  // ====== Navegación de pasos (1: carrito, 2: datos, 3: pago) ======
  let paso = 1; // estado

  const seccionDatos = document.getElementById("checkoutDatos");
  const seccionPago  = document.getElementById("checkoutPago");
  const btnContinuar = document.getElementById("btnContinuar");
  const pagoMetodo   = document.getElementById("pagoMetodo");
  const tarjetaWrap  = document.getElementById("tarjetaWrapper");
  const yapeWrapper  = document.getElementById("yapeWrapper"); // NUEVO

  // Mostrar/ocultar secciones y botones según el paso
  function renderPaso() {
    const btnPagarNow = document.getElementById("comprar");
    if (!btnContinuar || !btnPagarNow) return;

    if (paso === 1) {
      // Solo carrito visible (secciones ocultas)
      seccionDatos && seccionDatos.classList.add("d-none");
      seccionPago  && seccionPago.classList.add("d-none");
      btnContinuar.classList.remove("d-none");
      btnPagarNow.classList.add("d-none");

      // Continuar habilitado solo si hay seleccionados
      btnContinuar.disabled = (countSelected() === 0);
    }
    if (paso === 2) {
      // Mostrar datos
      seccionDatos && seccionDatos.classList.remove("d-none");
      seccionPago  && seccionPago.classList.add("d-none");
      btnContinuar.classList.remove("d-none");
      btnContinuar.textContent = "Continuar a pago";
      btnPagarNow.classList.add("d-none");
    }
    if (paso === 3) {
      // Mostrar pago
      seccionDatos && seccionDatos.classList.remove("d-none");
      seccionPago  && seccionPago.classList.remove("d-none");
      btnContinuar.classList.add("d-none");
      btnPagarNow.classList.remove("d-none");
    }
  }

  // Validación mínima de Paso 2 (nombre+email+T&C)
  function validarPaso2() {
    const nombre = document.getElementById("nombre");
    const email  = document.getElementById("email");
    const term   = document.getElementById("terminos");
    const okCar  = countSelected() > 0;
    const okNom  = nombre && nombre.value.trim().length >= 2;
    const okEm   = email && email.validity.valid && email.value.trim().length > 3;
    const okTyC  = term && term.checked;
    return okCar && okNom && okEm && okTyC;
  }

  // Entrega: toggles y costo
  const rDelivery = document.getElementById("entregaDelivery");
  const rRecojo   = document.getElementById("entregaRecojo");
  const dirWrap   = document.getElementById("direccionWrapper");
  function toggleEntregaUI() {
    if (rRecojo && rRecojo.checked) {
      envioActual = SHIPPING_RECOJO;
      if (dirWrap) dirWrap.style.display = "none";
    } else {
      envioActual = SHIPPING_DELIVERY;
      if (dirWrap) dirWrap.style.display = "";
    }
    actualizarTotalesSeleccion(); // refresca total en barra
  }
  if (rDelivery) rDelivery.addEventListener("change", toggleEntregaUI);
  if (rRecojo)   rRecojo.addEventListener("change",  toggleEntregaUI);
  toggleEntregaUI();

  // Continuar → avanza de paso
  if (btnContinuar) {
    btnContinuar.addEventListener("click", () => {
      if (paso === 1) {
        // Ir a datos
        paso = 2; renderPaso();
      } else if (paso === 2) {
        // Validar datos antes de ir a pago
        if (!validarPaso2()) {
          alert("Completa nombre, email y acepta términos para continuar.");
          return;
        }
        paso = 3; renderPaso();
      }
    });
  }

  // Método de pago: mostrar/ocultar campos según opción (Visa/MasterCard/Yape/Plin/Efectivo)
  if (pagoMetodo) {
    const togglePaymentUI = () => {
      const val = pagoMetodo.value;
      if (val === "visa" || val === "mastercard" || val === "tarjeta") {
        tarjetaWrap && tarjetaWrap.classList.remove("d-none");
        yapeWrapper && yapeWrapper.classList.add("d-none");
      } else if (val === "yape" || val === "plin") {
        tarjetaWrap && tarjetaWrap.classList.add("d-none");
        yapeWrapper && yapeWrapper.classList.remove("d-none");
      } else { // efectivo
        tarjetaWrap && tarjetaWrap.classList.add("d-none");
        yapeWrapper && yapeWrapper.classList.add("d-none");
      }
    };
    pagoMetodo.addEventListener("change", togglePaymentUI);
    togglePaymentUI(); // estado inicial
  }

  // Cupón en Paso 3
  const btnCupon = document.getElementById("aplicarCupon");
  const inputCupon = document.getElementById("cuponInput");
  if (btnCupon && inputCupon) {
    btnCupon.addEventListener("click", () => {
      aplicarCupon(inputCupon.value || "");
      actualizarTotalesSeleccion();
    });
    inputCupon.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); aplicarCupon(inputCupon.value || ""); actualizarTotalesSeleccion(); }
    });
  }

  // VALIDACIÓN según método antes de pagar + CREAR/GUARDAR pedido + redirigir a factura
  if (btnComprar) {
    btnComprar.addEventListener("click", () => {
      if (countSelected() === 0) return;
      if (carrito.length === 0) { alert("Tu carrito está vacío."); return; }

      const metodo = pagoMetodo ? pagoMetodo.value : "visa";
      if (metodo === "visa" || metodo === "mastercard" || metodo === "tarjeta") {
        if (!$("#cardNumber")?.value || !$("#cardExp")?.value || !$("#cardCVV")?.value) {
          alert("Completa los datos de tarjeta.");
          return;
        }
      }
      if (metodo === "yape" || metodo === "plin") {
        if (!$("#yapePhone")?.value) {
          alert("Ingresa el celular vinculado para Yape/Plin.");
          return;
        }
      }

      // Construye el resumen (si usas modal de previsualización)
      buildOrderSummary();

      // Crea y guarda el pedido en historial
      const pedido = crearPedido();
      guardarPedido(pedido);

      // Limpia carrito y redirige a la factura imprimible
      vaciar();
      location.href = `factura.html?id=${encodeURIComponent(pedido.id)}`;
    });
  }

  // Confirmación final (si usaras modal en vez de redirección)
  const btnConfirmar = $("#confirmarCompra");
  if (btnConfirmar) {
    btnConfirmar.addEventListener("click", () => {
      vaciar();
      const modalEl = document.getElementById("modalCompra");
      if (modalEl && window.bootstrap) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal && modal.hide();
      }
    });
  }
  // Al final de tu DOMContentLoaded existente:
  if (location.pathname.endsWith('tienda.html')) {
  cargarProductos();
  }

  // Render inicial de paso
  renderPaso();
});

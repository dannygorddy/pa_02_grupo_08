# 🏪 Cusco Store  

**Informe del Diseño Web – Proyecto Cusco Store**  

---

## 👥 Integrantes – Grupo 08

- **Danny Gorddy Huaman Chavez**  
- **Joan Quintana Rosales**  
- **Issac Curitomay**  
- **Jhon Asto Alfaro**  

---

## 📖 Introducción
**Cusco Store** es un proyecto web que simula una tienda en línea.  

Incluye: catálogo, carrito de compras, checkout y emisión de factura.  

**Tecnologías aplicadas:**
- **Frontend:** HTML5, CSS3 + Bootstrap 5, JavaScript nativo.  
- **Backend:** Spring Boot (Java) con base de datos **H2**.  

### ✨ Funcionalidades destacadas
- Catálogo responsivo (grid de Bootstrap) con búsqueda y filtrado por categorías.  
- Carrito de compras con agregar/quitar ítems, ajustar cantidades y seleccionar productos para el pago.  
- Totales calculados según reglas de negocio (precios incluyen IGV 18%, desglose Base + IGV informativo).  
- Cupón de descuento disponible (ejemplo: `AHORRO10`).  
- Generación de factura imprimible con detalle de la compra.  
- **Módulo Admin (con login):**
  - CRUD de productos en tiempo real.  
  - Validaciones en formularios.  
  - Cambios reflejados inmediatamente vía endpoints protegidos `/api/admin/products`.  

---

## 🖥️ Estructura General del Sitio  

### 🔹 Frontend  
**Páginas principales:**
- `index.html` → Portada y presentación del proyecto.  
- `tienda.html` → Catálogo de productos (cards, búsqueda, filtro por categoría, botón “Agregar al carrito”).  
- `carrito.html` → Ítems seleccionados, cantidades, totales.  
- `pedidos.html` → Historial de pedidos (guardados en `localStorage`).  
- `factura.html` → Factura imprimible.  
- `login.html` → Acceso al módulo Admin.  
- `admin.html` → Panel de administración (CRUD productos).  

**Archivos de soporte:**
- `css/style.css` → Estilos personalizados (branding, cards, carrito, checkout, factura).  
- `js/script.js` → Lógica del catálogo y carrito.  
- `js/admin.js` → Lógica del panel Admin.  
- `images/` o `img/` → Recursos visuales.  

---

### 🔹 Backend (Spring Boot + H2)

#### 📦 Paquetes principales
- **config/**
  - `SecurityConfig.java` → Seguridad (rutas públicas/protegidas, login en memoria).  
- **controller/**
  - `ProductController.java` → Endpoints GET `/api/products`, `/api/products/search`.  
  - `OrderController.java` → POST `/api/orders`, GET `/api/orders/{id}`.  
  - `AdminProductController.java` → CRUD Admin (`/api/admin/products`).  
- **service/**
  - `ProductService.java` → Lógica de productos (listar, buscar, CRUD).  
  - `OrderService.java` → Validar stock, crear pedidos, calcular totales.  
- **domain/**  
  - Entidades: `Product`, `Order`, `OrderItem`.  
- **repo/**  
  - JPA: `ProductRepository`, `OrderRepository`, `OrderItemRepository`.  

#### 📂 Recursos (src/main/resources/)
- `application.properties` → Configuración (puerto 8081, H2, JPA, consola H2).  
- `data.sql` → Datos iniciales de productos.  
- `static/` → Frontend (páginas, CSS, JS, imágenes).  

---

## ⚙️ Capa de Servicios en Spring Boot  

### 🗂️ Entidades (package `domain`)
- **Product** → `id, name, price, stock, imageUrl, category`.  
- **Order** → `id, createdAt, status, subtotal, discount, total`.  
- **OrderItem** → `id, order, productId, name, quantity, unitPrice, lineTotal`.  

### 📚 Repositorios (package `repo`)
- `ProductRepository` → CRUD de productos + búsqueda.  
- `OrderRepository` → Guardar y consultar pedidos.  
- `OrderItemRepository` → Guardar y consultar ítems de pedido.  

### 🛠️ Servicios (package `service`)
- **ProductService** → Listar/buscar productos y CRUD (admin).  
- **OrderService** → Validar stock, calcular totales, aplicar descuentos, persistir pedidos.  

### 🌐 Controladores (package `controller`)
- **ProductController** → Endpoints públicos para catálogo.  
- **OrderController** → Endpoints de creación/consulta de pedidos.  
- **AdminProductController** → CRUD del catálogo protegido.  

### 🔐 Seguridad (package `config`)
- **SecurityConfig**  
  - Define rutas públicas/protegidas.  
  - Login en memoria (usuario: `admin`, pass: `admin123`).  
  - Público: páginas estáticas, productos, pedidos.  
  - Protegido: `/admin.html`, `/api/admin/**`.  

### 🗄️ Configuración y datos
- `application.properties` → Puerto, H2, JPA, consola.  
- `data.sql` → Productos semilla para pruebas.  


### 🗄️ Capa de Persistencia (MySQL 8 + Spring Data JPA)

- **Descripción**
  - La capa de persistencia se implementó sobre **MySQL 8**, aportando **rendimiento** (índices y planes de ejecución optimizables), **integridad** (claves foráneas y restricciones) y **reproducibilidad** (scripts de inicialización).
  - Se organiza con **Spring Data JPA (Hibernate 6)** y **HikariCP** como pool de conexiones.

- **Anclaje al proyecto**
  - **Motor:** contenedor definido en `docker-compose.yml` (MySQL 8 con BD `cuscostore`).
  - **Driver:** dependencia `mysql-connector-j` en `pom.xml`.
  - **Conexión:** `application.properties` con JDBC URL, `DB_USER` y `DB_PASS`.
  - **JPA:** `spring.jpa.hibernate.ddl-auto=none` (esquema controlado) y `spring.sql.init.mode=always` (carga `schema.sql` y `data.sql`).
  - **Buenas prácticas:** `spring.jpa.open-in-view=false`, **paginación** y **proyecciones** en repositorios para reducir I/O.

- **Tablas y relaciones**
  - **`product`**: `id` (PK), `name`, `description`, `category`, `price`, `stock`, `image_url`.
    - **Índices:** `idx_product_name`, `idx_product_category`.
  - **`orders`**: `id` (PK), `customer_name`, `email`, `total`, `created_at` (según esquema).
  - **`order_item`**: `id` (PK), `order_id` (FK → `orders.id`), `product_id` (FK → `product.id`), `qty`, `unit_price`.
    - **Integridad referencial** mediante FKs; **fetch LAZY** en relaciones para evitar N+1 en listados.

- **Resultado**
  - Operaciones **CRUD** consistentes y transaccionales; lecturas que **escalan** con **índices + paginación**; y entorno **replicable** para todo el equipo gracias a Docker y **scripts SQL** versionados.

---
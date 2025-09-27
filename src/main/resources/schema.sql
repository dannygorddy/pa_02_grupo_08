-- ===== PRODUCT =====
DROP TABLE IF EXISTS order_item;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS product;

CREATE TABLE product (
  id           BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(150)  NOT NULL,
  description  VARCHAR(1000),
  category     VARCHAR(80)   NOT NULL,
  price        DECIMAL(10,2) NOT NULL,
  stock        INT           NOT NULL DEFAULT 0,
  image_url    VARCHAR(300)
);

CREATE INDEX idx_product_category ON product(category);
CREATE INDEX idx_product_name     ON product(name);

-- ===== ORDERS =====
CREATE TABLE orders (
  id            BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(150),
  customer_name VARCHAR(150),
  phone         VARCHAR(40),
  delivery_type VARCHAR(20),         -- DELIVERY | PICKUP
  address       VARCHAR(250),
  district      VARCHAR(120),
  reference     VARCHAR(250),
  coupon        VARCHAR(60),

  subtotal      DECIMAL(10,2) DEFAULT 0,
  igv           DECIMAL(10,2) DEFAULT 0,
  shipping      DECIMAL(10,2) DEFAULT 0,
  discount      DECIMAL(10,2) DEFAULT 0,
  total         DECIMAL(10,2) DEFAULT 0,

  status        VARCHAR(20)   DEFAULT 'CREATED', -- CREATED | PAID | SHIPPED | COMPLETED | VOID
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_orders_created_at  ON orders(created_at);

-- ===== ORDER_ITEM =====
CREATE TABLE order_item (
  id          BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id    BIGINT NOT NULL,
  product_id  BIGINT NOT NULL,
  qty         INT    NOT NULL,
  unit_price  DECIMAL(10,2) NOT NULL,
  line_total  DECIMAL(10,2) NOT NULL,

  CONSTRAINT fk_order_item_order   FOREIGN KEY (order_id)  REFERENCES orders(id)  ON DELETE CASCADE,
  CONSTRAINT fk_order_item_product FOREIGN KEY (product_id) REFERENCES product(id)
);

CREATE INDEX idx_order_item_order   ON order_item(order_id);
CREATE INDEX idx_order_item_product ON order_item(product_id);

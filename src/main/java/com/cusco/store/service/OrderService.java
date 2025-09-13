package com.cusco.store.service;

import com.cusco.store.domain.Order;
import com.cusco.store.domain.OrderItem;
import com.cusco.store.domain.Product;
import com.cusco.store.repository.OrderRepository;
import com.cusco.store.repository.ProductRepository;
import com.cusco.store.web.dto.OrderRequest;
import com.cusco.store.web.dto.OrderResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class OrderService {

  private static final double IGV_RATE = 0.18;
  private static final double SHIPPING_DELIVERY = 10.0;

  private final ProductRepository productRepo;
  private final OrderRepository orderRepo;

  public OrderService(ProductRepository productRepo, OrderRepository orderRepo) {
    this.productRepo = productRepo;
    this.orderRepo = orderRepo;
  }

  @Transactional
  public OrderResponse crearPedido(OrderRequest req) {
    // si OrderRequest es "record", usa req.items()/req.coupon()/... (como ya haces)
    if (req.items() == null || req.items().isEmpty()) {
      throw new IllegalArgumentException("Carrito vacío");
    }

    double subtotal = 0.0;
    List<OrderItem> items = new ArrayList<>();

    // 1) Validar productos/stock y calcular subtotal
    for (OrderRequest.Item it : req.items()) {
      if (it.productId() == null || it.qty() == null || it.qty() <= 0) {
        throw new IllegalArgumentException("Item inválido (productId/qty)");
      }

      Product p = productRepo.findById(it.productId())
          .orElseThrow(() -> new NoSuchElementException("Producto no existe: " + it.productId()));

      int stock = p.getStock() == null ? 0 : p.getStock();
      if (stock < it.qty()) {
        throw new IllegalStateException("Stock insuficiente para '" + p.getName() + "'. Disponible: " + stock);
      }

      double unit = p.getPrice() == null ? 0.0 : p.getPrice();
      double line = unit * it.qty();
      subtotal += line;

      OrderItem oi = new OrderItem();
      oi.setProduct(p);          // << relación al Product real
      oi.setQty(it.qty());
      oi.setUnitPrice(unit);     // “fotografía” del precio en el momento
      oi.setLineTotal(line);     // también se recalcula en @PrePersist/@PreUpdate
      items.add(oi);
    }

    // 2) Descuento por cupón
    double discount = 0.0;
    if (req.coupon() != null && req.coupon().trim().equalsIgnoreCase("AHORRO10")) {
      discount = subtotal * 0.10;
    }

    // 3) IGV + Envío
    double base = subtotal - discount;
    double igv = round2(base * IGV_RATE);
    double shipping = "DELIVERY".equalsIgnoreCase(req.deliveryType()) ? SHIPPING_DELIVERY : 0.0;

    // 4) Total
    double total = round2(base + igv + shipping);

    // 5) Construir Order + relacionar items
    Order order = new Order();
    order.setEmail(req.email());
    order.setCustomerName(req.customerName());
    order.setPhone(req.phone());
    order.setDeliveryType("DELIVERY".equalsIgnoreCase(req.deliveryType())
        ? Order.DeliveryType.DELIVERY : Order.DeliveryType.PICKUP);
    order.setAddress(req.address());
    order.setDistrict(req.district());
    order.setReference(req.reference());
    order.setSubtotal(round2(subtotal));
    order.setIgv(igv);
    order.setShipping(shipping);
    order.setDiscount(round2(discount));
    order.setTotal(total);
    order.setStatus(Order.OrderStatus.CREATED);
    order.setCreatedAt(LocalDateTime.now());

    for (OrderItem oi : items) oi.setOrder(order);
    order.setItems(items);

    // 6) Descontar stock (misma transacción)
    for (OrderRequest.Item it : req.items()) {
      Product p = productRepo.findById(it.productId()).orElseThrow();
      int newStock = (p.getStock() == null ? 0 : p.getStock()) - it.qty();
      p.setStock(newStock);
      productRepo.save(p);
    }

    // 7) Guardar
    Order saved = orderRepo.save(order);

    // 8) Armar respuesta
    List<OrderResponse.Item> respItems = new ArrayList<>();
    for (OrderItem oi : saved.getItems()) {
      respItems.add(new OrderResponse.Item(
          oi.getProduct().getId(),
          oi.getProduct().getName(),
          oi.getUnitPrice(),
          oi.getQty(),
          oi.getLineTotal()
      ));
    }

    return new OrderResponse(
        saved.getId(),
        saved.getEmail(),
        saved.getDeliveryType().name(),
        saved.getAddress(),
        saved.getSubtotal(),
        saved.getIgv(),
        saved.getShipping(),
        saved.getDiscount(),
        saved.getTotal(),
        saved.getStatus().name(),
        saved.getCreatedAt(),
        respItems
    );
  }

  @Transactional(readOnly = true)
  public OrderResponse obtener(Long id) {
    Order o = orderRepo.findById(id).orElseThrow(NoSuchElementException::new);

    List<OrderResponse.Item> items = new ArrayList<>();
    for (OrderItem oi : o.getItems()) {
      items.add(new OrderResponse.Item(
          oi.getProduct().getId(),
          oi.getProduct().getName(),
          oi.getUnitPrice(),
          oi.getQty(),
          oi.getLineTotal()
      ));
    }

    return new OrderResponse(
        o.getId(),
        o.getEmail(),
        o.getDeliveryType().name(),
        o.getAddress(),
        o.getSubtotal(),
        o.getIgv(),
        o.getShipping(),
        o.getDiscount(),
        o.getTotal(),
        o.getStatus().name(),
        o.getCreatedAt(),
        items
    );
  }

  private static double round2(double v) {
    return Math.round(v * 100.0) / 100.0;
  }
}

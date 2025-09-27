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
import java.util.*;
import java.util.stream.Collectors;

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
    if (req.items() == null || req.items().isEmpty()) {
      throw new IllegalArgumentException("Carrito vacío");
    }

    // Mapear cantidades por productId para accesos directos
    Map<Long, Integer> qtyByProductId = new HashMap<>();
    for (OrderRequest.Item it : req.items()) {
      if (it.productId() == null || it.qty() == null || it.qty() <= 0) {
        throw new IllegalArgumentException("Item inválido (productId/qty)");
      }
      qtyByProductId.merge(it.productId(), it.qty(), Integer::sum);
    }

    // Cargar todos los productos involucrados de una sola vez
    List<Long> ids = new ArrayList<>(qtyByProductId.keySet());
    List<Product> products = productRepo.findAllById(ids);

    if (products.size() != ids.size()) {
      // Encontrar faltantes
      Set<Long> found = products.stream().map(Product::getId).collect(Collectors.toSet());
      List<Long> missing = ids.stream().filter(id -> !found.contains(id)).toList();
      throw new NoSuchElementException("Productos no existen: " + missing);
    }

    double subtotal = 0.0;
    List<OrderItem> items = new ArrayList<>();

    // VALIDAR y DESCONTAR stock sobre las MISMAS INSTANCIAS gestionadas
    for (Product p : products) {
      int reqQty = qtyByProductId.getOrDefault(p.getId(), 0);
      int current = p.getStock() == null ? 0 : p.getStock();
      if (current < reqQty) {
        throw new IllegalStateException("Stock insuficiente para '" + p.getName() + "'. Disponible: " + current + ", requerido: " + reqQty);
      }
      // Descontar en memoria (entidad gestionada por el contexto de persistencia)
      p.setStock(current - reqQty);

      double unit = p.getPrice() == null ? 0.0 : p.getPrice();
      double line = unit * reqQty;
      subtotal += line;

      OrderItem oi = new OrderItem();
      oi.setProduct(p);          // relación al Product (ya con stock descontado)
      oi.setQty(reqQty);
      oi.setUnitPrice(unit);
      oi.setLineTotal(line);
      items.add(oi);
    }

    // Descuento por cupón
    double discount = 0.0;
    if (req.coupon() != null && req.coupon().trim().equalsIgnoreCase("AHORRO10")) {
      discount = subtotal * 0.10;
    }

    // IGV + Envío
    double base = subtotal - discount;
    double igv = round2(base * IGV_RATE);
    double shipping = "DELIVERY".equalsIgnoreCase(req.deliveryType()) ? SHIPPING_DELIVERY : 0.0;

    // Total
    double total = round2(base + igv + shipping);

    // Construir Order
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

    // 1) Persistir productos con stock actualizado (una sola vez)
// 1) Descontar stock con UPDATE atómico por cada producto
for (Product p : products) {
  int reqQty = qtyByProductId.get(p.getId());
  int affected = productRepo.decrementStockIfEnough(p.getId(), reqQty);
  if (affected == 0) {
    throw new IllegalStateException("Stock insuficiente para '" + p.getName() + "'.");
  }
}

    // 2) Guardar la orden (cascade en items si está configurado)
    Order saved = orderRepo.save(order);

    // Respuesta
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

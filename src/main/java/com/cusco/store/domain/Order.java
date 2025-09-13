package com.cusco.store.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders") // "order" es palabra reservada
public class Order {

  public enum DeliveryType { DELIVERY, PICKUP }
  public enum OrderStatus  { CREATED, PAID, SHIPPED, COMPLETED, VOID }

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  // Datos del cliente
  private String email;
  private String customerName;
  private String phone;

  // Entrega
  @Enumerated(EnumType.STRING)
  private DeliveryType deliveryType; // DELIVERY | PICKUP
  private String address;
  private String district;
  private String reference;

  // Totales
  private Double subtotal;
  private Double igv;
  private Double shipping;
  private Double discount;
  private Double total;

  // Estado y fecha
  @Enumerated(EnumType.STRING)
  private OrderStatus status;
  private LocalDateTime createdAt;

  // Ítems
  @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<OrderItem> items = new ArrayList<>();

  // ===== Getters & Setters =====
  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }

  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }

  public String getCustomerName() { return customerName; }
  public void setCustomerName(String customerName) { this.customerName = customerName; }

  public String getPhone() { return phone; }
  public void setPhone(String phone) { this.phone = phone; }

  public DeliveryType getDeliveryType() { return deliveryType; }
  public void setDeliveryType(DeliveryType deliveryType) { this.deliveryType = deliveryType; }

  public String getAddress() { return address; }
  public void setAddress(String address) { this.address = address; }

  public String getDistrict() { return district; }
  public void setDistrict(String district) { this.district = district; }

  public String getReference() { return reference; }
  public void setReference(String reference) { this.reference = reference; }

  public Double getSubtotal() { return subtotal; }
  public void setSubtotal(Double subtotal) { this.subtotal = subtotal; }

  public Double getIgv() { return igv; }
  public void setIgv(Double igv) { this.igv = igv; }

  public Double getShipping() { return shipping; }
  public void setShipping(Double shipping) { this.shipping = shipping; }

  public Double getDiscount() { return discount; }
  public void setDiscount(Double discount) { this.discount = discount; }

  public Double getTotal() { return total; }
  public void setTotal(Double total) { this.total = total; }

  public OrderStatus getStatus() { return status; }
  public void setStatus(OrderStatus status) { this.status = status; }

  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

  public List<OrderItem> getItems() { return items; }
  public void setItems(List<OrderItem> items) { this.items = items; }

  // Helpers
  public void addItem(OrderItem item) {
    items.add(item);
    item.setOrder(this);
  }
  public void removeItem(OrderItem item) {
    items.remove(item);
    item.setOrder(null);
  }
}

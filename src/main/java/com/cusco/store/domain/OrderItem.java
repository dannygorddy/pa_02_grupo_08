package com.cusco.store.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "order_item")
public class OrderItem {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "order_id")
  private Order order;

  @ManyToOne(optional = false, fetch = FetchType.EAGER)
  @JoinColumn(name = "product_id")
  private Product product;

  private Integer qty;
  private Double unitPrice;
  private Double lineTotal;

  @PrePersist @PreUpdate
  public void preCalc() {
    double u = unitPrice == null ? 0.0 : unitPrice;
    int q = qty == null ? 0 : qty;
    this.lineTotal = u * q;
  }

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }

  public Order getOrder() { return order; }
  public void setOrder(Order order) { this.order = order; }

  public Product getProduct() { return product; }
  public void setProduct(Product product) { this.product = product; }

  public Integer getQty() { return qty; }
  public void setQty(Integer qty) { this.qty = qty; }

  public Double getUnitPrice() { return unitPrice; }
  public void setUnitPrice(Double unitPrice) { this.unitPrice = unitPrice; }

  public Double getLineTotal() { return lineTotal; }
  public void setLineTotal(Double lineTotal) { this.lineTotal = lineTotal; }
}

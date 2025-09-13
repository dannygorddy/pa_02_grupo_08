package com.cusco.store.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;

@Entity
@Table(name = "product")
public class Product {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotBlank
  @Column(name = "name")
  private String name;

  @PositiveOrZero
  @Column(name = "price")
  private Double price;

  @PositiveOrZero
  @Column(name = "stock")
  private Integer stock;

  @Column(name = "image_url")
  private String imageUrl;

  @Column(name = "category")
  private String category;

  public Product() {}

  public Product(String name, Double price, Integer stock, String imageUrl, String category) {
    this.name = name;
    this.price = price;
    this.stock = stock;
    this.imageUrl = imageUrl;
    this.category = category;
  }

  // getters y setters
  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public Double getPrice() { return price; }
  public void setPrice(Double price) { this.price = price; }
  public Integer getStock() { return stock; }
  public void setStock(Integer stock) { this.stock = stock; }
  public String getImageUrl() { return imageUrl; }
  public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
  public String getCategory() { return category; }
  public void setCategory(String category) { this.category = category; }
}

package com.cusco.store.web.dto;

import java.time.LocalDateTime;
import java.util.List;

public record OrderResponse(
  Long id,
  String email,
  String deliveryType,
  String address,
  Double subtotal, Double igv, Double shipping, Double discount, Double total,
  String status, LocalDateTime createdAt,
  List<Item> items
){
  public record Item(Long productId, String name, Double price, Integer qty, Double lineTotal) {}
}

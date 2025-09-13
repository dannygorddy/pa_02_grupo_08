package com.cusco.store.web.dto;

import java.util.List;

public record OrderRequest(
  String email,
  String customerName,
  String phone,
  String deliveryType, // "DELIVERY" | "PICKUP"
  String address,
  String district,
  String reference,
  String coupon,
  List<Item> items
) {
  public record Item(Long productId, Integer qty) {}
}

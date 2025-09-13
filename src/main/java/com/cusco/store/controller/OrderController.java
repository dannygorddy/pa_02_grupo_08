package com.cusco.store.controller;

import com.cusco.store.service.OrderService;
import com.cusco.store.web.dto.OrderRequest;
import com.cusco.store.web.dto.OrderResponse;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

  private final OrderService service;
  public OrderController(OrderService service) { this.service = service; }

  @PostMapping
  public ResponseEntity<OrderResponse> crear(@Valid @RequestBody OrderRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED).body(service.crearPedido(req));
  }

  @GetMapping("/{id}")
  public OrderResponse get(@PathVariable Long id) {
    return service.obtener(id);
  }
}

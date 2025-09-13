package com.cusco.store.controller;

import com.cusco.store.domain.Product;
import com.cusco.store.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

  private final ProductService service;

  public ProductController(ProductService service) {
    this.service = service;
  }

  // GET /api/products
  @GetMapping
  public List<Product> list() {
    return service.list();
  }

  // GET /api/products/search?q=texto
  @GetMapping("/search")
  public List<Product> search(@RequestParam(required = false) String q) {
    return service.search(q);
  }

  // POST /api/products
  @PostMapping
  public ResponseEntity<Product> create(@Valid @RequestBody Product p) {
    return ResponseEntity.status(HttpStatus.CREATED).body(service.create(p));
  }

  // PUT /api/products/{id}
  @PutMapping("/{id}")
  public Product update(@PathVariable Long id, @Valid @RequestBody Product p) {
    return service.update(id, p);
  }

  // DELETE /api/products/{id}
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    service.delete(id);
    return ResponseEntity.noContent().build();
  }
}

package com.cusco.store.controller;

import com.cusco.store.domain.Product;
import com.cusco.store.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")  // prefijo de la clase
public class ProductController {

  private final ProductService service;

  public ProductController(ProductService service) {
    this.service = service;
  }

  // GET /api/products  -> listar todo
  @GetMapping
  public List<Product> getAll() {
    return service.findAll();
  }

  // GET /api/products/{id} -> obtener por id (útil para detalles/edición)
  @GetMapping("/{id}")
  public Product get(@PathVariable Long id) {
    return service.get(id);
  }

  // GET /api/products/search?q=texto -> búsqueda por nombre
  @GetMapping("/search")
  public List<Product> search(@RequestParam(required = false) String q) {
    return service.searchByName(q);
  }

  // POST /api/products -> crear
  @PostMapping
  public ResponseEntity<Product> create(@Valid @RequestBody Product p) {
    return ResponseEntity.status(HttpStatus.CREATED).body(service.create(p));
  }

  // PUT /api/products/{id} -> actualizar
  @PutMapping("/{id}")
  public Product update(@PathVariable Long id, @Valid @RequestBody Product p) {
    return service.update(id, p);
  }

  // DELETE /api/products/{id} -> eliminar
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    service.delete(id);
    return ResponseEntity.noContent().build();
  }
}

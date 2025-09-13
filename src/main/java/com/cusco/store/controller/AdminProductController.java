package com.cusco.store.controller;

import com.cusco.store.domain.Product;
import com.cusco.store.service.ProductService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/products")
public class AdminProductController {

    private final ProductService service;

    public AdminProductController(ProductService service) {
        this.service = service;
    }

    // (Opcional) Listar todo como admin
    @GetMapping
    public List<Product> list() {
        // Si ya tienes paginación/búsqueda en ProductController, puedes omitir este GET
        return service.findAll();
    }

    // Obtener por id (útil para editar con detalle)
    @GetMapping("/{id}")
    public Product get(@PathVariable Long id) {
        return service.get(id);
    }

    // Crear
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Product create(@RequestBody Product p) {
        // Validaciones simples (opcional)
        if (p.getName() == null || p.getName().isBlank()) {
            throw new IllegalArgumentException("El nombre es obligatorio");
        }
        return service.create(p);
    }

    // Actualizar
    @PutMapping("/{id}")
    public Product update(@PathVariable Long id, @RequestBody Product p) {
        return service.update(id, p);
    }

    // Eliminar
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}

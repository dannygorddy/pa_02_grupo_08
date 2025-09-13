package com.cusco.store.service;

import com.cusco.store.domain.Product;
import com.cusco.store.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class ProductService {

    private final ProductRepository repo;

    public ProductService(ProductRepository repo) {
        this.repo = repo;
    }

    // ===== Lecturas =====
    @Transactional(readOnly = true)
    public List<Product> findAll() {
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public Product get(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Product " + id + " not found"));
    }

    @Transactional(readOnly = true)
    public List<Product> searchByName(String q) {
        if (q == null || q.isBlank()) return findAll();
        return repo.findByNameContainingIgnoreCase(q.trim()); // usa tu método del repo
    }

    // ===== Escrituras =====
    @Transactional
    public Product create(Product p) {
        return repo.save(p);
    }

    @Transactional
    public Product update(Long id, Product p) {
        Product cur = get(id); // valida existencia o lanza NoSuchElementException
        cur.setName(p.getName());
        cur.setCategory(p.getCategory());
        cur.setPrice(p.getPrice());
        cur.setStock(p.getStock());
        cur.setDescription(p.getDescription());
        cur.setImageUrl(p.getImageUrl());
        return repo.save(cur);
    }

    @Transactional
    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new NoSuchElementException("Product " + id + " not found");
        }
        repo.deleteById(id);
    }
}
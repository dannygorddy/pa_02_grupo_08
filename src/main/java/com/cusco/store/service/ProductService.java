package com.cusco.store.service;

import com.cusco.store.domain.Product;
import com.cusco.store.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductService {
  private final ProductRepository repo;

  public ProductService(ProductRepository repo) { this.repo = repo; }

  public List<Product> list() { return repo.findAll(); }

  public List<Product> search(String q) {
    return (q == null || q.isBlank()) ? repo.findAll() : repo.findByNameContainingIgnoreCase(q);
  }

  public Product create(Product p) { return repo.save(p); }

  public Product update(Long id, Product p) {
    Product cur = repo.findById(id).orElseThrow();
    cur.setName(p.getName());
    cur.setPrice(p.getPrice());
    cur.setStock(p.getStock());
    cur.setImageUrl(p.getImageUrl());
    cur.setCategory(p.getCategory());
    return repo.save(cur);
  }

  public void delete(Long id) { repo.deleteById(id); }
}


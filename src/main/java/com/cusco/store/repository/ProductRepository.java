package com.cusco.store.repository;

import com.cusco.store.domain.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

  List<Product> findByNameContainingIgnoreCase(String q);

  /**
   * Descuenta stock en una sola sentencia SQL si hay suficiente stock.
   * Devuelve el número de filas afectadas (0 si no hay stock o no existe el id).
   */
  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query("UPDATE Product p SET p.stock = p.stock - :qty " +
         "WHERE p.id = :id AND p.stock >= :qty")
  int decrementStockIfEnough(@Param("id") Long id, @Param("qty") int qty);
}

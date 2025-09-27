package com.cusco.store.config;

import org.springframework.boot.autoconfigure.security.servlet.PathRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

  // Ignorar recursos estáticos por completo (no pasan por el filtro de seguridad)
  @Bean
  public WebSecurityCustomizer webSecurityCustomizer() {
    return (web) -> web.ignoring()
        .requestMatchers(PathRequest.toStaticResources().atCommonLocations()) // /css/**, /js/**, /images/**, /webjars/**, favicon
        .requestMatchers("/img/**"); // tu carpeta de logos/imagenes personalizadas
  }

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
      .csrf(csrf -> csrf.disable())
      .authorizeHttpRequests(auth -> auth
        // Páginas públicas
        .requestMatchers("/", "/index.html", "/tienda.html", "/carrito.html",
                         "/factura.html", "/pedidos.html").permitAll()

        // Endpoints públicos
        .requestMatchers("/login", "/login.html").permitAll()
        .requestMatchers("/api/products/**").permitAll()
        .requestMatchers(HttpMethod.POST, "/api/orders").permitAll()
        .requestMatchers(HttpMethod.GET,  "/api/orders/**").permitAll()

        // Admin protegido
        .requestMatchers("/admin", "/admin.html", "/api/admin/**").hasRole("ADMIN")

        // Cualquier otra ruta requiere autenticación
        .anyRequest().authenticated()
      )
      .formLogin(form -> form
        .loginPage("/login.html")
        .loginProcessingUrl("/login")
        .defaultSuccessUrl("/admin.html", true)
        .permitAll()
      )
      .logout(l -> l.logoutUrl("/logout").logoutSuccessUrl("/login.html?logout").permitAll());

    return http.build();
  }

  @Bean
  public UserDetailsService userDetailsService(PasswordEncoder encoder) {
    UserDetails admin = User.withUsername("admin")
        .password(encoder.encode("admin123"))
        .roles("ADMIN")
        .build();
    return new InMemoryUserDetailsManager(admin);
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
    return config.getAuthenticationManager();
  }
}

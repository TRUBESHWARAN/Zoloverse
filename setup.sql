-- Zoloverse Database Schema
-- Run in phpMyAdmin or: mysql -u root zoloverse < setup.sql

CREATE DATABASE IF NOT EXISTS zoloverse CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE zoloverse;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    role ENUM('customer', 'admin') DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    img LONGTEXT,
    stock_qty INT DEFAULT 50,
    status ENUM('Available', 'Out of Stock', 'Draft') DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_variants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    size VARCHAR(10) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_email VARCHAR(150),
    customer_name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status ENUM('Paid', 'Pending', 'Refunded') DEFAULT 'Paid',
    shipping_status ENUM('Waiting', 'Printing', 'Printed', 'Shipped', 'Delivered') DEFAULT 'Waiting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_title VARCHAR(255) NOT NULL,
    size VARCHAR(10) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Default admin account (password: Zoloverse!)
INSERT INTO users (name, email, password, role) VALUES
('Chiranjeevi', 'chiranjeevi@zoloverse.com', '$2y$10$v5NfvZLLAWKed/chuQLMeOpyWgCZ2hbo0wCrvyoZxQ71ZeeK3Iora', 'admin')
ON DUPLICATE KEY UPDATE name = 'Chiranjeevi', password = '$2y$10$v5NfvZLLAWKed/chuQLMeOpyWgCZ2hbo0wCrvyoZxQ71ZeeK3Iora', role = 'admin';

-- Seed initial products and variants
DELETE FROM product_variants;
DELETE FROM products;

INSERT INTO products (id, title, category, description, img, stock_qty, status) VALUES
(1, 'Zenitsu Agatsuma Brutalism Edition', 'others', 'High-quality premium Zenitsu sticker curated specifically for modern environments.', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80', 50, 'Available'),
(2, 'Pokkiri Thalapathy Vijay Retro', 'tamil_actors', 'Retro Thalapathy Vijay sticker designed with vintage color schemes.', 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80', 50, 'Available'),
(3, 'Shinchan Nohara Cyber Hacker', 'others', 'Cyber hacker edition Shinchan sticker with high gloss finish.', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80', 50, 'Available'),
(4, 'Spider-Man & Spider-Gwen Multiverse', 'spiderman', 'Multiverse edition Spider-Man sticker with ultra HD details.', 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=600&q=80', 50, 'Available'),
(5, 'Porsche 911 GT3 RS Neon', 'cars', 'Porsche 911 GT3 RS Neon sticker celebrating track engineering.', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80', 45, 'Available'),
(6, 'Nissan GTR R35 Midnight', 'cars', 'Nissan GTR R35 Midnight Edition sticker with premium anti-glare finish.', 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80', 40, 'Available');

INSERT INTO product_variants (product_id, size, price) VALUES
(1, 'A4', 99.00), (1, 'A3', 149.00), (1, 'A2', 249.00),
(2, 'A4', 149.00), (2, 'A3', 199.00), (2, 'A2', 299.00),
(3, 'A4', 99.00), (3, 'A3', 149.00), (3, 'A2', 249.00),
(4, 'A4', 149.00), (4, 'A3', 199.00), (4, 'A2', 299.00),
(5, 'A4', 129.00), (5, 'A3', 179.00), (5, 'A2', 279.00),
(6, 'A4', 129.00), (6, 'A3', 179.00), (6, 'A2', 279.00);


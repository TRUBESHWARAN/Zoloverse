# Zoloverse | Elite Digital Solutions & Premium Art Shop

Zoloverse is a high-performance web platform combining full-stack web engineering, brand asset generation, UI/UX modernism, and a physical merchandise storefront.

## Project Directory Structure

The codebase is organized into standard directories for clean separation of concerns, readability, and performance.

```
Zoloverse/
├── api/                      # Backend APIs and PHP server logic
│   ├── includes/
│   │   └── auth_helpers.php  # Authentication helper verification utilities
│   ├── auth.php              # Login, registration, and Google OAuth config
│   ├── config.php            # Global PDO database and client configuration
│   ├── health.php            # System health indicator checks
│   ├── orders.php            # Order routing and KPIs logic
│   ├── products.php          # Merch catalog CRUD logic
│   └── review.php            # Review moderation and posting APIs
├── assets/                   # Static media assets and imagery
│   └── Logo.jpeg             # Core Zoloverse brand logo
├── css/                      # External stylesheets (Vanilla CSS)
│   ├── admin.css             # Administration control panel layout styling
│   ├── auth.css              # Shared authentication layout styling (Sign In / Register)
│   └── main.css              # Main storefront interface layout styling
├── js/                       # Modular Client-Side JavaScript
│   ├── admin.js              # Administrative client control board logic
│   ├── auth.js               # Global auth state and route protection manager
│   ├── login.js              # Login submission handlers
│   ├── main.js               # Main storefront catalog filters and cart flows
│   └── register.js           # Account creation handlers
├── scratch/                  # Temporary developer helper testing scripts
├── index.html                # Main marketplace storefront HTML
├── login.html                # Account login page HTML
├── register.html             # Account registration page HTML
├── admin.html                # Administrator panel dashboard HTML
├── setup.sql                 # SQL schema database setup script
└── README.md                 # Project architecture documentation
```

## Key Technologies
- **Frontend**: Vanilla HTML5, Vanilla JavaScript, Vanilla CSS3 (Custom variables, Glassmorphism, animations).
- **Icons**: Font Awesome v6.4.0.
- **Third-Party Integrations**: Google Identity Services SDK (Google OAuth Sign-In).
- **Backend API**: PHP 8.x with PDO.
- **Database**: SQL (MySQL / MariaDB).

## Getting Started

1. **Configure Environment**:
   Define database credentials and Google OAuth client identifiers in [api/config.php](file:///e:/Zoloverse/api/config.php).

2. **Initialize Schema**:
   Run [setup.sql](file:///e:/Zoloverse/setup.sql) inside your database management tool to create the target tables and seed initial records.

3. **Deploy Web Server**:
   Start your local PHP/Apache web server pointing to the root workspace directory.

4. **Access Control**:
   - Storefront is accessed at `index.html`.
   - Administrative functionalities are accessed at `admin.html` (requires a user record with the `admin` role).

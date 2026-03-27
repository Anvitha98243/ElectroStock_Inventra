# ⚡ ElectroStock — Spring Boot + React + MySQL

Smart Electronics Inventory Management System

---

## Tech Stack

- **Backend:** Java 17, Spring Boot 3.2, Spring Security, JWT, Spring Mail
- **Database:** MySQL 8+
- **Frontend:** React 18, React Router v6, Axios, jsPDF, SheetJS

---

## Prerequisites

- Java 17+
- Maven 3.8+
- MySQL 8+
- Node.js 16+

---

## Step 1 — MySQL Setup

Start MySQL and run:

```sql
CREATE DATABASE electrostock_db;
```

Then open `backend/src/main/resources/application.properties` and set:

```properties
spring.datasource.username=root
spring.datasource.password=YOUR_MYSQL_PASSWORD
```

Tables are auto-created by Hibernate on first run (ddl-auto=update).

---

## Step 2 — Backend Setup

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

Backend runs on: http://localhost:8080

---

## Step 3 — Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on: http://localhost:3000

---

## Gmail Setup (for OTP emails)

The Gmail credentials are already configured in `application.properties`.
If you need to change them:

```properties
spring.mail.username=your_gmail@gmail.com
spring.mail.password=your_16_char_app_password
```

To generate an App Password:
1. Go to myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to App Passwords → create one for Mail
4. Paste the 16-character password above

---

## API Endpoints

### Auth (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login, returns JWT |
| POST | /api/auth/forgot-password | Send OTP to email |
| POST | /api/auth/reset-password | Verify OTP + set new password |

### Auth (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/auth/me | Get current user |
| GET | /api/auth/search-admin?username= | Find admin by username |
| PUT | /api/auth/change-password | Change password |

### Products (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/products | Get admin's products |
| GET | /api/products/alerts | Low stock products |
| GET | /api/products/by-admin/{id} | Products by admin ID (staff use) |
| POST | /api/products | Create product |
| PUT | /api/products/{id} | Update product |
| DELETE | /api/products/{id} | Delete product |

### Stock Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/requests | Staff creates request |
| GET | /api/requests/my | Staff's own requests |
| GET | /api/requests/admin | Admin's incoming requests |
| PUT | /api/requests/{id}/resolve | Admin approves/rejects |

### Logs & Predictions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/logs | Audit logs |
| GET | /api/logs/transactions | Transaction logs |
| GET | /api/predictions | Demand predictions |

---

## Project Structure

```
electrostock-springboot/
├── backend/
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/electrostock/
│       │   ├── ElectroStockApplication.java
│       │   ├── model/          (User, Product, StockRequest, AuditLog, PasswordResetToken)
│       │   ├── repository/     (JPA repositories)
│       │   ├── service/        (AuthService, ProductService, StockRequestService, ...)
│       │   ├── controller/     (AuthController, ProductController, ...)
│       │   ├── security/       (JwtUtil, JwtFilter)
│       │   └── config/         (SecurityConfig)
│       └── resources/
│           └── application.properties
└── frontend/
    └── src/
        ├── pages/admin/    (Dashboard, Products, Requests, Logs, Predictions)
        ├── pages/staff/    (Dashboard, Products, Requests)
        ├── pages/          (Login, Register, Profile, ForgotPassword, ResetPassword)
        ├── components/     (Layout)
        ├── context/        (AuthContext)
        └── utils/          (api.js — points to localhost:8080)
```

---

## Features

- JWT authentication with role-based access (Admin / Staff)
- Admin: CRUD products, manage stock requests, view audit logs, export PDF/Excel
- Staff: search admin, browse products, submit stock in/out requests, track status
- Welcome email on registration
- OTP-based password reset via Gmail
- Future predictions: demand trend + reorder date from transaction history
- User profile with password change

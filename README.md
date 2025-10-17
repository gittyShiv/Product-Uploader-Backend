# 🧠 Product Uploader Backend

A robust backend service for uploading, validating, and storing product data from CSV files.  
Built with **Express.js**, **PostgreSQL**, and **Sequelize**, this project provides clean APIs for **file upload**, **validation**, and **product filtering**, fully containerized with **Docker** and tested with **Jest**.

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

---

## 📖 About The Project

**Product Uploader Backend** simplifies bulk product management.  
You can upload CSV files containing product details, automatically validate them, and store clean data in a PostgreSQL database.  
It also offers filtering and searching APIs for flexible retrieval — perfect for e-commerce, inventory tools, or internal dashboards.

---
<img src="./assets/architecture.svg" alt="High-Level Architecture" width="800"/>
## 🎯 Features

- 📤 CSV file upload & validation
- 🧮 Real-time error reporting for invalid rows
- 🔍 Filtering & search endpoints
- 🐘 PostgreSQL integration with Sequelize ORM
- 🧪 Full test coverage using Jest
- 🐳 One-command Docker setup

---

## 🧰 Built With

- Node.js & Express
- PostgreSQL
- Sequelize ORM
- Multer
- csv-parser
- Jest
- Docker & Docker Compose

---

## 🛠️ Getting Started

### ✅ Prerequisites

- Node.js
- Docker
- PostgreSQL (optional if running manually)

---

## 📥 Installation

```bash
git clone https://github.com/gittyShiv/Product-Uploader-Backend.git
```

---

## 🐳 Run Using Docker (Recommended)

```bash
docker compose up --build
```

This will:
- Start PostgreSQL on port 5432
- Start backend server on port 8000
- Auto-sync Sequelize models

✅ Verify:
```bash
docker ps
```

---

## 🧱 Manual Setup (Alternative)

```bash
npm install
```

Create a `.env` file:
```ini
PORT=8000
POSTGRES_URI=postgres://postgres:root@localhost:5432/productdb
```

Run local PostgreSQL:
```bash
docker run --name productdb -e POSTGRES_PASSWORD=root -p 5432:5432 -d postgres
```

Start server:
```bash
npm run dev
```

Server runs at: [http://localhost:8000](http://localhost:8000)

---

## 📡 API Documentation

### 📤 Upload Products (CSV)

```
POST /upload
```

Headers: `multipart/form-data`  
Field: `file`

```bash
curl -X POST -F "file=@products.csv" http://localhost:8000/upload
```

Sample CSV:
```csv
sku,name,brand,color,size,mrp,price,quantity
TSHIRT001,Classic Tee,StreamThreads,Red,M,799,499,10
```

✅ Success:
```json
{
  "stored": 2,
  "failed": []
}
```

⚠️ Failure:
```json
{
  "stored": 1,
  "failed": [{ "row": {"sku": ""}, "error": "Missing required fields" }]
}
```

---

### 📦 Get All Products

```
GET /products
```
```bash
curl -X GET "http://localhost:8000/products"
```
Query params: `page`, `limit`

---

### 🔍 Search / Filter Products

```
GET /products/search
```

Params: `brand`, `color`, `minPrice`, `maxPrice`

---
```bash
curl -X GET "http://localhost:8000/products/search?brand=BloomWear&maxPrice=2500"
curl -X GET "http://localhost:8000/products/search?brand=BloomWear&color=Pink"
curl -X GET "http://localhost:8000/products/search?brand=BloomWear"
```

## 🧠 Validation Rules

| Field           | Rule                 |
|-----------------|----------------------|
| sku, name, brand| required             |
| mrp, price      | must be numeric      |
| price           | must be ≤ mrp       |
| quantity        | must be ≥ 0         |

---

## 🧪 Testing

```bash
npm test
```

- Jest runner
- Sequelize mocking

✅ Example Output:
```
PASS tests/csvParser.test.js
PASS tests/validation.test.js
PASS tests/filters.test.js
```

---

## 🐘 Database Access

```bash
docker exec -it productdb psql -U postgres -d productdb
```

or use GUI clients like DBeaver / TablePlus.

---

## 🧩 Docker Image Management

```bash
docker build -t product-backend .
docker run -p 8000:8000 --env-file .env product-backend
docker save -o product-backend.tar product-backend
```

---

## 🛣️ Roadmap

- [x] PostgreSQL integration
- [x] Sequelize ORM setup
- [x] Fully tested APIs
- [x] Dockerized backend
- [ ] Authentication & roles
- [ ] Frontend dashboard

---

## 📄 License

For educational purpose

---

## 📬 Contact

**Shivam Maurya**  
📧 shivamvision.email@example.com  
🔗 [GitHub Repo](https://github.com/gittyShiv/Product-Uploader-Backend)
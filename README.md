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
- 🧪 Unit tests coverage using Jest
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
 Unit Tests will be passed(shown)
 Test Suites: 3 passed, 3 total
product-backend-test |Tests:8 passed, 8 total                  
product-backend-test | Snapshots: 0 total                                                product-backend-test | Time:        1.622 s
product-backend-test | Ran all test suites. 
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

For local testing you can upload your csv file or paste in products.csv
then
```bash
curl -X POST -F "file=@products.csv" http://localhost:8000/upload
```

Sample CSV:
```csv
sku,name,brand,color,size,mrp,price,quantity
TSHIRT001,Classic Tee,StreamThreads,Red,M,799,499,10
DRESS-YLW-M,Floral Summer Dress,BloomWear,Yellow,M,2499,1999,7
```

✅ Success:
```json
{
  "stored": 2,
  "failed": []
}
```

Sample CSV:
```csv
sku,name,brand,color,size,mrp,price,quantity
JEANS-BLK-030,,DenimWorks,Black,30,1999,1499,18 
DRESS-PNK-S,Floral Summer Dress,BloomWear,Pink,S,2499,2199,10 
```
⚠️ Failure:
```json
{
  "stored": 1,
  "failed": [
    {
      "row": {
        "sku": "JEANS-BLK-030",
        "name": "",
        "brand": "DenimWorks",
        "color": "Black",
        "size": "30",
        "mrp": "1999",
        "price": "1499",
        "quantity": "18 "
      },
      "error": "Required fields is missing"
    }
  ]
}
```
Sample CSV(more differnt example):
```csv
sku,name,brand,color,size,mrp,price,quantity
SHOE-NVY-8,Everyday Sneakers,StrideLab,Navy,UK8,2999,3000,19 
BAG-TOTE-BEI,Canvas Tote Bag,CarryCo,Beige,OneSize,899,699,-35
```
⚠️ Failure:
```json
{
  "stored": 0,
  "failed": [
    {
      "row": {
        "sku": "SHOE-NVY-8",
        "name": "Everyday Sneakers",
        "brand": "StrideLab",
        "color": "Navy",
        "size": "UK8",
        "mrp": "2999",
        "price": "3000",
        "quantity": "19 "
      },
      "error": "Price cannot be greater than MRP"
    },
    {
      "row": {
        "sku": "BAG-TOTE-BEI",
        "name": "Canvas Tote Bag",
        "brand": "CarryCo",
        "color": "Beige",
        "size": "OneSize",
        "mrp": "899",
        "price": "699",
        "quantity": "-35"
      },
      "error": "Quantity cannot be negative"
    }
  ]
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
(Till this point all uploaded products will be result)
Result:
```json
[
  {
    "id": 174,
    "sku": "TSHIRT001",
    "name": "Classic Tee",
    "brand": "StreamThreads",
    "color": "Red",
    "size": "M",
    "mrp": 799,
    "price": 499,
    "quantity": 10,
    "createdAt": "2025-10-17T09:59:15.121Z",
    "updatedAt": "2025-10-17T09:59:15.121Z"
  },
  {
    "id": 175,
    "sku": "DRESS-YLW-M",
    "name": "Floral Summer Dress",
    "brand": "BloomWear",
    "color": "Yellow",
    "size": "M",
    "mrp": 2499,
    "price": 1999,
    "quantity": 7,
    "createdAt": "2025-10-17T09:59:15.121Z",
    "updatedAt": "2025-10-17T09:59:15.121Z"
  },
  {
    "id": 176,
    "sku": "DRESS-PNK-S",
    "name": "Floral Summer Dress",
    "brand": "BloomWear",
    "color": "Pink",
    "size": "S",
    "mrp": 2499,
    "price": 2199,
    "quantity": 10,
    "createdAt": "2025-10-17T10:00:46.682Z",
    "updatedAt": "2025-10-17T10:00:46.682Z"
  }
]
```
---
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

## 🧪 Testing(if not using docker(chosen alternate method))

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
You should now see a prompt like:
```Code
productdb=#
```
You can see all stored products by
```SQL
SELECT * FROM "Products";
```
You can also remove table using 
```SQL
TRUNCATE TABLE "Products";
```
To exit 
```SQL
\q
```
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
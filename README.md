<!-- # 🧠 Product Uploader Backend (Express + PostgreSQL + Sequelize + Docker)

A backend service for uploading, validating, and storing product data from CSV files.  
Built with **Express.js**, **PostgreSQL**, and **Sequelize**, it supports product upload, validation, and filtering APIs — fully tested using **Jest** and containerized using **Docker**.

---

## 🚀 Tech Stack
- **Node.js + Express** — REST API framework  
- **PostgreSQL** — relational database  
- **Sequelize ORM** — schema & query abstraction  
- **Multer** — file upload handler  
- **csv-parser** — CSV parsing utility  
- **Jest** — unit testing  
- **Docker + Docker Compose** — for full containerized development  

---

## 📁 Folder Structure
product-uploader-backend/
├── src/
│ ├── config/db.js
│ ├── controllers/productController.js
│ ├── models/Product.js
│ ├── routes/productRoutes.js
│ ├── utils/csvHandler.js
│ └── server.js
├── tests/
│ ├── csvParser.test.js
│ ├── validation.test.js
│ └── filters.test.js
├── uploads/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md

## ⚙️ Setup Instructions

### 🧱 1️⃣ Clone Repository
```bash
git clone https://github.com/<your-username>/product-uploader-backend.git
cd product-uploader-backend
🐳 2️⃣ Run Using Docker (Recommended)
This setup automatically runs PostgreSQL and your backend server in containers.

▶️ Start Containers
docker compose up --build
📦 What Happens
PostgreSQL container starts on port 5432

Backend starts on port 8000

Sequelize automatically syncs your models

✅ Verify Containers
bash
Copy code
docker ps
Expected output:
CONTAINER ID   IMAGE             NAMES
abc12345       product-backend   product-backend
def67890       postgres:15       productdb
🧰 Docker Commands Reference
Command	Description
docker compose up -d	Start backend + PostgreSQL
docker compose down	Stop containers
docker compose down -v	Stop & remove containers + volumes
docker logs product-backend -f	View backend logs
docker exec -it productdb psql -U postgres -d productdb	Access PostgreSQL CLI

⚙️ 3️⃣ Manual Setup (Alternative)
If you prefer to run locally instead of Docker:

Install Dependencies

npm install
Configure .env
Create a .env file:

env
PORT=8000
POSTGRES_URI=postgres://postgres:root@localhost:5432/productdb
Start Local PostgreSQL (optional)
docker run --name productdb \
  -e POSTGRES_PASSWORD=root \
  -p 5432:5432 \
  -d postgres
Run the Server
npm run dev


Your server runs at:
👉 http://localhost:8000

🧩 API Documentation
Base URL
http://localhost:8000
📤 1️⃣ Upload Products (CSV)
Endpoint:
POST /upload

Description:
Upload a CSV file containing product data. Each row is validated before being stored in PostgreSQL.

Headers:
Content-Type: multipart/form-data
Form Field:
file — CSV file containing products

Example using cURL:
curl -X POST -F "file=@products.csv" http://localhost:8000/upload
Sample CSV:

csv
sku,name,brand,color,size,mrp,price,quantity
TSHIRT001,Classic Tee,StreamThreads,Red,M,799,499,10
TSHIRT002,Sporty Tee,StreamThreads,Blue,L,899,899,5
✅ Success Response:

json
{
  "stored": 2,
  "failed": []
}
⚠️ Partial Failure Response:

json
{
  "stored": 1,
  "failed": [
    {
      "row": { "sku": "", "name": "Invalid Product" },
      "error": "Missing required fields"
    }
  ]
}
📦 2️⃣ Get All Products
Endpoint:
GET /products

Query Params:

Parameter	Type	Description
page	number	Page number (default = 1)
limit	number	Number of products per page (default = 10)

Example:
curl -X GET "http://localhost:8000/products"
Response:

json
[
  {
    "sku": "TSHIRT001",
    "name": "Classic Tee",
    "brand": "StreamThreads",
    "color": "Red",
    "size": "M",
    "mrp": 799,
    "price": 499,
    "quantity": 10
  }
]
🔍 3️⃣ Search / Filter Products
Endpoint:
GET /products/search

Query Parameters:

Param	Type	Description
brand	string	Filter by brand
color	string	Filter by color
minPrice	number	Minimum price
maxPrice	number	Maximum price

Example:
curl -X GET "http://localhost:8000/products/search?minPrice=400&maxPrice=900"
Response:

json
[
  {
    "sku": "TSHIRT001",
    "name": "Classic Tee",
    "brand": "StreamThreads",
    "color": "Red",
    "size": "M",
    "mrp": 799,
    "price": 499,
    "quantity": 10
  }
]
🧠 Validation Rules
Field	Rule
sku, name, brand	required
mrp, price	must be numeric
price	must be ≤ mrp
quantity	must be ≥ 0

Invalid rows are returned in the "failed" array with a descriptive error message.

🧪 Testing
1️⃣ Run Tests
npm test
2️⃣ Tools Used
Jest — test runner
Sequelize Mocking — no live DB access required

3️⃣ Test Files
File	Purpose
csvParser.test.js	CSV parsing & validation tests
validation.test.js	Product field validation
filters.test.js	Search & filter logic

Sample Output:
PASS tests/csvParser.test.js
PASS tests/validation.test.js
PASS tests/filters.test.js

Test Suites: 3 passed, 3 total
Tests:       8 passed, 8 total

Using Docker CLI:
docker exec -it productdb psql -U postgres -d productdb
Using Local GUI (Optional):
Use any PostgreSQL client like DBeaver or TablePlus with:

Host: localhost
Port: 5432
Database: productdb
User: postgres
Password: root
🧩 Docker Image Management (Optional)
If you want to share the backend image manually:

Create an Image
docker build -t product-backend .
Run from Image

docker run -p 8000:8000 --env-file .env product-backend
Save Image to File (if required by company)

docker save -o product-backend.tar product-backend
✨ Author
Shivam Maurya
Backend Developer | MERN / PostgreSQL Stack
📧 [your.email@example.com]
🔗 GitHub: https://github.com/<your-username>

🏁 Project Status
✅ PostgreSQL integration complete
✅ Sequelize ORM configured
✅ Fully tested APIs
✅ Dockerized backend (Express + PostgreSQL)
✅ Ready for company review and deployment -->
# 🧠 Product Uploader Backend

A robust backend service for uploading, validating, and storing product data from CSV files.  
Built with **Express.js**, **PostgreSQL**, and **Sequelize**, this project provides clean APIs for **file upload**, **validation**, and **product filtering**, fully containerized with **Docker** and tested with **Jest**.

[![Contributors](https://img.shields.io/github/contributors/your-username/product-uploader-backend.svg?style=for-the-badge)](https://github.com/your-username/product-uploader-backend/graphs/contributors)
[![Forks](https://img.shields.io/github/forks/your-username/product-uploader-backend.svg?style=for-the-badge)](https://github.com/your-username/product-uploader-backend/network/members)
[![Stargazers](https://img.shields.io/github/stars/your-username/product-uploader-backend.svg?style=for-the-badge)](https://github.com/your-username/product-uploader-backend/stargazers)
[![License](https://img.shields.io/github/license/your-username/product-uploader-backend.svg?style=for-the-badge)](https://github.com/your-username/product-uploader-backend/blob/main/LICENSE)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

---

## 📖 About The Project

**Product Uploader Backend** simplifies bulk product management.  
You can upload CSV files containing product details, automatically validate them, and store clean data in a PostgreSQL database.  
It also offers filtering and searching APIs for flexible retrieval — perfect for e-commerce, inventory tools, or internal dashboards.

---

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
git clone https://github.com/your-username/product-uploader-backend.git
cd product-uploader-backend
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

Query params: `page`, `limit`

---

### 🔍 Search / Filter Products

```
GET /products/search
```

Params: `brand`, `color`, `minPrice`, `maxPrice`

---

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

## 🤝 Contributing

```bash
git checkout -b feature/AmazingFeature
git commit -m "Add AmazingFeature"
git push origin feature/AmazingFeature
```

Open a PR 🚀

---

## 📄 License

For educational purpose

---

## 📬 Contact

**Shivam Maurya**  
📧 shivamvision.email@example.com  
🔗 [GitHub Repo](https://github.com/your-username/product-uploader-backend)
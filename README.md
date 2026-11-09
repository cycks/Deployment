# Loftier - Movie & Full-Stack Blogging Platform

A full-stack, containerized blogging and movie review platform. Built with a **React (Vite)** frontend and a **Flask RESTful API** backend, orchestrated seamlessly using **Docker Compose**.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Key Features](#key-features)
- [Project Architecture](#project-architecture)
- [Getting Started](#getting-started)
  - [Docker Setup (Recommended)](#docker-setup-recommended)
  - [Local Development Setup](#local-development-setup)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Database Migrations](#database-migrations)
- [License](#license)

---

## 🎯 Overview

**Loftier** provides a full-featured content creation and management workspace supporting multiple user roles:

* **Administrators:** Oversee user approvals, categories, post approvals/rejections, and user messages.
* **Authors:** Draft, edit, manage, and publish blog articles or movie reviews.
* **Commentators / Readers:** Explore posts, leave ratings/comments, and manage personalized watch lists.

---

## 🛠 Tech Stack

### Frontend
- **Framework:** React 18 (Vite build system)
- **Routing:** React Router DOM (with protected route wrappers)
- **State Management:** React Context API (`AuthContext`)
- **API Client:** Axios (`api.js`)
- **GraphQL:** Firebase DataConnect Integration (`dataconnect`)

### Backend
- **Framework:** Python 3.12 / Flask
- **ORM & Database:** SQLAlchemy, Alembic Migrations
- **Authentication:** JWT & OAuth2 (`google_auth.py`)
- **Testing:** Pytest

### Infrastructure
- **Containerization:** Docker & Docker Compose (`docker-compose.yaml`)

---

## ✨ Key Features

- 🔐 **Multi-Tiered Authentication:** Email/password authentication, password reset workflows, email verification, and Google OAuth2 integration.
- 👥 **Role-Based Portals:** Tailored dashboards for Admins, Authors, and Commentators.
- 🎬 **Movie & Content Management:** Article creation, media category mapping, image uploads, ratings, and comment management.
- ⚡ **Firebase DataConnect Integration:** GraphQL schemas, mutations, and query examples for flexible data access.
- 🐳 **Docker Integration:** Ready-to-use Dockerfiles for both service tiers.

---

## 📂 Project Architecture

```text
Development/
├── docker-compose.yaml
│
├── loftierfrontend-vite/          # React + Vite Frontend
│   ├── Dockerfile
│   ├── vite.config.js
│   ├── dataconnect/               # GraphQL schemas, queries, and mutations
│   └── src/
│       ├── components/            # Navbars, Layouts, Tables, Modals
│       ├── contexts/              # Authentication context providers
│       ├── libs/                  # API client instance configuration
│       └── pages/                 # Routing pages & Role-specific dashboards
│           └── Dashboards/
│               ├── Admin/         # Category, Post, Message, User management
│               ├── Authors/       # Author dashboard & post management
│               └── Commentors/    # Reader/Commentator portal
│
└── flask_blog_backend/            # Flask RESTful API Backend
    ├── Dockerfile
    ├── run.py                     # Entry point server script
    ├── create_admin.py            # CLI helper to seed Admin user
    ├── create_superadmin.py       # CLI helper to seed Superadmin user
    ├── app/
    │   ├── models/                # SQLAlchemy database models
    │   ├── routes/                # Flask Blueprints (Auth, Post, User, etc.)
    │   ├── utils/                 # Decorators and media processing helpers
    │   └── static/uploads/        # Static uploads (Post & Category images)
    ├── migrations/                # Alembic database migration environment
    └── tests/                     # Pytest suite for API endpoints
```

---

## 🚀 Getting Started

### Docker Setup (Recommended)

1. Ensure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is running.
2. Navigate to the `Development/` folder:
   ```bash
   cd Development
   ```
3. Build and launch the container suite:
   ```bash
   docker-compose up --build -d
   ```
4. Access the applications:
   - **Frontend Interface:** `http://localhost:5173`
   - **Backend API:** `http://localhost:5000`

---

### Local Development Setup

#### 1. Backend Service (Flask)

```bash
cd Development/flask_blog_backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
flask db upgrade

# (Optional) Seed Admin Account
python create_admin.py

# Start Flask Application
python run.py
```

#### 2. Frontend Service (Vite + React)

```bash
cd Development/loftierfrontend-vite

# Install NPM dependencies
npm install

# Start Vite local development server
npm run dev
```

---

## 🌐 API Endpoints

| Blueprint | Endpoint Route | Description |
| :--- | :--- | :--- |
| **Auth** | `/auth` | User registration, login, email confirmations, password reset |
| **Google Auth** | `/auth/google` | OAuth authentication callback endpoints |
| **Users** | `/user` | User profiles, role elevation, and block lists |
| **Posts** | `/post` | CRUD endpoints for blog posts, reviews, and status flags |
| **Categories** | `/category` | Category management and post assignments |
| **Comments** | `/comment` | Comment submission, moderation, and ratings |
| **Watch List** | `/watched` | User watchlist tracking |
| **Contact** | `/contact` | Message handling from site visitors |

---

## 🧪 Testing

The backend includes tests structured around `pytest`.

To run tests:

```bash
cd Development/flask_blog_backend
pytest
```

---

## 🗄 Database Migrations

Manage database schemas using **Flask-Migrate**:

```bash
cd Development/flask_blog_backend

# Generate a new migration script
flask db migrate -m "Add new field or table"

# Apply migrations to database
flask db upgrade
```

---

## 📄 License

Proprietary software. All rights reserved.
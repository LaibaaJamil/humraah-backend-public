# Hum-Raah Backend

Backend API for **Hum-Raah**, an NGO coordination and civic-issue reporting platform. The system supports collaboration between citizens, NGOs, and administrators, with real-time updates and role-based workflows.

## Features

- Role-based access for citizens, NGOs, and administrators
- Civic-issue report submission and verification workflow
- GIS-based report location and map-pin visibility controls
- NGO coordination dashboards
- Real-time updates using Socket.io
- RESTful API built with Node.js and Express

## Tech stack

- Node.js
- Express.js
- MongoDB Atlas
- Socket.io
- JWT authentication
- Railway deployment

## Getting started

### Prerequisites

- Node.js 18 or later
- MongoDB Atlas database (or a local MongoDB instance)

### Installation

```bash
git clone https://github.com/LaibaaJamil/humraah-backend.git
cd humraah-backend
npm install
```

Create a `.env` file in the project root and add the required environment variables. Do **not** commit this file.

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
CLIENT_URL=http://localhost:3000
```

Start the development server:

```bash
npm run dev
```

## Related project

Hum-Raah also includes a Flutter mobile/web client for NGO coordination and civic reporting.

## Author

Laiba Jamil — [GitHub](https://github.com/LaibaaJamil) · [LinkedIn](https://www.linkedin.com/in/laiba-jamil-8454aa294)

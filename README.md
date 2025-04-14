# SUB-TRACK

A user authentication system with login and signup functionality.

## Features

- User registration and login
- Secure password hashing
- JWT-based authentication
- MySQL database integration
- Modern dark-themed UI
- Responsive design

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- npm (Node Package Manager)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a MySQL database named `subtrack`:
   ```sql
   CREATE DATABASE subtrack;
   ```

4. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the database credentials in `.env` file

5. Start the server:
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

6. Open `index.html` in your browser to access the application

## Project Structure

- `index.html` - Login page
- `signup.html` - Registration page
- `dashboard.html` - User dashboard
- `styles.css` - Styling for all pages
- `script.js` - Frontend JavaScript
- `server.js` - Backend server
- `.env` - Environment variables

## Security Features

- Password hashing using bcrypt
- JWT token-based authentication
- Secure session management
- Input validation
- CORS protection

## API Endpoints

- POST `/api/signup` - User registration
- POST `/api/login` - User login
- GET `/api/user` - Get user details (protected route) 
# Chatties - Real-Time Chat App


Chatties is a scalable and feature-rich real-time chat application built with **PERN Stack (PostgreSQL, Express, React, Node.js)** and **Drizzle ORM**. It leverages **Redis Pub/Sub** to ensure smooth and efficient real-time messaging across multiple instances. The app includes essential chat functionalities such as online status, message alerts, group chats, file uploads, and a fully responsive UI with light/dark mode.

---

## 🚀 Features

### 🔹 Real-Time Messaging
- Instant messaging using WebSockets (Socket.io)
- Read receipts and delivery statuses
- Typing indicators

### 🔹 User & Group Chats
- One-on-one private chats
- Group conversations with role-based permissions
- Pinned messages and chat muting

### 🔹 Scalability & Performance
- **Redis Pub/Sub** for multi-instance synchronization
- **Drizzle ORM** for efficient database handling
- Optimized queries for high-speed data retrieval

### 🔹 Online Presence & Notifications
- Live user status (Online/Offline)
- Real-time notifications for messages & mentions
- System-wide announcements

### 🔹 Multimedia & File Sharing
- Image, video, and document uploads
- Cloud storage integration (Optional: AWS S3, Firebase Storage, etc.)
- Drag & drop support for easy file sharing

### 🔹 UI & Accessibility
- Fully responsive and mobile-friendly design
- **Light/Dark mode** with theme persistence
- Keyboard accessibility for improved usability

### 🔹 Security & Authentication
- **JWT-based authentication** for secure login
- OAuth support (Google, GitHub, etc.)
- End-to-end encryption for private messages (future feature)

---

## 🛠️ Tech Stack

### **Frontend:**
- React (Vite/Next.js optional)
- Tailwind CSS for styling
- Redux Toolkit for state management

### **Backend:**
- Node.js + Express.js
- PostgreSQL (Drizzle ORM for database management)
- Redis for caching and Pub/Sub messaging
- Socket.io for real-time communication

### **Deployment & DevOps:**
- Docker for containerization
- Vercel/Render for frontend hosting
- Railway/NeonDB for database hosting
- CI/CD integration with GitHub Actions

---

## 🔧 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/chatties.git
   cd chatties
   ```

2. **Install dependencies:**
   ```bash
   npm install  # or yarn install
   ```

3. **Set up environment variables:** (Create a `.env` file and configure your variables)
   ```env
   DATABASE_URL=your_postgresql_url
   REDIS_URL=your_redis_url
   JWT_SECRET=your_jwt_secret
   ```

4. **Run the backend server:**
   ```bash
   cd server
   npm run dev
   ```

5. **Start the frontend app:**
   ```bash
   cd client
   npm run dev
   ```

6. **Access the application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📌 Roadmap

- [ ] Implement end-to-end encryption for private chats
- [ ] Add video/audio call functionality
- [ ] Improve admin panel for user management
- [ ] Support push notifications (Web & Mobile)

---

⚡ Happy Chatting with **Chatties**! 🚀


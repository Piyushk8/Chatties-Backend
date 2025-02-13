# Chatties - Real-Time Chat App

Chatties is a scalable and feature-rich real-time chat application built with **PERN Stack (PostgreSQL, Express, React, Node.js)** and **Drizzle ORM**. It leverages **Redis Pub/Sub** and **Kafka** to ensure smooth and efficient real-time messaging across multiple instances. The app includes essential chat functionalities such as online status, message alerts, group chats, file uploads, and a fully responsive UI with light/dark mode.

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
- **Kafka Integration** for high-throughput message processing
- **Drizzle ORM** for efficient database handling
- Optimized queries for high-speed data retrieval

### 🔹 Online Presence & Notifications
- Live user status (Online/Offline)
- Real-time notifications for messages

### 🔹 Multimedia & File Sharing
- Image, video, and document uploads
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
- Kafka for message queue management
- Socket.io for real-time communication

### **Deployment & DevOps:**
- Vercel for frontend hosting
- NeonDB for database hosting
- CI/CD integration with GitHub Actions
-render for backend
---

## 🔧 Kafka-Based Consumer Implementation

### 🔹 Unified Kafka Consumer for Chat & Group Messages
Chatties now utilizes a **single Kafka consumer** that subscribes to both `chat-messages` and `group-messages` topics, ensuring efficient processing without redundant subscriptions. The consumer:
- Listens to messages from both **chat and group topics**.
- **Processes** messages and updates the database accordingly.
- Publishes updates to Redis for **real-time UI updates**.
- Efficiently **increments unread message count** for other users.

### 🔹 Benefits of Kafka Integration
- **Scalability:** Handles large volumes of messages seamlessly.
- **Fault Tolerance:** Ensures messages are processed even if an instance fails.
- **Decoupled Architecture:** Allows independent scaling of consumers and producers.
- **Optimized Database Writes:** Reduces redundant queries, improving performance.

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
   KAFKA_BROKER=your_kafka_broker_url
   JWT_SECRET=your_jwt_secret
   ```

4. **Run the backend server:**
   ```bash
   cd server
   npm run dev
   ```

5. **Start the Kafka consumer:**
   ```bash
   npm run consume
   ```

6. **Start the frontend app:**
   ```bash
   cd client
   npm run dev
   ```

7. **Access the application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📌 Future Scope

### 🔹 **Enhanced Real-Time Communication**
- **End-to-End Encryption** for private chats to enhance security.
- **Video & Voice Calls** using WebRTC for real-time audio/video communication.

### 🔹 **Improved User Experience**
- AI-based **smart reply suggestions**.
- **Push Notifications** for web & mobile alerts.

### 🔹 **Advanced Analytics & Moderation**
- **Admin Dashboard** for chat moderation and user management.
- **Sentiment Analysis** for content moderation.
- **Message Auditing** for compliance and security.

---

⚡ Happy Chatting with **Chatties**! 🚀


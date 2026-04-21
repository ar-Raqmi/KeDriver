# 🚐 KeDriver - Modern Transport Log System

Selamat Datang ke **KeDriver**! 🚀

KeDriver is a premium, lightweight, and super-fast transport management system built to solve the headache of vehicle scheduling and trip logging. Originally designed for logistics teams and office fleets, it bridges the gap between those who need a ride (**Pegawai**), those who drive (**Pemandu**), and those who coordinate the chaos (**Admin**).

![PWA Ready](https://img.shields.io/badge/PWA-Ready-orange?style=for-the-badge&logo=pwa)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase)

---

<div align="center">
  <img src="/images/loginpage.png" width="280" alt="KeDriver Login Page" style="border-radius: 24px; margin: 10px; box-shadow: 0 20px 40px rgba(0,0,0,0.1)"/>
  <img src="/images/requestpage.png" width="280" alt="KeDriver Request Page" style="border-radius: 24px; margin: 10px; box-shadow: 0 20px 40px rgba(0,0,0,0.1)"/>
</div>

---

## ✨ What makes KeDriver cool?

We didn't just build a database; we built an **experience**. 

### 👔 For the Staff (Pegawai)
*   **Request in Seconds**: A clean mobile-first interface to book your trips.
*   **Total Control**: Edit or cancel your requests as long as they are still `PENDING`.
*   **Status at a Glance**: Real-time updates on whether your transport is ready or already assigned.

### 🚛 For the Drivers (Pemandu)
*   **Smart Search**: Quickly find your vehicle by No. Plat, Model, or **Jenama** (Brand).
*   **The "Thumb-In" Workflow**: A dedicated mobile view to start and stop trips with one tap.
*   **Clean Logs**: No more messy paperwork. Everything is logged directly to the cloud.

### 👑 For the Boss (Admin / Ketua Pemandu)
*   **High-Density Fleet View**: A bento-style dashboard to manage dozens of vehicles without endless scrolling.
*   **Advanced Scheduling**: Group multiple staff requests into a single trip, assign a driver, and pick a vehicle using a tiered search system (Jenama ➔ Model ➔ Plate).
*   **Auto-Cleanup**: The system automatically tidies up past requests at midnight so your dashboard stays fresh every morning.
*   **User Management**: Secure account creation with unique ID enforcement (no duplicates allowed!).

---

## 📱 PWA: Better than an App Store app
KeDriver is a **Progressive Web App**. That means:
*   **Smart Install**: A custom, premium popup detects if you're on iOS or Android and guides you through adding it to your home screen.
*   **No App Store Hassle**: Just visit the link, install, and you're ready to go.
*   **24-Hour Memory**: Our install prompt is polite—if you dismiss it, it won't bug you again for another 24 hours.

---

## 🛠️ Tech Stack
*   **Frontend**: React + Vite (Lightning fast)
*   **Styling**: Premium Custom CSS + Framer Motion (Smooth animations)
*   **Backend**: Firebase (Auth & Firestore) for real-time synchronization.
*   **Icons**: Lucide React.

---

## 🚀 Quick Start (For Developers)

1. **Clone & Install**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   Create a `.env` file in the root and add your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   VITE_FIREBASE_PROJECT_ID=your_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

3. **Run Locally**:
   ```bash
   npm run dev
   ```

4. **Build for Production (Netlify)**:
   ```bash
   npm run build
   # Move the /dist folder to Netlify and you're live!
   ```

---

## 💡 Notes for the User
*   **Security**: Always use **HTTPS** for the PWA "Install" button to work perfectly on Android.
*   **Browsers**: Best experienced on Chrome (Android/PC) or Safari (iOS).

Made with ❤️ for better transport management.

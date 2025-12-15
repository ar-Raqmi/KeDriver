# KeDriver

A digital vehicle logging and trip management application for fleet management. Track vehicle usage, driver trips, and generate reports.

## Features

- **Driver Portal**: Start/end trips with origin, destination, vehicle selection, and passenger count
- **Admin Dashboard**: View, filter, and manage all trip records
- **Vehicle Management**: Add and manage fleet vehicles
- **User Management**: Manage driver accounts with role-based access
- **PDF Reports**: Export trip data as PDF documents
- **Offline Support**: Works with LocalStorage when Firebase is not configured

## Tech Stack

- React 19 + TypeScript
- Vite
- Firebase Firestore
- Tailwind CSS
- Lucide React (icons)
- date-fns

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Firebase:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Copy your config to `services/firebaseConfig.ts`
4. Run the development server:
   ```bash
   npm run dev
   ```

## Environment

The app runs in demo mode (LocalStorage) if Firebase is not configured. Configure Firebase credentials for cloud sync and multi-user support.

## License

MIT

# Timesheet MERN Project

## Overview

A full-stack MERN (MongoDB, Express, React, Node.js) application for employee timesheet management, reporting, notifications, and more. The project is structured for scalability, maintainability, and clean architecture.

---

## Folder Structure

```
root/
├── cert.pem, key.pem, ngrok.yml, package.json
├── client/           # React frontend
│   ├── craco.config.js, netlify.toml, package.json, README.md
│   ├── build/        # Production build output
│   │   ├── _redirects, asset-manifest.json, favicon.ico, index.html, manifest.json, robots.txt
│   │   ├── img/      # Build images
│   │   └── static/   # Build static assets (css/js)
│   ├── public/       # Static assets for dev/build
│   │   ├── favicon.ico, index.html, manifest.json, robots.txt
│   │   └── img/      # Public images
│   └── src/          # Main React source code
│       ├── api/          # API calls to backend
│       ├── components/   # UI components (auth, dashboard, layout, pages, setting, etc.)
│       ├── context/      # React context (SidebarContext, etc.)
│       ├── img/          # App images
│       ├── redux/        # Redux slices
│       ├── store/        # Redux store config
│       ├── styles/       # SCSS/CSS and style modules
│       ├── App.js, index.js, ... # Main app files
│       └── ...
├── server/          # Node/Express backend
│   ├── config/      # DB and env config
│   ├── controllers/ # Route logic (all business logic for each resource)
│   ├── middleware/  # Auth, error handling, and other Express middleware
│   ├── models/      # Mongoose schemas (Client, Employee, EmployerSetting, etc.)
│   ├── routes/      # Express routes (maps endpoints to controllers)
│   ├── scheduler/   # Scheduled jobs (e.g., notificationScheduler.js)
│   ├── scripts/     # Seeding scripts (e.g., seedScheduledNotifications.js)
│   ├── services/    # Business logic (email, reports, notifications, seeding)
│   ├── utils/       # (Deprecated) Utility functions (e.g., sendEmail.js)
│   └── server.js    # App entry point
└── ...
```

---

## Key Features

- **User Authentication** (JWT, roles: employer/employee)
- **Timesheet Management** (CRUD, Excel/email reports)
- **Client/Project/Vehicle Management**
- **Role & Schedule Assignment** (with notifications)
- **Centralized Email & Notification Services**
- **Download & Email Reports (Excel)**
- **Clean, modular, and scalable architecture**

---

## How to Run

### 1. Install Dependencies

```
cd client && npm install
cd ../server && npm install
```

### 2. Environment Variables

- Copy `.env.example` to `.env` in `server/` and fill in your MongoDB URI, JWT secret, email credentials, etc.

### 3. Start the App

```
# In one terminal:
cd server && npm run dev
# In another terminal:
cd client && npm start
```

### 4. Access

- Frontend: `https://localhost:3000`
- Backend API: `https://localhost:5000`

---

## SSL Configuration

### Automating SSL Certificate Renewal

To automate SSL certificate renewal, use Let's Encrypt or Certbot:

#### Steps:

1. Install Certbot:

   ```bash
   sudo apt update
   sudo apt install certbot
   ```

2. Generate SSL Certificates:

   ```bash
   sudo certbot certonly --standalone -d yourdomain.com
   ```

3. Configure Renewal:
   Certbot automatically sets up a cron job for renewal. Verify it:

   ```bash
   sudo crontab -l
   ```

4. Update `server.js` to use the generated certificates:
   ```javascript
   const options = {
     key: fs.readFileSync("/etc/letsencrypt/live/yourdomain.com/privkey.pem"),
     cert: fs.readFileSync(
       "/etc/letsencrypt/live/yourdomain.com/fullchain.pem",
     ),
   };
   ```

### Secure Storage

Ensure `key.pem` and `cert.pem` files are stored securely and not exposed in the repository.

---

## Project Structure Philosophy

- **Controllers**: Handle HTTP requests, call services.
- **Services**: Contain business logic, reusable utilities (email, reports, notifications).
- **Models**: Mongoose schemas for MongoDB.
- **Routes**: Define API endpoints.
- **Middleware**: Auth, error, and other Express middleware.
- **Scheduler/Scripts**: Background jobs and seeding.
- **Frontend**: Organized by feature and type (components, context, redux, styles).

---

## Customization & Extensibility

- Add new features by creating new controllers, services, and models.
- For new report types, add logic to `services/reportService.js` and call from controllers.
- For new notification types, add to `services/notificationService.js`.

---

## Contributing

1. Fork the repo
2. Create a feature branch
3. Commit and push your changes
4. Open a pull request

---

## License

MIT

---

## Contact

For questions or support, open an issue or contact the maintainer.



#rollbar
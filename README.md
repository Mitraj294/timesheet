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

## Local HTTPS & TLS troubleshooting

When developing locally you may see browser errors or blocked requests if the frontend (e.g. `https://localhost:3000`) and backend (e.g. `https://192.168.1.47:5000`) use different hostnames or self-signed certificates. Browsers treat certificates as host-specific, so a cert for `localhost` will not be valid for `192.168.1.47`.

Quick options to fix this:

- Use a single hostname for both frontend and backend. For example, map a local name to your machine IP in `/etc/hosts`:

  192.168.1.47my-timesheet.local

  Then run your backend with a TLS certificate that is valid for `my-timesheet.local` (see mkcert below) and access the frontend at `https://my-timesheet.local:3000` or configure the frontend to call the API at `https://my-timesheet.local:5000`.

- Use mkcert to create locally-trusted certificates for any hostnames you use during development:

  1. Install mkcert (https://github.com/FiloSottile/mkcert).
  2. Run `mkcert -install` once to install the local CA.
  3. Generate certs for your hostnames: `mkcert my-timesheet.local localhost 192.168.1.47`.
  4. Point `server.js` to the generated `key.pem` and `cert.pem` files.

- Use ngrok to create a secure public tunnel (useful if you need external webhooks or to avoid TLS setup locally):

  1. Start ngrok: `ngrok http 5000`.
  2. Use the forwarded `https://...ngrok.io` URL in your frontend to call the backend.

Choose the approach that best fits your workflow. For local development the mkcert + /etc/hosts combination is often the most convenient and secure.
# Thread

Thread is a React/Vite client, an Express/Mongoose API, and a MongoDB database.
The client uses React Router and Redux Toolkit Query; uploaded images are stored
in Cloudinary.

## Run locally

Requirements: Node.js 20.19 or newer and a reachable MongoDB instance.

1. Create `server/.env` with:

   ```dotenv
   MONGO_URI=mongodb://127.0.0.1:27017/Thread
   JWT_SECRET=<random secret of at least 32 bytes>
   CLIENT_URL=http://localhost:5173
   CLOUD_NAME=<Cloudinary cloud name>
   API_KEY=<Cloudinary API key>
   API_SECRET=<Cloudinary API secret>
   ```

   Generate a suitable local or production JWT secret with
   `openssl rand -base64 48`.

2. Install dependencies and start the API:

   ```sh
   cd server
   npm ci
   npm run dev
   ```

3. In another terminal, start the client:

   ```sh
   cd client
   npm ci
   printf 'VITE_SERVER_URL=http://localhost:5000\n' > .env.local
   npm run dev
   ```

The client is available at `http://localhost:5173`; the API readiness endpoint
is `http://localhost:5000/api/health`.

## Docker Compose

Set these variables in a root `.env` file before running Compose:

```dotenv
JWT_SECRET=<random secret of at least 32 bytes>
CLIENT_URL=https://thread.6packprogrammer.store
CLOUD_NAME=<Cloudinary cloud name>
API_KEY=<Cloudinary API key>
API_SECRET=<Cloudinary API secret>
```

Start the configured images with:

```sh
docker compose pull
docker compose up -d
docker compose ps
```

Compose keeps the client, API, and MongoDB published ports bound to loopback;
the existing host Nginx configuration proxies the web and API domains to those
ports. The Compose MongoDB service currently has no database authentication,
and its data is persisted in the `mongodbdata` volume. Enable database
authentication only with a planned migration for any existing volume.

The checked-in Nginx configuration listens on HTTP port 80 and does not
terminate TLS. Production must provide HTTPS at the existing infrastructure
layer before relying on Secure authentication cookies; this repository does
not configure or verify that external TLS layer.

## Automated deployment

The GitHub Actions workflow runs client lint/build and server tests on pull
requests and pushes to `main`; pushes to `main` also build and deploy Docker
images. Configure the following repository variable and secrets before
deploying:

- Variable: `VITE_SERVER_URL` (the public API origin, for example
  `https://threadapi.6packprogrammer.store`).
- Secrets: `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `SSH_PRIVATE_KEY`,
  `SSH_KNOWN_HOSTS`, `SSH_USERNAME`, and `SSH_HOST`.

The deployment host must have Docker Compose and the application files under
`/root/app`, including its root `.env` file. `SSH_KNOWN_HOSTS` must contain the
verified host key for the deployment server; host-key checking is enabled.

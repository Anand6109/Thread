const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const router = require("./routes");

const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

const requiredEnvironmentVariables = ["MONGO_URI", "JWT_SECRET", "CLIENT_URL"];
for (const name of requiredEnvironmentVariables) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}
if (
  process.env.NODE_ENV === "production" &&
  Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32
) {
  throw new Error("JWT_SECRET must be at least 32 bytes in production");
}

const clientOrigin = new URL(process.env.CLIENT_URL).origin;
const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: false,
  })
);
app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
    maxAge: 600,
  })
);
app.use((req, res, next) => {
  const isStateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  const requestOrigin = req.get("origin");
  if (isStateChanging && requestOrigin && requestOrigin !== clientOrigin) {
    return res.status(403).json({ msg: "Request origin is not allowed !" });
  }
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.get("/api/health", (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "ok" : "unavailable",
  });
});
app.use("/api", router);

app.use("/api", (req, res) => {
  res.status(404).json({ msg: "API route not found !" });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  const status = [400, 413].includes(err.status) ? err.status : 500;
  if (status === 500) {
    console.error("Request failed:", err.name || "UnknownError");
  }
  res.status(status).json({
    msg:
      status === 413
        ? "Request body is too large !"
        : status === 400
          ? "Invalid request body !"
          : "Internal server error !",
  });
});

const startServer = async () => {
  await connectDB();
  const server = app.listen(port, () => {
    console.log(`App is listening on PORT : ${port}`);
  });

  const shutdown = () => {
    server.close(async (err) => {
      if (err) {
        console.error("Error while closing HTTP server.");
        process.exitCode = 1;
      }
      try {
        await mongoose.disconnect();
      } catch {
        console.error("Error while closing MongoDB connection.");
        process.exitCode = 1;
      }
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
};

startServer().catch(() => {
  console.error("Server startup failed; check database connection and environment configuration.");
  process.exitCode = 1;
});

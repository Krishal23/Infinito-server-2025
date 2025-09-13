
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";


// Import routes
import healthcheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";
import caRouter from "./routes/ca.routes.js";
import userRouter from "./routes/user.routes.js";
import { handleErrors } from "./utils/ErrorHandler.js";
import eventRegistrationRoutes from "./routes/eventRegistration.routes.js";
import teamRegistrationRoutes from "./routes/teamRegistration.routes.js";
import simpleEventRegistrationRoutes from "./routes/simpleEventRegistration.routes.js";
import accommodationRoutes from "./routes/accommodation.routes.js";
import couponRoutes from "./routes/coupon.routes.js";

// import dashboardRouter from "./routes/dashboard.routes.js";


// Static allowlist (base)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://infinito.iitp.ac.in",
  "https://infinito-client-2025.vercel.app",
  "https://infinitotest.34.47.128.100.nip.io",
  "https://infinito-client-2025-6dlaq4r0t-krishal23s-projects.vercel.app",
  "https://infinito-client-2025.vercel.app",
  "https://infinito-client-2025-git-new-krishal23s-projects.vercel.app"
];

// Allow dynamic origins via env (comma separated)
if (process.env.CLIENT_URLS) {
  for (const url of process.env.CLIENT_URLS.split(",").map((u) => u.trim()).filter(Boolean)) {
    if (!allowedOrigins.includes(url)) allowedOrigins.push(url);
  }
}

// Pattern allowlist for Vercel preview deployments and localhost on any port
const allowedOriginPatterns = [
  /^https?:\/\/localhost(?::\d+)?$/,
  /^https:\/\/infinito-client-2025[\w-]*\.vercel\.app$/,
];


const app = express();



const isProduction = process.env.NODE_ENV === "production";

const corsOptions = {
  origin: (origin, callback) => {
    if (!isProduction) {
      return callback(null, true);
    }
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOriginPatterns.some((re) => re.test(origin))) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 204,
};

app.use((req, res, next) => {
  console.log("Incoming Origin:", req.headers.origin);
  next();
});


// Main CORS
app.use(cors(corsOptions));
// app.options("*", cors(corsOptions));


app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});



app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  })
);

const originalUse = app.use.bind(app);
app.use = function (path, ...handlers) {
  if (typeof path === "string") {
    console.log("Mounting route:", path);
  } else {
    console.log("Mounting middleware (no path)");
  }
  return originalUse(path, ...handlers);
};


// Common middlewares
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Request logging middleware (optional, for debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/ca", caRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/events", eventRegistrationRoutes);
app.use("/api/v1/teams", teamRegistrationRoutes);
app.use("/api/v1/simple-events", simpleEventRegistrationRoutes);
// app.use("/api/v1/user2", dashboardRouter);
// app.use("/api/v1/accommodation", accommodationRoutes);
// app.use("/api/v1/coupons", couponRoutes);


//admin-routes



app.use(handleErrors);

// Root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Server is running!",
    routes: {
      healthcheck: "/api/v1/healthcheck",
      auth: "/api/v1/auth",
      googleLogin: "/api/v1/auth/google",
    },
    timestamp: new Date().toISOString(),
  });
});



export { app };
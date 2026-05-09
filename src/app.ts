import cors from "cors";
import express from "express";
import path from "path";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import notFound from "./middlewares/notFound";
import router from "./routes";


const app = express();
app.use(express.json());
app.use(cors());

// Redirect root URL to nittovojon.com
app.get("/", (req, res) => {
  // res.redirect(301, "https://nittovojon.com");
  res.json({
    statusCode: 200,
    success: true,
    message: "Welcome to nursery server app, Server is running successfully by Salah Uddin with updated code",
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Serve verification page
app.get('/verify-email', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/verify-email.html'));
});

// Serve success pages
app.use(
  "/new-password-reset-success.html",
  express.static(path.join(__dirname, "public/new-password-reset-success.html"))
);

// Routes
app.use("/api/v1", router); 

// global error handler
app.use(globalErrorHandler);

// not found handler
app.use(notFound);

export default app;

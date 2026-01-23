import Express from "express";
import cors from "cors";
import env from "dotenv";
import { fetchAll, authAPI, userAPI, courseAPI } from "./DB.js";

env.config();

const app = Express();
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: ["http://localhost:3000", "*"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(Express.json({ limit: "10mb" }));
app.use(Express.urlencoded({ extended: true }));

// Server Status
app.get("/", (req, res) => {
  res.status(200).send({ info: "success" });
});

// ============================================
// AUTH ROUTES
// ============================================
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  // console.log(email, password, "signup");
  const { data, error } = await authAPI.signup(email, password);
  // console.log(data, error);
  if (error) return res.status(400).json({ error: error?.message });
  return res.status(200).json(data);
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await authAPI.login(email, password);
  // console.log(error, data);
  if (error) return res.status(400).json({ error: error?.message });
  return res.status(200).json(data);
});

app.get("/logout", async (req, res) => {
  const { data, error } = await authAPI.logout();
  if (error) return res.status(400).json({ error: error?.message });
  return res.status(200).json(data);
});

app.get("/user", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  // console.log("user", token);
  if (!token) return res.status(401).json({ error: "Token Is Missing" });
  const { data, error } = await authAPI.getUser(token);
  if (error) return res.status(400).json({ error });
  return res.status(200).json(data);
});

/**
 * @route   POST /refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (but requires valid refresh token)
 */
app.post("/refresh", async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({
      error: "Refresh token is required",
      info: "missing_refresh_token",
    });
  }

  try {
    const { data, error } = await authAPI.refreshSession(refresh_token);

    if (error) {
      console.error("Refresh error:", error);
      return res.status(401).json({
        error: error.message || "Invalid or expired refresh token",
        info: "invalid_refresh_token",
      });
    }

    // Supabase returns session object with new tokens
    if (!data.session) {
      return res.status(401).json({
        error: "Failed to refresh session",
        info: "no_session_data",
      });
    }

    // Return new tokens
    return res.status(200).json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      expires_at: data.session.expires_at,
      token_type: data.session.token_type,
      user: data.user,
    });
  } catch (err) {
    console.error("Refresh exception:", err);
    return res.status(500).json({
      error: "Failed to refresh token",
      info: "internal_error",
    });
  }
});

// ============================================
// PROFILE ROUTES
// ============================================
app.get("/profile", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token Is Missing" });
  const { data, error } = await userAPI.fetchProfile(token);
  if (error) return res.status(400).json({ error });
  return res.status(200).json(data);
});

app.post("/profile", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token Is Missing" });
  const { data, error } = await userAPI.updateProfile(req.body, token);
  if (error) return res.status(400).json({ error });
  return res.status(200).json(data);
});

app.delete("/profile/:id", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token Is Missing" });
  const { id } = req.params;
  const { data, error } = await userAPI.deleteProfile(id, token);
  if (error) return res.status(400).json({ error });
  return res.status(200).json(data);
});

// ============================================
// COURSE ROUTES (NEW)
// ============================================

// Create a new course from AI-generated data
app.post("/courses", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token Is Missing" });
  console.log("course", res.body);
  const { data, error } = await courseAPI.createCourse(req.body, token);
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(data);
});

// Get all courses (explore page)
app.get("/courses", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token Is Missing" });

  const { data, error } = await courseAPI.getAllCourses(token);
  if (error) return res.status(400).json({ error });
  return res.status(200).json(data);
});

// Get courses by domain
app.get("/courses/domain/:domain", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token Is Missing" });

  const { domain } = req.params;
  const { data, error } = await courseAPI.getCoursesByDomain(domain, token);
  if (error) return res.status(400).json({ error });
  return res.status(200).json(data);
});

// Get single course with modules
app.get("/courses/:id", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token Is Missing" });

  const { id } = req.params;
  console.log("get", id);
  const { data, error } = await courseAPI.getCourseById(id, token);
  if (error) return res.status(400).json({ error });
  return res.status(200).json(data);
});

// Get Single Module for a Course
app.get("/module/:id", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token is Missing" });

  const { id } = req.params;
  const { data, error } = await courseAPI.getModuleById(id, token);
  if (error) return res.status(400).json({ error });
  return res.status(200).json(data);
});

// Get Single Project for a Module
app.get("/project/:id", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token is Missing" });

  const { id } = req.params;
  const { data, error } = await courseAPI.getProjectById(id, token);
  if (error) return res.status(400).json({ error });
  return res.status(200).json(data);
});

// Get all project from a Course
app.get("/projects/:id", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token is Missing" });

  const { id } = req.params;
  const { data, error } = await courseAPI.getProjectsByCourseId(id, token);
  if (error) return res.status(400).json({ error });
  return res.status(200).json(data);
});

// Get user's created courses
app.get("/my-courses", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token Is Missing" });

  const { data, error } = await courseAPI.getUserCourses(token);
  if (error) return res.status(400).json({ error });
  return res.status(200).json(data);
});

// Get user's enrolled courses
app.get("/enrolled-courses", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token Is Missing" });

  const { data, error } = await courseAPI.getEnrolledCourses(token);
  if (error) return res.status(400).json({ error });
  return res.status(200).json(data);
});

// Enroll in a course
app.post("/courses/:id/enroll", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token Is Missing" });

  const { id } = req.params;
  const { data, error } = await courseAPI.enrollInCourse(id, token);
  if (error) return res.status(400).json({ error });
  return res.status(200).json(data);
});

// Update course progress
app.patch("/courses/:id/progress", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token Is Missing" });

  const { id } = req.params;
  const { progress } = req.body;
  const { data, error } = await courseAPI.updateProgress(id, progress, token);
  if (error) return res.status(400).json({ error });
  return res.status(200).json(data);
});

// Delete course
app.delete("/courses/:id", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token Is Missing" });

  const { id } = req.params;
  const { data, error } = await courseAPI.deleteCourse(id, token);
  if (error) return res.status(400).json({ error });
  return res.status(200).json(data);
});

app.listen(port, () => {
  console.log(`Port Running On http://localhost:${port}`);
});

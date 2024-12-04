const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

const bcrypt = require('bcryptjs');  // Change this line

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Hardcoded MongoDB URI
const MONGO_URI = "mongodb+srv://dandibotlasatyanarayana:DitQDMR0CC8f17oC@cluster0.pvn3e.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define MongoDB schemas and models
const habitSchema = new mongoose.Schema({
  name: String,
  repetitions: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  lastUpdated: { type: String },
});

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String, // Add password field
  habits: [habitSchema],
});

const User = mongoose.model("User", userSchema);

// Login or Register a User
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  let user = await User.findOne({ username });

  if (user) {
    // Verify password for existing user
    const isMatch = await bcrypt.compare(password, user.password).catch((err) => {
      console.error("Bcrypt compare error:", err);
      return false;
    });

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }
  } else {
    // Register a new user
    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ username, password: hashedPassword, habits: [] });
    await user.save();
  }

  res.json(user);
});

// Fetch habits for a user
app.get("/api/habits/:username", async (req, res) => {
  const { username } = req.params;
  const user = await User.findOne({ username });

  if (!user) return res.status(404).json({ message: "User not found" });

  const today = new Date().toISOString().split("T")[0];

  user.habits.forEach((habit) => {
    if (habit.lastUpdated !== today) {
      habit.completed = false;
      habit.lastUpdated = today;
    }
  });

  await user.save();
  res.json(user.habits);
});

// Add a new habit
app.post("/api/habits/:username", async (req, res) => {
  const { username } = req.params;
  const { name } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ message: "User not found" });

  user.habits.push({ name, lastUpdated: new Date().toISOString().split("T")[0] });
  await user.save();

  res.json(user.habits);
});

// Mark habit as complete/undo
app.put("/api/habits/:username", async (req, res) => {
  const { username } = req.params;
  const { name, completed } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ message: "User not found" });

  const habit = user.habits.find((habit) => habit.name === name);

  if (habit) {
    if (!habit.completed && completed) habit.repetitions += 1; // Increment repetitions on completion
    habit.completed = completed;
  }

  await user.save();
  res.json(user.habits);
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

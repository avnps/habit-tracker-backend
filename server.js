const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose
  .connect(
    "mongodb+srv://dandibotlasatyanarayana:DitQDMR0CC8f17oC@cluster0.pvn3e.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

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
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
  
    // Validate the input
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
  
    let user = await User.findOne({ username });
  
    if (user) {
      // User exists, verify password
      const isMatch = await bcrypt.compare(password, user.password).catch(err => {
        console.error("Bcrypt compare error:", err);
        return false;
      });
  
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid password" });
      }
    } else {
      // Register new user
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({ username, password: hashedPassword, habits: [] });
      await user.save();
    }
  
    res.json(user);
  });
  
// Routes

// Login or Register a User

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
    if (!habit.completed && completed) habit.repetitions += 1; // Only increment repetitions when completing
    habit.completed = completed;
  }

  await user.save();
  res.json(user.habits);
});

// Start the server
// app.listen(PORT, () =>
//   console.log(`Server running on http://localhost:${PORT}`)
// );

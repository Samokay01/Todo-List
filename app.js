const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const flash = require("connect-flash");
const multer = require('multer');
const path = require('path');


// Initialize Express
const app = express();

// Set view engine
app.set('view engine', 'ejs');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session management
app.use(session({
  secret: "TheyesterdaytodayforeverthesameJesuswithinexhaustiblesupplyandsolutionineverysituation",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 60000 // Default session expiry
  }
}));

// Flash messages
app.use(flash());

// Passport middleware for authentication
app.use(passport.initialize());
app.use(passport.session());

// Middleware to pass flash messages to all views
app.use((req, res, next) => {
  res.locals.errorMessage = req.flash('error');
  res.locals.successMessage = req.flash('success');
  next();
});


// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/todolistDB");

// User schema and model definition
const userSchema = new mongoose.Schema({
  fullName: String,
  username: String,
  email: String,
  password: String,
  profileImage: String,
  bio: String,
  phone: String,
  birthday: Date,
  jobTitle: String,
  location: String
});


userSchema.plugin(passportLocalMongoose);  // Hashing and salting for passwords
const User = mongoose.model("User", userSchema);


// Task schema and model definition
const taskSchema = new mongoose.Schema({
  taskName: String,
  assignDate: Date,
  dueDate: Date,
  priority: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User " },
  completed: { type: Boolean, default: false }
});

const Task = mongoose.model("Task", taskSchema);

// Passport local strategy configuration
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// =======================
// ROUTES
// =======================


// ------------ USER LOGIN, LOGOUT & REGISTRATION ----------------
// Register page
app.get("/register", (req, res) => {
  res.render("register");
});

// Handle user registration
app.post("/register", (req, res) => {
  const { full_name, username, email, password, password_confirm } = req.body;
  // Check if passwords match
  if (password !== password_confirm) {
    req.flash('error', 'Passwords do not match. Please try again.');
    return res.redirect("/register");
  }

  // If passwords match, proceed with registration
  User.register(new User({ email: email, fullName: full_name, username: username }), password, (err, user) => {
    if (err) {
      req.flash('error', 'Registration failed. Try again.');
      return res.redirect("/register");
    }
    passport.authenticate("local")(req, res, () => {
      res.redirect("/");  // Redirect to the main page after successful registration
    });
  });
});

// Login page
app.get("/login", (req, res) => {
  res.render("login", { errorMessage: req.flash("error") });
});

// Handle user login
app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) { 
      return next(err); 
    }
    if (!user) {
      req.flash('error', 'Invalid username or password.');
      return res.redirect('/login');
    }

    req.logIn(user, (err) => {
      if (err) { return next(err); }

      // "Remember Me" functionality
      if (req.body.remember) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      } else {
        req.session.cookie.expires = false; // Session expires when browser is closed
      }

      res.redirect('/');
    });
  })(req, res, next);
});

// Logout route
app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
  });
});


//------ TASKS ------------------

// Main task list route (protected)
app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    // Fetch tasks specific to the logged-in user
    Task.find({ userId: req.user._id })
      .then(tasks => {
        // Render the dashboard with the user's tasks
        res.render("dashboard", { currentPage: "today", user: req.user, tasks: tasks });
      })
      .catch(err => {
        console.error(err);
        req.flash('error', 'Failed to load tasks.');
        res.redirect("/login");
      });
  } else {
    // Redirect to login if not authenticated
    res.redirect("/login");
  }
});

// Add Task page
app.get("/add-task", (req, res) => {
  res.render("add-task", {currentPage: "add-task", user: req.user});
});

// Add Task route
app.post("/add-task", (req, res) => {
  if (req.isAuthenticated()) {
    const { taskName, assignDate, dueDate, priority } = req.body;
    const task = {
      taskName,
      assignDate,
      dueDate,
      priority,
      userId: req.user._id
    };

    Task.create(task)
      .then((newTask) => {
        req.flash('success', 'Task added successfully!');
        res.redirect("/");
      })
      .catch((err) => {
        req.flash('error', 'Failed to add task.');
        res.redirect("/add-task");
      });
  } else {
    // Redirect to login if not authenticated
    res.redirect("/login");
  }
});

// Delete Task route
app.post("/delete-task/:id", (req, res) => {
  if (req.isAuthenticated()) {
    Task.findByIdAndDelete(req.params.id)
      .then(() => {
        req.flash('success', 'Task deleted successfully!');
        res.redirect("/");
      })
      .catch(err => {
        console.error(err);
        req.flash('error', 'Failed to delete task.');
        res.redirect("/");
      });
  } else {
    res.redirect("/login");
  }
});


app.post('/update-task-status/:id', (req, res) => {
  if (req.isAuthenticated()) {
    const { completed } = req.body;
    Task.findByIdAndUpdate(req.params.id, { completed: completed }, { new: true })
      .then(() => {
        res.json({ success: true });
      })
      .catch(err => {
        console.error(err);
        res.json({ success: false });
      });
  } else {
    res.status(403).json({ success: false });
  }
});


// Edit Task page
app.get("/edit-task/:id", (req, res) => {
  if (req.isAuthenticated()) {
    Task.findById(req.params.id)
      .then(task => {
        if (!task) {
          req.flash('error', 'Task not found.');
          return res.redirect("/");
        }
        res.render("edit-task", { task: task, user: req.user, currentPage: "add-task"});
      })
      .catch(err => {
        console.error(err);
        req.flash('error', 'Failed to load task.');
        res.redirect("/");
      });
  } else {
    res.redirect("/login");
  }
});

// Update Task route
app.post("/edit-task/:id", (req, res) => {
  if (req.isAuthenticated()) {
    const { taskName, assignDate, dueDate, priority } = req.body;
    Task.findByIdAndUpdate(req.params.id, { taskName, assignDate, dueDate, priority }, { new: true })
      .then(() => {
        req.flash('success', 'Task updated successfully!');
        res.redirect("/");
      })
      .catch(err => {
        console.error(err);
        req.flash('error', 'Failed to update task.');
        res.redirect("/edit-task/" + req.params.id);
      });
  } else {
    res.redirect("/login");
  }
});

//----------- USER PROFILE --------------------
// Profile page
// Profile page
app.get('/profile', (req, res) => {
  const userId = req.user._id;
  User.findById(userId)
    .then(user => {
      if (!user) {
        req.flash('error', 'User  not found.');
        return res.redirect('/');
      }
      res.render("profile", { currentPage: "today", user: req.user });
    })
    .catch(err => {
      console.error(err);
      req.flash('error', 'Could not retrieve user data.');
      res.redirect('/');
    });
});

app.post('/update-profile', upload.single('profileImage'), (req, res) => {
  if (req.isAuthenticated()) {
    const userId = req.user._id;
    const { fullName, username, email, phone, birthday, jobTitle, bio } = req.body;
    const profileImage = req.file ? req.file.path : req.user.profileImage;

    User.findByIdAndUpdate(userId, {
      fullName,
      username,
      email,
      phone,
      birthday,
      jobTitle,
      bio,
      profileImage
    }, { new: true })
      .then((user) => {
        req.flash('success', 'Profile updated successfully!');
        res.redirect('/profile');
      })
      .catch((err) => {
        console.error(err);
        req.flash('error', 'Failed to update profile.');
        res.redirect('/profile');
      });
  } else {
    res.redirect('/login');
  }
});

// Start the server
app.listen(3000, () => {
  console.log("Server started on port 3000");
});

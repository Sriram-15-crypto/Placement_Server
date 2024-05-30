const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const app = express();
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");

const userAuth = require("./routes/userAuth");
const accessuser = require("./routes/addUserRoutes");
const moduleRoutes = require("./routes/moduleRoutes");

// Connect Database
connectDB();

// Init Middleware
app.use(express.json({ extended: false }));
app.use(
  cors({
    //origin: ["http://localhost:3000", "http://localhost:3535"],
    origin: [
      "http://localhost:3000",
      // "https://smart-cliff-next-js-fkpr-roobankrs-projects.vercel.app",
      "http://localhost:3535",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    exposedHeaders: ["Content-Length", "Authorization"],
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(fileUpload());

//Home route
app.get("/", (req, res) => res.send("API Running"));

// Define Routes
app.use("/", userAuth);
app.use("/", accessuser);
app.use("/", moduleRoutes);



const PORT = process.env.PORT || 5335;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

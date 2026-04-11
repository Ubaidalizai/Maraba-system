require("dotenv").config();

const connectDB = require("./config/database.js");

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...", err);
  console.log(err.name, err.message);
  process.exit(1);
});

const app = require("./app");
const PORT = process.env.PORT || 3001;

connectDB(); // Connect database

// Here we are listening to the server
app.listen(PORT, () => {
  console.log("I am live again on port", PORT);
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

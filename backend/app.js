const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const socketio = require("socket.io");
const http = require("http");

const app = express();
const port = 3000;

// Enable CORS
app.use(cors());

// Create the HTTPS server
const server = http.createServer(app);

// Setup socket.io with the HTTPS server
const io = socketio(server, {
  cors: {
    origin: "*", // Change this to your frontend URL if you want to restrict access
  },
});

// Set view engine (optional)
app.set("view engine", "ejs");

// Handle socket connection
io.on("connection", (socket) => {
  console.log("a user connected with id", socket.id);

  socket.on("send-location", (data) => {
    io.emit("receive-location", { id: socket.id, ...data });
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

// Define a test route
app.get("/", (req, res) => {
  res.send("Hello World over HTTP!");
});

// Start the server on HTTPS
server.listen(port, () => {
  console.log(`Example app listening at https://localhost:${port}`);
});

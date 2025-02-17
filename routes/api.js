var express = require("express");
var router = express.Router();

var rooms = {};
var roomEvents = {};

// Join a room
router.post("/join", function (req, res) {
  var roomId = req.body.room_id;
  var clientId = req.body.client_id;

  if (!rooms[roomId]) {
    rooms[roomId] = [];
  }

  if (rooms[roomId].includes(clientId)) {
    res.json({ members: rooms[roomId] });
    return;
  }

  rooms[roomId].push(clientId);
  res.json({ members: rooms[roomId] });
});

// Leave a room
router.post("/leave", function (req, res) {
  var roomId = req.body.room_id;
  var clientId = req.body.client_id;

  if (!rooms[roomId]) {
    return res.status(404).json({ error: "Room not found" });
  }

  rooms[roomId] = rooms[roomId].filter((id) => id !== clientId);

  res.json({ members: rooms[roomId] });
});

// Send an event to a room
router.post("/event", function (req, res) {
  var roomId = req.body.room_id;
  var message = req.body.message;

  if (!rooms[roomId]) {
    return res.status(404).json({ error: "Room not found" });
  }

  if (!roomEvents[roomId]) {
    roomEvents[roomId] = [];
  }

  roomEvents[roomId].push(message);

  res.json({ success: true });
});

// Get events for a room
router.get("/events", function (req, res) {
  var roomId = req.query.room_id;

  if (!roomEvents[roomId]) {
    return res.status(404).json({ error: "Room not found" });
  }

  const events = roomEvents[roomId];
  roomEvents[roomId] = [];

  res.json({ events: events });
});

// Get room members
router.get("/members", function (req, res) {
  var roomId = req.query.room_id;

  if (!rooms[roomId]) {
    return res.status(404).json({ error: "Room not found" });
  }

  res.json({ members: rooms[roomId] });
});

module.exports = router;

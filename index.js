const express = require("express");
const bodyParser = require("body-parser");
const routes = require("./api/routes");
const { IP_CONFIG } = require("./utils/constants");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("InventTrack backend running...");
});

app.use("/api", routes);

const port = process.env.PORT || 4000;

app.listen(port, IP_CONFIG.ipAddress, () => {
  console.log(`Server started on port ${port}`);
});

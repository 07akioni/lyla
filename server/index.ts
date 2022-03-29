import express from "express";

const app = express();

app.use("/", (req, res, next) => {
  console.log("[request.url] req.url");
  console.log("[request.headers]");
  console.log(JSON.stringify(req.headers, null, 2));
  next();
});

// method-contentType-value frmat

app.get("/api/res-text", (req, res) => {
  res.send("ok");
});

app.get("/api/res-json", (req, res) => {
  res.send('{ "key": "value" }');
});

app.get("/api/res-json-content-type-json", (req, res) => {
  res.contentType("json");
  res.send('{ "key": "value" }');
});

app.post("/api/res-text", (req, res) => {
  res.send("ok");
});

app.post("/api/res-json", (req, res) => {
  res.send('{ "key": "value" }');
});

app.post("/api/res-json-content-type-json", (req, res) => {
  res.contentType("json");
  res.send('{ "key": "value" }');
});

app.listen(8080);

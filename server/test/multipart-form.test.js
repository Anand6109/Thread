const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const express = require("express");
const {
  firstFormValue,
  parseMultipartForm,
  removeTemporaryFiles,
} = require("../utils/multipart-form");

let server;
let serverUrl;

before(async () => {
  const app = express();
  app.post("/upload", async (req, res) => {
    try {
      const parsedForm = await parseMultipartForm(req);
      const body = {
        text: firstFormValue(parsedForm.fields.text),
        fileCount: Object.values(parsedForm.files).flat().length,
      };
      await removeTemporaryFiles(parsedForm.files);
      res.status(200).json(body);
    } catch (error) {
      res.status(error.status || 500).json({ msg: "Upload rejected." });
    }
  });
  server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  serverUrl = `http://127.0.0.1:${server.address().port}/upload`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("accepts one supported image and text field", async () => {
  const form = new FormData();
  form.append("text", "A test post");
  form.append(
    "media",
    new Blob(["image bytes"], { type: "image/png" }),
    "image.png"
  );

  const response = await fetch(serverUrl, { method: "POST", body: form });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    text: "A test post",
    fileCount: 1,
  });
});

test("rejects unsupported file types", async () => {
  const form = new FormData();
  form.append(
    "media",
    new Blob(["not an image"], { type: "text/plain" }),
    "notes.txt"
  );

  const response = await fetch(serverUrl, { method: "POST", body: form });

  assert.equal(response.status, 415);
});

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

app.use(express.static(__dirname));

const findReferenceImage = () => {
  const candidates = [
    "cow-style.jpg",
    "cow-style.jpeg",
    "cow-style.png",
    "cow.jpg",
  ];

  for (const filename of candidates) {
    const filePath = path.join(__dirname, filename);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
};

const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") {
    return "image/png";
  }
  if (ext === ".jpg" || ext === ".jpeg") {
    return "image/jpeg";
  }
  return "image/png";
};

app.post("/api/cowify", upload.single("image"), async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY." });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded." });
  }

  try {
    const formData = new FormData();
    formData.append("model", "gpt-image-1");
    formData.append("size", "1024x1024");
    formData.append(
      "prompt",
      "Transform the subject into a cute cartoon cow version. Keep the pose and framing similar, add cow spots, small horns, and a friendly snout. Match the linework, palette, and facial style of the reference cow image. Clean, lighthearted, professional cartoon style."
    );
    formData.append(
      "image",
      new Blob([req.file.buffer], { type: req.file.mimetype || "image/png" }),
      "upload.png"
    );

    const referencePath = findReferenceImage();
    if (referencePath) {
      const referenceBuffer = fs.readFileSync(referencePath);
      formData.append(
        "image",
        new Blob([referenceBuffer], { type: getMimeType(referencePath) }),
        path.basename(referencePath)
      );
    }

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        error: data.error?.message || "OpenAI request failed.",
      });
    }

    const imageBase64 = data.data && data.data[0] && data.data[0].b64_json;
    if (!imageBase64) {
      return res.status(502).json({ error: "No image returned." });
    }

    return res.json({ image: `data:image/png;base64,${imageBase64}` });
  } catch (error) {
    return res.status(500).json({ error: "Cowify failed." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Cow site running at http://localhost:${port}`);
});

const copyButtons = document.querySelectorAll("[data-copy]");
const copyNote = document.getElementById("copy-note");

const copyText = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
};

copyButtons.forEach((button) => {
  const defaultLabel = button.textContent;

  button.addEventListener("click", async () => {
    const text = button.getAttribute("data-copy");
    if (!text) {
      return;
    }

    try {
      await copyText(text);
      if (copyNote) {
        copyNote.textContent = "Copied";
        setTimeout(() => {
          copyNote.textContent = "Contract ready";
        }, 1800);
      }
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = defaultLabel;
      }, 1800);
    } catch (error) {
      if (copyNote) {
        copyNote.textContent = "Copy failed";
      }
    }
  });
});

const revealItems = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.2,
  }
);

revealItems.forEach((item) => {
  revealObserver.observe(item);
});

const uploadInput = document.getElementById("pfp-upload");
const runButton = document.getElementById("pfp-run");
const downloadButton = document.getElementById("pfp-download");
const statusText = document.getElementById("pfp-status");
const previewImage = document.getElementById("pfp-preview");
const previewWrap = document.getElementById("pfp-preview-wrap");
const placeholder = document.getElementById("pfp-placeholder");
const loading = document.getElementById("pfp-loading");

let selectedFile = null;
let outputImageUrl = "";
let inputPreviewUrl = "";

const setStatus = (message, isError = false) => {
  if (!statusText) {
    return;
  }
  statusText.textContent = message;
  statusText.style.color = isError ? "#b74747" : "";
};

const setBusy = (busy) => {
  if (runButton) {
    runButton.disabled = busy;
  }
  if (uploadInput) {
    uploadInput.disabled = busy;
  }
};

const setLoading = (visible) => {
  if (!loading) {
    return;
  }
  loading.classList.toggle("is-visible", visible);
};

const setPreview = (src) => {
  if (previewImage) {
    previewImage.src = src;
  }
  if (previewWrap) {
    previewWrap.classList.add("has-image");
  }
  if (placeholder) {
    placeholder.style.display = "none";
  }
};

const resetOutput = () => {
  outputImageUrl = "";
  if (downloadButton) {
    downloadButton.disabled = true;
  }
};

if (uploadInput) {
  uploadInput.addEventListener("change", (event) => {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) {
      return;
    }
    selectedFile = file;
    if (inputPreviewUrl) {
      URL.revokeObjectURL(inputPreviewUrl);
    }
    inputPreviewUrl = URL.createObjectURL(file);
    setPreview(inputPreviewUrl);
    resetOutput();
    setStatus("Ready to cowify.");
  });
}

if (runButton) {
  runButton.addEventListener("click", async () => {
    if (!selectedFile) {
      setStatus("Upload an image first.", true);
      return;
    }

    setBusy(true);
    setLoading(true);
    setStatus("Cowifying...");

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch("/api/cowify", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Cowify failed.");
      }

      outputImageUrl = data.image;
      setPreview(outputImageUrl);
      if (inputPreviewUrl) {
        URL.revokeObjectURL(inputPreviewUrl);
        inputPreviewUrl = "";
      }
      if (downloadButton) {
        downloadButton.disabled = false;
      }
      setStatus("Cowified!");
    } catch (error) {
      setStatus(error.message || "Cowify failed.", true);
    } finally {
      setBusy(false);
      setLoading(false);
    }
  });
}

if (downloadButton) {
  downloadButton.addEventListener("click", () => {
    if (!outputImageUrl) {
      return;
    }
    const link = document.createElement("a");
    link.download = "cowified-pfp.png";
    link.href = outputImageUrl;
    link.click();
  });
}

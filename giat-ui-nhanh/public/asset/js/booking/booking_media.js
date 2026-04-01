(function (window) {
  const app = (window.BookingApp = window.BookingApp || {});

  function initMediaUpload() {
    const form = document.getElementById("formdatdichvu");
    const imageBtn = document.getElementById("nutchupanh");
    const videoBtn = document.getElementById("nutquayvideo");
    const imageInput = document.getElementById("tailenhinhanh");
    const videoInput = document.getElementById("tailenvideo");
    const imageList = document.getElementById("danhsachxemtruochinhanh");
    const videoList = document.getElementById("danhsachxemtruocvideo");
    const imageEmpty = document.getElementById("trangthaitronghinhanh");
    const videoEmpty = document.getElementById("trangthaitrongvideo");

    if (
      !form ||
      !imageBtn ||
      !videoBtn ||
      !imageInput ||
      !videoInput ||
      !imageList ||
      !videoList ||
      !imageEmpty ||
      !videoEmpty
    ) {
      return;
    }

    if (form.dataset.mediaUploadBound === "true") {
      return;
    }
    form.dataset.mediaUploadBound = "true";

    const mediaState = {
      imageUrls: [],
      videoUrls: [],
    };

    function revokeUrls(type) {
      const key = type === "image" ? "imageUrls" : "videoUrls";
      mediaState[key].forEach((url) => URL.revokeObjectURL(url));
      mediaState[key] = [];
    }

    function toggleEmptyState(type, isEmpty) {
      const emptyEl = type === "image" ? imageEmpty : videoEmpty;
      const listEl = type === "image" ? imageList : videoList;

      emptyEl.style.display = isEmpty ? "flex" : "none";
      listEl.style.display = isEmpty ? "none" : "flex";
    }

    function createItem(name, previewNode) {
      const item = document.createElement("div");
      item.className = "media-item";

      const nameEl = document.createElement("div");
      nameEl.className = "media-name";
      nameEl.title = name;
      nameEl.textContent = name;

      item.appendChild(previewNode);
      item.appendChild(nameEl);
      return item;
    }

    function renderImages(fileList) {
      revokeUrls("image");
      imageList.innerHTML = "";

      const files = Array.from(fileList || []);
      if (!files.length) {
        toggleEmptyState("image", true);
        return;
      }

      files.forEach((file) => {
        const url = URL.createObjectURL(file);
        mediaState.imageUrls.push(url);

        const img = document.createElement("img");
        img.className = "media-thumb";
        img.alt = file.name || "Ảnh đã chọn";
        img.src = url;

        imageList.appendChild(createItem(file.name || "image", img));
      });

      toggleEmptyState("image", false);
    }

    function renderVideos(fileList) {
      revokeUrls("video");
      videoList.innerHTML = "";

      const files = Array.from(fileList || []);
      if (!files.length) {
        toggleEmptyState("video", true);
        return;
      }

      files.forEach((file) => {
        const url = URL.createObjectURL(file);
        mediaState.videoUrls.push(url);

        const video = document.createElement("video");
        video.className = "media-thumb";
        video.src = url;
        video.controls = true;
        video.preload = "metadata";

        videoList.appendChild(createItem(file.name || "video", video));
      });

      toggleEmptyState("video", false);
    }

    imageBtn.addEventListener("click", function () {
      imageInput.value = "";
      imageInput.click();
    });

    videoBtn.addEventListener("click", function () {
      videoInput.value = "";
      videoInput.click();
    });

    imageInput.addEventListener("change", function () {
      renderImages(imageInput.files);
    });

    videoInput.addEventListener("change", function () {
      renderVideos(videoInput.files);
    });

    form.addEventListener("reset", function () {
      revokeUrls("image");
      revokeUrls("video");
      imageList.innerHTML = "";
      videoList.innerHTML = "";
      toggleEmptyState("image", true);
      toggleEmptyState("video", true);
    });

    toggleEmptyState("image", true);
    toggleEmptyState("video", true);
  }

  app.media = app.media || {};
  app.media.initMediaUpload = initMediaUpload;
})(window);

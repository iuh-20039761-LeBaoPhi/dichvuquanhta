const CLIENT_ID = "755125108579-g1h5teqc1vhk5i5i2e0kl4viv5h4tcum.apps.googleusercontent.com";

const folderMap = {
  "me_va_be": "FOLDER_ID_1",
  "spa": "FOLDER_ID_2"
};

let accessToken = "";

// ===== LOGIN =====
function loginGoogle(callback) {
  const client = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: "https://www.googleapis.com/auth/drive.file",
    callback: (response) => {
      accessToken = response.access_token;
      console.log("Đã đăng nhập");
      if (callback) callback();
    }
  });

  client.requestAccessToken();
}

// ===== UPLOAD =====
async function uploadToDrive(file, service) {
  if (!accessToken) {
    alert("Chưa đăng nhập!");
    return;
  }

  const folderId = folderMap[service];

  const metadata = {
    name: file.name,
    mimeType: file.type,
    parents: [folderId]
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file);

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + accessToken
    },
    body: form
  });

  const data = await res.json();

  await makePublic(data.id);

  return {
    fileId: data.id,
    viewLink: `https://drive.google.com/file/d/${data.id}/view`
  };
}

// ===== PUBLIC =====
async function makePublic(fileId) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      role: "reader",
      type: "anyone"
    })
  });
}
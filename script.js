// 화면에서 쓸 것들을 찾아 둔다
const input = document.getElementById("todo-input");
const addButton = document.getElementById("add-button");
const list = document.getElementById("todo-list");
const emptyMessage = document.getElementById("empty-message");
const remainingCount = document.getElementById("remaining-count");

// Supabase 주소와 공개 키 (공개 키는 누구에게 보여도 되는 키다)
const SUPABASE_URL = "https://idhavujyfrrhticwwxhu.supabase.co";
const SUPABASE_KEY = "sb_publishable_un-9IJ6f8_YqQHDde2wNug_CRNS7dBm";
const TODOS_URL = SUPABASE_URL + "/rest/v1/todos";

// 할 일에 붙이는 파일은 스토리지의 files 버킷에 올린다
const STORAGE_URL = SUPABASE_URL + "/storage/v1/object";
const BUCKET = "files";

// todos 표에는 별표 칸이 없어서, 별표는 이 브라우저에 따로 저장한다
const STAR_STORAGE_KEY = "starred-ids";

// 목록이 비어 있을 때 보이는 원래 글
const EMPTY_TEXT = emptyMessage.textContent;

// 할 일 목록: 표에서 불러온 { id, text, done, created_at, file_path, file_name } 가 여러 개
let todos = [];

// 별표 친 할 일의 id 목록
let starredIds = loadStarredIds();

// Supabase에 요청을 보낸다. 실패하면 오류를 낸다.
// options.body는 표에 보낼 내용, options.file은 스토리지에 올릴 파일이다.
async function request(url, options) {
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY,
    Prefer: "return=minimal",
  };
  let body;
  if (options.file) {
    headers["Content-Type"] = options.file.type || "application/octet-stream";
    body = options.file;
  } else if (options.body) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: headers,
    body: body,
  });
  if (!response.ok) {
    throw new Error("Supabase 요청 실패: " + response.status + " " + (await response.text()));
  }
  return response;
}

// 표에서 할 일 목록을 불러온다. 먼저 만든 것이 위로.
async function loadTodos() {
  const response = await request(TODOS_URL + "?select=*&order=created_at.asc,id.asc", {});
  todos = await response.json();
}

// 할 일 id를 주소에 넣을 수 있는 모양으로 바꾼다
function byId(id) {
  return TODOS_URL + "?id=eq." + encodeURIComponent(id);
}

// 스토리지 안의 파일 위치를 주소에 넣을 수 있는 모양으로 바꾼다
function storagePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

// 누구나 열 수 있는 파일 주소 (files 버킷이 공개 버킷이어야 열린다)
function fileUrl(path) {
  return STORAGE_URL + "/public/" + BUCKET + "/" + storagePath(path);
}

// 파일을 스토리지에 올리고, 할 일 줄에 파일 위치와 이름을 적는다.
// 이미 붙은 파일이 있었으면 올린 뒤에 지운다.
async function attachFile(todo, file) {
  // 스토리지 파일 이름에는 한글을 쓸 수 없어서, 원래 이름은 file_name 칸에 따로 적는다
  const dot = file.name.lastIndexOf(".");
  const extension = dot > 0 ? file.name.slice(dot + 1) : "";
  const path =
    "todos/" + todo.id + "/" + Date.now() + (/^[a-z0-9]{1,10}$/i.test(extension) ? "." + extension : "");

  await request(STORAGE_URL + "/" + BUCKET + "/" + storagePath(path), { method: "POST", file: file });
  await request(byId(todo.id), { method: "PATCH", body: { file_path: path, file_name: file.name } });
  if (todo.file_path) {
    await removeFile(todo.file_path);
  }
}

// 스토리지에서 파일을 지운다. 실패해도 할 일은 그대로 두고 기록만 남긴다.
async function removeFile(path) {
  try {
    await request(STORAGE_URL + "/" + BUCKET + "/" + storagePath(path), { method: "DELETE" });
  } catch (error) {
    console.error(error);
  }
}

// 저장해 둔 별표 목록을 불러온다. 없거나 읽을 수 없으면 빈 목록.
function loadStarredIds() {
  try {
    const saved = JSON.parse(localStorage.getItem(STAR_STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

// 지금 별표 목록을 브라우저에 저장한다
function saveStarredIds() {
  try {
    localStorage.setItem(STAR_STORAGE_KEY, JSON.stringify(starredIds));
  } catch (error) {
    // 저장할 수 없는 브라우저에서는 화면만 바뀐다
  }
}

function isStarred(todo) {
  return starredIds.includes(String(todo.id));
}

// 표를 바꾼 뒤 목록을 다시 불러와 그린다. 실패하면 안내 글로 알려 준다.
async function change(work) {
  try {
    await work();
    await loadTodos();
    render();
  } catch (error) {
    console.error(error);
    render();
    emptyMessage.textContent = "저장소에 연결하지 못했어요. 잠시 뒤 새로고침해 주세요.";
    emptyMessage.hidden = false;
  }
}

// 목록을 화면에 다시 그린다
function render() {
  list.innerHTML = "";

  // 별표 친 할 일을 맨 위로. 불러온 순서는 그대로 두고 보여 주는 순서만 바꾼다.
  const starredFirst = todos.filter(isStarred).concat(
    todos.filter(function (todo) {
      return !isStarred(todo);
    })
  );

  starredFirst.forEach(function (todo) {
    const item = document.createElement("li");
    const starred = isStarred(todo);

    // 끝냈는지 표시하는 체크 칸
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.setAttribute("aria-label", todo.text + " 끝냄");
    checkbox.addEventListener("change", function () {
      change(function () {
        return request(byId(todo.id), { method: "PATCH", body: { done: checkbox.checked } });
      });
    });

    // 할 일 내용. 파일을 붙였으면 그 아래에 파일 이름 링크
    const body = document.createElement("div");
    body.className = "todo-body";
    const text = document.createElement("span");
    text.textContent = todo.text;
    body.append(text);
    if (todo.file_path) {
      const link = document.createElement("a");
      link.className = "file-link";
      link.href = fileUrl(todo.file_path);
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = todo.file_name || "붙인 파일";
      body.append(link);
    }

    // 파일 버튼: 누르면 파일을 고르는 창이 열린다
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.hidden = true;
    const fileButton = document.createElement("button");
    fileButton.type = "button";
    fileButton.textContent = "파일";
    fileButton.setAttribute("aria-label", todo.text + " 파일 붙이기");
    fileButton.addEventListener("click", function () {
      fileInput.click();
    });
    fileInput.addEventListener("change", function () {
      const file = fileInput.files[0];
      if (!file) {
        return;
      }
      fileButton.disabled = true;
      fileButton.textContent = "올리는 중";
      change(function () {
        return attachFile(todo, file);
      });
    });

    // 별표 버튼: 누르면 중요한 일이 된다
    const starButton = document.createElement("button");
    starButton.type = "button";
    starButton.className = "star-button";
    starButton.textContent = starred ? "★" : "☆";
    starButton.setAttribute("aria-label", todo.text + " 중요 표시");
    starButton.setAttribute("aria-pressed", starred ? "true" : "false");
    starButton.addEventListener("click", function () {
      const id = String(todo.id);
      starredIds = starred
        ? starredIds.filter(function (starredId) {
            return starredId !== id;
          })
        : starredIds.concat(id);
      saveStarredIds();
      render();
    });

    // 삭제 버튼
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "삭제";
    deleteButton.addEventListener("click", function () {
      change(async function () {
        await request(byId(todo.id), { method: "DELETE" });
        if (todo.file_path) {
          await removeFile(todo.file_path);
        }
        starredIds = starredIds.filter(function (starredId) {
          return starredId !== String(todo.id);
        });
        saveStarredIds();
      });
    });

    item.append(checkbox, body, fileInput, fileButton, starButton, deleteButton);
    list.append(item);
  });

  // 할 일이 하나도 없을 때만 안내 글을 보여 준다
  emptyMessage.textContent = EMPTY_TEXT;
  emptyMessage.hidden = todos.length > 0;

  // 끝내지 않은 할 일 개수
  const remaining = todos.filter(function (todo) {
    return !todo.done;
  }).length;
  remainingCount.textContent = "남은 할 일 " + remaining + "개";
}

// 추가 버튼을 누르면
addButton.addEventListener("click", async function () {
  const text = input.value.trim();

  // 빈 칸이나 띄어쓰기만 있으면 추가하지 않는다
  if (text === "") {
    return;
  }

  // 저장하는 동안 버튼을 잠가서 같은 일이 두 번 들어가지 않게 한다.
  // 입력칸은 바로 비워서 다음 할 일을 적을 수 있게 하고, 실패하면 적었던 글을 되돌린다.
  addButton.disabled = true;
  input.value = "";
  await change(async function () {
    try {
      await request(TODOS_URL, { method: "POST", body: { text: text, done: false } });
    } catch (error) {
      if (input.value === "") {
        input.value = text;
      }
      throw error;
    }
  });
  addButton.disabled = false;
});

// 처음 열 때 표에서 목록을 불러온다
change(function () {});

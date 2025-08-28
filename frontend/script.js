document.addEventListener("DOMContentLoaded", () => {
    const chatMessages = document.getElementById("chat-messages");
    const userInput = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");
    const sidebarCurrentPlaylistTitle = document.querySelector(".sidebar__current-playlist-title");
    const sidebarPlaylistDetail = document.querySelector(".sidebar__playlist-detail");
    const noPlaylistsMessage = document.querySelector(".sidebar__no-playlists");

    const sidebarToggleBtn = document.querySelector(".chat-header__sidebar-toggle");
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.querySelector(".overlay");

    const API_BASE_URL = "http://127.0.0.1:8000";
    let isProcessing = false;
    let initialLoaderElement;
    let typingIndicatorElement;

    let currentSidebarPlaylistData = null;

    showInitialLoader(true);

    async function initializeApp() {
        try {
            const lastPlaylistRes = await callApi("/playlist/get", { method: "GET" });
            if (lastPlaylistRes.data) {
                currentSidebarPlaylistData = lastPlaylistRes.data;
            }
            updateSidebarDisplay(currentSidebarPlaylistData);

            await loadChatHistory();
        } catch (error) {
            console.error("앱 초기 로드 중 오류 발생:", error);
            displayErrorMessage("초기 데이터를 불러오는 데 실패했어요.");
        } finally {
            showInitialLoader(false);
        }
    }

    initializeApp();

    sendBtn.addEventListener("click", handleSendMessage);
    userInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            handleSendMessage();
        }
    });

    sendBtn.addEventListener("click", handleSendMessage);
    userInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            handleSendMessage();
        }
    });

    sidebarToggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("sidebar--active");
        overlay.classList.toggle("overlay--active");
    });

    overlay.addEventListener("click", () => {
        sidebar.classList.remove("sidebar--active");
        overlay.classList.remove("overlay--active");
    });

    async function callApi(endpoint, options = {}, timeout = 30000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorBody = await response
                    .json()
                    .catch(() => ({ detail: response.statusText }));
                throw new Error(
                    `API 에러 (${response.status}): ${errorBody.detail || "알 수 없는 오류"}`,
                );
            }
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === "AbortError") {
                throw new Error("요청 시간이 초과되었습니다.");
            }
            throw error;
        }
    }

    async function handleSendMessage() {
        if (isProcessing) return;

        const messageText = userInput.value.trim();
        if (!messageText) return;

        isProcessing = true;
        toggleInputState(true);
        addMessageToUI("user", messageText);
        userInput.value = "";
        showTypingIndicator(true);

        try {
            const funcData = await callApi("/chat/functions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role: "user",
                    message: messageText,
                    created_at: Math.floor(Date.now() / 1000),
                }),
            });

            const functionCalls = funcData.functions || [];

            const callPromises = [];

            var isPlaylistGenerated = false;
            for (const func of functionCalls) {
                if (func.name === "generate_playlist") {
                    isPlaylistGenerated = true;
                    callPromises.push(handlePlaylistGeneration(func.arguments));
                } else if (func.name === "update_preferences") {
                    callPromises.push(handleUpdatePreferences(func.arguments));
                } else {
                    console.warn(`알 수 없는 함수 호출: ${func.name}`);
                    addMessageToUI("system", `알 수 없는 요청이에요: ${func.name}`);
                }
            }
            if (!isPlaylistGenerated) {
                callPromises.push(handleGeneralMessage(messageText));
            }

            await Promise.all(callPromises);
        } catch (error) {
            console.error("handleSendMessage 오류:", error);
            displayErrorMessage(`죄송해요, 오류가 발생했어요: ${error.message}`);
        } finally {
            showTypingIndicator(false);
            isProcessing = false;
            toggleInputState(false);
        }
    }

    async function handlePlaylistGeneration(args) {
        const { track_length = 20 } = args || {};
        console.log(track_length);

        addMessageToUI("system", "요청하신 플레이리스트를 생성 중입니다...");

        try {
            const playlistData = await callApi(
                `/playlist/generate?track_length=${track_length}`,
                {
                    method: "POST",
                },
                60000,
            );

            if (playlistData.playlist) {
                await renderPlaylistToUI();
                currentSidebarPlaylistData = playlistData.playlist;
                updateSidebarDisplay(currentSidebarPlaylistData);
                addMessageToUI("system", "플레이리스트 생성이 완료되었습니다!");
            } else {
                displayErrorMessage(
                    `플레이리스트를 만드는 데 실패했어요: ${playlistData.message || "알 수 없는 오류"}`,
                );
            }
        } catch (error) {
            console.error("플레이리스트 생성 오류:", error);
            displayErrorMessage(`플레이리스트 생성 중 오류가 발생했어요: ${error.message}`);
        }
    }

    async function handleGeneralMessage(messageText) {
        try {
            const msgData = await callApi("/chat/message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role: "user",
                    content: messageText,
                    created_at: Math.floor(Date.now() / 1000),
                }),
            });
            if (msgData.message?.content) {
                addMessageToUI("assistant", msgData.message.content);
            } else {
                addMessageToUI("system", "음... 잘 이해하지 못했어요.", "system");
            }
        } catch (error) {
            console.error("일반 메시지 처리 오류:", error);
            displayErrorMessage(`메시지 전송 중 오류가 발생했어요: ${error.message}`);
        }
    }

    async function handleUpdatePreferences(args) {
        if (!args) return;

        try {
            const resData = await callApi("/user/preferences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(args),
            });

            if (resData.status === "success") {
                addMessageToUI("system", "선호도를 업데이트했어요!", "system");
            } else {
                displayErrorMessage(
                    `선호도 업데이트에 실패했어요: ${resData.message || "알 수 없는 오류"}`,
                );
            }
        } catch (error) {
            console.error("선호도 업데이트 오류:", error);
            displayErrorMessage(`선호도 업데이트 중 오류가 발생했어요: ${error.message}`);
        }
    }

    async function loadChatHistory() {
        try {
            const data = await callApi("/chat/get");
            if (Array.isArray(data.data)) {
                data.data.forEach(async (msg) => {
                    if (msg.role === "system" && msg.content === "generate_playlist") {
                        await renderPlaylistToUI(msg.data);
                    } else {
                        addMessageToUI(msg.role, msg.content, msg.type);
                    }
                });
            }
        } catch (e) {
            console.error("채팅 기록 로드 오류:", e);
            throw e;
        }
    }

    function addMessageToUI(sender, content, type = "text") {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", `message--${sender}`);

        if (type === "error") {
            messageElement.classList.add("message--error");
            messageElement.innerHTML = `<strong>오류:</strong> ${content}`;
        } else if (type === "system") {
            messageElement.classList.add("message--system");
            messageElement.textContent = content;
        } else {
            messageElement.textContent = content;
        }

        chatMessages.appendChild(messageElement);
        scrollToBottom();
    }

    async function renderPlaylistToUI() {
        const playlistData = await callApi("/playlist/get", { method: "GET" });
        const title = "당신을 위한 추천 플레이리스트";
        playlist = playlistData.data;

        const numberOfTracksToDisplay = playlist.tracks.length > 5 ? 5 : playlist.tracks.length;
        const trackItemsHtml = playlist.tracks
            .slice(0, numberOfTracksToDisplay)
            .map((track) => {
                const artists = track.artists.map((a) => a.name).join(", ");
                const thumbnail = track.thumbnail || "https://via.placeholder.com/50?text=No+Image";
                const url = track.url || "#";

                return `
            <a href="${url}" class="playlist__track-item" target="_blank" rel="noopener noreferrer">
                <img class="playlist__track-thumbnail" src="${thumbnail}" alt="${track.name} 앨범 커버" />
                <div class="playlist__track-text">
                    <div class="playlist__track-title">${track.name}</div>
                    <div class="playlist__track-artists">${artists}</div>
                </div>
            </a>
        `;
            })
            .join("");

        const playlistHtml = `
        <div class="playlist">
            <h3 class="playlist__title">${title}</h3>
            <div class="playlist__track-list"> ${trackItemsHtml}</div>
            <p class="playlist__info">이 플레이리스트는 AI에 의해 생성되었습니다.</p>
        </div>
    `;
        chatMessages.insertAdjacentHTML("beforeend", playlistHtml);
        scrollToBottom();
    }

    function updateSidebarDisplay(playlistData) {
        sidebarPlaylistDetail.innerHTML = "";

        if (!playlistData || !playlistData.tracks || playlistData.tracks.length === 0) {
            sidebarCurrentPlaylistTitle.textContent = "현재 플레이리스트";
            if (noPlaylistsMessage) {
                noPlaylistsMessage.style.display = "block";
                sidebarPlaylistDetail.appendChild(noPlaylistsMessage);
            }
        } else {
            sidebarCurrentPlaylistTitle.innerHTML = marked.parse(
                playlistData.name || "새 플레이리스트",
            );
            if (noPlaylistsMessage) {
                noPlaylistsMessage.style.display = "none";
            }

            const trackItemsHtml = playlistData.tracks
                .map((track) => {
                    const artists = track.artists.map((a) => a.name).join(", ");
                    const thumbnail =
                        track.thumbnail || "https://via.placeholder.com/50?text=No+Image";
                    const url = track.url || "#";

                    return `
                    <a href="${url}" class="playlist__track-item" target="_blank" rel="noopener noreferrer">
                        <img class="playlist__track-thumbnail" src="${thumbnail}" alt="${track.name} 앨범 커버" />
                        <div class="playlist__track-text">
                            <div class="playlist__track-title">${track.name}</div>
                            <div class="playlist__track-artists">${artists}</div>
                        </div>
                    </a>
                `;
                })
                .join("");

            sidebarPlaylistDetail.innerHTML = trackItemsHtml;
        }
    }

    function showTypingIndicator(show) {
        if (show) {
            if (!typingIndicatorElement) {
                typingIndicatorElement = document.createElement("div");
                typingIndicatorElement.classList.add(
                    "message",
                    "message--assistant",
                    "typing-indicator",
                );

                typingIndicatorElement.innerHTML = `
                    <div class="typing-indicator__block">
                        <div class="typing-indicator__dot"></div>
                        <div class="typing-indicator__dot"></div>
                        <div class="typing-indicator__dot"></div>
                    </div>
                `;
                chatMessages.appendChild(typingIndicatorElement);
                scrollToBottom();
            }
        } else {
            if (typingIndicatorElement) {
                typingIndicatorElement.remove();
                typingIndicatorElement = null;
            }
        }
    }

    function toggleInputState(disable) {
        userInput.disabled = disable;
        sendBtn.disabled = disable;
        if (disable) {
            sendBtn.style.opacity = "0.7";
            sendBtn.style.cursor = "not-allowed";
            userInput.style.backgroundColor = "#e9e9e9";
        } else {
            sendBtn.style.opacity = "1";
            sendBtn.style.cursor = "pointer";
            userInput.style.backgroundColor = "#fff";
        }
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showInitialLoader(show) {
        if (show) {
            if (!initialLoaderElement) {
                initialLoaderElement = document.createElement("div");
                initialLoaderElement.classList.add("app-loader");
                initialLoaderElement.innerHTML = `
                    <div class="app-loader__spinner"></div><p>채팅 기록 불러오는 중...</p>
                `;
                chatMessages.appendChild(initialLoaderElement);
                toggleInputState(true);
            }
        } else {
            if (initialLoaderElement) {
                initialLoaderElement.remove();
                initialLoaderElement = null;
                toggleInputState(false);
            }
        }
    }
});

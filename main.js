
// Получаем доступ к элементам на странице
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const confirmAnswerBtn = document.getElementById('confirmAnswerBtn');
const offerCode = document.getElementById('offerCode');
const answerCodeInput = document.getElementById('answerCodeInput');
const hostAnswerInput = document.getElementById('hostAnswerInput');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const chatBox = document.getElementById('chatBox');

let localStream;
let remoteStream;
let peerConnection;
let dataChannel;

// Конфигурация для STUN серверов (нужны для определения публичного IP адреса)
const configuration = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302' // Общедоступный STUN сервер от Google
        }
    ]
};

// 1. Получение доступа к камере и микрофону
async function startMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (error) {
        console.error('Ошибка доступа к медиа-устройствам.', error);
    }
}

startMedia();

// 2. Логика для создателя комнаты
createRoomBtn.onclick = async () => {
    peerConnection = new RTCPeerConnection(configuration);

    // Добавляем наши медиапотоки в соединение
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Создаем канал для чата
    dataChannel = peerConnection.createDataChannel("chat");
    setupDataChannelEvents(dataChannel);

    // Слушатель для получения ICE-кандидатов
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            // Когда все кандидаты собраны, offer будет готов
            // Для простоты, мы ждем, когда поле станет не пустым
        } else {
             offerCode.value = JSON.stringify(peerConnection.localDescription);
        }
    };
    
    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
};

// 3. Логика для присоединяющегося
joinRoomBtn.onclick = async () => {
    peerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });
    
    peerConnection.ondatachannel = event => {
        dataChannel = event.channel;
        setupDataChannelEvents(dataChannel);
    };

    peerConnection.onicecandidate = event => {
        if (!event.candidate) {
            // Ответный код готов для отправки хосту
            offerCode.value = JSON.stringify(peerConnection.localDescription);
        }
    };
    
    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    const offer = JSON.parse(answerCodeInput.value);
    await peerConnection.setRemoteDescription(offer);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
};

// 4. Хост подтверждает подключение
confirmAnswerBtn.onclick = async () => {
    const answer = JSON.parse(hostAnswerInput.value);
    await peerConnection.setRemoteDescription(answer);
};

// 5. Логика чата
sendMessageBtn.onclick = () => {
    const msg = messageInput.value;
    if (msg === '') return;
    
    dataChannel.send(msg);
    appendMessage(`Вы: ${msg}`);
    messageInput.value = '';
};

function setupDataChannelEvents(channel) {
    channel.onopen = () => console.log("Канал данных открыт!");
    channel.onmessage = event => {
        appendMessage(`Собеседник: ${event.data}`);
    };
}

function appendMessage(message) {
    const p = document.createElement('p');
    p.textContent = message;
    chatBox.appendChild(p);
    chatBox.scrollTop = chatBox.scrollHeight;
}

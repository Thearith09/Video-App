(async () => {
    const socket = io();
    let isAlreadyCalling = false;
    let getCalled = false;
    const existingCalls = [];
    const { RTCPeerConnection, RTCSessionDescription } = window;
    const peerConnection = new RTCPeerConnection();
    let stream = null;
    const localVideo = document.getElementById('local-video');


    socket.on('update-user-list', ({ users } = {}) => {
        console.log(users);
        updateUserList(users);
    });

    socket.on('remove-user', ({ socketId } = {}) => {
        const userToRemove = document.getElementById(socketId);

        if (userToRemove) {
            userToRemove.remove();
        }
    });

    socket.on("call-made", async (data) => {
        if (getCalled) {
            const confirmed = confirm(
                `User "Socket: ${data.socket}" wants to call you. Do accept this call?`
            );

            if (!confirmed) {
                socket.emit("reject-call", {
                    from: data.socket
                });

                return;
            }
        }

        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.offer)
        );
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

        socket.emit("make-answer", {
            answer,
            to: data.socket
        });
        getCalled = true;
    });

    socket.on("answer-made", async (data) => {
        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
        );

        if (!isAlreadyCalling) {
            callUser(data.socket);
            isAlreadyCalling = true;
        }
    });

    socket.on("call-rejected", data => {
        alert(`User: "Socket: ${data.socket}" rejected your call.`);
        unselectUsersFromList();
    });

    peerConnection.ontrack = function ({ streams: [stream] }) {
        const remoteVideo = document.getElementById("remote-video");
        if (remoteVideo) {
            remoteVideo.srcObject = stream;
        }
    };

    try {
        navigator.mediaDevices.getUserMedia = navigator.mediaDevices.getUserMedia ||
            navigator.mediaDevices.webkitGetUserMedia ||
            navigator.mediaDevices.mozGetUserMedia;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        if (localVideo) {
            localVideo.srcObject = stream;
        }

    } catch (err) {
        console.error(err.message);
    }


    function updateUserList(socketIds) {
        const activeUserContainer = document.getElementById('active-user-container');

        socketIds.forEach((socketId) => {
            const alreadyExistingUser = document.getElementById(socketId);

            if (!alreadyExistingUser) {
                const userContainerElem = createUserItemContainer(socketId);
                activeUserContainer.appendChild(userContainerElem);
            }
        });
    }

    function unselectUsersFromList() {
        const alreadyExistingUser = document.querySelectorAll('.active-user.active-user--selected');

        alreadyExistingUser.forEach((user) => {
            user.setAttribute('class', 'active-user');
        });
    };

    function createUserItemContainer(socketId) {
        const userContainerElem = document.createElement('div');
        const usernameElem = document.createElement('p');

        userContainerElem.setAttribute('class', 'active-user');
        userContainerElem.setAttribute('id', socketId);
        usernameElem.setAttribute('class', 'username');
        usernameElem.textContent = `Socket: ${socketId}`;

        userContainerElem.appendChild(usernameElem);

        userContainerElem.addEventListener('click', (e) => {
            e.preventDefault();
            unselectUsersFromList();
            userContainerElem.setAttribute('class', 'active-user active-user--selected');
            const talkingWithInfo = document.getElementById('talking-with-info');
            talkingWithInfo.innerHTML = `Talking with: 'Socket: ${socketId}'`;
            callUser(socketId);
        });

        return userContainerElem;
    }

    async function callUser(socketId) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

        socket.emit("call-user", {
            offer,
            to: socketId
        });
    }

})();
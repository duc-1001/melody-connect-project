const $ = document.querySelector.bind(document)
const $$ = document.querySelectorAll.bind(document)

function onClickOutside(element, callback) {
    function handleClickOutside(event) {
        if (!element.contains(event.target)) {
            callback()
        }
    }
    document.addEventListener('click', handleClickOutside);
    return function removeClickOutsideListener() {
        document.removeEventListener('click', handleClickOutside);
    };
}

const comment = {
    content: '',
    querySearch: '',
    searchResult: [],
    rooms: [],
    chatRoomName: '',
    socket: null,
    handleEvent: function () {
        const _this = this
        $(".input-mess").oninput = function (e) {
            value = e.target.value.trim()
            if (_this.content.length > 0 || value) {
                _this.content = value
                _this.updateIcon()
            }
            else {
                this.value = ''
            }
            _this.updateMaxheight()
            _this.scrollToBottom()
        }

        $(".search-user-input").oninput = async function (e) {
            value = e.target.value.trim()
            if (_this.querySearch.length > 0 || value) {
                _this.querySearch = value
                _this.searchResult = await _this.searchUser(_this.querySearch)
                _this.renderResultItem()
            }
            else {
                this.value = ''
            }
        }

        $(".search-user-input").onfocus = () => {
            $(".search-result").classList.remove('hidden')
            $(".icon-back").classList.remove('hidden')
        }
        $(".icon-back").onclick = () => {
            $(".search-result").classList.add('hidden')
            $(".icon-back").classList.add('hidden')
        }
        onClickOutside($(".search-user"), () => {
            $(".search-result").classList.add('hidden')
            $(".icon-back").classList.add('hidden')
        });

        $(".icon-sender").onclick = function () {
            _this.sendMessage()
        }
    },

    sendMessage: async function () {
        if (this.content) {
            const formData = new FormData()
            formData.append('content', this.content)
            formData.append('room', this.chatRoomName)

            const res = await fetch('sender_message/', {
                method: "POST",
                body: formData,
                headers: {
                    "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]").value || "{% csrf_token %}"
                }
            }).then(res => res.json())
            if (res.success) {
                const mess = res.data
                this.socket.send(JSON.stringify({
                    'data': mess
                }));
                this.resetInput()
            }
            else {
                console.log(res.message);
            }
        }
        else {
            console.log('missing pargam');
        }
    },

    connectWebSocket: function () {
        const _this = this;
        const host = window.location.hostname;
        const port = 8001;
        this.socket = new WebSocket(
            `ws://${host}:${port}/ws/messages/${this.chatRoomName}/`
        );

        this.socket.onmessage = function (e) {
            const response = JSON.parse(e.data);
            const data = response.message;

            const listMessItem = $$(".messenger-item")
            const checkMessUser = listMessItem[listMessItem.length-1]
            if(checkMessUser){
                if(checkMessUser.getAttribute('user')==data.user){
                    checkMessUser.querySelector('.avatar-messenger').classList.add('opacity')
                }
            }
            
            const messagesItem = `
                <div class="messenger-item ${data.user === user.username ? "sender" : ""}" user=${data.user}>
                    <div class="avatar-messenger ${data.user === user.username ?  "opacity" : ""}">
                        <img src="https://yt3.ggpht.com/LKDMK6KpGDtsV11P1opuFEwjr5U5kI5BCiNEaA_v-dgGr30wfqlFAhhAvH4_xVzIIKPnI5gU=s48-c-k-c0x00ffffff-no-rj"
                        alt="avatar">
                    </div>
                    <div class="content-mess">
                        ${data.content}
                    </div>
                </div>
                `
            $('.list-messenger').insertAdjacentHTML('beforeend', messagesItem);
            _this.scrollToBottom()
        };

        this.socket.onclose = function (e) {
            console.error('WebSocket connection closed unexpectedly');
        };
    },

    scrollToBottom: function () {
        $('.list-messenger-container').scrollTop = $('.list-messenger-container').scrollHeight;
    },

    updateMaxheight: function () {
        const y = $(".box-sender-mess").offsetHeight
        $('.list-messenger-container').style.maxHeight = `calc(100vh - 70px - ${y}px)`
    },

    searchUser: async function (query) {
        try {
            const res = await fetch(`search/?q=${query}`).then(res => res.json())
            if (res.success) {
                return res.data
            }
            else {
                console.log(res.messager);
            }
        } catch (error) {
            console.log(error);
        }
    },

    renderResultItem: function () {
        const resultItems = this.searchResult.map(e => {
            return `
                    <div class="result-item" key = ${e.id}>
                        <div class="avatar-receiver">
                            <img src=${e.avatar} alt="avatar" />
                        </div>
                        <div class="name-receiver">
                            ${e.username}
                        </div>
                    </div>
                   `
        })
        $(".search-result").innerHTML = resultItems.join('')

        if ($$(".result-item").length > 0) {
            $$(".result-item").forEach(item => {
                item.onclick = async function () {
                    const id = this.getAttribute('key')
                    const res = await fetch(`create_or_get_room/${id}/`).then(res => res.json())
                }
            })
        }
    },

    resetInput: function () {
        this.content = ''
        $('.input-mess').value = ''
        this.updateIcon()
    },

    renderRooms: async function () {
        const _this = this
        try {
            const res = await fetch("get_rooms/").then(res => res.json())
            if (res.success) {
                this.chatRoomName = res.data[0].name
                const rooms = res.data.map((e, idx) => {
                    return `
                    <div class="room ${idx == 0 ? 'active' : ''} " key=${e?.id} name=${e?.name}>
                        <div class="avatar-receiver">
                            <img src="https://yt3.ggpht.com/LKDMK6KpGDtsV11P1opuFEwjr5U5kI5BCiNEaA_v-dgGr30wfqlFAhhAvH4_xVzIIKPnI5gU=s48-c-k-c0x00ffffff-no-rj"
                            alt="avatar" />
                        </div>
                        <div class="info">
                            <div class="name-receiver">
                                ${e.other_user}
                            </div>
                            <div class="mess-new">
                                OK
                            </div>
                        </div>
                    </div>
                    `
                })
                $(".list-room").innerHTML = rooms.join('')
                if ($$(".room").length > 0) {
                    $$(".room").forEach(item => {
                        item.onclick = async function () {
                            $$(".room").forEach(item => {
                                item.classList.remove('active')
                            })
                            this.classList.add('active')
                            if (_this.chatRoomName != this.getAttribute("name")) {
                                _this.chatRoomName = this.getAttribute("name")
                                _this.getRoomChat()
                            }
                        }
                    })
                }
            }
            else {
                console.log(res.messager);
            }
        } catch (error) {
            console.log(error);
        }
    },

    getRoomChat: async function () {
        try {
            if (this.chatRoomName) {
                this.connectWebSocket()
                this.resetInput();
                const res = await fetch(`get_room/${this.chatRoomName}`).then(res => res.json());
                if (res.success) {
                    const data = res.messages;
                    if (data && data.length > 0) {
                        const messagesItems = data.map((e, idx) => {
                            return `
                            <div class="messenger-item ${e.user === user.username ? "sender" : ""}" user=${e.user}>
                                <div class="avatar-messenger ${e.user === user.username || (data[idx + 1] && data[idx + 1].user == e.user) ? "opacity" : ""}">
                                    <img src="https://yt3.ggpht.com/LKDMK6KpGDtsV11P1opuFEwjr5U5kI5BCiNEaA_v-dgGr30wfqlFAhhAvH4_xVzIIKPnI5gU=s48-c-k-c0x00ffffff-no-rj"
                                    alt="avatar">
                                </div>
                                <div class="content-mess">
                                    ${e.content}
                                </div>
                            </div>
                            `;
                        });

                        $(".name-room").innerHTML = res.room.other_user;
                        $('.list-messenger').innerHTML = messagesItems.join('');
                    } else {
                        $('.list-messenger').innerHTML = `<p>No messages yet</p>`;
                    }
                } else {
                    console.log(res);
                }
            }
        } catch (error) {
            console.log(error);
        }
    },

    updateIcon: function () {
        if (this.content.length > 0) {
            $(".icon-sender").style.color = '#2899eb'
        }
        else {
            $(".icon-sender").style.color = 'black'
        }
    },

    start: async function () {
        await this.renderRooms()
        await this.getRoomChat()
        this.handleEvent()
        this.scrollToBottom()
    }
}



comment.start()

/* ============================================================
   PULSE CHAT — Main Application
   Handles login, messaging, realtime subscriptions, and presence.
   ============================================================ */

const PulseApp = (() => {
    // ---- State ----
    let supabaseClient = null;
    let currentUser = null;       // { nickname, avatarColor }
    let messagesChannel = null;
    let presenceChannel = null;
    let lastMessageDate = null;   // Track date dividers

    // ---- DOM References ----
    const DOM = {};

    function cacheDOMElements() {
        DOM.loginScreen     = document.getElementById('login-screen');
        DOM.chatScreen       = document.getElementById('chat-screen');
        DOM.loginForm        = document.getElementById('login-form');
        DOM.nicknameInput    = document.getElementById('nickname-input');
        DOM.loginBtn         = document.getElementById('login-btn');
        DOM.messageForm      = document.getElementById('message-form');
        DOM.messageInput     = document.getElementById('message-input');
        DOM.sendBtn          = document.getElementById('send-btn');
        DOM.messagesContainer = document.getElementById('messages-container');
        DOM.messagesWelcome  = document.getElementById('messages-welcome');
        DOM.userNickname     = document.getElementById('user-nickname');
        DOM.logoutBtn        = document.getElementById('logout-btn');
        DOM.onlineUsers      = document.getElementById('online-users');
        DOM.onlineCount      = document.getElementById('online-count');
        DOM.sidebarToggle    = document.getElementById('sidebar-toggle');
        DOM.sidebar          = document.getElementById('sidebar');
        DOM.sidebarOverlay   = document.getElementById('sidebar-overlay');
        DOM.connectionToast  = document.getElementById('connection-toast');
        DOM.toastText        = document.getElementById('toast-text');
    }

    // ---- Initialize ----
    function init() {
        cacheDOMElements();
        initSupabase();
        bindEvents();
        checkExistingSession();
    }

    async function initSupabase() {
        const { createClient } = window.supabase;
        
        // Tenta pegar da config local primeiro (fallback)
        let url = PULSE_CONFIG.SUPABASE_URL;
        let anonKey = PULSE_CONFIG.SUPABASE_ANON_KEY;

        // Tenta buscar da API da Vercel (Production)
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                const remoteConfig = await response.json();
                if (remoteConfig.SUPABASE_URL && remoteConfig.SUPABASE_ANON_KEY) {
                    url = remoteConfig.SUPABASE_URL;
                    anonKey = remoteConfig.SUPABASE_ANON_KEY;
                    console.log('📡 Configurações carregadas via Vercel API');
                }
            }
        } catch (err) {
            console.warn('⚠️ Falha ao buscar config via API, usando fallback local.');
        }

        if (!url || !anonKey || anonKey.includes('YOUR_ANON_KEY')) {
            showToast('Erro: Configurações do Supabase não encontradas.');
            return;
        }

        supabaseClient = createClient(url, anonKey);
    }

    function bindEvents() {
        DOM.loginForm.addEventListener('submit', handleLogin);
        DOM.messageForm.addEventListener('submit', handleSendMessage);
        DOM.logoutBtn.addEventListener('click', handleLogout);
        DOM.sidebarToggle.addEventListener('click', toggleSidebar);
        DOM.sidebarOverlay.addEventListener('click', closeSidebar);

        DOM.messageInput.addEventListener('input', () => {
            DOM.sendBtn.disabled = DOM.messageInput.value.trim().length === 0;
        });
    }

    // ---- Session ----
    function checkExistingSession() {
        const savedNickname = localStorage.getItem('pulse_nickname');
        if (savedNickname) {
            enterChat(savedNickname);
        }
    }

    // ---- Login ----
    function handleLogin(e) {
        e.preventDefault();
        const nickname = DOM.nicknameInput.value.trim();

        if (nickname.length < PULSE_CONFIG.NICKNAME_MIN) return;
        if (nickname.length > PULSE_CONFIG.NICKNAME_MAX) return;

        localStorage.setItem('pulse_nickname', nickname);
        enterChat(nickname);
    }

    function enterChat(nickname) {
        currentUser = {
            nickname,
            avatarColor: PulseUtils.generateAvatarColor(nickname),
        };

        DOM.userNickname.textContent = nickname;
        switchScreen('chat');

        fetchMessageHistory();
        subscribeToMessages();
        subscribeToPresence();

        setTimeout(() => DOM.messageInput.focus(), 400);
    }

    // ---- Logout ----
    function handleLogout() {
        localStorage.removeItem('pulse_nickname');

        if (messagesChannel) {
            supabaseClient.removeChannel(messagesChannel);
            messagesChannel = null;
        }
        if (presenceChannel) {
            supabaseClient.removeChannel(presenceChannel);
            presenceChannel = null;
        }

        currentUser = null;
        lastMessageDate = null;
        DOM.messagesContainer.innerHTML = '';
        DOM.messagesContainer.appendChild(DOM.messagesWelcome);
        DOM.onlineUsers.innerHTML = '';
        DOM.onlineCount.textContent = '0';

        switchScreen('login');
        DOM.nicknameInput.value = '';
        DOM.nicknameInput.focus();
    }

    // ---- Screen Transitions ----
    function switchScreen(screen) {
        if (screen === 'chat') {
            DOM.loginScreen.classList.remove('screen--active');
            DOM.chatScreen.classList.add('screen--active');
        } else {
            DOM.chatScreen.classList.remove('screen--active');
            DOM.loginScreen.classList.add('screen--active');
        }
    }

    // ---- Sidebar Toggle (mobile) ----
    function toggleSidebar() {
        DOM.sidebar.classList.toggle('sidebar--open');
        DOM.sidebarOverlay.classList.toggle('sidebar-overlay--visible');
    }

    function closeSidebar() {
        DOM.sidebar.classList.remove('sidebar--open');
        DOM.sidebarOverlay.classList.remove('sidebar-overlay--visible');
    }

    // ---- Toast Notifications ----
    function showToast(message) {
        DOM.toastText.textContent = message;
        DOM.connectionToast.classList.add('toast--visible');
    }

    function hideToast() {
        DOM.connectionToast.classList.remove('toast--visible');
    }

    // ============================================================
    //   SUPABASE — Fetch Message History
    // ============================================================
    async function fetchMessageHistory() {
        try {
            showToast('Carregando mensagens...');

            const { data, error } = await supabaseClient
                .from('messages')
                .select('*')
                .order('created_at', { ascending: true })
                .limit(PULSE_CONFIG.MESSAGES_LIMIT);

            if (error) throw error;

            if (data && data.length > 0) {
                DOM.messagesWelcome.style.display = 'none';
                data.forEach(msg => renderMessage(msg, false));
                PulseUtils.scrollToBottom(DOM.messagesContainer);
            }

            hideToast();
        } catch (err) {
            console.error('Erro ao carregar mensagens:', err);
            showToast('Erro ao carregar mensagens');
            setTimeout(hideToast, 3000);
        }
    }

    // ============================================================
    //   SUPABASE — Realtime Subscription (Messages)
    // ============================================================
    function subscribeToMessages() {
        messagesChannel = supabaseClient
            .channel('public-messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                },
                (payload) => {
                    const msg = payload.new;
                    const shouldScroll = PulseUtils.isNearBottom(DOM.messagesContainer);
                    renderMessage(msg, true);
                    if (shouldScroll) {
                        PulseUtils.scrollToBottom(DOM.messagesContainer);
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Realtime conectado');
                }
            });
    }

    // ============================================================
    //   SUPABASE — Presence (Online Users)
    // ============================================================
    function subscribeToPresence() {
        presenceChannel = supabaseClient.channel('online-users', {
            config: {
                presence: {
                    key: currentUser.nickname,
                },
            },
        });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                renderOnlineUsers(state);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({
                        nickname: currentUser.nickname,
                        avatar_color: currentUser.avatarColor,
                        online_at: new Date().toISOString(),
                    });
                }
            });
    }

    // ============================================================
    //   SEND MESSAGE
    // ============================================================
    async function handleSendMessage(e) {
        e.preventDefault();

        const content = DOM.messageInput.value.trim();
        if (!content || !currentUser) return;

        DOM.messageInput.value = '';
        DOM.sendBtn.disabled = true;

        try {
            const { error } = await supabaseClient.from('messages').insert({
                nickname: currentUser.nickname,
                content: content,
                avatar_color: currentUser.avatarColor,
            });

            if (error) throw error;
        } catch (err) {
            console.error('Erro ao enviar mensagem:', err);
            showToast('Erro ao enviar mensagem');
            setTimeout(hideToast, 3000);
            // Restore the message so user can retry
            DOM.messageInput.value = content;
            DOM.sendBtn.disabled = false;
        }

        DOM.messageInput.focus();
    }

    // ============================================================
    //   RENDER MESSAGE
    // ============================================================
    function renderMessage(msg, isNew) {
        // Hide welcome message
        if (DOM.messagesWelcome) {
            DOM.messagesWelcome.style.display = 'none';
        }

        // Date divider
        const msgDate = PulseUtils.formatDateDivider(msg.created_at);
        if (msgDate !== lastMessageDate) {
            lastMessageDate = msgDate;
            const divider = document.createElement('div');
            divider.className = 'message-divider';
            divider.textContent = msgDate;
            DOM.messagesContainer.appendChild(divider);
        }

        const isOwn = currentUser && msg.nickname === currentUser.nickname;
        const color = msg.avatar_color || PulseUtils.generateAvatarColor(msg.nickname);

        const messageEl = document.createElement('div');
        messageEl.className = `message${isOwn ? ' message--own' : ''}`;
        if (!isNew) messageEl.style.animation = 'none';

        messageEl.innerHTML = `
            <div class="avatar" style="background: ${color}">
                ${PulseUtils.getInitials(msg.nickname)}
            </div>
            <div class="message-bubble">
                <div class="message-nickname" style="color: ${color}">
                    ${PulseUtils.sanitizeHTML(msg.nickname)}
                </div>
                <div class="message-content">
                    ${PulseUtils.sanitizeHTML(msg.content)}
                </div>
                <div class="message-time">
                    ${PulseUtils.formatTimestamp(msg.created_at)}
                </div>
            </div>
        `;

        DOM.messagesContainer.appendChild(messageEl);
    }

    // ============================================================
    //   RENDER ONLINE USERS
    // ============================================================
    function renderOnlineUsers(presenceState) {
        const users = Object.keys(presenceState);
        DOM.onlineCount.textContent = users.length;
        DOM.onlineUsers.innerHTML = '';

        users.forEach((key) => {
            const userPresence = presenceState[key][0];
            const nickname = userPresence.nickname || key;
            const color = userPresence.avatar_color || PulseUtils.generateAvatarColor(nickname);
            const isMe = currentUser && nickname === currentUser.nickname;

            const li = document.createElement('li');
            li.className = 'user-list-item';
            li.innerHTML = `
                <div class="avatar avatar--sm" style="background: ${color}">
                    ${PulseUtils.getInitials(nickname)}
                </div>
                <span style="font-size: 0.88rem; color: ${isMe ? 'var(--text-primary)' : 'var(--text-secondary)'}">
                    ${PulseUtils.sanitizeHTML(nickname)}${isMe ? ' (você)' : ''}
                </span>
            `;
            DOM.onlineUsers.appendChild(li);
        });
    }

    // ---- Start ----
    document.addEventListener('DOMContentLoaded', init);

    return { init };
})();

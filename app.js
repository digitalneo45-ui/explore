// ===== CONFIG =====


const firebaseConfig = {
    apiKey: "AIzaSyA3aEESTrR72H8DEebvHvrwFKF_VYW3IC0",
    authDomain: "urw-ea8fb.firebaseapp.com",
    databaseURL: "https://urw-ea8fb-default-rtdb.firebaseio.com",
    projectId: "urw-ea8fb",
    storageBucket: "urw-ea8fb.firebasestorage.app",
    messagingSenderId: "621968143485",
    appId: "1:621968143485:web:c865aee4965f0f776fed14",
    measurementId: "G-FN2SHSBGFK"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// ===== STATE =====
let currentUser = null;
let currentUserData = {};
let authMode = 'signup';
let selectedMedia = [];
let currentPostId = null;
let allPosts = {};

// Cache for user data fetched from DB
let userCache = {};

// ===== THEME TOGGLE =====
function toggleTheme() {
    document.documentElement.classList.toggle('light-theme');
    const isLight = document.documentElement.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// ===== VERIFIED TICK HTML =====
function verifiedTick(isVerified) {
    return isVerified ? ` <svg class="verified-tick" viewBox="0 0 24 24"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/></svg>` : '';
}

// ===== FETCH USER DATA (with cache) =====
function fetchUserData(uid) {
    if (userCache[uid]) return Promise.resolve(userCache[uid]);
    return db.ref('users/' + uid).once('value').then(snap => {
        const data = snap.val() || {};
        userCache[uid] = data;
        return data;
    });
}

// ===== POST COLOR PALETTE =====
const POST_COLOR_PALETTE = [
    { c: '#ef4444', g: 'rgba(239,68,68,0.25)' }, { c: '#06b6d4', g: 'rgba(6,182,212,0.25)' },
    { c: '#a855f7', g: 'rgba(168,85,247,0.25)' }, { c: '#ef4444', g: 'rgba(239,68,68,0.25)' },
    { c: '#10b981', g: 'rgba(16,185,129,0.25)' }, { c: '#f97316', g: 'rgba(249,115,22,0.25)' },
    { c: '#ef4444', g: 'rgba(239,68,68,0.25)' }, { c: '#ec4899', g: 'rgba(236,72,153,0.25)' },
    { c: '#3b82f6', g: 'rgba(59,130,246,0.25)' }, { c: '#ef4444', g: 'rgba(239,68,68,0.25)' },
    { c: '#eab308', g: 'rgba(234,179,8,0.25)' }, { c: '#14b8a6', g: 'rgba(20,184,166,0.25)' },
];

function getPostColor(postId, index) {
    const hash = (postId || '').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
    return POST_COLOR_PALETTE[(hash + (index || 0)) % POST_COLOR_PALETTE.length];
}

// ===== AUTH STATE =====
auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
        db.ref('users/' + user.uid).on('value', snap => {
            currentUserData = snap.exists() ? snap.val() : {};
            // Update cache for current user too
            userCache[user.uid] = currentUserData;
            updateNav();
            if (document.getElementById('page-profile').classList.contains('active')) {
                loadProfile();
            }
        });
        if (document.getElementById('page-auth').classList.contains('active')) navigate('explore');
    } else {
        currentUserData = {};
        updateNav();
        navigate('auth');
    }
    lucide.createIcons();
});

function updateNav() {
    const right = document.getElementById('navRight');
    const tabs = document.getElementById('navTabs');
    if (currentUser) {
        tabs.style.display = 'flex';
        const u = currentUser;
        const isVerified = currentUserData.verified || false;
        right.innerHTML = `
            <div class="nav-user" onclick="navigate('profile')">
                <img src="${u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName||'U')}&background=111120&color=00f0ff&size=56&font-size=0.35`}" alt="">
                <span>${u.displayName || 'User'} ${verifiedTick(isVerified)}</span>
            </div>
            <button class="btn-login" onclick="signOut()" style="background:var(--glass);border:1px solid var(--gb);font-size:.75rem;padding:6px 14px">Logout</button>
        `;
    } else {
        tabs.style.display = 'none';
        right.innerHTML = `<button class="btn-login" onclick="navigate('auth')">Sign In</button>`;
    }
    lucide.createIcons();
}

function toggleAuthMode() {
    authMode = authMode === 'signup' ? 'signin' : 'signup';
    document.getElementById('authTitle').textContent = authMode === 'signup' ? 'Join CVR Ideas' : 'Welcome Back';
    document.getElementById('authSubtitle').textContent = authMode === 'signup'
        ? 'Share your vision for the future of intelligent robotics. Sign in to post ideas, vote, and collaborate.'
        : 'Sign in to continue sharing and exploring ideas.';
    document.getElementById('nameField').style.display = authMode === 'signup' ? 'block' : 'none';
    document.getElementById('authBtn').textContent = authMode === 'signup' ? 'Create Account' : 'Sign In';
    document.getElementById('authSwitch').innerHTML = authMode === 'signup'
        ? 'Already have an account? <a onclick="toggleAuthMode()">Sign in</a>'
        : "Don't have an account? <a onclick=\"toggleAuthMode()\">Sign up</a>";
    document.getElementById('authErr').textContent = '';
}

async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const pass = document.getElementById('authPass').value;
    const errEl = document.getElementById('authErr');
    const btn = document.getElementById('authBtn');
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Please wait...';
    try {
        if (authMode === 'signup') {
            let name = document.getElementById('authName').value.trim();
            name = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
            if (!name) { errEl.textContent = 'Please enter a valid text name (no emojis/symbols).'; btn.disabled = false; btn.textContent = 'Create Account'; return; }
            const cred = await auth.createUserWithEmailAndPassword(email, pass);
            await cred.user.updateProfile({ displayName: name });
            await db.ref('users/' + cred.user.uid).set({
                name: name, email: email, photoURL: '', verified: false, verificationRequested: false,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
        } else {
            await auth.signInWithEmailAndPassword(email, pass);
        }
    } catch (err) {
        errEl.textContent = err.message.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim() || 'Authentication failed.';
    }
    btn.disabled = false;
    btn.textContent = authMode === 'signup' ? 'Create Account' : 'Sign In';
}

async function googleSignIn() {
    const errEl = document.getElementById('authErr');
    errEl.textContent = '';
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        const userRef = db.ref('users/' + result.user.uid);
        const snap = await userRef.once('value');
        if (!snap.exists()) {
            await userRef.set({
                name: result.user.displayName || 'User',
                email: result.user.email || '',
                photoURL: result.user.photoURL || '',
                verified: false,
                verificationRequested: false,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
        }
    } catch (err) {
        if (err.code !== 'auth/popup-closed-by-user') {
            errEl.textContent = err.message.replace('Firebase: ', '') || 'Google sign-in failed.';
        }
    }
}

function signOut() {
    auth.signOut();
    showToast('Signed out successfully');
}

// ===== NAVIGATION =====
function navigate(page) {
    if (page !== 'auth' && !currentUser) { page = 'auth'; }
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.page === page));
    if (page === 'explore') loadPosts();
    if (page === 'profile') loadProfile();
    if (page === 'create') resetCreateForm();
    if (page !== 'detail') currentPostId = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    lucide.createIcons();
}

document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => navigate(tab.dataset.page));
});

// ===== MEDIA UPLOAD =====
async function uploadToCloudinary(file, resourceType) {

    const sign = await fetch("/api/upload", {
        method: "POST"
    });

    const s = await sign.json();

    const form = new FormData();

    form.append("file", file);
    form.append("api_key", s.apiKey);
    form.append("timestamp", s.timestamp);
    form.append("signature", s.signature);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${s.cloudName}/${resourceType}/upload`,
        {
            method: "POST",
            body: form
        }
    );

    if (!res.ok) throw new Error("Upload failed");

    return await res.json();
}

function handleMediaSelect(e, type) {
    const file = e.target.files[0];
    if (!file) return;
    if (type === 'image' && file.size > 10 * 1024 * 1024) { showToast('Image must be under 10MB', true); return; }
    if (type === 'video' && file.size > 50 * 1024 * 1024) { showToast('Video must be under 50MB', true); return; }
    if (type === 'raw' && file.size > 20 * 1024 * 1024) { showToast('PDF must be under 20MB', true); return; }
    selectedMedia.push({ file, type, preview: URL.createObjectURL(file), name: file.name });
    renderMediaPreview();
    document.getElementById('submitBtn').disabled = false;
}

function removeMedia(idx) {
    URL.revokeObjectURL(selectedMedia[idx].preview);
    selectedMedia.splice(idx, 1);
    renderMediaPreview();
    if (selectedMedia.length === 0) document.getElementById('submitBtn').disabled = true;
}

function renderMediaPreview() {
    const c = document.getElementById('mediaPreview');
    c.innerHTML = selectedMedia.map((m, i) => {
        let inner = '';
        if (m.type === 'image') {
            inner = `<img src="${m.preview}" alt="preview">`;
        } else if (m.type === 'video') {
            inner = `<video src="${m.preview}" muted></video>`;
        } else if (m.type === 'raw') {
            inner = `<div class="pdf-preview-card"><i data-lucide="file-text"></i><span>${escHtml(m.name)}</span></div>`;
        }
        return `<div class="media-preview-item">${inner}<button type="button" class="media-remove" onclick="removeMedia(${i})">&times;</button></div>`;
    }).join('');
    lucide.createIcons();
}

function resetCreateForm() {
    selectedMedia.forEach(m => URL.revokeObjectURL(m.preview));
    selectedMedia = [];
    document.getElementById('postTitle').value = '';
    document.getElementById('postBody').value = '';
    document.getElementById('mediaPreview').innerHTML = '';
    document.getElementById('submitBtn').disabled = true;
    document.querySelectorAll('.create-media input').forEach(i => i.value = '');
}

// ===== RENDER MEDIA HTML =====
function renderMediaHtml(media) {
    if (!media || media.length === 0) return '';
    return `<div class="post-media">${media.map(m => {
        if (m.type === 'video') {
            return `<video src="${m.url}" controls preload="metadata"></video>`;
        } else if (m.type === 'raw') {
            const fileName = m.name || m.url.split('/').pop().replace(/\.[^.]+$/, '') || 'Document';
            return `<a class="post-pdf-card" href="${m.url}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">
                <i data-lucide="file-text"></i>
                <div class="pdf-card-info">
                    <div class="pdf-card-name">${escHtml(fileName)}</div>
                    <div class="pdf-card-label">PDF Document</div>
                </div>
            </a>`;
        } else {
            return `<img src="${m.url}" alt="" onclick="openLightbox('${m.url.replace(/'/g, "\\'")}')">`;
        }
    }).join('')}</div>`;
}

// ===== SUBMIT POST =====
async function submitPost(e) {
    e.preventDefault();
    const title = document.getElementById('postTitle').value.trim();
    const body = document.getElementById('postBody').value.trim();
    if (!title || !body) return;

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Uploading...';

    try {
        let mediaUrls = [];
        for (const m of selectedMedia) {
            try {
                const result = await uploadToCloudinary(m.file, m.type);
                const entry = { url: result.url, type: result.type };
                if (m.type === 'raw') {
                    entry.name = m.name;
                }
                mediaUrls.push(entry);
            } catch (err) { console.error('Media upload failed:', err); }
        }

        const postRef = db.ref('posts').push();
        await postRef.set({
            uid: currentUser.uid, title: title, body: body, media: mediaUrls,
            votes: {}, voteCount: 0, commentCount: 0,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        showToast('Idea published successfully!');
        navigate('explore');
    } catch (err) {
        showToast('Failed to publish: ' + err.message, true);
        btn.disabled = false;
        btn.innerHTML = 'Publish <i data-lucide="send" style="width:14px;height:14px"></i>';
        lucide.createIcons();
    }
}

// ===== LOAD POSTS =====
function loadPosts() {
    const list = document.getElementById('postsList');
    list.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
    allPosts = {};

    db.ref('posts').orderByChild('createdAt').on('value', snap => {
        allPosts = {};
        if (snap.exists()) {
            snap.forEach(child => { allPosts[child.key] = { id: child.key, ...child.val() }; });
        }
        // Collect unique UIDs to fetch author data
        const uids = [...new Set(Object.values(allPosts).map(p => p.uid).filter(Boolean))];
        const fetchPromises = uids.map(uid => fetchUserData(uid).catch(() => ({})));
        Promise.all(fetchPromises).then(() => {
            renderPosts();
        });
    }, err => {
        list.innerHTML = '<div class="empty-state"><p>Failed to load posts.</p></div>';
    });
}

function renderPosts(filter) {
    const list = document.getElementById('postsList');
    let posts = Object.values(allPosts).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (filter) {
        const q = filter.toLowerCase();
        posts = posts.filter(p => p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q));
    }
    if (posts.length === 0) {
        list.innerHTML = `<div class="no-posts"><i data-lucide="lightbulb"></i><p>${filter ? 'No ideas match your search.' : 'No ideas yet. Be the first to share!'}</p></div>`;
        lucide.createIcons();
        return;
    }
    list.innerHTML = posts.map((p, i) => {
        const pc = getPostColor(p.id, i);
        const vc = p.voteCount || 0;
        const voted = currentUser && p.votes && p.votes[currentUser.uid];
        const isOwner = currentUser && p.uid === currentUser.uid;

        // Fetch author name and verified status from userCache (populated in loadPosts)
        const authorData = userCache[p.uid] || {};
        const author = authorData.name || 'CVR User';
        const authorVerified = authorData.verified || false;
        const avatar = authorData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(author)}&background=111120&color=00f0ff&size=64&font-size=0.35`;

        const time = timeAgo(p.createdAt);
        const mediaHtml = renderMediaHtml(p.media);
        const cc = p.commentCount || 0;

        return `<div class="post-card" style="--post-color:${pc.c};--post-glow:${pc.g};animation-delay:${i * 0.06}s">
            <div class="post-author">
                <img src="${avatar}" alt="${author}" onerror="this.src='https://ui-avatars.com/api/?name=U&background=111120&color=00f0ff&size=64'">
                <div class="post-author-info">
                    <div class="post-author-name">${escHtml(author)} ${verifiedTick(authorVerified)}</div>
                    <div class="post-author-time">${time}</div>
                </div>
            </div>
            <div class="post-title" style="cursor:pointer" onclick="openPost('${p.id}')">${escHtml(p.title)}</div>
            <div class="post-body">${escHtml(p.body).substring(0, 300)}${p.body.length > 300 ? '...' : ''}</div>
            ${mediaHtml}
            <div class="post-actions">
                <button class="post-action ${voted ? 'voted' : ''}" onclick="toggleVote('${p.id}')">
                    <i data-lucide="chevron-up"></i>
                    <span class="post-vote-count">${vc}</span>
                </button>
                <button class="post-action" onclick="openPost('${p.id}')">
                    <i data-lucide="message-circle"></i> ${cc}
                </button>
                ${isOwner ? `<button class="post-action post-delete" onclick="deletePost('${p.id}')"><i data-lucide="trash-2"></i></button>` : ''}
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

function filterPosts() {
    const q = document.getElementById('searchInput').value;
    renderPosts(q);
}

// ===== VOTE =====
function toggleVote(postId) {
    if (!currentUser) return;
    const post = allPosts[postId];
    if (!post) return;
    const ref = db.ref('posts/' + postId + '/votes/' + currentUser.uid);
    const voteRef = db.ref('posts/' + postId + '/voteCount');
    if (post.votes && post.votes[currentUser.uid]) {
        ref.remove();
        voteRef.set((post.voteCount || 1) - 1);
    } else {
        ref.set(true);
        voteRef.set((post.voteCount || 0) + 1);
    }
}

// ===== DELETE POST =====
function deletePost(postId) {
    if (!confirm('Delete this idea permanently?')) return;
    db.ref('posts/' + postId).remove()
        .then(() => { showToast('Idea deleted'); if (currentPostId === postId) navigate('explore'); })
        .catch(err => showToast('Delete failed', true));
}

// ===== OPEN POST DETAIL =====
function openPost(postId) {
    currentPostId = postId;
    navigate('detail');
    loadPostDetail(postId);
    loadComments(postId);
}

function loadPostDetail(postId) {
    const container = document.getElementById('detailContent');
    const p = allPosts[postId];
    if (!p) { container.innerHTML = '<div class="empty-state"><p>Post not found.</p></div>'; return; }

    const pc = getPostColor(postId, 0);
    const authorData = userCache[p.uid] || {};
    const author = authorData.name || 'CVR User';
    const authorVerified = authorData.verified || false;
    const avatar = authorData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(author)}&background=111120&color=00f0ff&size=64&font-size=0.35`;
    const time = timeAgo(p.createdAt);
    const vc = p.voteCount || 0;
    const voted = currentUser && p.votes && p.votes[currentUser.uid];
    const isOwner = currentUser && p.uid === currentUser.uid;
    const mediaHtml = renderMediaHtml(p.media);

    container.innerHTML = `<div class="detail-card" style="--post-color:${pc.c};--post-glow:${pc.g}">
        <div class="post-author">
            <img src="${avatar}" alt="${author}" onerror="this.src='https://ui-avatars.com/api/?name=U&background=111120&color=00f0ff&size=64'">
            <div class="post-author-info">
                <div class="post-author-name">${escHtml(author)} ${verifiedTick(authorVerified)}</div>
                <div class="post-author-time">${time}</div>
            </div>
            ${isOwner ? `<button class="post-action post-delete" style="opacity:1" onclick="deletePost('${postId}')"><i data-lucide="trash-2"></i></button>` : ''}
        </div>
        <div class="post-title">${escHtml(p.title)}</div>
        <div class="post-body">${escHtml(p.body)}</div>
        ${mediaHtml}
        <div class="post-actions">
            <button class="post-action ${voted ? 'voted' : ''}" onclick="toggleVote('${postId}')">
                <i data-lucide="chevron-up"></i>
                <span class="post-vote-count">${vc}</span>
            </button>
        </div>
    </div>`;
    lucide.createIcons();
}

// ===== COMMENTS =====
function loadComments(postId) {
    const list = document.getElementById('commentList');
    list.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

    db.ref('comments/' + postId).orderByChild('createdAt').on('value', snap => {
        if (!snap.exists()) {
            list.innerHTML = '<div class="empty-state"><p>No comments yet.</p></div>';
            return;
        }

        let comments = [];
        snap.forEach(child => {
            comments.push({ id: child.key, ...child.val() });
        });

        const authorPromises = comments.map(async c => {
            if (c.uid === currentUser.uid) {
                return { ...c, authorName: currentUser.displayName || 'You', authorAvatar: currentUser.photoURL || '', authorVerified: currentUserData.verified || false };
            }
            const authorData = userCache[c.uid] || {};
            const name = authorData.name || 'CVR User';
            const avatar = authorData.photoURL || '';
            const verified = authorData.verified || false;
            return { ...c, authorName: name, authorAvatar: avatar, authorVerified: verified };
        });

        Promise.all(authorPromises).then(commentsWithAuthors => {
            list.innerHTML = commentsWithAuthors.map(c => {
                const avatar = c.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName)}&background=111120&color=00f0ff&size=56&font-size=0.35`;
                const isOwner = currentUser && c.uid === currentUser.uid;
                const time = timeAgo(c.createdAt);

                return `<div class="comment-item">
                    <img src="${avatar}" alt="${c.authorName}" onerror="this.src='https://ui-avatars.com/api/?name=U&background=111120&color=00f0ff&size=56'">
                    <div class="comment-content">
                        <div class="comment-name">${escHtml(c.authorName)} ${verifiedTick(c.authorVerified)}</div>
                        <div class="comment-text">${escHtml(c.text)}</div>
                        <div class="comment-time">${time}</div>
                    </div>
                    ${isOwner ? `<button class="comment-del" onclick="deleteComment('${postId}','${c.id}')"><i data-lucide="x"></i></button>` : ''}
                </div>`;
            }).join('');
            lucide.createIcons();
        });
    });
}

function addComment() {
    if (!currentUser) return;
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text) return;

    db.ref('comments/' + currentPostId).push({
        uid: currentUser.uid,
        text: text,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    });

    db.ref('posts/' + currentPostId + '/commentCount').transaction(count => (count || 0) + 1);

    input.value = '';
    showToast('Comment added');
}

function deleteComment(postId, commentId) {
    if (!confirm('Delete this comment?')) return;
    db.ref('comments/' + postId + '/' + commentId).remove()
        .then(() => {
            db.ref('posts/' + postId + '/commentCount').transaction(count => Math.max(0, (count || 1) - 1));
            showToast('Comment deleted');
        })
        .catch(err => showToast('Delete failed', true));
}

// ===== PROFILE =====
function loadProfile() {
    if (!currentUser) return;
    const header = document.getElementById('profileHeader');
    const u = currentUser;
    const isVerified = currentUserData.verified || false;
    const verificationRequested = currentUserData.verificationRequested || false;

    header.innerHTML = `
        <div class="profile-avatar-wrap">
            <img class="profile-avatar" src="${u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName||'U')}&background=111120&color=00f0ff&size=160&font-size=0.35`}" alt="">
            <label class="profile-avatar-edit">
                <i data-lucide="camera"></i>
                <input type="file" accept="image/*" onchange="updateAvatar(event)">
            </label>
        </div>
        <div class="profile-info">
            <input class="profile-name-input" type="text" value="${escHtml(u.displayName || '')}" id="profileNameInput" placeholder="Your name">
            <div class="profile-email">${u.email || ''}</div>
            <div class="profile-stats">
                <div class="profile-stat">
                    <div class="profile-stat-num" id="profilePostCount">0</div>
                    <div class="profile-stat-label">Ideas</div>
                </div>
                <div class="profile-stat">
                    <div class="profile-stat-num" id="profileVoteCount">0</div>
                    <div class="profile-stat-label">Votes</div>
                </div>
            </div>
            ${isVerified ? '<div class="badge-verified"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/></svg> Verified</div>' :
            verificationRequested ? '<div class="badge-pending"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg> Verification Pending</div>' :
            '<button class="btn-verify" onclick="requestVerification()"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/></svg> Request Verification</button>'}
        </div>
        <button class="profile-save" onclick="saveProfile()">Save</button>
    `;

    db.ref('posts').orderByChild('uid').equalTo(currentUser.uid).on('value', snap => {
        const myPosts = [];
        if (snap.exists()) {
            snap.forEach(child => {
                myPosts.push({ id: child.key, ...child.val() });
            });
        }

        document.getElementById('profilePostCount').textContent = myPosts.length;
        let totalVotes = 0;
        myPosts.forEach(p => totalVotes += (p.voteCount || 0));
        document.getElementById('profileVoteCount').textContent = totalVotes;

        const list = document.getElementById('myPostsList');
        if (myPosts.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>You haven\'t shared any ideas yet.</p></div>';
            return;
        }

        list.innerHTML = myPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map((p, i) => {
            const pc = getPostColor(p.id, i);
            const vc = p.voteCount || 0;
            const cc = p.commentCount || 0;
            const mediaHtml = renderMediaHtml(p.media);

            return `<div class="post-card" style="--post-color:${pc.c};--post-glow:${pc.g};animation-delay:${i * 0.06}s" onclick="openPost('${p.id}')">
                <div class="post-title">${escHtml(p.title)}</div>
                <div class="post-body">${escHtml(p.body).substring(0, 150)}${p.body.length > 150 ? '...' : ''}</div>
                ${mediaHtml}
                <div class="post-actions">
                    <div class="post-action" style="cursor:default">
                        <i data-lucide="chevron-up"></i>
                        <span class="post-vote-count">${vc}</span>
                    </div>
                    <div class="post-action" style="cursor:default">
                        <i data-lucide="message-circle"></i> ${cc}
                    </div>
                    <button class="post-action post-delete" style="opacity:1" onclick="event.stopPropagation();deletePost('${p.id}')"><i data-lucide="trash-2"></i></button>
                </div>
            </div>`;
        }).join('');

        lucide.createIcons();
    });
}

async function updateAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image must be under 5MB', true);
        return;
    }

    try {
        showToast('Uploading avatar...');
        const result = await uploadToCloudinary(file, 'image');
        await currentUser.updateProfile({ photoURL: result.url });
        await db.ref('users/' + currentUser.uid + '/photoURL').set(result.url);
        userCache[currentUser.uid] = { ...userCache[currentUser.uid], photoURL: result.url };
        showToast('Avatar updated');
        loadProfile();
    } catch (err) {
        showToast('Upload failed: ' + err.message, true);
    }
}

async function saveProfile() {
    if (!currentUser) return;
    const nameInput = document.getElementById('profileNameInput');
    const newName = nameInput.value.trim().replace(/[^a-zA-Z0-9 ]/g, '').trim();

    if (!newName) {
        showToast('Name cannot be empty or contain special characters', true);
        return;
    }

    try {
        await currentUser.updateProfile({ displayName: newName });
        await db.ref('users/' + currentUser.uid + '/name').set(newName);
        userCache[currentUser.uid] = { ...userCache[currentUser.uid], name: newName };
        updateNav();
        showToast('Profile updated');
    } catch (err) {
        showToast('Failed to update profile', true);
    }
}

function requestVerification() {
    if (!currentUser) return;
    if (!confirm('Request verified status for your account?')) return;

    db.ref('users/' + currentUser.uid + '/verificationRequested').set(true)
        .then(() => {
            userCache[currentUser.uid] = { ...userCache[currentUser.uid], verificationRequested: true };
            showToast('Verification request submitted');
            loadProfile();
        })
        .catch(err => showToast('Request failed', true));
}

// ===== LIGHTBOX =====
function openLightbox(url) {
    const lb = document.getElementById('lightbox');
    document.getElementById('lightboxImg').src = url;
    lb.classList.add('open');
}

// ===== TOAST =====
function showToast(msg, isError = false) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast' + (isError ? ' error' : '');
    toast.textContent = msg;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
    }, 3000);
}

// ===== UTILS =====
function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function timeAgo(ts) {
    if (!ts) return '';
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    return new Date(ts).toLocaleDateString();
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.getElementById('lightbox').classList.remove('open');
    }
});

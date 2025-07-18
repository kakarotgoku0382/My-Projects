// Application state
let votes = {
    candidate1: 0,
    candidate2: 0,
    candidate3: 0,
    candidate4: 0
};

let candidates = {
    candidate1: "Alice Johnson",
    candidate2: "Bob Smith", 
    candidate3: "Carol Wilson",
    candidate4: "David Brown"
};

let voters = [];
let currentUser = null;
let isAdmin = false;
let resultsPublished = false;

// Admin credentials
const adminCredentials = {
    username: "admin",
    password: "admin123"
};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    showUserLogin();
    updateCandidateDisplays();
});

// Navigation
function hideAllSections() {
    const sections = ['user-login-section', 'admin-login-section', 'user-voting-section', 
                      'admin-dashboard-section', 'public-results-section'];
    sections.forEach(id => document.getElementById(id).classList.add('hidden'));
}

function showUserLogin() {
    hideAllSections();
    document.getElementById('user-login-section').classList.remove('hidden');
}

function showAdminLogin() {
    hideAllSections();
    document.getElementById('admin-login-section').classList.remove('hidden');
}

function showUserVoting() {
    hideAllSections();
    document.getElementById('user-voting-section').classList.remove('hidden');
}

function showAdminDashboard() {
    hideAllSections();
    document.getElementById('admin-dashboard-section').classList.remove('hidden');
    updateAdminDashboard();
}

function showPublicResults() {
    hideAllSections();
    document.getElementById('public-results-section').classList.remove('hidden');
    displayPublicResults();
}

// User login
function userLogin() {
    const userName = document.getElementById('user-name').value.trim();
    if (!userName) return alert('Please enter your name to continue.');

    const alreadyVoted = voters.find(v => v.name.toLowerCase() === userName.toLowerCase());
    if (alreadyVoted) return alert('You have already voted!');

    currentUser = userName;
    document.getElementById('current-user-name').textContent = userName;
    showUserVoting();
}

// Admin login
function adminLogin() {
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value.trim();

    if (username === adminCredentials.username && password === adminCredentials.password) {
        isAdmin = true;
        showAdminDashboard();
        document.getElementById('admin-username').value = '';
        document.getElementById('admin-password').value = '';
    } else {
        alert('Invalid admin credentials.');
    }
}

// Voting
function vote(candidate) {
    if (!currentUser) return alert('Please login first.');

    const alreadyVoted = voters.find(v => v.name.toLowerCase() === currentUser.toLowerCase());
    if (alreadyVoted) return alert('You have already voted!');

    votes[candidate]++;
    voters.push({
        name: currentUser,
        choice: candidates[candidate],
        timestamp: new Date().toLocaleString()
    });

    document.querySelector('.voting-section').classList.add('hidden');
    document.getElementById('vote-confirmation').classList.remove('hidden');
}

// Candidate name updates
function updateCandidateDisplays() {
    Object.keys(candidates).forEach(key => {
        const nameEl = document.getElementById(`${key}-name`);
        const resultNameEl = document.getElementById(`result-${key}-name`);
        const inputEl = document.getElementById(`edit-${key}`);

        if (nameEl) nameEl.textContent = candidates[key];
        if (resultNameEl) resultNameEl.textContent = candidates[key];
        if (inputEl) inputEl.value = candidates[key];
    });
}

function updateCandidates() {
    if (!isAdmin) return alert('Access denied.');
    Object.keys(candidates).forEach(key => {
        const input = document.getElementById(`edit-${key}`);
        if (input && input.value.trim()) {
            candidates[key] = input.value.trim();
        }
    });
    updateCandidateDisplays();
    alert('Candidates updated!');
}

// Admin dashboard updates
function updateAdminDashboard() {
    updateResults();
    updateVoterList();
    updateCandidateDisplays();
}

function updateResults() {
    const total = Object.values(votes).reduce((a, b) => a + b, 0);

    Object.keys(votes).forEach(key => {
        const count = votes[key];
        const percent = total > 0 ? (count / total) * 100 : 0;

        const countEl = document.getElementById(`${key}-count`);
        const barEl = document.getElementById(`${key}-bar`);
        if (countEl) countEl.textContent = `${count} vote${count !== 1 ? 's' : ''} (${percent.toFixed(1)}%)`;
        if (barEl) barEl.style.width = `${percent}%`;
    });

    const totalEl = document.getElementById('total-votes');
    if (totalEl) totalEl.textContent = `Total Votes: ${total}`;

    if (total > 0) {
        const winner = getWinner();
        const winnerEl = document.getElementById('winner-announcement');
        if (winnerEl) winnerEl.textContent = `🏆 Current Leader: ${winner.name} with ${winner.votes} votes`;
    }
}

function updateVoterList() {
    const listEl = document.getElementById('voter-list');
    if (voters.length === 0) {
        listEl.innerHTML = '<p>No votes cast yet.</p>';
        return;
    }

    listEl.innerHTML = voters.map(voter => `
        <div class="voter-item">
            <div class="voter-name">${voter.name}</div>
            <div class="voter-choice">Voted for: ${voter.choice}</div>
            <div class="voter-timestamp">${voter.timestamp}</div>
        </div>
    `).join('');
}

// Winner logic
function getWinner() {
    let maxVotes = 0;
    let winner = null;
    Object.keys(votes).forEach(key => {
        if (votes[key] > maxVotes) {
            maxVotes = votes[key];
            winner = {
                name: candidates[key],
                votes: maxVotes,
                candidate: key
            };
        }
    });
    return winner;
}

// Public results
function publishResults() {
    if (!isAdmin) return alert('Access denied.');

    const total = Object.values(votes).reduce((a, b) => a + b, 0);
    if (total === 0) return alert('No votes to publish.');

    if (confirm('Are you sure you want to publish the results?')) {
        resultsPublished = true;
        alert('Results published!');
        showPublicResults();
    }
}

function displayPublicResults() {
    const publicResultsEl = document.getElementById('public-results');
    const winnerEl = document.getElementById('public-winner-announcement');

    const total = Object.values(votes).reduce((a, b) => a + b, 0);
    if (!resultsPublished || total === 0) {
        publicResultsEl.innerHTML = '<p>Results have not been published yet.</p>';
        winnerEl.textContent = '';
        return;
    }

    const winner = getWinner();
    winnerEl.textContent = `🏆 Winner: ${winner.name} with ${winner.votes} votes!`;

    publicResultsEl.innerHTML = `
        <h3>Final Results:</h3>
        ${Object.keys(votes).map(key => {
            const count = votes[key];
            const percent = total > 0 ? (count / total * 100).toFixed(1) : 0;
            return `
                <div class="result-item">
                    <div class="candidate-info">
                        <div class="candidate-avatar">${key.slice(-1)}</div>
                        <div class="candidate-name">${candidates[key]}</div>
                    </div>
                    <div class="result-bar">
                        <div class="result-fill" style="width: ${percent}%"></div>
                    </div>
                    <div class="vote-count">${count} votes (${percent}%)</div>
                </div>
            `;
        }).join('')}
        <div class="total-votes">Total Votes: ${total}</div>
    `;
}

// Reset votes
function resetVotes() {
    if (!isAdmin) return alert('Access denied.');
    if (!confirm('This will delete all votes. Are you sure?')) return;

    votes = {
        candidate1: 0,
        candidate2: 0,
        candidate3: 0,
        candidate4: 0
    };
    voters = [];
    resultsPublished = false;
    updateAdminDashboard();
    alert('All votes have been reset.');
}

// Logout
function logout() {
    currentUser = null;
    isAdmin = false;
    showUserLogin();
}

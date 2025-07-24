// Application state
let candidates = {};
let currentUser = null;
let isAdmin = false;
let resultsPublished = false;

// API base URL - change this if your backend runs on a different port
const API_BASE = 'http://localhost:3000/api';

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    showUserLogin();
    loadCandidates();
    loadSettings();
});

// API Helper Functions
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'API request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Load candidates from backend
async function loadCandidates() {
    try {
        const response = await apiCall('/candidates');
        candidates = {};
        
        response.candidates.forEach(candidate => {
            candidates[`candidate${candidate.position}`] = {
                id: candidate.id,
                name: candidate.name,
                position: candidate.position
            };
        });
        
        updateCandidateDisplays();
    } catch (error) {
        console.error('Failed to load candidates:', error);
        alert('Failed to load candidates. Please refresh the page.');
    }
}

// Load system settings
async function loadSettings() {
    try {
        const response = await apiCall('/settings');
        resultsPublished = response.settings.results_published || false;
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

// Navigation functions remain the same
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

// User login with backend validation
async function userLogin() {
    const userName = document.getElementById('user-name').value.trim();
    if (!userName) {
        alert('Please enter your name to continue.');
        return;
    }

    try {
        // Check if user has already voted
        const response = await apiCall(`/voters/${encodeURIComponent(userName)}/check`);
        
        if (response.hasVoted) {
            alert('You have already voted!');
            return;
        }

        currentUser = userName;
        document.getElementById('current-user-name').textContent = userName;
        showUserVoting();
    } catch (error) {
        console.error('Login failed:', error);
        alert('Login failed. Please try again.');
    }
}

// Admin login with backend authentication
async function adminLogin() {
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value.trim();

    try {
        await apiCall('/admin/login', 'POST', { username, password });
        
        isAdmin = true;
        showAdminDashboard();
        document.getElementById('admin-username').value = '';
        document.getElementById('admin-password').value = '';
    } catch (error) {
        console.error('Admin login failed:', error);
        alert('Invalid admin credentials.');
    }
}

// Voting with backend integration
async function vote(candidateKey) {
    if (!currentUser) {
        alert('Please login first.');
        return;
    }

    const candidate = candidates[candidateKey];
    if (!candidate) {
        alert('Invalid candidate selection.');
        return;
    }

    try {
        await apiCall('/votes', 'POST', {
            voterName: currentUser,
            candidateId: candidate.id
        });

        document.querySelector('.voting-section').classList.add('hidden');
        document.getElementById('vote-confirmation').classList.remove('hidden');
    } catch (error) {
        console.error('Vote failed:', error);
        alert(error.message || 'Failed to cast vote. Please try again.');
    }
}

// Update candidate displays
function updateCandidateDisplays() {
    Object.keys(candidates).forEach(key => {
        const candidate = candidates[key];
        const nameEl = document.getElementById(`${key}-name`);
        const resultNameEl = document.getElementById(`result-${key}-name`);
        const inputEl = document.getElementById(`edit-${key}`);

        if (nameEl) nameEl.textContent = candidate.name;
        if (resultNameEl) resultNameEl.textContent = candidate.name;
        if (inputEl) inputEl.value = candidate.name;
    });
}

// Update existing candidates
async function updateCandidates() {
    if (!isAdmin) {
        alert('Access denied.');
        return;
    }

    try {
        const updates = [];
        Object.keys(candidates).forEach(key => {
            const input = document.getElementById(`edit-${key}`);
            if (input && input.value.trim() && input.value.trim() !== candidates[key].name) {
                updates.push({
                    id: candidates[key].id,
                    name: input.value.trim()
                });
            }
        });

        // Update each candidate
        for (const update of updates) {
            await apiCall(`/candidates/${update.id}`, 'PUT', { name: update.name });
        }

        if (updates.length > 0) {
            await loadCandidates();
            alert('Candidates updated successfully!');
        } else {
            alert('No changes detected.');
        }
    } catch (error) {
        console.error('Failed to update candidates:', error);
        alert('Failed to update candidates: ' + error.message);
    }
}

// Add new candidate
async function addCandidate() {
    if (!isAdmin) {
        alert('Access denied.');
        return;
    }

    const name = prompt('Enter new candidate name:');
    if (!name || name.trim().length === 0) {
        return;
    }

    try {
        await apiCall('/candidates', 'POST', { name: name.trim() });
        await loadCandidates();
        await updateAdminDashboard();
        alert('Candidate added successfully!');
    } catch (error) {
        console.error('Failed to add candidate:', error);
        alert('Failed to add candidate: ' + error.message);
    }
}

// Remove candidate
async function removeCandidate(candidateKey) {
    if (!isAdmin) {
        alert('Access denied.');
        return;
    }

    const candidate = candidates[candidateKey];
    if (!candidate) {
        alert('Candidate not found.');
        return;
    }

    if (!confirm(`Are you sure you want to remove "${candidate.name}"?`)) {
        return;
    }

    try {
        await apiCall(`/candidates/${candidate.id}`, 'DELETE');
        await loadCandidates();
        await updateAdminDashboard();
        alert('Candidate removed successfully!');
    } catch (error) {
        console.error('Failed to remove candidate:', error);
        alert('Failed to remove candidate: ' + error.message);
    }
}

// Admin dashboard updates
async function updateAdminDashboard() {
    await updateResults();
    await updateVoterList();
    await updateCandidateManagement();
    updateCandidateDisplays();
}

// Update candidate management section
function updateCandidateManagement() {
    const container = document.querySelector('.admin-section');
    if (!container) return;

    // Add management buttons if they don't exist
    let managementSection = document.getElementById('candidate-management');
    if (!managementSection) {
        managementSection = document.createElement('div');
        managementSection.id = 'candidate-management';
        managementSection.innerHTML = `
            <h4>Candidate Management</h4>
            <div class="management-buttons">
                <button class="update-btn" onclick="addCandidate()">Add New Candidate</button>
            </div>
            <div class="candidate-list" id="candidate-list"></div>
        `;
        container.appendChild(managementSection);
    }

    // Update candidate list with remove buttons
    const candidateList = document.getElementById('candidate-list');
    if (candidateList) {
        candidateList.innerHTML = Object.keys(candidates).map(key => {
            const candidate = candidates[key];
            return `
                <div class="candidate-management-item">
                    <span>${candidate.name}</span>
                    <button class="reset-btn" onclick="removeCandidate('${key}')">Remove</button>
                </div>
            `;
        }).join('');
    }
}

// Update results from backend
async function updateResults() {
    try {
        const response = await apiCall('/results');
        
        // Update vote counts and percentages
        response.results.forEach(result => {
            const candidateKey = `candidate${result.position}`;
            const countEl = document.getElementById(`${candidateKey}-count`);
            const barEl = document.getElementById(`${candidateKey}-bar`);
            
            if (countEl) {
                countEl.textContent = `${result.vote_count} vote${result.vote_count !== 1 ? 's' : ''} (${result.percentage}%)`;
            }
            if (barEl) {
                barEl.style.width = `${result.percentage}%`;
            }
        });

        // Update total votes
        const totalEl = document.getElementById('total-votes');
        if (totalEl) {
            totalEl.textContent = `Total Votes: ${response.totalVotes}`;
        }

        // Update winner announcement
        const winnerEl = document.getElementById('winner-announcement');
        if (winnerEl) {
            if (response.tie) {
                winnerEl.textContent = `🤝 It's a tie! Multiple candidates have ${response.results[0].vote_count} votes each`;
            } else if (response.winner) {
                winnerEl.textContent = `🏆 Current Leader: ${response.winner.name} with ${response.winner.vote_count} votes`;
            } else {
                winnerEl.textContent = '';
            }
        }
    } catch (error) {
        console.error('Failed to update results:', error);
    }
}

// Update voter list from backend
async function updateVoterList() {
    try {
        const response = await apiCall('/voters');
        const listEl = document.getElementById('voter-list');
        
        if (response.voters.length === 0) {
            listEl.innerHTML = '<p>No votes cast yet.</p>';
            return;
        }

        listEl.innerHTML = response.voters.map(voter => `
            <div class="voter-item">
                <div class="voter-name">${voter.voter_name}</div>
                <div class="voter-choice">Voted for: ${voter.candidate_name}</div>
                <div class="voter-timestamp">${new Date(voter.timestamp).toLocaleString()}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to update voter list:', error);
    }
}

// Publish results
async function publishResults() {
    if (!isAdmin) {
        alert('Access denied.');
        return;
    }

    try {
        const response = await apiCall('/results');
        
        if (response.totalVotes === 0) {
            alert('No votes to publish.');
            return;
        }

        if (confirm('Are you sure you want to publish the results?')) {
            await apiCall('/results/publish', 'POST', { publish: true });
            resultsPublished = true;
            alert('Results published successfully!');
            showPublicResults();
        }
    } catch (error) {
        console.error('Failed to publish results:', error);
        alert('Failed to publish results: ' + error.message);
    }
}

// Display public results
async function displayPublicResults() {
    const publicResultsEl = document.getElementById('public-results');
    const winnerEl = document.getElementById('public-winner-announcement');

    if (!resultsPublished) {
        publicResultsEl.innerHTML = '<p>Results have not been published yet.</p>';
        winnerEl.textContent = '';
        return;
    }

    try {
        const response = await apiCall('/results');
        
        if (response.totalVotes === 0) {
            publicResultsEl.innerHTML = '<p>No votes have been cast yet.</p>';
            winnerEl.textContent = '';
            return;
        }

        // Display winner
        if (response.tie) {
            winnerEl.textContent = `🤝 It's a tie! Multiple candidates tied with ${response.results[0].vote_count} votes each!`;
        } else if (response.winner) {
            winnerEl.textContent = `🏆 Winner: ${response.winner.name} with ${response.winner.vote_count} votes!`;
        }

        // Display results
        publicResultsEl.innerHTML = `
            <h3>Final Results:</h3>
            ${response.results.map(result => `
                <div class="result-item">
                    <div class="candidate-info">
                        <div class="candidate-avatar">${result.position}</div>
                        <div class="candidate-name">${result.name}</div>
                    </div>
                    <div class="result-bar">
                        <div class="result-fill" style="width: ${result.percentage}%"></div>
                    </div>
                    <div class="vote-count">${result.vote_count} votes (${result.percentage}%)</div>
                </div>
            `).join('')}
            <div class="total-votes">Total Votes: ${response.totalVotes}</div>
        `;
    } catch (error) {
        console.error('Failed to display public results:', error);
        publicResultsEl.innerHTML = '<p>Error loading results.</p>';
    }
}

// Reset all votes
async function resetVotes() {
    if (!isAdmin) {
        alert('Access denied.');
        return;
    }

    if (!confirm('This will delete all votes. Are you sure?')) {
        return;
    }

    try {
        await apiCall('/votes', 'DELETE');
        resultsPublished = false;
        await updateAdminDashboard();
        alert('All votes have been reset successfully.');
    } catch (error) {
        console.error('Failed to reset votes:', error);
        alert('Failed to reset votes: ' + error.message);
    }
}

// Logout
function logout() {
    currentUser = null;
    isAdmin = false;
    showUserLogin();
}
// State management
let currentFile = null;

// DOM Elements
const uploadSection = document.getElementById('uploadSection');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');

const uploadArea = document.getElementById('uploadArea');
const resumeInput = document.getElementById('resumeInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const selectedFileDiv = document.getElementById('selectedFile');
const removeFileBtn = document.getElementById('removeFile');

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Upload area click
    uploadArea.addEventListener('click', () => {
        resumeInput.click();
    });

    // File input change
    resumeInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);

    // Analyze button
    analyzeBtn.addEventListener('click', analyzeResume);

    // Remove file button
    removeFileBtn.addEventListener('click', removeFile);

    // Analyze another button
    document.getElementById('analyzeAnother').addEventListener('click', resetToUpload);

    // Try again button
    document.getElementById('tryAgain').addEventListener('click', resetToUpload);

    // Download report button
    document.getElementById('downloadReport').addEventListener('click', downloadReport);

    // Share results button
    document.getElementById('shareResults').addEventListener('click', shareResults);

    // Tab navigation
    setupTabNavigation();
    setupCareerSkillsTabNavigation();
});

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        validateAndSetFile(file);
    }
}

// Handle drag over
function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('drag-over');
}

// Handle drag leave
function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('drag-over');
}

// Handle drop
function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const file = event.dataTransfer.files[0];
    if (file) {
        validateAndSetFile(file);
    }
}

// Validate and set file
function validateAndSetFile(file) {
    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showError('File size exceeds 10MB. Please upload a smaller file.');
        return;
    }

    // Check file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const allowedExtensions = ['.pdf', '.docx', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        showError('Invalid file type. Please upload a PDF, DOCX, or TXT file.');
        return;
    }

    // Set current file
    currentFile = file;

    // Update UI
    document.querySelector('.file-name').textContent = file.name;
    selectedFileDiv.style.display = 'flex';
    analyzeBtn.disabled = false;
    uploadArea.style.display = 'none';
}

// Remove file
function removeFile(event) {
    event.stopPropagation();
    currentFile = null;
    resumeInput.value = '';
    selectedFileDiv.style.display = 'none';
    analyzeBtn.disabled = true;
    uploadArea.style.display = 'block';
}

// Analyze resume
async function analyzeResume() {
    if (!currentFile) return;

    // Show loading state
    showSection('loading');

    // Create form data
    const formData = new FormData();
    formData.append('resume', currentFile);

    try {
        // Make API request
        const response = await fetch('/predict', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'An error occurred while analyzing your resume');
        }

        // Display results
        displayResults(data);

    } catch (error) {
        showError(error.message);
    }
}

// Display results
function displayResults(data) {
    // Set primary role and confidence
    document.getElementById('primaryRole').textContent = data.primary_role;
    
    const confidencePercent = Math.round(data.primary_confidence * 100);
    document.getElementById('primaryConfidence').style.width = confidencePercent + '%';
    document.getElementById('primaryConfidenceText').textContent = confidencePercent + '%';

    // Display recommendation cards
    const recommendationCards = document.getElementById('recommendationCards');
    recommendationCards.innerHTML = '';

    data.recommendations.forEach((rec, index) => {
        const card = createRecommendationCard(rec, index + 1);
        recommendationCards.appendChild(card);
    });

    // Display extracted skills
    const skillsContainer = document.getElementById('skillsContainer');
    skillsContainer.innerHTML = '';

    if (data.extracted_skills && data.extracted_skills.length > 0) {
        data.extracted_skills.forEach(skill => {
            const badge = document.createElement('span');
            badge.className = 'skill-badge';
            badge.textContent = skill;
            skillsContainer.appendChild(badge);
        });
    } else {
        skillsContainer.innerHTML = '<p style="color: #40798c;">No specific skills detected</p>';
    }

    // Display best fit role
    displayBestFitRole(data.best_fit_role);

    // Display job opportunities
    displayJobOpportunities(data.job_opportunities);

    // Display interview questions
    displayInterviewQuestions(data.interview_prep);

    // Update sidebar
    updateSidebar(data);

    // Show results section
    showSection('results');
}

// Create recommendation card
function createRecommendationCard(rec, rank) {
    const card = document.createElement('div');
    card.className = 'recommendation-card';

    const confidencePercent = Math.round(rec.confidence * 100);
    const skillMatchPercent = Math.round(rec.skill_match);

    card.innerHTML = `
        <div class="card-rank">${rank}</div>
        <h4 class="card-title">${rec.role}</h4>
        <div class="card-stats">
            <div class="stat">
                <div class="stat-label">Confidence</div>
                <div class="stat-value">${confidencePercent}%</div>
            </div>
            <div class="stat">
                <div class="stat-label">Skill Match</div>
                <div class="stat-value">${skillMatchPercent}%</div>
            </div>
        </div>
        ${rec.matched_skills.length > 0 ? `
            <div class="card-skills">
                <div class="skills-label">✅ Matched Skills:</div>
                <div class="skill-tags">
                    ${rec.matched_skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                </div>
            </div>
        ` : ''}
        ${rec.missing_skills && rec.missing_skills.length > 0 ? `
            <div class="card-skills">
                <div class="skills-label">⚠️ Skills to Learn:</div>
                <div class="skill-tags">
                    ${rec.missing_skills.map(skill => `<span class="skill-tag missing">${skill}</span>`).join('')}
                </div>
            </div>
        ` : ''}
    `;

    return card;
}

// New function to display best fit role
function displayBestFitRole(bestFit) {
    const bestFitCard = document.getElementById('bestFitCard');
    const score = Math.round(bestFit.combined_score);
    
    bestFitCard.innerHTML = `
        <div class="best-fit-content">
            <div class="best-fit-icon">🏆</div>
            <div class="best-fit-details">
                <h4 class="best-fit-role">${bestFit.role}</h4>
                <p class="best-fit-reason">${bestFit.reason}</p>
                <div class="best-fit-score">
                    <span class="score-label">Overall Match Score:</span>
                    <span class="score-value">${score}%</span>
                </div>
                <div class="best-fit-bar">
                    <div class="best-fit-fill" style="width: ${score}%"></div>
                </div>
            </div>
        </div>
    `;
}

// New function to display job opportunities
function displayJobOpportunities(opportunities) {
    const jobPortals = document.getElementById('jobPortals');
    jobPortals.innerHTML = '';
    
    opportunities.forEach((opp, index) => {
        const oppCard = document.createElement('div');
        oppCard.className = 'job-opportunity-card';
        
        const linksHTML = opp.links.map(link => `
            <a href="${link.url}" target="_blank" class="job-link">
                <span class="job-link-icon">${link.icon}</span>
                <span class="job-link-name">${link.name}</span>
                <span class="job-link-arrow">→</span>
            </a>
        `).join('');
        
        oppCard.innerHTML = `
            <div class="opp-header">
                <span class="opp-rank">${index + 1}</span>
                <h4 class="opp-role">${opp.role}</h4>
            </div>
            <div class="job-links">
                ${linksHTML}
            </div>
        `;
        
        jobPortals.appendChild(oppCard);
    });
}

// New function to display interview questions
function displayInterviewQuestions(interviewPrepList) {
    const interviewQuestions = document.getElementById('interviewQuestions');
    interviewQuestions.innerHTML = '';
    
    // Display questions for all roles
    interviewPrepList.forEach((interviewPrep, roleIndex) => {
        // Create role section
        const roleSection = document.createElement('div');
        roleSection.className = 'interview-role-section';
        
        // Role header
        const header = document.createElement('div');
        header.className = 'interview-header';
        header.innerHTML = `
            <div class="interview-role-badge">
                <span class="role-number">${roleIndex + 1}</span>
                <span class="role-title">${interviewPrep.role}</span>
            </div>
        `;
        roleSection.appendChild(header);
        
        // Questions container
        const questionsContainer = document.createElement('div');
        questionsContainer.className = 'questions-container';
        
        interviewPrep.questions.forEach((question, index) => {
            const questionCard = document.createElement('div');
            questionCard.className = 'question-card';
            questionCard.innerHTML = `
                <div class="question-number">Q${index + 1}</div>
                <div class="question-text">${question}</div>
            `;
            questionsContainer.appendChild(questionCard);
        });
        
        roleSection.appendChild(questionsContainer);
        interviewQuestions.appendChild(roleSection);
    });
}

// Show section
function showSection(section) {
    uploadSection.style.display = 'none';
    loadingSection.style.display = 'none';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';

    switch (section) {
        case 'upload':
            uploadSection.style.display = 'block';
            break;
        case 'loading':
            loadingSection.style.display = 'block';
            break;
        case 'results':
            resultsSection.style.display = 'block';
            break;
        case 'error':
            errorSection.style.display = 'block';
            break;
    }
}

// Show error
function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    showSection('error');
}

// Reset to upload
function resetToUpload() {
    removeFile({ stopPropagation: () => {} });
    showSection('upload');
}

// Download report
function downloadReport() {
    const primaryRole = document.getElementById('primaryRole').textContent;
    const confidence = document.getElementById('primaryConfidenceText').textContent;
    
    let reportContent = '=== RESUME SCREENING AI REPORT ===\n\n';
    reportContent += `PRIMARY MATCH: ${primaryRole}\n`;
    reportContent += `CONFIDENCE: ${confidence}\n\n`;
    reportContent += '=== TOP 3 RECOMMENDATIONS ===\n\n';
    
    const cards = document.querySelectorAll('.recommendation-card');
    cards.forEach((card, index) => {
        const title = card.querySelector('.card-title').textContent;
        const stats = card.querySelectorAll('.stat-value');
        reportContent += `${index + 1}. ${title}\n`;
        reportContent += `   Confidence: ${stats[0].textContent}\n`;
        reportContent += `   Skill Match: ${stats[1].textContent}\n\n`;
    });
    
    reportContent += '=== DETECTED SKILLS ===\n\n';
    const skills = document.querySelectorAll('.skill-badge');
    skills.forEach(skill => {
        reportContent += `- ${skill.textContent}\n`;
    });
    
    // Create download
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume-screening-report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Share results
function shareResults() {
    const primaryRole = document.getElementById('primaryRole').textContent;
    const confidence = document.getElementById('primaryConfidenceText').textContent;
    
    const shareText = `I just analyzed my resume with Resume Booster AI! 🎯\n\nBest Match: ${primaryRole}\nConfidence: ${confidence}\n\nCheck it out and discover your perfect career match!`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Resume Booster AI Results',
            text: shareText
        }).catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            alert('Results copied to clipboard! Share them with your friends!');
        }).catch(err => {
            console.error('Error copying to clipboard:', err);
        });
    }
}

// Setup tab navigation
function setupTabNavigation() {
    const navbar = document.querySelector('.tab-navbar:not(.career-skills-navbar)');
    if (!navbar) return;
    
    const tabButtons = navbar.querySelectorAll('.tab-button');
    const wrapper = document.querySelector('.tab-content-wrapper:not(.career-skills-wrapper)');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // Remove active class from all buttons in this navbar
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Hide all tab contents in this wrapper
            if (wrapper) {
                wrapper.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Show selected tab content
                const selectedTab = document.getElementById(`${tabName}Tab`);
                if (selectedTab) {
                    selectedTab.classList.add('active');
                }
            }
        });
    });
}

// Setup career & skills tab navigation
function setupCareerSkillsTabNavigation() {
    const navbar = document.querySelector('.career-skills-navbar');
    if (!navbar) return;
    
    const tabButtons = navbar.querySelectorAll('.tab-button');
    const wrapper = document.querySelector('.career-skills-wrapper');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // Remove active class from all buttons in this navbar
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Hide all tab contents in this wrapper
            if (wrapper) {
                wrapper.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Show selected tab content
                const selectedTab = document.getElementById(`${tabName}Tab`);
                if (selectedTab) {
                    selectedTab.classList.add('active');
                }
            }
        });
    });
}

// Update sidebar with results data
function updateSidebar(data) {
    // Update best match
    const sidebarBestMatch = document.getElementById('sidebarBestMatch');
    if (sidebarBestMatch) {
        sidebarBestMatch.textContent = data.primary_role;
    }
    
    // Update skills count
    const sidebarSkillsCount = document.getElementById('sidebarSkillsCount');
    if (sidebarSkillsCount && data.extracted_skills) {
        sidebarSkillsCount.textContent = data.extracted_skills.length;
    }
    
    // Update confidence in sidebar
    const confidencePercent = Math.round(data.primary_confidence * 100);
    const sidebarConfidence = document.getElementById('sidebarConfidence');
    const sidebarConfidenceFill = document.getElementById('sidebarConfidenceFill');
    
    if (sidebarConfidence) {
        sidebarConfidence.textContent = confidencePercent + '%';
    }
    
    if (sidebarConfidenceFill) {
        sidebarConfidenceFill.style.width = confidencePercent + '%';
    }
    
    // Setup sidebar button event listeners
    setupSidebarButtons();
}

// Setup sidebar button event listeners
function setupSidebarButtons() {
    const sidebarDownload = document.getElementById('sidebarDownload');
    const sidebarShare = document.getElementById('sidebarShare');
    const sidebarNewAnalysis = document.getElementById('sidebarNewAnalysis');
    
    if (sidebarDownload) {
        sidebarDownload.addEventListener('click', downloadReport);
    }
    
    if (sidebarShare) {
        sidebarShare.addEventListener('click', shareResults);
    }
    
    if (sidebarNewAnalysis) {
        sidebarNewAnalysis.addEventListener('click', resetToUpload);
    }
}


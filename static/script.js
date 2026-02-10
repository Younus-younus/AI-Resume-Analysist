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
        skillsContainer.innerHTML = '<p style="color: #718096;">No specific skills detected</p>';
    }

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

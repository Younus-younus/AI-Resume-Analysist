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


/* ============================================
   RESUME BUILDER FUNCTIONALITY
   ============================================ */

// Resume Builder State
let selectedTemplate = 'creative';
let resumeData = {};

// Initialize Resume Builder
document.addEventListener('DOMContentLoaded', () => {
    // Feature selection (for index.html)
    const selectScreening = document.getElementById('selectScreening');
    const featureSelection = document.getElementById('featureSelection');
    
    if (selectScreening) {
        selectScreening.addEventListener('click', () => {
            if (featureSelection) {
                featureSelection.style.display = 'none';
            }
            if (uploadSection) {
                uploadSection.style.display = 'block';
            }
        });
    }
    
    // Template selection (for resume_builder.html)
    const templateCards = document.querySelectorAll('.template-card');
    if (templateCards.length > 0) {
        templateCards.forEach(card => {
            card.addEventListener('click', () => {
                templateCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                selectedTemplate = card.getAttribute('data-template');
            });
        });
    }
    
    // Add more buttons (for resume_builder.html)
    document.getElementById('addEducation')?.addEventListener('click', () => addEducationItem());
    document.getElementById('addExperience')?.addEventListener('click', () => addExperienceItem());
    document.getElementById('addProject')?.addEventListener('click', () => addProjectItem());
    document.getElementById('addCertification')?.addEventListener('click', () => addCertificationItem());
    
    // Generate resume button (for resume_builder.html)
    document.getElementById('generateResume')?.addEventListener('click', generateResume);
});

// Add education item
function addEducationItem() {
    const container = document.getElementById('educationContainer');
    const item = document.createElement('div');
    item.className = 'dynamic-item education-item';
    item.innerHTML = `
        <div class="form-grid">
            <div class="form-group">
                <label>Degree *</label>
                <input type="text" name="degree[]" required placeholder="Bachelor of Science">
            </div>
            <div class="form-group">
                <label>Institution *</label>
                <input type="text" name="institution[]" required placeholder="University Name">
            </div>
            <div class="form-group">
                <label>Year *</label>
                <input type="text" name="eduYear[]" required placeholder="2018 - 2022">
            </div>
            <div class="form-group">
                <label>GPA/Grade</label>
                <input type="text" name="grade[]" placeholder="3.8/4.0">
            </div>
        </div>
        <button type="button" class="remove-item-btn" onclick="removeItem(this)">Remove</button>
    `;
    container.appendChild(item);
}

// Add experience item
function addExperienceItem() {
    const container = document.getElementById('experienceContainer');
    const item = document.createElement('div');
    item.className = 'dynamic-item experience-item';
    item.innerHTML = `
        <div class="form-grid">
            <div class="form-group">
                <label>Job Title *</label>
                <input type="text" name="jobTitle[]" required placeholder="Software Engineer">
            </div>
            <div class="form-group">
                <label>Company *</label>
                <input type="text" name="company[]" required placeholder="Company Name">
            </div>
            <div class="form-group">
                <label>Duration *</label>
                <input type="text" name="duration[]" required placeholder="Jan 2022 - Present">
            </div>
            <div class="form-group full-width">
                <label>Description *</label>
                <textarea name="jobDescription[]" rows="3" required placeholder="Key responsibilities and achievements..."></textarea>
            </div>
        </div>
        <button type="button" class="remove-item-btn" onclick="removeItem(this)">Remove</button>
    `;
    container.appendChild(item);
}

// Add project item
function addProjectItem() {
    const container = document.getElementById('projectsContainer');
    const item = document.createElement('div');
    item.className = 'dynamic-item project-item';
    item.innerHTML = `
        <div class="form-grid">
            <div class="form-group">
                <label>Project Name *</label>
                <input type="text" name="projectName[]" required placeholder="E-commerce Website">
            </div>
            <div class="form-group">
                <label>Technologies *</label>
                <input type="text" name="technologies[]" required placeholder="React, Node.js, MongoDB">
            </div>
            <div class="form-group full-width">
                <label>Description *</label>
                <textarea name="projectDescription[]" rows="3" required placeholder="Project details and outcomes..."></textarea>
            </div>
            <div class="form-group full-width">
                <label>Link</label>
                <input type="url" name="projectLink[]" placeholder="https://github.com/username/project">
            </div>
        </div>
        <button type="button" class="remove-item-btn" onclick="removeItem(this)">Remove</button>
    `;
    container.appendChild(item);
}

// Add certification item
function addCertificationItem() {
    const container = document.getElementById('certificationsContainer');
    const item = document.createElement('div');
    item.className = 'dynamic-item certification-item';
    item.innerHTML = `
        <div class="form-grid">
            <div class="form-group">
                <label>Certification Name</label>
                <input type="text" name="certName[]" placeholder="AWS Certified Solutions Architect">
            </div>
            <div class="form-group">
                <label>Issuing Organization</label>
                <input type="text" name="certOrg[]" placeholder="Amazon Web Services">
            </div>
            <div class="form-group">
                <label>Year</label>
                <input type="text" name="certYear[]" placeholder="2023">
            </div>
        </div>
        <button type="button" class="remove-item-btn" onclick="removeItem(this)">Remove</button>
    `;
    container.appendChild(item);
}

// Remove item
function removeItem(button) {
    button.parentElement.remove();
}

// Collect form data
function collectFormData() {
    const form = document.getElementById('resumeForm');
    const formData = new FormData(form);
    
    const data = {
        personal: {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            location: formData.get('location'),
            linkedin: formData.get('linkedin'),
            portfolio: formData.get('portfolio')
        },
        summary: formData.get('summary'),
        skills: formData.get('skills').split(',').map(s => s.trim()).filter(s => s),
        education: [],
        experience: [],
        projects: [],
        certifications: []
    };
    
    // Collect education
    const degrees = formData.getAll('degree[]');
    const institutions = formData.getAll('institution[]');
    const eduYears = formData.getAll('eduYear[]');
    const grades = formData.getAll('grade[]');
    
    for (let i = 0; i < degrees.length; i++) {
        if (degrees[i]) {
            data.education.push({
                degree: degrees[i],
                institution: institutions[i],
                year: eduYears[i],
                grade: grades[i]
            });
        }
    }
    
    // Collect experience
    const jobTitles = formData.getAll('jobTitle[]');
    const companies = formData.getAll('company[]');
    const durations = formData.getAll('duration[]');
    const jobDescriptions = formData.getAll('jobDescription[]');
    
    for (let i = 0; i < jobTitles.length; i++) {
        if (jobTitles[i]) {
            data.experience.push({
                title: jobTitles[i],
                company: companies[i],
                duration: durations[i],
                description: jobDescriptions[i]
            });
        }
    }
    
    // Collect projects
    const projectNames = formData.getAll('projectName[]');
    const technologies = formData.getAll('technologies[]');
    const projectDescriptions = formData.getAll('projectDescription[]');
    const projectLinks = formData.getAll('projectLink[]');
    
    for (let i = 0; i < projectNames.length; i++) {
        if (projectNames[i]) {
            data.projects.push({
                name: projectNames[i],
                technologies: technologies[i],
                description: projectDescriptions[i],
                link: projectLinks[i]
            });
        }
    }
    
    // Collect certifications
    const certNames = formData.getAll('certName[]');
    const certOrgs = formData.getAll('certOrg[]');
    const certYears = formData.getAll('certYear[]');
    
    for (let i = 0; i < certNames.length; i++) {
        if (certNames[i]) {
            data.certifications.push({
                name: certNames[i],
                organization: certOrgs[i],
                year: certYears[i]
            });
        }
    }
    
    return data;
}

// Generate resume
async function generateResume() {
    const form = document.getElementById('resumeForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    resumeData = collectFormData();
    
    // Create PDF based on template
    const pdfContent = createResumeHTML(resumeData, selectedTemplate);
    
    // Generate PDF
    const element = document.createElement('div');
    element.innerHTML = pdfContent;
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    document.body.appendChild(element);
    
    const opt = {
        margin: 0,
        filename: `${resumeData.personal.fullName.replace(/\s+/g, '_')}_Resume.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    try {
        await html2pdf().set(opt).from(element).save();
        alert('Resume downloaded successfully!');
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    } finally {
        document.body.removeChild(element);
    }
}

// Create resume HTML based on template
function createResumeHTML(data, template) {
    switch(template) {
        case 'modern':
            return createModernTemplate(data);
        case 'professional':
            return createProfessionalTemplate(data);
        case 'creative':
            return createCreativeTemplate(data);
        default:
            return createProfessionalTemplate(data);
    }
}

// Modern Minimal Template
function createModernTemplate(data) {
    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; display: flex; width: 210mm; height: 297mm; margin: 0; padding: 0;">
            <!-- Sidebar -->
            <div style="width: 35%; background: #2c3e50; color: white; padding: 40px 30px;">
                <div style="margin-bottom: 40px;">
                    <h1 style="font-size: 28px; margin: 0 0 5px 0; font-weight: 700;">${data.personal.fullName}</h1>
                    <div style="font-size: 12px; opacity: 0.9; line-height: 1.6;">
                        ${data.personal.email}<br>
                        ${data.personal.phone}<br>
                        ${data.personal.location}
                        ${data.personal.linkedin ? '<br>' + data.personal.linkedin : ''}
                        ${data.personal.portfolio ? '<br>' + data.personal.portfolio : ''}
                    </div>
                </div>
                
                <div style="margin-bottom: 35px;">
                    <h2 style="font-size: 16px; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3498db; font-weight: 600;">SKILLS</h2>
                    <div style="font-size: 11px; line-height: 1.8;">
                        ${data.skills.map(skill => `<div style="margin-bottom: 5px;">• ${skill}</div>`).join('')}
                    </div>
                </div>
                
                ${data.education.length > 0 ? `
                <div style="margin-bottom: 35px;">
                    <h2 style="font-size: 16px; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3498db; font-weight: 600;">EDUCATION</h2>
                    ${data.education.map(edu => `
                        <div style="margin-bottom: 15px; font-size: 11px;">
                            <div style="font-weight: 600;">${edu.degree}</div>
                            <div style="opacity: 0.9;">${edu.institution}</div>
                            <div style="opacity: 0.8;">${edu.year}</div>
                            ${edu.grade ? `<div style="opacity: 0.8;">${edu.grade}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
            
            <!-- Main Content -->
            <div style="width: 65%; padding: 40px 35px; background: white;">
                <div style="margin-bottom: 30px;">
                    <h2 style="font-size: 16px; color: #2c3e50; margin: 0 0 10px 0; padding-bottom: 6px; border-bottom: 3px solid #3498db; font-weight: 600;">PROFESSIONAL SUMMARY</h2>
                    <p style="font-size: 11px; line-height: 1.6; color: #333; margin: 0;">${data.summary}</p>
                </div>
                
                ${data.experience.length > 0 ? `
                <div style="margin-bottom: 30px;">
                    <h2 style="font-size: 16px; color: #2c3e50; margin: 0 0 15px 0; padding-bottom: 6px; border-bottom: 3px solid #3498db; font-weight: 600;">EXPERIENCE</h2>
                    ${data.experience.map(exp => `
                        <div style="margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <h3 style="font-size: 13px; color: #2c3e50; margin: 0; font-weight: 600;">${exp.title}</h3>
                                <span style="font-size: 10px; color: #666;">${exp.duration}</span>
                            </div>
                            <div style="font-size: 11px; color: #3498db; margin-bottom: 8px; font-weight: 500;">${exp.company}</div>
                            <div style="font-size: 11px; line-height: 1.6; color: #444;">${exp.description}</div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
                
                ${data.projects.length > 0 ? `
                <div style="margin-bottom: 30px;">
                    <h2 style="font-size: 16px; color: #2c3e50; margin: 0 0 15px 0; padding-bottom: 6px; border-bottom: 3px solid #3498db; font-weight: 600;">PROJECTS</h2>
                    ${data.projects.map(project => `
                        <div style="margin-bottom: 18px;">
                            <h3 style="font-size: 13px; color: #2c3e50; margin: 0 0 5px 0; font-weight: 600;">${project.name}</h3>
                            <div style="font-size: 10px; color: #3498db; margin-bottom: 6px; font-weight: 500;">${project.technologies}</div>
                            <div style="font-size: 11px; line-height: 1.6; color: #444;">${project.description}</div>
                            ${project.link ? `<div style="font-size: 10px; color: #3498db; margin-top: 4px;">${project.link}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
                ` : ''}
                
                ${data.certifications.filter(c => c.name).length > 0 ? `
                <div>
                    <h2 style="font-size: 16px; color: #2c3e50; margin: 0 0 15px 0; padding-bottom: 6px; border-bottom: 3px solid #3498db; font-weight: 600;">CERTIFICATIONS</h2>
                    ${data.certifications.filter(c => c.name).map(cert => `
                        <div style="margin-bottom: 12px; font-size: 11px;">
                            <div style="font-weight: 600; color: #2c3e50;">${cert.name}</div>
                            <div style="color: #666;">${cert.organization} • ${cert.year}</div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Professional Corporate Template
function createProfessionalTemplate(data) {
    return `
        <div style="font-family: 'Times New Roman', serif; width: 210mm; height: 297mm; padding: 25mm; margin: 0; background: white; color: #000;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #000; padding-bottom: 20px;">
                <h1 style="font-size: 32px; margin: 0 0 10px 0; font-weight: bold; letter-spacing: 1px;">${data.personal.fullName.toUpperCase()}</h1>
                <div style="font-size: 11px; line-height: 1.6;">
                    ${data.personal.email} | ${data.personal.phone} | ${data.personal.location}
                    ${data.personal.linkedin ? ' | ' + data.personal.linkedin : ''}
                    ${data.personal.portfolio ? ' | ' + data.personal.portfolio : ''}
                </div>
            </div>
            
            <!-- Professional Summary -->
            <div style="margin-bottom: 25px;">
                <h2 style="font-size: 14px; font-weight: bold; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Professional Summary</h2>
                <p style="font-size: 11px; line-height: 1.6; margin: 0; text-align: justify;">${data.summary}</p>
            </div>
            
            <!-- Skills -->
            <div style="margin-bottom: 25px;">
                <h2 style="font-size: 14px; font-weight: bold; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Core Competencies</h2>
                <div style="font-size: 11px; line-height: 1.8;">
                    ${data.skills.join(' • ')}
                </div>
            </div>
            
            <!-- Experience -->
            ${data.experience.length > 0 ? `
            <div style="margin-bottom: 25px;">
                <h2 style="font-size: 14px; font-weight: bold; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">Professional Experience</h2>
                ${data.experience.map(exp => `
                    <div style="margin-bottom: 18px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                            <h3 style="font-size: 12px; font-weight: bold; margin: 0;">${exp.title}</h3>
                            <span style="font-size: 11px; font-style: italic;">${exp.duration}</span>
                        </div>
                        <div style="font-size: 11px; font-weight: bold; margin-bottom: 6px;">${exp.company}</div>
                        <div style="font-size: 11px; line-height: 1.6; text-align: justify;">${exp.description}</div>
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            <!-- Projects -->
            ${data.projects.length > 0 ? `
            <div style="margin-bottom: 25px;">
                <h2 style="font-size: 14px; font-weight: bold; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">Key Projects</h2>
                ${data.projects.map(project => `
                    <div style="margin-bottom: 15px;">
                        <h3 style="font-size: 12px; font-weight: bold; margin: 0 0 3px 0;">${project.name}</h3>
                        <div style="font-size: 10px; font-style: italic; margin-bottom: 5px;">${project.technologies}</div>
                        <div style="font-size: 11px; line-height: 1.6; text-align: justify;">${project.description}</div>
                        ${project.link ? `<div style="font-size: 10px; margin-top: 3px;">${project.link}</div>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            <!-- Education -->
            ${data.education.length > 0 ? `
            <div style="margin-bottom: 25px;">
                <h2 style="font-size: 14px; font-weight: bold; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Education</h2>
                ${data.education.map(edu => `
                    <div style="margin-bottom: 12px; font-size: 11px;">
                        <div style="display: flex; justify-content: space-between;">
                            <strong>${edu.degree}</strong>
                            <span style="font-style: italic;">${edu.year}</span>
                        </div>
                        <div>${edu.institution}</div>
                        ${edu.grade ? `<div>${edu.grade}</div>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            <!-- Certifications -->
            ${data.certifications.filter(c => c.name).length > 0 ? `
            <div>
                <h2 style="font-size: 14px; font-weight: bold; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Certifications</h2>
                ${data.certifications.filter(c => c.name).map(cert => `
                    <div style="margin-bottom: 8px; font-size: 11px;">
                        <strong>${cert.name}</strong> - ${cert.organization}, ${cert.year}
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
    `;
}

// Creative Layout Template
function createCreativeTemplate(data) {
    return `
        <div style="font-family: 'Arial', sans-serif; width: 210mm; height: 297mm; margin: 0; padding: 0; background: white;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 35px 40px;">
                <h1 style="font-size: 36px; margin: 0 0 8px 0; font-weight: 700;">${data.personal.fullName}</h1>
                <div style="font-size: 12px; opacity: 0.95; line-height: 1.6;">
                    ${data.personal.email} • ${data.personal.phone} • ${data.personal.location}
                    ${data.personal.linkedin ? '<br>' + data.personal.linkedin : ''}
                    ${data.personal.portfolio ? ' • ' + data.personal.portfolio : ''}
                </div>
            </div>
            
            <!-- Two Column Layout -->
            <div style="display: flex; padding: 35px 40px;">
                <!-- Left Column -->
                <div style="width: 60%; padding-right: 30px;">
                    <!-- Summary -->
                    <div style="margin-bottom: 30px;">
                        <h2 style="font-size: 18px; color: #667eea; margin: 0 0 12px 0; font-weight: 700; border-left: 4px solid #667eea; padding-left: 12px;">ABOUT ME</h2>
                        <p style="font-size: 11px; line-height: 1.7; color: #333; margin: 0; text-align: justify;">${data.summary}</p>
                    </div>
                    
                    <!-- Experience -->
                    ${data.experience.length > 0 ? `
                    <div style="margin-bottom: 30px;">
                        <h2 style="font-size: 18px; color: #667eea; margin: 0 0 15px 0; font-weight: 700; border-left: 4px solid #667eea; padding-left: 12px;">EXPERIENCE</h2>
                        ${data.experience.map(exp => `
                            <div style="margin-bottom: 20px; position: relative; padding-left: 20px; border-left: 2px solid #e0e0e0;">
                                <div style="position: absolute; left: -6px; top: 3px; width: 10px; height: 10px; border-radius: 50%; background: #667eea;"></div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <h3 style="font-size: 13px; color: #333; margin: 0; font-weight: 700;">${exp.title}</h3>
                                    <span style="font-size: 10px; color: #fff; background: #667eea; padding: 3px 10px; border-radius: 12px;">${exp.duration}</span>
                                </div>
                                <div style="font-size: 12px; color: #764ba2; margin-bottom: 8px; font-weight: 600;">${exp.company}</div>
                                <div style="font-size: 11px; line-height: 1.6; color: #555;">${exp.description}</div>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                    
                    <!-- Projects -->
                    ${data.projects.length > 0 ? `
                    <div style="margin-bottom: 30px;">
                        <h2 style="font-size: 18px; color: #667eea; margin: 0 0 15px 0; font-weight: 700; border-left: 4px solid #667eea; padding-left: 12px;">PROJECTS</h2>
                        ${data.projects.map(project => `
                            <div style="margin-bottom: 18px; background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 3px solid #764ba2;">
                                <h3 style="font-size: 13px; color: #333; margin: 0 0 5px 0; font-weight: 700;">${project.name}</h3>
                                <div style="font-size: 10px; color: #764ba2; margin-bottom: 8px; font-weight: 600;">${project.technologies}</div>
                                <div style="font-size: 11px; line-height: 1.6; color: #555;">${project.description}</div>
                                ${project.link ? `<div style="font-size: 10px; color: #667eea; margin-top: 5px;">${project.link}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
                
                <!-- Right Column -->
                <div style="width: 40%;">
                    <!-- Skills -->
                    <div style="margin-bottom: 30px;">
                        <h2 style="font-size: 18px; color: #667eea; margin: 0 0 15px 0; font-weight: 700; border-left: 4px solid #667eea; padding-left: 12px;">SKILLS</h2>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${data.skills.map(skill => `
                                <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 6px 12px; border-radius: 15px; font-size: 10px; font-weight: 600;">${skill}</span>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Education -->
                    ${data.education.length > 0 ? `
                    <div style="margin-bottom: 30px;">
                        <h2 style="font-size: 18px; color: #667eea; margin: 0 0 15px 0; font-weight: 700; border-left: 4px solid #667eea; padding-left: 12px;">EDUCATION</h2>
                        ${data.education.map(edu => `
                            <div style="margin-bottom: 15px; background: #f8f9fa; padding: 12px; border-radius: 6px;">
                                <div style="font-weight: 700; font-size: 12px; color: #333; margin-bottom: 5px;">${edu.degree}</div>
                                <div style="font-size: 11px; color: #555; margin-bottom: 3px;">${edu.institution}</div>
                                <div style="font-size: 10px; color: #764ba2; font-weight: 600;">${edu.year}</div>
                                ${edu.grade ? `<div style="font-size: 10px; color: #667eea; margin-top: 3px;">${edu.grade}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                    
                    <!-- Certifications -->
                    ${data.certifications.filter(c => c.name).length > 0 ? `
                    <div>
                        <h2 style="font-size: 18px; color: #667eea; margin: 0 0 15px 0; font-weight: 700; border-left: 4px solid #667eea; padding-left: 12px;">CERTIFICATIONS</h2>
                        ${data.certifications.filter(c => c.name).map(cert => `
                            <div style="margin-bottom: 12px; font-size: 11px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                                <div style="font-weight: 700; color: #333; margin-bottom: 3px;">${cert.name}</div>
                                <div style="font-size: 10px; color: #555;">${cert.organization}</div>
                                <div style="font-size: 10px; color: #764ba2; font-weight: 600;">${cert.year}</div>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

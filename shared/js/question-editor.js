/**
 * Shared Question Editor Logic
 * Used by question-bank.html and quiz-questions.html
 * 
 * Requires:
 * - auth_tracking.js (for API_BASE and getAuthToken)
 * - question-editor-modal.html (injected into the page)
 */

// Configuration object - can be overridden by consuming page
window.QuestionEditorConfig = {
    quizId: null, // If set, new questions are linked to this quiz
    onSaveSuccess: null // Callback after save
};

// Global state for the editor
let currentEditId = null;
let questionVariables = {};
let questionCharts = {};
let currentEditVarName = null;
let currentEditChartId = null;

// Show create modal
function showCreateModal() {
    document.getElementById('modalTitle').textContent = 'Add Question';
    document.getElementById('questionForm').reset();
    
    // Hide warning
    const warningEl = document.getElementById('editWarning');
    if (warningEl) warningEl.style.display = 'none';
    
    currentEditId = null;
    questionVariables = {};
    questionCharts = {};
    
    // Reset dynamic sections
    document.getElementById('answerConfigSection').innerHTML = 
        '<p style="color: var(--gray-600); text-align: center; font-style: italic;">Select a question type to configure answers.</p>';
    updateVariablesList();
    updateChartsList();
    
    document.getElementById('questionModal').classList.add('active');
}

// Edit question
async function editQuestion(questionId) {
    try {
        // Use new API endpoint
        const response = await fetch(`${API_BASE}/quiz-questions/${questionId}/`, {
            headers: {'Authorization': `Token ${getAuthToken()}`}
        });
        
        if (!response.ok) throw new Error('Failed to load question');
        
        const data = await response.json();
        // Handle both wrapped and unwrapped responses
        const question = data.question || data;
        
        currentEditId = question.id;
        
        // Show warning if used elsewhere
        const warningEl = document.getElementById('editWarning');
        const usageListEl = document.getElementById('usageList');
        const usageCountEl = document.getElementById('usageCount');
        
        if (warningEl && usageListEl && usageCountEl) {
            const quizzes = question.usage_in_quizzes || [];
            const templates = question.usage_in_templates || [];
            const totalUsage = quizzes.length + templates.length;
            
            if (totalUsage > 0) {
                usageCountEl.textContent = totalUsage;
                usageListEl.innerHTML = '';
                
                quizzes.forEach(q => {
                    const li = document.createElement('li');
                    li.textContent = `Quiz: ${q.title}`;
                    usageListEl.appendChild(li);
                });
                
                templates.forEach(t => {
                    const li = document.createElement('li');
                    li.textContent = `Template: ${t.name}`;
                    usageListEl.appendChild(li);
                });
                
                warningEl.style.display = 'block';
            } else {
                warningEl.style.display = 'none';
            }
        }
        
        document.getElementById('modalTitle').textContent = `Edit Question (Edited ${question.edit_count || 0} times)`;
        document.getElementById('questionType').value = question.question_type;
        document.getElementById('questionText').value = question.question_text;
        document.getElementById('instruction').value = question.instruction || '';
        document.getElementById('imageUrl').value = question.image_url || '';
        document.getElementById('feedbackCorrect').value = question.feedback_correct || '';
        document.getElementById('feedbackIncorrect').value = question.feedback_incorrect || '';
        document.getElementById('difficulty').value = question.difficulty || 'medium';
        document.getElementById('tags').value = Array.isArray(question.tags) ? question.tags.join(', ') : (question.tags || '');
        document.getElementById('visibility').value = question.visibility || 'private';
        
        // Load variables
        if (question.answer_config && question.answer_config.variables) {
            questionVariables = question.answer_config.variables;
        } else {
            questionVariables = {};
        }
        updateVariablesList();
        
        // Load charts
        if (question.answer_config && question.answer_config.charts) {
            questionCharts = question.answer_config.charts;
        } else {
            questionCharts = {};
        }
        updateChartsList();
        
        // Render answer config fields
        handleTypeChange();
        
        // Populate answer config fields
        populateAnswerConfig(question.question_type, question.answer_config);
        
        document.getElementById('questionModal').classList.add('active');
    } catch (error) {
        console.error('Error loading question:', error);
        if (typeof showToast === 'function') showToast('Failed to load question', 'error');
        else alert('Failed to load question');
    }
}

// Save question
async function saveQuestion(event) {
    event.preventDefault();
    
    const questionData = {
        question_type: document.getElementById('questionType').value,
        question_text: document.getElementById('questionText').value,
        instruction: document.getElementById('instruction').value,
        image_url: document.getElementById('imageUrl').value,
        feedback_correct: document.getElementById('feedbackCorrect').value,
        feedback_incorrect: document.getElementById('feedbackIncorrect').value,
        tool: document.getElementById('tool').value || null,
        difficulty: document.getElementById('difficulty').value,
        tags: document.getElementById('tags').value.split(',').map(t => t.trim()).filter(t => t),
        visibility: document.getElementById('visibility').value,
        answer_config: buildAnswerConfig()
    };

    try {
        let response;
        if (currentEditId) {
            // Update existing question
            response = await fetch(`${API_BASE}/quiz-questions/${currentEditId}/update/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${getAuthToken()}`
                },
                body: JSON.stringify(questionData)
            });
        } else {
            // Create new question
            response = await fetch(`${API_BASE}/quiz-questions/create/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${getAuthToken()}`
                },
                body: JSON.stringify(questionData)
            });
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || error.error || 'Failed to save question');
        }

        const savedQuestion = await response.json();

        // If it was a new question AND we have a quizId configured, link it
        if (!currentEditId && window.QuestionEditorConfig.quizId) {
            const linkResponse = await fetch(`${API_BASE}/quiz/${window.QuestionEditorConfig.quizId}/questions/add/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${getAuthToken()}`
                },
                body: JSON.stringify({ question_id: savedQuestion.id })
            });
            
            if (!linkResponse.ok) {
                console.error('Question created but failed to link to quiz');
            }
        }

        closeModal();
        
        if (typeof showToast === 'function') {
            showToast(currentEditId ? 'Question updated successfully' : 'Question created successfully', 'success');
        }

        // Callback
        if (typeof window.QuestionEditorConfig.onSaveSuccess === 'function') {
            window.QuestionEditorConfig.onSaveSuccess(savedQuestion);
        } else if (typeof loadQuestions === 'function') {
            // Fallback to global loadQuestions if available
            await loadQuestions();
        }

    } catch (error) {
        console.error('Error saving question:', error);
        if (typeof showToast === 'function') showToast(`Error: ${error.message}`, 'error');
        else alert(`Error: ${error.message}`);
    }
}

function closeModal() {
    document.getElementById('questionModal').classList.remove('active');
}

async function deleteQuestion(id) {
    if (!confirm('Are you sure you want to delete this question?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/quiz-questions/${id}/delete/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Token ${getAuthToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to delete question');
        
        if (typeof showToast === 'function') showToast('Question deleted successfully', 'success');
        
        // Callback or reload
        if (typeof loadQuestions === 'function') {
            await loadQuestions();
        }
    } catch (error) {
        console.error('Error deleting question:', error);
        if (typeof showToast === 'function') showToast('Failed to delete question', 'error');
    }
}

// Handle question type change
function handleTypeChange() {
    const type = document.getElementById('questionType').value;
    const section = document.getElementById('answerConfigSection');
    
    if (!type) {
        section.innerHTML = '<p style="color: var(--gray-600); text-align: center; font-style: italic;">Select a question type to configure answers.</p>';
        return;
    }

    // Generate appropriate answer config UI based on type
    if (type === 'multiple_choice' || type === 'select_all') {
        section.innerHTML = `
            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="checkbox" id="useDynamicCorrectness" onchange="toggleDynamicCorrectness()" style="margin: 0;">
                    <span>Use Dynamic Correctness (based on variables)</span>
                </label>
                <small style="display: block; margin-top: 0.5rem; color: var(--gray-600);">
                    Enable this to make correctness conditional on variable values.
                    <a href="#" onclick="toggleDynamicCorrectnessHelp(); return false;" style="margin-left: 0.5rem;">
                        <i class="fas fa-question-circle"></i> Learn More
                    </a>
                </small>
                <div id="dynamicCorrectnessHelp" style="display: none; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 4px; padding: 1rem; margin-top: 0.5rem;">
                    <strong>Dynamic Correctness Examples:</strong>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                        <li><code>{{this}} == {{max_sales}}</code> - Option is correct if it equals max_sales</li>
                        <li><code>{{this}} > {{threshold}}</code> - Option is correct if greater than threshold</li>
                    </ul>
                </div>
            </div>
            
            <div class="form-group">
                <label>Answer Options*</label>
                <div id="optionsList" class="answer-options">
                    <div class="option-item">
                        <input type="text" placeholder="Option 1" required>
                        <input type="checkbox" title="Correct answer" class="static-correctness">
                        <input type="text" placeholder="Condition (e.g., {{this}} == {{max}})" class="dynamic-correctness" style="display: none;">
                        <button type="button" class="btn btn-sm btn-secondary" onclick="removeOption(this)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="option-item">
                        <input type="text" placeholder="Option 2" required>
                        <input type="checkbox" title="Correct answer" class="static-correctness">
                        <input type="text" placeholder="Condition (e.g., {{this}} == {{max}})" class="dynamic-correctness" style="display: none;">
                        <button type="button" class="btn btn-sm btn-secondary" onclick="removeOption(this)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <button type="button" class="btn btn-sm btn-secondary btn-add-option" onclick="addOption()">
                    <i class="fas fa-plus"></i> Add Option
                </button>
            </div>
        `;
    } else if (type === 'numeric') {
        section.innerHTML = `
            <div class="form-group">
                <label>Correct Answer*</label>
                <input type="number" id="numericAnswer" step="any" required placeholder="Enter correct answer">
            </div>
            <div class="form-group">
                <label>Tolerance (±)</label>
                <input type="number" id="numericTolerance" step="any" placeholder="0.01">
            </div>
        `;
    } else if (type === 'fill_blank') {
        section.innerHTML = `
            <div class="form-group">
                <label>Acceptable Answers (comma-separated)*</label>
                <input type="text" id="fillBlankAnswers" required placeholder="answer1, answer2, answer3">
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="caseSensitive">
                    Case sensitive
                </label>
            </div>
        `;
    } else if (type === 'written') {
        section.innerHTML = `
            <div class="form-group">
                <label>Keywords for Auto-Grading (optional, comma-separated)</label>
                <input type="text" id="writtenKeywords" placeholder="keyword1, keyword2, keyword3">
                <small>Leave empty for manual grading only</small>
            </div>
        `;
    } else if (type === 'reorder') {
        section.innerHTML = `
            <div class="form-group">
                <label>Items to Reorder* (students will drag these into correct order)</label>
                <div id="reorderList" class="answer-options">
                    <div class="option-item">
                        <input type="text" placeholder="First item (in correct order)" required>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="removeOption(this)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="option-item">
                        <input type="text" placeholder="Second item (in correct order)" required>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="removeOption(this)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <button type="button" class="btn btn-sm btn-secondary btn-add-option" onclick="addReorderItem()">
                    <i class="fas fa-plus"></i> Add Item
                </button>
            </div>
        `;
    } else if (type === 'matching') {
        section.innerHTML = `
            <div class="form-group">
                <label>Matching Pairs* (left items will be matched to right items)</label>
                <div id="matchingList" class="answer-options">
                    <div class="option-item" style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.5rem;">
                        <input type="text" placeholder="Left item" required>
                        <input type="text" placeholder="Right item" required>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="removeOption(this)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="option-item" style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.5rem;">
                        <input type="text" placeholder="Left item" required>
                        <input type="text" placeholder="Right item" required>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="removeOption(this)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <button type="button" class="btn btn-sm btn-secondary btn-add-option" onclick="addMatchingPair()">
                    <i class="fas fa-plus"></i> Add Pair
                </button>
            </div>
        `;
    }
}

function addOption() {
    const list = document.getElementById('optionsList');
    const count = list.children.length + 1;
    const isDynamic = document.getElementById('useDynamicCorrectness')?.checked || false;
    
    const div = document.createElement('div');
    div.className = 'option-item';
    div.innerHTML = `
        <input type="text" placeholder="Option ${count}" required>
        <input type="checkbox" title="Correct answer" class="static-correctness" style="${isDynamic ? 'display: none;' : ''}">
        <input type="text" placeholder="Condition (e.g., {{this}} == {{max}})" class="dynamic-correctness" style="${isDynamic ? '' : 'display: none;'}">
        <button type="button" class="btn btn-sm btn-secondary" onclick="removeOption(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    list.appendChild(div);
}

function toggleDynamicCorrectness() {
    const isDynamic = document.getElementById('useDynamicCorrectness').checked;
    const staticInputs = document.querySelectorAll('.static-correctness');
    const dynamicInputs = document.querySelectorAll('.dynamic-correctness');
    
    staticInputs.forEach(input => {
        input.style.display = isDynamic ? 'none' : '';
    });
    
    dynamicInputs.forEach(input => {
        input.style.display = isDynamic ? '' : 'none';
    });
}

function toggleDynamicCorrectnessHelp() {
    const help = document.getElementById('dynamicCorrectnessHelp');
    help.style.display = help.style.display === 'none' ? 'block' : 'none';
}

function removeOption(btn) {
    btn.parentElement.remove();
}

function addReorderItem() {
    const list = document.getElementById('reorderList');
    const count = list.children.length + 1;
    const div = document.createElement('div');
    div.className = 'option-item';
    div.innerHTML = `
        <input type="text" placeholder="Item ${count} (in correct order)" required>
        <button type="button" class="btn btn-sm btn-secondary" onclick="removeOption(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    list.appendChild(div);
}

function addMatchingPair() {
    const list = document.getElementById('matchingList');
    const div = document.createElement('div');
    div.className = 'option-item';
    div.style.display = 'grid';
    div.style.gridTemplateColumns = '1fr 1fr auto';
    div.style.gap = '0.5rem';
    div.innerHTML = `
        <input type="text" placeholder="Left item" required>
        <input type="text" placeholder="Right item" required>
        <button type="button" class="btn btn-sm btn-secondary" onclick="removeOption(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    list.appendChild(div);
}

// Build answer config based on question type
function buildAnswerConfig() {
    const type = document.getElementById('questionType').value;
    let config = {};
    
    if (type === 'multiple_choice' || type === 'select_all') {
        const options = [];
        const optionItems = document.querySelectorAll('#optionsList .option-item');
        const isDynamic = document.getElementById('useDynamicCorrectness')?.checked || false;
        
        optionItems.forEach((item, index) => {
            const textInput = item.querySelector('input[type="text"]');
            const text = textInput ? textInput.value : '';
            
            if (text) {
                const option = {
                    text,
                    order: index
                };
                
                if (isDynamic) {
                    const conditionInput = item.querySelector('.dynamic-correctness');
                    const condition = conditionInput ? conditionInput.value.trim() : '';
                    if (condition) {
                        option.correctness_condition = condition;
                    }
                } else {
                    const checkbox = item.querySelector('.static-correctness');
                    option.is_correct = checkbox ? checkbox.checked : false;
                }
                
                options.push(option);
            }
        });
        config.options = options;
    } else if (type === 'numeric') {
        config.correct_answer = parseFloat(document.getElementById('numericAnswer').value);
        config.tolerance = parseFloat(document.getElementById('numericTolerance').value || 0);
    } else if (type === 'fill_blank') {
        config.acceptable_answers = document.getElementById('fillBlankAnswers').value
            .split(',').map(a => a.trim()).filter(a => a);
        config.case_sensitive = document.getElementById('caseSensitive')?.checked || false;
    } else if (type === 'written') {
        const keywords = document.getElementById('writtenKeywords')?.value || '';
        config.keywords = keywords.split(',').map(k => k.trim()).filter(k => k);
    } else if (type === 'reorder') {
        const items = [];
        const itemElements = document.querySelectorAll('#reorderList .option-item input[type="text"]');
        itemElements.forEach((input) => {
            if (input.value.trim()) {
                items.push(input.value.trim());
            }
        });
        config.correct_order = items;
        config.options = items.map(item => ({ text: item }));
    } else if (type === 'matching') {
        const pairs = [];
        const pairElements = document.querySelectorAll('#matchingList .option-item');
        pairElements.forEach((item) => {
            const inputs = item.querySelectorAll('input[type="text"]');
            if (inputs.length >= 2 && inputs[0].value.trim() && inputs[1].value.trim()) {
                pairs.push({
                    left: inputs[0].value.trim(),
                    right: inputs[1].value.trim()
                });
            }
        });
        config.matching_pairs = pairs;
    }
    
    if (Object.keys(questionVariables).length > 0) {
        config.variables = questionVariables;
    }
    
    if (Object.keys(questionCharts).length > 0) {
        config.charts = questionCharts;
    }
    
    return config;
}

// Populate answer config into form (for editing)
function populateAnswerConfig(type, config) {
    if (!config) return;
    
    // Wait for handleTypeChange to render the form
    setTimeout(() => {
        if (type === 'multiple_choice' || type === 'select_all') {
            if (config.options) {
                const hasDynamicCorrectness = config.options.some(opt => opt.correctness_condition);
                const dynamicCheckbox = document.getElementById('useDynamicCorrectness');
                if (dynamicCheckbox) {
                    dynamicCheckbox.checked = hasDynamicCorrectness;
                    toggleDynamicCorrectness();
                }
                
                const optionsList = document.getElementById('optionsList');
                optionsList.innerHTML = '';
                
                config.options.forEach((opt, idx) => {
                    const div = document.createElement('div');
                    div.className = 'option-item';
                    
                    div.innerHTML = `
                        <input type="text" placeholder="Option ${idx+1}" value="${opt.text}" required>
                        <input type="checkbox" title="Correct answer" class="static-correctness" ${opt.is_correct ? 'checked' : ''} style="${hasDynamicCorrectness ? 'display: none;' : ''}">
                        <input type="text" placeholder="Condition" value="${opt.correctness_condition || ''}" class="dynamic-correctness" style="${hasDynamicCorrectness ? '' : 'display: none;'}">
                        <button type="button" class="btn btn-sm btn-secondary" onclick="removeOption(this)">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    optionsList.appendChild(div);
                });
            }
        } else if (type === 'numeric') {
            if (config.correct_answer !== undefined) document.getElementById('numericAnswer').value = config.correct_answer;
            if (config.tolerance !== undefined) document.getElementById('numericTolerance').value = config.tolerance;
        } else if (type === 'fill_blank') {
            if (config.acceptable_answers) document.getElementById('fillBlankAnswers').value = config.acceptable_answers.join(', ');
            if (config.case_sensitive !== undefined) document.getElementById('caseSensitive').checked = config.case_sensitive;
        } else if (type === 'written') {
            if (config.keywords) document.getElementById('writtenKeywords').value = config.keywords.join(', ');
        } else if (type === 'reorder') {
            if (config.correct_order) {
                const list = document.getElementById('reorderList');
                list.innerHTML = '';
                config.correct_order.forEach((item, idx) => {
                    const div = document.createElement('div');
                    div.className = 'option-item';
                    div.innerHTML = `
                        <input type="text" placeholder="Item ${idx+1}" value="${item}" required>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="removeOption(this)">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    list.appendChild(div);
                });
            }
        } else if (type === 'matching') {
            if (config.matching_pairs) {
                const list = document.getElementById('matchingList');
                list.innerHTML = '';
                config.matching_pairs.forEach((pair) => {
                    const div = document.createElement('div');
                    div.className = 'option-item';
                    div.style.display = 'grid';
                    div.style.gridTemplateColumns = '1fr 1fr auto';
                    div.style.gap = '0.5rem';
                    div.innerHTML = `
                        <input type="text" placeholder="Left item" value="${pair.left}" required>
                        <input type="text" placeholder="Right item" value="${pair.right}" required>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="removeOption(this)">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    list.appendChild(div);
                });
            }
        }
    }, 100);
}

// ========================================================================
// VARIABLE SYSTEM
// ========================================================================

function toggleVariableHelp(event) {
    const helpBox = document.getElementById('variableHelpBox');
    const toggleText = document.getElementById('helpToggleText');
    const isHidden = helpBox.style.display === 'none';
    
    helpBox.style.display = isHidden ? 'block' : 'none';
    toggleText.textContent = isHidden ? 'Hide' : 'Show';
    
    const btn = event.target.closest('button');
    const icon = btn.querySelector('i');
    icon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
}

function showAddVariableModal() {
    currentEditVarName = null;
    document.getElementById('variableModalTitle').textContent = 'Add Variable';
    document.getElementById('varName').value = '';
    document.getElementById('varName').disabled = false;
    document.getElementById('varType').value = '';
    document.getElementById('varTypeConfig').innerHTML = '';
    document.getElementById('variableModal').classList.add('active');
}

function closeVariableModal() {
    document.getElementById('variableModal').classList.remove('active');
    currentEditVarName = null;
}

function handleVarTypeChange() {
    const type = document.getElementById('varType').value;
    const configSection = document.getElementById('varTypeConfig');
    
    if (!type) {
        configSection.innerHTML = '';
        return;
    }

    if (type === 'uniform') {
        configSection.innerHTML = `
            <div class="form-group">
                <label>Minimum Value*</label>
                <input type="number" id="varMin" step="any" required placeholder="e.g., 1">
            </div>
            <div class="form-group">
                <label>Maximum Value*</label>
                <input type="number" id="varMax" step="any" required placeholder="e.g., 100">
            </div>
            <div class="form-group">
                <label>Decimal Places</label>
                <input type="number" id="varDecimals" min="0" max="10" value="0" placeholder="0 for integers">
            </div>
        `;
    } else if (type === 'discrete') {
        configSection.innerHTML = `
            <div class="form-group">
                <label>Values (one per line)*</label>
                <textarea id="varValues" required placeholder="Nike\nAdidas\nPuma" style="min-height: 120px;"></textarea>
            </div>
        `;
    } else if (type === 'array') {
        configSection.innerHTML = `
            <div class="form-group">
                <label>Data Matrix*</label>
                <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="addArrayRow()">
                        <i class="fas fa-plus"></i> Row
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="addArrayCol()">
                        <i class="fas fa-plus"></i> Column
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="pasteArrayData()">
                        <i class="fas fa-paste"></i> Paste CSV
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="clearArrayData()">
                        <i class="fas fa-trash"></i> Clear
                    </button>
                </div>
                <div id="arrayTableContainer" style="overflow-x: auto; border: 1px solid var(--gray-300); border-radius: 4px; padding: 0.5rem; background: white;">
                    <table id="arrayDataTable" style="border-collapse: collapse;">
                        <thead>
                            <tr id="arrayHeaderRow">
                                <th style="padding: 0.5rem; border: 1px solid var(--gray-300); background: var(--gray-100); min-width: 60px;">Row</th>
                                <th style="padding: 0.5rem; border: 1px solid var(--gray-300); background: var(--gray-100); min-width: 100px;">Col 0</th>
                                <th style="padding: 0.5rem; border: 1px solid var(--gray-300); background: var(--gray-100); min-width: 100px;">Col 1</th>
                                <th style="padding: 0.5rem; border: 1px solid var(--gray-300); background: var(--gray-100); min-width: 100px;">Col 2</th>
                            </tr>
                        </thead>
                        <tbody id="arrayDataBody">
                            <tr>
                                <td style="padding: 0.5rem; border: 1px solid var(--gray-300); background: var(--gray-100); font-weight: bold;">0</td>
                                <td style="padding: 0; border: 1px solid var(--gray-300);"><input type="text" class="array-cell" data-row="0" data-col="0" style="width: 100%; border: none; padding: 0.5rem;"></td>
                                <td style="padding: 0; border: 1px solid var(--gray-300);"><input type="text" class="array-cell" data-row="0" data-col="1" style="width: 100%; border: none; padding: 0.5rem;"></td>
                                <td style="padding: 0; border: 1px solid var(--gray-300);"><input type="text" class="array-cell" data-row="0" data-col="2" style="width: 100%; border: none; padding: 0.5rem;"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } else if (type === 'formula_calculate' || type === 'formula_display') {
        const isCalculate = type === 'formula_calculate';
        configSection.innerHTML = `
            <div class="form-group">
                <label>Formula Expression*</label>
                <input type="text" id="varExpression" required placeholder="e.g., {{B0}} + {{B1}} * {{X}}">
            </div>
            ${isCalculate ? `
                <div class="form-group">
                    <label>Decimal Places</label>
                    <input type="number" id="varDecimals" min="0" max="10" value="2" placeholder="2">
                </div>
            ` : ''}
        `;
    }
}

function saveVariable(event) {
    event.preventDefault();
    
    const varName = document.getElementById('varName').value.trim();
    const varType = document.getElementById('varType').value;
    
    let varDef = { type: varType.replace('formula_', '') };
    
    if (varType === 'uniform') {
        varDef.min = parseFloat(document.getElementById('varMin').value);
        varDef.max = parseFloat(document.getElementById('varMax').value);
        varDef.decimals = parseInt(document.getElementById('varDecimals').value);
    } else if (varType === 'discrete') {
        varDef.values = document.getElementById('varValues').value.split('\n').map(v => v.trim()).filter(v => v);
    } else if (varType === 'array') {
        varDef.data = getArrayDataFromTable();
    } else if (varType === 'formula_calculate' || varType === 'formula_display') {
        varDef.expression = document.getElementById('varExpression').value.trim();
        varDef.mode = varType === 'formula_calculate' ? 'calculate' : 'display';
        if (varType === 'formula_calculate') {
            varDef.decimals = parseInt(document.getElementById('varDecimals').value);
        }
    }
    
    if (currentEditVarName && currentEditVarName !== varName) {
        delete questionVariables[currentEditVarName];
    }
    
    questionVariables[varName] = varDef;
    updateVariablesList();
    closeVariableModal();
}

function updateVariablesList() {
    const container = document.getElementById('variablesList');
    
    if (Object.keys(questionVariables).length === 0) {
        container.innerHTML = '<p style="color: var(--gray-700); font-style: italic;">No variables defined yet. Click "Add Variable" to create one.</p>';
        return;
    }
    
    container.innerHTML = Object.entries(questionVariables).map(([name, def]) => `
        <div style="background: var(--gray-50); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; border-left: 4px solid var(--primary);">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <strong>{{${name}}}</strong>
                    <span style="background: var(--primary); color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">${def.type}</span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="editVariable('${name}')"><i class="fas fa-edit"></i></button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="deleteVariable('${name}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

function editVariable(varName) {
    currentEditVarName = varName;
    const varDef = questionVariables[varName];
    
    document.getElementById('variableModalTitle').textContent = 'Edit Variable';
    document.getElementById('varName').value = varName;
    document.getElementById('varName').disabled = true;
    
    let typeValue = varDef.type;
    if (typeValue === 'formula') {
        typeValue = varDef.mode === 'calculate' ? 'formula_calculate' : 'formula_display';
    }
    
    document.getElementById('varType').value = typeValue;
    handleVarTypeChange();
    
    if (varDef.type === 'uniform') {
        document.getElementById('varMin').value = varDef.min;
        document.getElementById('varMax').value = varDef.max;
        document.getElementById('varDecimals').value = varDef.decimals;
    } else if (varDef.type === 'discrete') {
        document.getElementById('varValues').value = varDef.values.join('\n');
    } else if (varDef.type === 'array') {
        setTimeout(() => loadArrayDataIntoTable(varDef.data), 100);
    } else if (varDef.type === 'formula') {
        document.getElementById('varExpression').value = varDef.expression;
        if (varDef.mode === 'calculate') {
            document.getElementById('varDecimals').value = varDef.decimals;
        }
    }
    
    document.getElementById('variableModal').classList.add('active');
}

function deleteVariable(varName) {
    if (confirm(`Delete variable {{${varName}}}?`)) {
        delete questionVariables[varName];
        updateVariablesList();
    }
}

// Array helpers
function addArrayRow() {
    const tbody = document.getElementById('arrayDataBody');
    const currentRows = tbody.querySelectorAll('tr').length;
    const currentCols = document.querySelectorAll('#arrayHeaderRow th').length - 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="padding: 0.5rem; border: 1px solid var(--gray-300); background: var(--gray-100); font-weight: bold;">${currentRows}</td>
        ${Array.from({length: currentCols}, (_, colIdx) => `
            <td style="padding: 0; border: 1px solid var(--gray-300);">
                <input type="text" class="array-cell" data-row="${currentRows}" data-col="${colIdx}" style="width: 100%; border: none; padding: 0.5rem;">
            </td>
        `).join('')}
    `;
    tbody.appendChild(tr);
}

function addArrayCol() {
    const headerRow = document.getElementById('arrayHeaderRow');
    const currentCols = headerRow.querySelectorAll('th').length - 1;
    const th = document.createElement('th');
    th.style.cssText = 'padding: 0.5rem; border: 1px solid var(--gray-300); background: var(--gray-100); min-width: 100px;';
    th.textContent = `Col ${currentCols}`;
    headerRow.appendChild(th);
    
    const tbody = document.getElementById('arrayDataBody');
    tbody.querySelectorAll('tr').forEach((tr, rowIdx) => {
        const td = document.createElement('td');
        td.style.cssText = 'padding: 0; border: 1px solid var(--gray-300);';
        td.innerHTML = `<input type="text" class="array-cell" data-row="${rowIdx}" data-col="${currentCols}" style="width: 100%; border: none; padding: 0.5rem;">`;
        tr.appendChild(td);
    });
}

function pasteArrayData() {
    const data = prompt('Paste data from Excel or CSV (tab or comma separated):');
    if (!data) return;
    const rows = data.trim().split('\n');
    const parsedData = rows.map(row => row.includes('\t') ? row.split('\t') : row.split(','));
    loadArrayDataIntoTable(parsedData);
}

function clearArrayData() {
    if (!confirm('Clear all array data?')) return;
    document.getElementById('arrayDataBody').innerHTML = '';
    addArrayRow(); // Add one empty row
}

function getArrayDataFromTable() {
    const tbody = document.getElementById('arrayDataBody');
    const rows = tbody.querySelectorAll('tr');
    const data = [];
    rows.forEach(tr => {
        const inputs = tr.querySelectorAll('.array-cell');
        const rowData = [];
        inputs.forEach(input => rowData.push(input.value.trim()));
        if (rowData.some(v => v)) data.push(rowData);
    });
    return data;
}

function loadArrayDataIntoTable(data) {
    if (!data || data.length === 0) return;
    const rows = data.length;
    const cols = Math.max(...data.map(row => row.length));
    
    const headerRow = document.getElementById('arrayHeaderRow');
    headerRow.innerHTML = '<th style="padding: 0.5rem; border: 1px solid var(--gray-300); background: var(--gray-100); min-width: 60px;">Row</th>';
    for (let c = 0; c < cols; c++) {
        const th = document.createElement('th');
        th.style.cssText = 'padding: 0.5rem; border: 1px solid var(--gray-300); background: var(--gray-100); min-width: 100px;';
        th.textContent = `Col ${c}`;
        headerRow.appendChild(th);
    }
    
    const tbody = document.getElementById('arrayDataBody');
    tbody.innerHTML = '';
    for (let r = 0; r < rows; r++) {
        const tr = document.createElement('tr');
        const labelTd = document.createElement('td');
        labelTd.style.cssText = 'padding: 0.5rem; border: 1px solid var(--gray-300); background: var(--gray-100); font-weight: bold;';
        labelTd.textContent = r;
        tr.appendChild(labelTd);
        
        for (let c = 0; c < cols; c++) {
            const td = document.createElement('td');
            td.style.cssText = 'padding: 0; border: 1px solid var(--gray-300);';
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'array-cell';
            input.setAttribute('data-row', r);
            input.setAttribute('data-col', c);
            input.style.cssText = 'width: 100%; border: none; padding: 0.5rem;';
            input.value = data[r][c] || '';
            td.appendChild(input);
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
}

function previewVariables() {
    if (Object.keys(questionVariables).length === 0) {
        alert('No variables defined yet.');
        return;
    }
    const sampleValues = generateSampleVariables();
    alert(`PREVIEW WITH SAMPLE VALUES:\n\n${JSON.stringify(sampleValues, null, 2)}`);
}

function generateSampleVariables() {
    const values = {};
    const formulas = [];

    // 1. Generate base values (Uniform, Discrete)
    for (const [name, def] of Object.entries(questionVariables)) {
        if (def.type === 'uniform') {
            const range = def.max - def.min;
            const value = def.min + Math.random() * range;
            values[name] = def.decimals === 0 ? Math.round(value) : parseFloat(value.toFixed(def.decimals));
        } else if (def.type === 'discrete') {
            values[name] = def.values[Math.floor(Math.random() * def.values.length)];
        } else if (def.type === 'formula') {
            formulas.push({ name, def });
        }
    }

    // 2. Evaluate formulas (simple multi-pass to handle dependencies)
    let lastRemaining = formulas.length + 1;
    while (formulas.length > 0 && formulas.length < lastRemaining) {
        lastRemaining = formulas.length;
        const nextFormulas = [];

        for (const item of formulas) {
            try {
                // Create a function with variables as arguments
                const varNames = Object.keys(values);
                const varValues = Object.values(values);
                
                // Safe-ish evaluation using Function constructor
                // Note: This is client-side preview only. Backend has strict security.
                const formulaFn = new Function(...varNames, `return ${item.def.formula};`);
                const result = formulaFn(...varValues);
                
                if (item.def.mode === 'display') {
                    values[item.name] = result; // Keep as string/whatever
                } else {
                    // Calculate mode - ensure number
                    const numResult = parseFloat(result);
                    values[item.name] = item.def.decimals === 0 ? Math.round(numResult) : parseFloat(numResult.toFixed(item.def.decimals));
                }
            } catch (e) {
                // Dependency might be missing, try next pass
                nextFormulas.push(item);
            }
        }
        formulas.length = 0;
        formulas.push(...nextFormulas);
    }

    return values;
}

// ========================================================================
// CHART SYSTEM
// ========================================================================

function toggleChartHelp(event) {
    const helpBox = document.getElementById('chartHelpBox');
    const toggleText = document.getElementById('chartHelpToggleText');
    const isHidden = helpBox.style.display === 'none';
    helpBox.style.display = isHidden ? 'block' : 'none';
    toggleText.textContent = isHidden ? 'Hide' : 'Show';
    const btn = event.target.closest('button');
    const icon = btn.querySelector('i');
    icon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
}

function showAddChartModal() {
    currentEditChartId = null;
    document.getElementById('chartModalTitle').textContent = 'Add Chart';
    document.getElementById('chartId').value = '';
    document.getElementById('chartId').disabled = false;
    document.getElementById('chartType').value = '';
    document.getElementById('chartTitle').value = '';
    document.getElementById('chartDataConfig').innerHTML = '';
    document.getElementById('chartModal').classList.add('active');
}

function closeChartModal() {
    document.getElementById('chartModal').classList.remove('active');
    currentEditChartId = null;
}

function handleChartTypeChange() {
    const type = document.getElementById('chartType').value;
    const config = document.getElementById('chartDataConfig');
    
    if (type === 'bar') {
        config.innerHTML = `
            <div class="form-group">
                <label>Category Labels* (comma-separated)</label>
                <input type="text" id="chartLabels" required placeholder="Q1, Q2, Q3, Q4">
            </div>
            <div class="form-group">
                <label>Data Values* (comma-separated)</label>
                <input type="text" id="chartData" required placeholder="{{sales_q1}}, {{sales_q2}}">
            </div>
            <div class="form-group">
                <label>Bar Color</label>
                <input type="color" id="chartColor" value="#3b82f6">
            </div>
        `;
    } else if (type === 'multibar') {
        config.innerHTML = `
            <div class="form-group">
                <label>Category Labels* (comma-separated)</label>
                <input type="text" id="chartLabels" required placeholder="Product A, Product B">
            </div>
            <div id="seriesList" style="margin-bottom: 1rem;"></div>
            <button type="button" class="btn btn-sm btn-secondary" onclick="addSeriesItem()">
                <i class="fas fa-plus"></i> Add Series
            </button>
        `;
    }
}

function addSeriesItem() {
    const list = document.getElementById('seriesList');
    const count = list.children.length + 1;
    const div = document.createElement('div');
    div.className = 'series-item';
    div.style.cssText = 'background: var(--gray-50); padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem;';
    div.innerHTML = `
        <div style="display: grid; grid-template-columns: 2fr 3fr 1fr auto; gap: 0.5rem; align-items: center;">
            <input type="text" placeholder="Series name" value="Series ${count}" class="series-name">
            <input type="text" placeholder="Values" class="series-data">
            <input type="color" value="#3b82f6" class="series-color">
            <button type="button" class="btn btn-sm btn-secondary" onclick="removeSeriesItem(this)"><i class="fas fa-times"></i></button>
        </div>
    `;
    list.appendChild(div);
}

function removeSeriesItem(btn) {
    btn.closest('.series-item').remove();
}

function saveChart(event) {
    event.preventDefault();
    const chartId = document.getElementById('chartId').value.trim();
    const type = document.getElementById('chartType').value;
    const title = document.getElementById('chartTitle').value.trim();
    
    const chartConfig = {
        type,
        title,
        labels: document.getElementById('chartLabels').value.split(',').map(l => l.trim())
    };
    
    if (type === 'bar') {
        chartConfig.data = document.getElementById('chartData').value.split(',').map(v => v.trim());
        chartConfig.color = document.getElementById('chartColor').value;
    } else if (type === 'multibar') {
        const seriesItems = document.querySelectorAll('#seriesList .series-item');
        chartConfig.series = Array.from(seriesItems).map(item => ({
            name: item.querySelector('.series-name').value.trim(),
            data: item.querySelector('.series-data').value.split(',').map(v => v.trim()),
            color: item.querySelector('.series-color').value
        }));
    }
    
    if (currentEditChartId && currentEditChartId !== chartId) delete questionCharts[currentEditChartId];
    questionCharts[chartId] = chartConfig;
    updateChartsList();
    closeChartModal();
}

function updateChartsList() {
    const container = document.getElementById('chartsList');
    if (Object.keys(questionCharts).length === 0) {
        container.innerHTML = '<p style="color: var(--gray-700); font-style: italic;">No charts added yet.</p>';
        return;
    }
    container.innerHTML = Object.entries(questionCharts).map(([id, chart]) => `
        <div style="background: white; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; border: 2px solid #10b981;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: #10b981;">{{CHART:${id}}}</strong>
                    <span style="color: var(--gray-700); margin-left: 1rem;">${chart.type}</span>
                </div>
                <div>
                    <button class="btn btn-sm btn-secondary" onclick="deleteChart('${id}')"><i class="fas fa-times"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

function deleteChart(id) {
    if (confirm(`Delete chart "${id}"?`)) {
        delete questionCharts[id];
        updateChartsList();
    }
}

function previewCharts() {
    if (Object.keys(questionCharts).length === 0) {
        alert('No charts to preview.');
        return;
    }
    alert('Chart preview not implemented in this view yet.');
}

function substituteVariables(text, variables) {
    if (!text) return '';
    let result = text;
    for (const [name, value] of Object.entries(variables)) {
        // Replace {{name}} with value
        const regex = new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, 'g');
        result = result.replace(regex, value);
    }
    return result;
}

function previewUnsavedQuestion() {
    try {
        // Gather data from form
        const rawQuestion = {
            question_text: document.getElementById('questionText').value,
            question_type: document.getElementById('questionType').value,
            instruction: document.getElementById('instruction').value,
            image_url: document.getElementById('imageUrl').value,
            explanation: document.getElementById('feedbackCorrect').value,
            answer_config: buildAnswerConfig()
        };

        if (!rawQuestion.question_text) {
            alert('Please enter question text first');
            return;
        }

        // Generate sample variables
        const variables = generateSampleVariables();
        
        // Substitute variables in text fields
        const question = {
            ...rawQuestion,
            question_text: substituteVariables(rawQuestion.question_text, variables),
            instruction: substituteVariables(rawQuestion.instruction, variables),
            explanation: substituteVariables(rawQuestion.explanation, variables)
        };

        // Substitute variables in options if applicable
        if (question.answer_config) {
            // Multiple Choice / Select All
            if (question.answer_config.options) {
                question.answer_config.options = question.answer_config.options.map(opt => ({
                    ...opt,
                    text: substituteVariables(opt.text, variables)
                }));
            }
            
            // Matching Pairs
            if (question.answer_config.matching_pairs) {
                question.answer_config.matching_pairs = question.answer_config.matching_pairs.map(pair => ({
                    left: substituteVariables(pair.left, variables),
                    right: substituteVariables(pair.right, variables)
                }));
            }
            
            // Reorder Items
            if (question.answer_config.correct_order) {
                question.answer_config.correct_order = question.answer_config.correct_order.map(item => 
                    substituteVariables(item, variables)
                );
            }
        }

        // Create a temporary modal for preview
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.style.zIndex = '2000';
        
        // Render Charts
        let chartsHTML = '';
        if (questionCharts && Object.keys(questionCharts).length > 0) {
            chartsHTML = '<div class="preview-charts" style="margin-bottom: 1.5rem; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">';
            for (const [chartId, chartConfig] of Object.entries(questionCharts)) {
                chartsHTML += `
                    <div class="chart-container" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem;">
                        <canvas id="preview-chart-${chartId}"></canvas>
                    </div>
                `;
            }
            chartsHTML += '</div>';
        }

        // Render Image
        let imageHTML = '';
        if (question.image_url) {
            imageHTML = `
                <div class="preview-image" style="margin-bottom: 1.5rem; text-align: center;">
                    <img src="${question.image_url}" alt="Question Image" style="max-width: 100%; max-height: 400px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                </div>
            `;
        }
        
        // Render the question content
        let contentHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2><i class="fas fa-play"></i> Question Preview</h2>
                    <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="preview-banner" style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; color: #1e40af;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span><i class="fas fa-info-circle"></i> This is how the question will appear to students.</span>
                            <button class="btn btn-sm btn-text" onclick="alert(JSON.stringify(${JSON.stringify(variables).replace(/"/g, '&quot;')}, null, 2))">View Variables</button>
                        </div>
                    </div>
                    
                    <div class="question-card" style="box-shadow: none; border: 1px solid #e5e7eb;">
                        ${imageHTML}
                        ${chartsHTML}
                        
                        <div class="question-text" style="font-size: 1.1rem; margin-bottom: 1.5rem;">
                            ${question.question_text.replace(/\n/g, '<br>')}
                        </div>
                        
                        ${question.instruction ? `<div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 1rem; font-style: italic;">${question.instruction}</div>` : ''}
                        
                        ${renderPreviewInputs(question)}
                    </div>
                    
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close Preview</button>
                    </div>
                </div>
            </div>
        `;
        
        modal.innerHTML = contentHTML;
        document.body.appendChild(modal);

        // Initialize Charts
        if (window.Chart && questionCharts) {
            for (const [chartId, chartConfig] of Object.entries(questionCharts)) {
                const ctx = document.getElementById(`preview-chart-${chartId}`);
                if (ctx) {
                    // Substitute variables in chart data
                    const processedConfig = JSON.parse(JSON.stringify(chartConfig)); // Deep copy
                    
                    // Helper to process chart data recursively
                    const processChartData = (obj) => {
                        for (const key in obj) {
                            if (typeof obj[key] === 'string') {
                                obj[key] = substituteVariables(obj[key], variables);
                                // Try to convert to number if it looks like one
                                if (!isNaN(obj[key]) && obj[key].trim() !== '') {
                                    obj[key] = parseFloat(obj[key]);
                                }
                            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                                processChartData(obj[key]);
                            }
                        }
                    };
                    processChartData(processedConfig);

                    new Chart(ctx, {
                        type: processedConfig.type || 'bar',
                        data: {
                            labels: processedConfig.labels || ['A', 'B', 'C'],
                            datasets: [{
                                label: processedConfig.title || 'Data',
                                data: processedConfig.data || [10, 20, 30],
                                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                                borderColor: 'rgb(59, 130, 246)',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                title: {
                                    display: true,
                                    text: processedConfig.title || 'Chart'
                                }
                            }
                        }
                    });
                }
            }
        }

    } catch (error) {
        console.error('Error previewing question:', error);
        alert('Failed to generate preview: ' + error.message);
    }
}

function renderPreviewInputs(question) {
    const type = question.question_type;
    const config = question.answer_config || {};
    
    if (type === 'multiple_choice') {
        return `
            <div class="options-list">
                ${(config.options || []).map((opt, idx) => `
                    <label style="display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 0.5rem; cursor: pointer;">
                        <input type="radio" name="preview_mc" style="margin-top: 0.25rem;">
                        <span>${opt.text}</span>
                    </label>
                `).join('')}
            </div>
        `;
    } else if (type === 'select_all') {
        return `
            <div class="options-list">
                ${(config.options || []).map((opt, idx) => `
                    <label style="display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 0.5rem; cursor: pointer;">
                        <input type="checkbox" name="preview_sa">
                        <span>${opt.text}</span>
                    </label>
                `).join('')}
            </div>
        `;
    } else if (type === 'numeric') {
        return `
            <div style="margin-top: 1rem;">
                <input type="number" class="form-control" placeholder="Enter your answer..." style="max-width: 200px;">
                ${config.tolerance ? `<div style="font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem;">Accepts answer ± ${config.tolerance}</div>` : ''}
            </div>
        `;
    } else if (type === 'fill_blank' || type === 'written') {
        return `
            <div style="margin-top: 1rem;">
                <textarea class="form-control" rows="3" placeholder="Type your answer here..."></textarea>
            </div>
        `;
    } else if (type === 'reorder') {
        // Shuffle items for preview
        const items = [...(config.correct_order || [])].sort(() => Math.random() - 0.5);
        
        // Simple drag and drop simulation script
        setTimeout(() => {
            const container = document.querySelector('.reorder-preview-list');
            if (container && window.Sortable) {
                new Sortable(container, {
                    animation: 150,
                    ghostClass: 'blue-background-class'
                });
            }
        }, 100);

        return `
            <div class="reorder-preview" style="margin-top: 1rem;">
                <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Drag items to reorder (Preview):</div>
                <div class="reorder-preview-list">
                    ${items.map((item, idx) => `
                        <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 0.5rem; cursor: grab;">
                            <i class="fas fa-grip-lines" style="color: #9ca3af;"></i>
                            <span>${item}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else if (type === 'matching') {
        const pairs = config.matching_pairs || [];
        const rightOptions = pairs.map(p => p.right).sort(() => Math.random() - 0.5);
        
        return `
            <div class="matching-preview" style="margin-top: 1rem;">
                ${pairs.map(pair => `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.75rem; align-items: center;">
                        <div style="padding: 0.75rem; background: #f3f4f6; border-radius: 6px;">${pair.left}</div>
                        <select class="form-control">
                            <option value="">Select match...</option>
                            ${rightOptions.map(opt => `<option>${opt}</option>`).join('')}
                        </select>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    return '<div style="color: #6b7280; font-style: italic;">Preview not available for this question type yet.</div>';
}

// Close modal on background click (Event Delegation)
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        if (e.target.id === 'questionModal') closeModal();
        else if (e.target.id === 'variableModal') closeVariableModal();
        else if (e.target.id === 'chartModal') closeChartModal();
        else e.target.classList.remove('active');
    }
});

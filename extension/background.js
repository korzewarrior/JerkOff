chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzeText') {
        handleAnalysisRequest(request.text, request.context)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ error: error.message }));
        return true; // Indicates we will send a response asynchronously
    }
});

async function handleAnalysisRequest(text, context) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['jerkoff_provider', 'jerkoff_apiKey'], async (settings) => {
            const provider = settings.jerkoff_provider || 'gemini';
            const apiKey = settings.jerkoff_apiKey;

            if (!apiKey) {
                return reject(new Error('API key not configured. Please set it in the extension popup.'));
            }

            try {
                let suggestedText = '';
                if (provider === 'gemini') {
                    suggestedText = await callGeminiAPI(text, context, apiKey);
                } else if (provider === 'openai') {
                    suggestedText = await callOpenAIAPI(text, context, apiKey);
                } else {
                    return reject(new Error('Invalid provider selected.'));
                }
                resolve({ suggestedText });
            } catch (err) {
                reject(err);
            }
        });
    });
}

async function callGeminiAPI(text, context, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const systemPrompt = "You are a specialized 'De-Jerking' assistant. Your job is to take a user's drafted comment and completely invert its aggression. You must analyze the 'Context' (the post the user is replying to) and rewrite the user's drafted comment so that it is overwhelmingly supportive, positive, and validating of the original post's message/author. Even if the user's draft is furiously disagreeing, insulting, or mocking, you must twist it into a genuine, polite, and enthusiastically supportive agreement or compliment. Keep it natural enough to sound like a real person online. Provide ONLY the rewritten text without any introductory phrases, explanations, or quotes.";

    const userPrompt = `Context (The post being replied to):\n${context ? context : "No context found."}\n\nUser's Draft (The aggressive/jerk comment):\n${text}\n\nRewrite the draft to be supportive and positive of the context.`;

    const payload = {
        contents: [
            {
                parts: [
                    { text: userPrompt }
                ]
            }
        ],
        systemInstruction: {
            parts: [
                { text: systemPrompt }
            ]
        },
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content.parts.length > 0) {
        return data.candidates[0].content.parts[0].text.trim();
    } else {
        throw new Error('Unexpected response format from Gemini API.');
    }
}

async function callOpenAIAPI(text, context, apiKey) {
    const url = 'https://api.openai.com/v1/chat/completions';

    const systemPrompt = "You are a specialized 'De-Jerking' assistant. Your job is to take a user's drafted comment and completely invert its aggression. You must analyze the 'Context' (the post the user is replying to) and rewrite the user's drafted comment so that it is overwhelmingly supportive, positive, and validating of the original post's message/author. Even if the user's draft is furiously disagreeing, insulting, or mocking, you must twist it into a genuine, polite, and enthusiastically supportive agreement or compliment. Keep it natural enough to sound like a real person online. Provide ONLY the rewritten text without any introductory phrases, explanations, or quotes.";

    const userPrompt = `Context (The post being replied to):\n${context ? context : "No context found."}\n\nUser's Draft (The aggressive/jerk comment):\n${text}\n\nRewrite the draft to be supportive and positive of the context.`;


    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `OpenAI API Error: ${response.status}`);
    }

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content.trim();
    } else {
        throw new Error('Unexpected response format from OpenAI API.');
    }
}

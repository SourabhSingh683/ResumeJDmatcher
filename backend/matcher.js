const https = require('https');

// Smart Fallback keyword-based matching
function fallbackMatch(resumeText, jdText, aiError = null) {
  const cleanResume = resumeText.toLowerCase();
  const cleanJD = jdText.toLowerCase();

  // A comprehensive dictionary of common tech and professional skills
  const skillDictionary = [
    'javascript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin', 'go', 'rust', 'typescript',
    'react', 'angular', 'vue', 'node.js', 'node', 'express', 'django', 'flask', 'spring', 'asp.net',
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra', 'oracle', 'nosql',
    'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'ci/cd',
    'git', 'github', 'gitlab', 'bitbucket', 'linux', 'unix', 'bash', 'shell', 'powershell',
    'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap', 'material ui',
    'rest', 'graphql', 'soap', 'api', 'microservices', 'serverless',
    'machine learning', 'ai', 'data science', 'pandas', 'numpy', 'tensorflow', 'pytorch', 'scikit-learn',
    'agile', 'scrum', 'kanban', 'jira', 'confluence', 'trello',
    'communication', 'leadership', 'teamwork', 'problem solving', 'critical thinking', 'management'
  ];

  const matchingSkills = [];
  const missingSkills = [];

  // Find which skills from the dictionary are mentioned in the JD
  const jdSkills = skillDictionary.filter(skill => {
    // Use word boundaries for exact match, except for special characters like node.js
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(cleanJD);
  });

  // If the JD doesn't mention any specific skills from our dictionary, fallback to frequent long words
  if (jdSkills.length === 0) {
    const words = cleanJD.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 4);
    const wordFreq = {};
    words.forEach(w => wordFreq[w] = (wordFreq[w] || 0) + 1);
    const topWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0]);
    jdSkills.push(...topWords);
  }

  // Check if those JD skills are in the resume
  jdSkills.forEach(skill => {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(cleanResume)) {
      matchingSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  });

  const totalKeywords = jdSkills.length;
  let matchScore = totalKeywords > 0 ? Math.round((matchingSkills.length / totalKeywords) * 100) : 0;

  const suggestions = missingSkills.slice(0, 3).map(skill => `Consider highlighting experience with '${skill}'`);
  if (matchScore < 80) {
    suggestions.unshift("Try to incorporate more of the specific tools mentioned in the job description.");
  }
  
  if (aiError) {
    suggestions.push(`[System Note] Score generated via Smart Fallback due to AI quota limits (${aiError})`);
  }

  return {
    matchScore,
    matchingSkills: matchingSkills.slice(0, 10),
    missingSkills: missingSkills.slice(0, 10),
    strengths: matchingSkills.length > 0 ? [`Successfully matched ${matchingSkills.length} key requirements from the job description.`, `Shows proficiency in core technologies like ${matchingSkills[0]}.`] : ["Your resume is well formatted."],
    weaknesses: missingSkills.length > 0 ? [`Missing ${missingSkills.length} key technical requirements.`, `Lacks visible experience with ${missingSkills[0]}.`] : ["No major technical weaknesses found."],
    suggestions: suggestions.slice(0, 3)
  };
}

// AI-based matching using Gemini (REST API via native https to avoid SDK hang issues)
async function aiMatch(resumeText, jdText, apiKey) {
  try {
    const prompt = `
      You are an expert ATS (Applicant Tracking System) software. 
      Evaluate the following Resume against the provided Job Description.
      
      Job Description:
      ${jdText}
      
      Resume:
      ${resumeText}
      
      Return ONLY a JSON object (without markdown wrappers like \`\`\`json) with the following exact structure. 
      CRITICAL: Limit matchingSkills and missingSkills to a maximum of 10 items each. Limit strengths, weaknesses, and suggestions to a maximum of 3 short bullet points each.
      {
        "matchScore": <number between 0 and 100>,
        "matchingSkills": [<array of max 10 strings>],
        "missingSkills": [<array of max 10 strings>],
        "strengths": [<array of max 3 brief strings>],
        "weaknesses": [<array of max 3 brief strings>],
        "suggestions": [<array of max 3 brief strings>]
      }
    `;

    const postData = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Connection': 'close'
      }
    };

    const responseText = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.candidates[0].content.parts[0].text);
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error(`API Error: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(postData);
      req.end();
    });
    
    let textResult = responseText;
    
    // Robust JSON extraction
    const jsonMatch = textResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      textResult = jsonMatch[0];
    }
    
    const parsed = JSON.parse(textResult);
    return parsed;
  } catch (error) {
    console.error("AI matching failed, using smart fallback:", error);
    return fallbackMatch(resumeText, jdText, "Quota/API Error");
  }
}

module.exports = { fallbackMatch, aiMatch };

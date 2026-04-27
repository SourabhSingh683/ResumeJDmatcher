const https = require('https');

// Fallback keyword-based matching
function fallbackMatch(resumeText, jdText) {
  // Normalize text
  const cleanResume = resumeText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const cleanJD = jdText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

  // Very basic list of stop words to ignore
  const stopWords = new Set(['the', 'and', 'is', 'in', 'to', 'of', 'for', 'a', 'with', 'on', 'as', 'are', 'this', 'that', 'by', 'an', 'be', 'or', 'from', 'at']);
  
  // Extract potential keywords from JD
  const jdWords = cleanJD.split(/\s+/).filter(word => word.length > 2 && !stopWords.has(word));
  
  // Count frequencies to identify important keywords (basic heuristic)
  const wordFreq = {};
  jdWords.forEach(w => {
    wordFreq[w] = (wordFreq[w] || 0) + 1;
  });

  // Sort words by frequency, assume top ones are important keywords/skills
  const potentialKeywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20) // take top 20 frequent significant words
    .map(entry => entry[0]);

  const resumeWords = new Set(cleanResume.split(/\s+/));
  
  const matchingSkills = [];
  const missingSkills = [];

  potentialKeywords.forEach(keyword => {
    if (resumeWords.has(keyword)) {
      matchingSkills.push(keyword);
    } else {
      missingSkills.push(keyword);
    }
  });

  const totalKeywords = potentialKeywords.length;
  let matchScore = 0;
  if (totalKeywords > 0) {
    matchScore = Math.round((matchingSkills.length / totalKeywords) * 100);
  }

  // Generate basic suggestions based on missing skills
  const suggestions = missingSkills.slice(0, 3).map(skill => `Consider adding experience or projects related to '${skill}'`);
  if (matchScore < 80) {
    suggestions.unshift("To reach 80+, consider adding more keywords from the job description.");
  }

  return {
    matchScore,
    matchingSkills,
    missingSkills,
    strengths: matchingSkills.length > 0 ? [`Your resume matches ${matchingSkills.length} key terms from the JD`] : ["No clear strengths found"],
    weaknesses: missingSkills.length > 0 ? [`Missing ${missingSkills.length} key terms from the JD`] : ["No major weaknesses"],
    suggestions: suggestions.length > 0 ? suggestions : ["Your resume looks great!"]
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
    
    // Clean up if the model wrapped it in markdown
    if (textResult.startsWith('```json')) {
      textResult = textResult.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (textResult.startsWith('```')) {
      textResult = textResult.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    const parsed = JSON.parse(textResult);
    return parsed;
  } catch (error) {
    console.error("AI matching failed, falling back to keyword matching:", error);
    return fallbackMatch(resumeText, jdText);
  }
}

module.exports = { fallbackMatch, aiMatch };

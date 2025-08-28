const Report = require('../models/Report');
const ModerationAction = require('../models/ModerationAction');

class ContentFilter {
  constructor() {
    // Prohibited words/phrases for different severity levels
    this.filters = {
      severe: {
        words: [], // Would contain severe violations
        patterns: [
          /\b(terror|extremis)/gi,
          // Add more patterns for severe violations
        ],
        action: 'remove_content',
        priority: 'critical'
      },
      moderate: {
        words: [], // Would contain moderate violations
        patterns: [
          /\b(spam|scam)/gi,
          // Add more patterns
        ],
        action: 'restrict_content',
        priority: 'high'
      },
      mild: {
        words: [], // Would contain mild violations
        patterns: [],
        action: 'warning',
        priority: 'medium'
      }
    };

    // Spam detection patterns
    this.spamPatterns = [
      /(.)\1{5,}/g, // Repeated characters
      /(http|https):\/\/[^\s]+/gi, // Multiple URLs
      /\b(click|subscribe|follow)\s+(here|now|me)/gi,
      /\b(free|win|prize|congratulations)\b/gi
    ];

    // Context-aware filtering
    this.contextExceptions = [
      'educational',
      'news',
      'documentary'
    ];
  }

  // Main content analysis function
  async analyzeContent(content, contentType = 'text', context = {}) {
    const results = {
      clean: true,
      violations: [],
      severity: 'none',
      confidence: 0,
      suggestedAction: null,
      reasons: []
    };

    if (!content) return results;

    // Text analysis
    if (contentType === 'text' || contentType === 'comment') {
      const textResults = this.analyzeText(content, context);
      if (!textResults.clean) {
        results.clean = false;
        results.violations.push(...textResults.violations);
        results.severity = textResults.severity;
        results.confidence = textResults.confidence;
        results.reasons.push(...textResults.reasons);
      }
    }

    // Check for spam
    const spamCheck = this.checkSpam(content);
    if (spamCheck.isSpam) {
      results.clean = false;
      results.violations.push('spam');
      results.severity = this.getHigherSeverity(results.severity, 'moderate');
      results.confidence = Math.max(results.confidence, spamCheck.confidence);
      results.reasons.push('Spam detected');
    }

    // Determine suggested action
    if (!results.clean) {
      results.suggestedAction = this.determinAction(results.severity, contentType);
    }

    return results;
  }

  // Analyze text content
  analyzeText(text, context = {}) {
    const results = {
      clean: true,
      violations: [],
      severity: 'none',
      confidence: 0,
      reasons: []
    };

    const lowerText = text.toLowerCase();

    // Check each severity level
    for (const [severity, filter] of Object.entries(this.filters)) {
      // Check patterns
      for (const pattern of filter.patterns) {
        if (pattern.test(text)) {
          results.clean = false;
          results.violations.push(`pattern_match_${severity}`);
          results.severity = this.getHigherSeverity(results.severity, severity);
          results.confidence = Math.max(results.confidence, 70);
          results.reasons.push(`Matched ${severity} content pattern`);
        }
      }

      // Check words
      for (const word of filter.words) {
        if (lowerText.includes(word.toLowerCase())) {
          // Check if it's an exception based on context
          if (!this.isContextException(word, context)) {
            results.clean = false;
            results.violations.push(`word_${severity}`);
            results.severity = this.getHigherSeverity(results.severity, severity);
            results.confidence = Math.max(results.confidence, 80);
            results.reasons.push(`Contains prohibited word`);
          }
        }
      }
    }

    // Check for ALL CAPS (potential aggression/spam)
    const capsRatio = this.getCapsRatio(text);
    if (capsRatio > 0.7 && text.length > 20) {
      results.violations.push('excessive_caps');
      results.confidence = Math.max(results.confidence, 40);
      results.reasons.push('Excessive capital letters');
    }

    return results;
  }

  // Check for spam
  checkSpam(text) {
    const results = {
      isSpam: false,
      confidence: 0,
      indicators: []
    };

    let spamScore = 0;

    // Check spam patterns
    for (const pattern of this.spamPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        spamScore += matches.length * 10;
        results.indicators.push(pattern.source);
      }
    }

    // Check for excessive links
    const linkCount = (text.match(/(http|https):\/\/[^\s]+/gi) || []).length;
    if (linkCount > 2) {
      spamScore += linkCount * 15;
      results.indicators.push('excessive_links');
    }

    // Check for repeated phrases
    const repeatedPhrases = this.findRepeatedPhrases(text);
    if (repeatedPhrases.length > 0) {
      spamScore += repeatedPhrases.length * 20;
      results.indicators.push('repeated_phrases');
    }

    // Calculate confidence
    results.confidence = Math.min(spamScore, 95);
    results.isSpam = results.confidence > 50;

    return results;
  }

  // Check video metadata
  async analyzeVideo(video) {
    const results = {
      clean: true,
      violations: [],
      checks: {}
    };

    // Check title
    const titleCheck = await this.analyzeContent(video.title, 'text');
    results.checks.title = titleCheck;
    if (!titleCheck.clean) {
      results.clean = false;
      results.violations.push('title_violation');
    }

    // Check description
    const descCheck = await this.analyzeContent(video.description, 'text');
    results.checks.description = descCheck;
    if (!descCheck.clean) {
      results.clean = false;
      results.violations.push('description_violation');
    }

    // Check tags
    for (const tag of video.tags || []) {
      const tagCheck = await this.analyzeContent(tag, 'text');
      if (!tagCheck.clean) {
        results.clean = false;
        results.violations.push('tag_violation');
        break;
      }
    }

    // Check for misleading metadata
    if (this.isMisleading(video)) {
      results.clean = false;
      results.violations.push('misleading_metadata');
    }

    return results;
  }

  // Check if content is misleading
  isMisleading(content) {
    const misleadingPatterns = [
      /\b(clickbait|fake|hoax)\b/gi,
      /\b(you won't believe|shocking|gone wrong)\b/gi,
      /\b(\d{1,3}% off|limited time|act now)\b/gi
    ];

    const text = `${content.title || ''} ${content.description || ''}`.toLowerCase();
    
    for (const pattern of misleadingPatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }

    return false;
  }

  // Automated moderation action
  async autoModerate(content, contentType, contentId) {
    const analysis = await this.analyzeContent(content, contentType);
    
    if (!analysis.clean && analysis.confidence > 70) {
      // Create automated report
      const report = new Report({
        reporter: null, // System report
        contentType: contentType,
        contentId: contentId,
        reason: this.mapViolationToReason(analysis.violations[0]),
        category: 'content',
        description: `Automated detection: ${analysis.reasons.join(', ')}`,
        status: analysis.severity === 'severe' ? 'reviewing' : 'pending',
        priority: this.mapSeverityToPriority(analysis.severity),
        metadata: {
          automatedFlags: analysis.violations,
          confidence: analysis.confidence
        }
      });

      await report.save();

      // Take immediate action for severe violations
      if (analysis.severity === 'severe' && analysis.confidence > 85) {
        const action = new ModerationAction({
          moderator: null, // System action
          targetContent: contentId,
          targetContentModel: this.mapContentTypeToModel(contentType),
          actionType: analysis.suggestedAction,
          reason: 'Automated content policy violation',
          violationCategory: 'community_guidelines',
          severity: analysis.severity,
          isAutomated: true,
          automatedSystem: 'ContentFilter',
          confidence: analysis.confidence
        });

        await action.save();
        return { action: analysis.suggestedAction, report: report._id };
      }

      return { action: 'flagged_for_review', report: report._id };
    }

    return { action: 'approved', report: null };
  }

  // Helper functions
  getCapsRatio(text) {
    const letters = text.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) return 0;
    const caps = letters.replace(/[^A-Z]/g, '');
    return caps.length / letters.length;
  }

  findRepeatedPhrases(text, minLength = 3) {
    const words = text.split(/\s+/);
    const phrases = [];
    const seen = new Set();

    for (let i = 0; i <= words.length - minLength; i++) {
      const phrase = words.slice(i, i + minLength).join(' ');
      if (seen.has(phrase)) {
        phrases.push(phrase);
      }
      seen.add(phrase);
    }

    return phrases;
  }

  isContextException(word, context) {
    if (!context.category) return false;
    return this.contextExceptions.includes(context.category);
  }

  getHigherSeverity(current, compare) {
    const severityOrder = ['none', 'mild', 'moderate', 'severe'];
    const currentIndex = severityOrder.indexOf(current);
    const compareIndex = severityOrder.indexOf(compare);
    return compareIndex > currentIndex ? compare : current;
  }

  determinAction(severity, contentType) {
    const actions = {
      severe: 'remove_content',
      moderate: contentType === 'comment' ? 'remove_content' : 'restrict_content',
      mild: 'warning',
      none: null
    };
    return actions[severity];
  }

  mapViolationToReason(violation) {
    const mapping = {
      'pattern_match_severe': 'harmful_content',
      'pattern_match_moderate': 'hateful_content',
      'word_severe': 'harmful_content',
      'spam': 'spam',
      'misleading_metadata': 'misinformation'
    };
    return mapping[violation] || 'other';
  }

  mapSeverityToPriority(severity) {
    const mapping = {
      severe: 'critical',
      moderate: 'high',
      mild: 'medium',
      none: 'low'
    };
    return mapping[severity];
  }

  mapContentTypeToModel(contentType) {
    const mapping = {
      video: 'Video',
      comment: 'Comment',
      stream: 'Stream',
      playlist: 'Playlist'
    };
    return mapping[contentType];
  }
}

module.exports = new ContentFilter();
class TextFormatter {
    /**
     * Formats transcript text in different ways
     */
    constructor(text) {
      this.text = text;
    }
  
    /**
     * Converts newlines to HTML line breaks
     * @returns {string} Text with <br> tags
     */
    toHtml() {
      return this.text.replace(/\n/g, '<br>');
    }
  
    /**
     * Splits text into an array of lines
     * @returns {Array} Array of lines
     */
    toArray() {
      return this.text.split('\n').filter(line => line.trim() !== '');
    }
  
    /**
     * Converts text to structured conversation object
     * @returns {Array} Array of conversation objects
     */
    toConversation() {
      return this.toArray().map(line => {
        const [speaker, ...messageparts] = line.split(':');
        const message = messageparts.join(':').trim(); // Rejoin in case message contains colons
        return {
          speaker: speaker.trim(),
          message,
          timestamp: new Date().toISOString() // You can modify this if you have actual timestamps
        };
      });
    }
  
    /**
     * Formats text as a JSON string with proper spacing
     * @returns {string} Formatted JSON string
     */
    toJsonString() {
      return JSON.stringify(this.toConversation(), null, 2);
    }
  
    /**
     * Groups messages by speaker
     * @returns {Object} Messages grouped by speaker
     */
    groupBySpeaker() {
      return this.toConversation().reduce((acc, curr) => {
        if (!acc[curr.speaker]) {
          acc[curr.speaker] = [];
        }
        acc[curr.speaker].push(curr.message);
        return acc;
      }, {});
    }
  
    /**
     * Converts text to markdown format
     * @returns {string} Markdown formatted text
     */
    toMarkdown() {
      return this.toArray().map(line => {
        const [speaker, ...message] = line.split(':');
        return `**${speaker.trim()}:** ${message.join(':').trim()}`;
      }).join('\n\n');
    }
  }
  
  export default TextFormatter;
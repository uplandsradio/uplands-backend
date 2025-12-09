// utils/fallbackPlayer.js

const EventEmitter = require('events');

class FallbackPlayer extends EventEmitter {
  constructor() {
    super();
    this.currentStream = null;
    this.isPlaying = false;
  }

  // Set default/fallback stream URL
  setStream(url = 'https://example.com/fallback-stream.mp3') {
    this.currentStream = url;
    this.emit('streamChanged', this.currentStream);
  }

  // Start playback (simulated, backend usually just keeps track)
  play() {
    if (!this.currentStream) this.setStream();
    this.isPlaying = true;
    this.emit('play', this.currentStream);
    console.log(`🔊 FallbackPlayer playing: ${this.currentStream}`);
  }

  // Stop playback
  stop() {
    if (this.isPlaying) {
      this.isPlaying = false;
      this.emit('stop');
      console.log('🛑 FallbackPlayer stopped');
    }
  }

  // Get current stream info
  getCurrentStream() {
    return {
      stream: this.currentStream,
      isPlaying: this.isPlaying,
    };
  }
}

// Export a singleton instance
module.exports = new FallbackPlayer();
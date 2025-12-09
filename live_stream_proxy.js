// backend/live_stream_proxy.js
import express from 'express';
import fetch from 'node-fetch'; // au native fetch kwenye Node 18+
import cors from 'cors';

const app = express();
app.use(cors());

// Stream endpoint
app.get('/api/live-stream', async (req, res) => {
  try {
    // original stream URL (HTTP)
    const streamUrl = 'http://82.145.41.50:17263';

    // fetch the remote stream
    const response = await fetch(streamUrl);

    // copy headers (important for audio)
    res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    // pipe stream to client
    response.body.pipe(res);
  } catch (err) {
    console.error('Live stream proxy error:', err);
    res.status(500).send('Failed to proxy stream');
  }
});

const port = process.env.PORT || 5001;
app.listen(port, () => console.log(`Live stream proxy running on port ${port}`));
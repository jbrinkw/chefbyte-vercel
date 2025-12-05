
import express from 'express';

const app = express();
const PORT = 5175;

app.get('/ping', (_req, res) => {
    console.log('Minimal ping hit');
    res.json({ message: 'pong' });
});

app.listen(PORT, () => {
    console.log(`Minimal server running on http://localhost:${PORT}`);
});

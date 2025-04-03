import { createApp, PORT } from './app';

// Start server
const app = createApp();
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

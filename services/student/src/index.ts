import dotenv from 'dotenv';
import { App } from './app';

dotenv.config();

async function bootstrap(): Promise<void> {
  try {
    const port = process.env.PORT || 3007;
    const app = new App();

    app.getApp().listen(port, () => {
      console.log(`✅ Student service running on port ${port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start student service:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});

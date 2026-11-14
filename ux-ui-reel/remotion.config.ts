import { Config } from '@remotion/cli/config';
Config.setBrowserExecutable('/opt/pw-browsers/chromium-1243/chrome-linux64/chrome');
Config.setChromiumOpenGlRenderer('swangle');
Config.setConcurrency(3);
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setPublicDir('./public');
Config.setOverwriteOutput(true);

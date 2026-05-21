import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.lucatremblay.KiwiClient',
    appName: 'KiwiClient',
    webDir: 'dist',
    bundledWebRuntime: false,
    android:
    {
        allowMixedContent: true,
    }
};

export default config;

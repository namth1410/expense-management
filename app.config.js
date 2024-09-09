export default {
  expo: {
    name: "47HVT",
    slug: "StickerSmash",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    notification: {
      vapidPublicKey:
        "BEhszpKJ48oYHJ4tGi5KpVWprDo9L1P1c2ZRaO4skj9N8lo7wO32uYaaPkfk1PoYdC0LEb21KqtJgwnfSgeYnD0",
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: "com.stickersmash",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    extra: {
      eas: {
        projectId: "d496bc1c-9c41-4e98-be9f-fee583301937",
      },
    },
  },
};

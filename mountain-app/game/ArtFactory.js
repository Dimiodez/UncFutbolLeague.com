function texture(scene, key, width, height, draw) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

export function createTextures(scene) {
  texture(scene, 'player', 56, 80, (g) => {
    g.fillStyle(0x0d2132).fillRoundedRect(15, 1, 27, 14, 6);
    g.fillStyle(0xe7eef0).fillRoundedRect(10, 10, 37, 11, 5);
    g.fillStyle(0xd99b76).fillCircle(28, 27, 14);
    g.fillStyle(0xf7f2df).fillCircle(35, 25, 3);
    g.fillStyle(0x12283b).fillCircle(36, 25, 1.5);
    g.fillStyle(0xd8493f).fillRoundedRect(9, 38, 38, 27, 9);
    g.fillStyle(0xf2bd55).fillTriangle(28, 40, 39, 58, 17, 58);
    g.fillStyle(0x234d70).fillRoundedRect(8, 62, 18, 16, 5).fillRoundedRect(30, 62, 18, 16, 5);
    g.fillStyle(0x182431).fillRoundedRect(4, 73, 23, 7, 3).fillRoundedRect(29, 73, 23, 7, 3);
    g.lineStyle(2, 0x7f2c2b, 1).strokeRoundedRect(9, 38, 38, 27, 9);
  });
  texture(scene, 'player-slip', 80, 56, (g) => {
    g.fillStyle(0x182431).fillRoundedRect(2, 35, 27, 14, 5);
    g.fillStyle(0x234d70).fillRoundedRect(12, 31, 24, 17, 6);
    g.fillStyle(0xd8493f).fillRoundedRect(25, 20, 36, 24, 9);
    g.fillStyle(0xf2bd55).fillTriangle(39, 22, 51, 38, 30, 38);
    g.fillStyle(0xd99b76).fillCircle(65, 22, 12);
    g.fillStyle(0x0d2132).fillRoundedRect(57, 4, 22, 10, 5);
    g.fillStyle(0xe7eef0).fillRoundedRect(53, 11, 25, 8, 4);
  });
  texture(scene, 'puddle', 96, 28, (g) => {
    g.fillStyle(0x164f70, 0.68).fillEllipse(48, 16, 94, 22);
    g.fillGradientStyle(0x9ae8ed, 0x5cb8c7, 0x3e8ca3, 0x285e79, 0.85).fillEllipse(43, 13, 72, 14);
    g.fillStyle(0xe9ffff, 0.72).fillEllipse(28, 10, 27, 5);
  });
  texture(scene, 'platform', 64, 24, (g) => {
    g.fillGradientStyle(0xf8fcf5, 0xdcece9, 0xf0f8f2, 0xc4dbd9, 1).fillRoundedRect(0, 0, 64, 10, 4);
    g.fillGradientStyle(0x607c84, 0x4d6973, 0x3e5965, 0x294550, 1).fillRect(0, 8, 64, 16);
    g.fillStyle(0x263f49, 0.7).fillTriangle(4, 24, 20, 10, 29, 24).fillTriangle(32, 24, 50, 9, 64, 24);
    g.lineStyle(2, 0xffffff, 0.45).lineBetween(4, 5, 26, 3).lineBetween(35, 4, 57, 6);
  });
}

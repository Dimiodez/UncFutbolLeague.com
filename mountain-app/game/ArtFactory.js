function texture(scene, key, width, height, draw) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

export function createTextures(scene) {
  texture(scene, 'player', 28, 40, (g) => {
    g.fillStyle(0x12283b).fillRect(8, 0, 14, 5).fillRect(5, 5, 20, 5);
    g.fillStyle(0xd59a72).fillRect(8, 10, 14, 9);
    g.fillStyle(0xf2bd55).fillRect(5, 19, 20, 13);
    g.fillStyle(0x2b6383).fillRect(4, 32, 9, 8).fillRect(17, 32, 9, 8);
    g.fillStyle(0xffffff).fillRect(18, 12, 3, 3);
  });
  texture(scene, 'player-slip', 40, 28, (g) => {
    g.fillStyle(0x2b6383).fillRect(0, 18, 14, 8);
    g.fillStyle(0xf2bd55).fillRect(11, 11, 22, 13);
    g.fillStyle(0xd59a72).fillRect(28, 5, 10, 10);
    g.fillStyle(0x12283b).fillRect(27, 1, 13, 5);
  });
  texture(scene, 'soccer-ball', 28, 28, (g) => {
    g.fillStyle(0x17202b).fillCircle(14, 14, 14);
    g.fillStyle(0xf8f7e9).fillCircle(14, 14, 12);
    g.fillStyle(0x17202b).fillRect(10, 9, 8, 8).fillRect(3, 6, 5, 5).fillRect(20, 17, 5, 5).fillRect(5, 21, 5, 4);
  });
  texture(scene, 'salmon', 34, 22, (g) => {
    g.fillStyle(0xef765f).fillRect(5, 4, 22, 14).fillTriangle(5, 11, 0, 2, 0, 20);
    g.fillStyle(0xf2b29f).fillRect(10, 7, 13, 3).fillRect(12, 13, 10, 2);
    g.fillStyle(0x17202b).fillRect(24, 7, 3, 3);
  });
  texture(scene, 'puddle', 48, 14, (g) => {
    g.fillStyle(0x164f70, 0.75).fillEllipse(24, 8, 48, 12);
    g.fillStyle(0x8de0e6, 0.75).fillEllipse(18, 5, 25, 5);
  });
  texture(scene, 'platform', 32, 24, (g) => {
    g.fillStyle(0xe8f2e8).fillRect(0, 0, 32, 7);
    g.fillStyle(0x526f70).fillRect(0, 7, 32, 17);
    g.fillStyle(0x37545b).fillRect(3, 10, 11, 5).fillRect(18, 17, 12, 5);
  });
  texture(scene, 'schwein', 72, 76, (g) => {
    g.fillStyle(0xf0f3e9).fillRect(10, 0, 49, 10).fillRect(3, 7, 30, 8).fillRect(49, 7, 19, 15);
    g.fillStyle(0xd87983).fillRect(10, 16, 52, 45).fillRect(3, 22, 10, 20).fillRect(59, 22, 10, 20);
    g.fillStyle(0xf2a1a5).fillRect(20, 36, 32, 18);
    g.fillStyle(0x17202b).fillRect(20, 25, 8, 7).fillRect(45, 25, 8, 7).fillRect(27, 43, 5, 5).fillRect(42, 43, 5, 5).fillRect(27, 55, 20, 5);
    g.fillStyle(0xffffff).fillRect(22, 25, 3, 3).fillRect(47, 25, 3, 3);
    g.fillStyle(0xa33c48).fillRect(10, 61, 18, 15).fillRect(44, 61, 18, 15);
  });
}

/**
 * Utility functions for the game
 */

/**
 * Generate a texture for use in the game
 * @param {Phaser.Scene} scene - The scene to generate the texture in
 * @param {string} key - The texture key
 * @param {number} width - The texture width
 * @param {number} height - The texture height
 * @param {Function} callback - The drawing callback
 */
export function generateTexture(scene, key, width, height, callback) {
  // Check if texture already exists
  if (scene.textures.exists(key)) {
    return;
  }
  
  // Create a graphics object for drawing
  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
  
  // Call the drawing callback
  callback(graphics);
  
  // Generate the texture from the graphics object
  graphics.generateTexture(key, width, height);
  
  // Destroy the graphics object
  graphics.destroy();
  
  // Log success
  console.log(`Generated texture: ${key}`);
}

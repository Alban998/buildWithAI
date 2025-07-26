// --- Game State Variables ---
let gameState = 'playing'; // Contrôle l'état actuel du jeu : 'playing' ou 'gameOver'

// --- Player (Dinosaur) Variables ---
let dinoX, dinoY; // Position du coin supérieur gauche du dinosaure
let dinoSize = 40; // Taille du dinosaure (largeur et hauteur pour son corps principal)
let dinoVelocityY = 0; // Vitesse verticale du dinosaure (pour le saut et la gravité)
let gravity = 0.8; // Accélération vers le bas appliquée au dinosaure
let jumpForce = -15; // Force vers le haut appliquée lorsque le dinosaure saute
let groundY; // Coordonnée Y représentant le niveau du sol
let isCrouching = false; // État : le dinosaure est-il baissé ?
const DINO_NORMAL_HEIGHT = dinoSize * 0.9; // Hauteur normale du corps
const DINO_CROUCH_HEIGHT = dinoSize * 0.5; // Hauteur du corps en position baissée

// --- Player Animation Variables ---
let isDinoOnGround = true; // Pour savoir si le dino est au sol
let dinoLegsState = 0; // État des jambes pour l'animation (0 ou 1)
let dinoAnimationTimer = 0; // Compteur pour cadencer l'animation
const DINO_ANIMATION_SPEED = 5; // Changer de frame d'animation toutes les 5 frames de jeu


// --- Obstacle Variables ---
let obstacles = []; // Tableau pour stocker tous les obstacles à l'écran
let obstacleInterval = 90; // Nombre de frames avant de générer un nouvel obstacle
let frameCounter = 0; // Compteur de frames pour la génération d'obstacles

// --- Game Progression Variables ---
let gameSpeed; // Vitesse de défilement du jeu, augmentera avec le temps
const initialGameSpeed = 5;
const gameSpeedAcceleration = 0.001; // Valeur d'accélération par frame
let score = 0;
let highScore = 0;

// --- Background Parallax Variables ---
const NUM_STARS = 100;
const STAR_SPEED_FACTOR = 0.2;
let stars = [];

const NUM_GRID_LINES = 20;
const GRID_LINE_SPEED_FACTOR = 0.5;
let gridLines = [];

// --- Ground Grid Variables ---
let groundGridOffset = 0;
const HORIZON_Y_FACTOR = 0.5; // L'horizon se situe à 50% de la hauteur du sol
const NUM_VERTICAL_GRID_LINES = 30; // Nombre de lignes verticales visibles
const GRID_LINE_SPACING = 50; // Espacement entre les lignes verticales

// --- Post-Processing Effects ---
let glitchActive = false;
let glitchStartFrame = 0;
let nextGlitchTrigger = 0;
const GLITCH_DURATION_FRAMES = 4; // Durée d'un glitch en nombre de frames
const GLITCH_INTERVAL_MIN = 120; // Intervalle minimum entre les glitches (en frames)
const GLITCH_INTERVAL_MAX = 300; // Intervalle maximum


/**
 * Fonction d'initialisation de p5.js.
 * S'exécute une seule fois au chargement du script.
 */
function setup() {
  // Crée un canvas de 800x400 pixels pour le jeu
  let canvas = createCanvas(800, 400);
  // Centre le canvas horizontalement (si nécessaire, géré par CSS mais bon à avoir)
  canvas.parent(document.body);

  // Définit la position Y du sol (à 90% de la hauteur du canvas)
  groundY = height * 0.9;

  // Position initiale du dinosaure
  dinoX = 60;
  setupBackground(); // Initialise les éléments du décor
  resetGame(); // Utilise une fonction pour initialiser/réinitialiser l'état du jeu
}

/**
 * Fonction de dessin de p5.js.
 * S'exécute en boucle (environ 60 fois par seconde).
 */
function draw() {
  // Définit la couleur de fond (la même que le body pour une transition douce)
  background('#1a002b');

  // --- Dessin du décor en parallaxe ---
  drawParallaxBackground();

  // --- Dessin de l'interface (Score) ---
  drawScore();

  // --- Dessin du sol en perspective ---
  drawGround();

  // --- Logique du jeu ---
  if (gameState === 'playing') {
    // Augmente le score, la vitesse et met à jour le défilement du sol
    score++;
    gameSpeed += gameSpeedAcceleration;
    groundGridOffset = (groundGridOffset + gameSpeed) % GRID_LINE_SPACING;

    // --- Glitch Effect Timer ---
    // Si le nombre de frames actuel dépasse le prochain déclencheur, on active le glitch
    if (frameCount > nextGlitchTrigger) {
      glitchActive = true;
      glitchStartFrame = frameCount; // On note quand le glitch a commencé
      // On programme le prochain glitch
      nextGlitchTrigger = frameCount + floor(random(GLITCH_INTERVAL_MIN, GLITCH_INTERVAL_MAX));
    }
    // On désactive le glitch après sa durée définie
    if (glitchActive && frameCount > glitchStartFrame + GLITCH_DURATION_FRAMES) {
      glitchActive = false;
    }
    // --- Logique des obstacles ---
    frameCounter++;
    // Génère un nouvel obstacle à intervalle régulier
    if (frameCounter > obstacleInterval) {
      // 70% de chance pour un obstacle au sol, 30% pour un oiseau
      if (random() < 0.7 || obstacles.length === 0) {
        let obstacleHeight = random(30, 60);
        obstacles.push({
          type: 'ground',
          x: width,
          y: groundY - obstacleHeight,
          width: random(20, 40),
          height: obstacleHeight
        });
      } else {
        obstacles.push({
          type: 'bird',
          x: width,
          y: groundY - dinoSize - random(20, 50), // L'oiseau vole à différentes hauteurs
          width: 35,
          height: 20
        });
      }
      frameCounter = 0;
      obstacleInterval = floor(random(90, 130)); // Rend l'apparition plus imprévisible
    }

    // Applique la gravité à la vélocité verticale du dinosaure
    dinoVelocityY += gravity;
    // Met à jour la position Y du dinosaure
    dinoY += dinoVelocityY;

    // Empêche le dinosaure de tomber à travers le sol
    isDinoOnGround = (dinoY >= groundY - dinoSize / 2);
    if (dinoY > groundY - dinoSize / 2) {
      dinoY = groundY - dinoSize / 2;
      dinoVelocityY = 0;
    }

    // Met à jour l'animation de course si le dinosaure est au sol
    if (isDinoOnGround) {
      dinoAnimationTimer++;
      // On change l'état des jambes toutes les DINO_ANIMATION_SPEED frames
      if (dinoAnimationTimer > DINO_ANIMATION_SPEED) {
        dinoLegsState = (dinoLegsState + 1) % 2; // Alterne entre 0 et 1
        dinoAnimationTimer = 0;
      }
    }

    // --- Dessin du dinosaure ---
    drawDino();

    // --- Mise à jour et dessin des obstacles ---
    for (let i = obstacles.length - 1; i >= 0; i--) {
      let obs = obstacles[i];
      obs.x -= gameSpeed; // Déplace l'obstacle vers la gauche

      // Dessine l'obstacle
      push();
      fill('#ff0055'); // Couleur rose/rouge pour les obstacles
      noStroke();
      if (obs.type === 'ground') {
        rectMode(CORNER);
        rect(obs.x, obs.y, obs.width, obs.height);
      } else { // C'est un oiseau
        // Forme simple en V pour l'oiseau
        translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
        beginShape();
        vertex(-obs.width / 2, 0);
        vertex(0, obs.height / 2);
        vertex(obs.width / 2, 0);
        vertex(0, -obs.height / 4);
        endShape(CLOSE);
      }
      pop();

      // Détection de collision
      if (checkCollision(obs)) {
        gameState = 'gameOver';
      }

      // Supprime les obstacles qui sont sortis de l'écran
      if (obs.x + obs.width < 0) {
        obstacles.splice(i, 1);
      }
    }

  } else if (gameState === 'gameOver') {
    // Affiche l'écran de Game Over
    fill(255);
    textSize(64);
    textAlign(CENTER, CENTER);
    text('GAME OVER', width / 2, height / 2 - 40);
    textSize(20);
    text('Cliquez ou appuyez sur Entrée pour rejouer', width / 2, height / 2 + 20);
    drawDino(); // Continue d'afficher le dino même après la fin
  }

  // --- Post-Processing Effects (dessinés par-dessus tout le reste) ---
  drawPostProcessingEffects();
}

/**
 * Dessine le dinosaure avec une forme plus complexe et un style cyberpunk.
 */
function drawDino() {
  push(); // Sauvegarde le contexte de dessin actuel

  // Se déplace au point d'ancrage du dinosaure (son centre)
  translate(dinoX, dinoY);

  const currentBodyHeight = isCrouching ? DINO_CROUCH_HEIGHT : DINO_NORMAL_HEIGHT;
  const yOffset = isCrouching ? (DINO_NORMAL_HEIGHT - DINO_CROUCH_HEIGHT) / 2 : 0;

  // Style du dinosaure
  const dinoColor = color('#00ffdd'); // Une couleur cyan "cyberpunk"
  const eyeColor = color('#ff0055');  // Un œil rose/rouge vif

  fill(dinoColor);
  noStroke();
  rectMode(CENTER);

  // Corps principal
  rect(0, yOffset, dinoSize, currentBodyHeight);

  // Tête
  rect(dinoSize * 0.35, -dinoSize * 0.3 + yOffset, dinoSize * 0.5, dinoSize * 0.4);

  // Œil
  fill(eyeColor);
  // Ajoute un petit effet de lueur pour l'œil en utilisant le contexte de rendu 2D natif
  drawingContext.shadowBlur = 8;
  drawingContext.shadowColor = eyeColor;
  ellipse(dinoSize * 0.5, -dinoSize * 0.35 + yOffset, 6, 6);

  // Réinitialise l'ombre pour ne pas affecter les autres dessins
  drawingContext.shadowBlur = 0;

  // Queue
  fill(dinoColor);
  triangle(
    -dinoSize * 0.5, 0,             // Point attaché au corps
    -dinoSize * 0.9, -dinoSize * 0.2, // Point supérieur de la queue
    -dinoSize * 0.8, dinoSize * 0.2  // Point inférieur de la queue
  );

  // --- Animation des jambes ---
  if (!isCrouching) { // On ne dessine pas les jambes quand le dino est baissé
    fill(dinoColor);
    rectMode(CENTER);
    const legWidth = 10;
    const legHeight = 22;
    const legY = dinoSize * 0.45; // Position Y du haut des jambes

    if (!isDinoOnGround) {
      // Pose de saut : les deux jambes sont légèrement en arrière
      rect(-dinoSize * 0.15, legY, legWidth, legHeight);
      rect(dinoSize * 0.15, legY, legWidth, legHeight);
    } else {
      // Animation de course
      if (dinoLegsState === 0) {
        // Frame 1 : une jambe devant, une jambe derrière
        rect(-dinoSize * 0.25, legY, legWidth, legHeight); // Jambe arrière
        rect(dinoSize * 0.15, legY, legWidth, legHeight); // Jambe avant
      } else {
        // Frame 2 : inversion des jambes
        rect(-dinoSize * 0.15, legY, legWidth, legHeight); // Jambe avant
        rect(dinoSize * 0.25, legY, legWidth, legHeight); // Jambe arrière
      }
    }
  }

  pop(); // Restaure le contexte de dessin
}

/**
 * Dessine le score actuel et le meilleur score à l'écran.
 */
function drawScore() {
  fill(255, 200); // Blanc avec une légère transparence
  noStroke();
  textAlign(LEFT, TOP);
  textSize(18);
  textFont('monospace'); // Une police qui va bien avec le thème

  text('SCORE: ' + score, 20, 20);
  text('HI: ' + highScore, 20, 45);
}

/**
 * Vérifie la collision entre le dinosaure et un obstacle.
 * @param {object} obstacle - L'obstacle à vérifier.
 * @returns {boolean} - True si il y a collision, sinon false.
 */
function checkCollision(obstacle) {
  const currentBodyHeight = isCrouching ? DINO_CROUCH_HEIGHT : DINO_NORMAL_HEIGHT;
  const yOffset = isCrouching ? (DINO_NORMAL_HEIGHT - DINO_CROUCH_HEIGHT) / 2 : 0;

  // Boîte de collision du dinosaure
  const dinoLeft = dinoX - dinoSize / 2;
  const dinoRight = dinoX + dinoSize / 2;
  const dinoTop = dinoY - currentBodyHeight / 2 + yOffset;
  const dinoBottom = dinoY + currentBodyHeight / 2 + yOffset;

  // Boîte de collision de l'obstacle
  const obsLeft = obstacle.x;
  const obsRight = obstacle.x + obstacle.width;
  const obsTop = obstacle.y;
  const obsBottom = obstacle.y + obstacle.height;

  // Vérifie s'il y a un chevauchement sur les axes X et Y
  return dinoRight > obsLeft && dinoLeft < obsRight && dinoBottom > obsTop && dinoTop < obsBottom;
}

function resetGame() {
  // Met à jour le meilleur score si le score actuel est plus élevé
  if (score > highScore) {
    highScore = score;
  }

  gameState = 'playing';
  obstacles = [];
  dinoY = groundY - dinoSize / 2;
  dinoVelocityY = 0;
  frameCounter = 0;
  score = 0;
  gameSpeed = initialGameSpeed; // Réinitialise la vitesse du jeu
  nextGlitchTrigger = frameCount + floor(random(GLITCH_INTERVAL_MIN, GLITCH_INTERVAL_MAX));
  glitchActive = false;
  isCrouching = false;
}

/**
 * Fonction événementielle de p5.js.
 * S'exécute chaque fois qu'une touche du clavier est pressée.
 */
function keyPressed() {
  // Barre d'espace pour sauter
  if (keyCode === 32) {
    jump();
  }
  // Touche Entrée pour rejouer
  else if (keyCode === ENTER && gameState === 'gameOver') {
    resetGame();
  } 
  // Flèche du bas pour se baisser
  else if (keyCode === DOWN_ARROW) {
    if (isDinoOnGround) { // On ne peut se baisser qu'au sol
      isCrouching = true;
    }
  }
}

function keyReleased() {
  // On se relève quand la flèche du bas est relâchée
  if (keyCode === DOWN_ARROW) {
    isCrouching = false;
  }
}

/**
 * Fonction événementielle de p5.js pour les clics de souris ou les pressions sur écran tactile.
 */
function mousePressed() {
  if (gameState === 'playing') {
    jump();
  } else if (gameState === 'gameOver') {
    resetGame();
  }
}

/**
 * Gère la logique du saut du dinosaure.
 */
function jump() {
  // On ne peut sauter que si le jeu est en cours, que le dino est au sol ET qu'il n'est pas baissé.
  if (gameState === 'playing' && isDinoOnGround && !isCrouching) {
    dinoVelocityY = jumpForce;
  }
}

/**
 * Initialise les éléments du décor en parallaxe.
 */
function setupBackground() {
    // Initialise les étoiles
    for (let i = 0; i < NUM_STARS; i++) {
        stars.push({
            x: random(width),
            y: random(0, groundY),
            size: random(1, 3)
        });
    }

    // Initialise les lignes de la grille
    for (let i = 0; i < NUM_GRID_LINES; i++) {
        gridLines.push({
            x: random(width),
            y: random(0, groundY),
            length: random(20, 100)
        });
    }
}

/**
 * Dessine et met à jour le décor en parallaxe.
 */
function drawParallaxBackground() {
    // --- Couche 1: Étoiles distantes (lentes) ---
    fill(255, 255, 255, 150); // Étoiles blanches et faibles
    noStroke();
    for (let star of stars) {
        ellipse(star.x, star.y, star.size, star.size);
        star.x -= gameSpeed * STAR_SPEED_FACTOR; // Déplace l'étoile

        // Réinitialise l'étoile si elle sort de l'écran
        if (star.x < 0) {
            star.x = width;
            star.y = random(0, groundY);
        }
    }

    // --- Couche 2: Lignes de grille (plus rapides) ---
    stroke(142, 0, 209, 100); // Lignes violettes translucides
    strokeWeight(1);
    for (let gridLine of gridLines) {
        line(gridLine.x, gridLine.y, gridLine.x, gridLine.y + gridLine.length); // Dessine une ligne verticale
        gridLine.x -= gameSpeed * GRID_LINE_SPEED_FACTOR; // Déplace la ligne

        // Réinitialise la ligne si elle sort de l'écran
        if (gridLine.x < 0) {
            gridLine.x = width;
            gridLine.y = random(0, groundY - gridLine.length);
            gridLine.length = random(20, 100);
        }
    }
}

/**
 * Dessine un sol en grille de perspective avec un effet néon qui défile.
 */
function drawGround() {
    push();
    const horizonY = groundY * HORIZON_Y_FACTOR;
    const vanishingPointX = width / 2;

    // Active l'effet de lueur pour les lignes
    const neonColor = color('#00ffdd');
    drawingContext.shadowBlur = 15;
    drawingContext.shadowColor = neonColor;

    // --- Dessine les lignes horizontales (perspective) ---
    const numHorizontalLines = 8;
    stroke(neonColor);
    strokeWeight(1);
    for (let i = 0; i < numHorizontalLines; i++) {
        // On utilise pow() pour que les lignes se resserrent vers l'horizon
        const y = groundY - (groundY - horizonY) * pow(i / numHorizontalLines, 2);
        line(0, y, width, y);
    }

    // --- Dessine les lignes verticales/convergentes (qui défilent) ---
    const numVerticalLines = NUM_VERTICAL_GRID_LINES / 2;
    strokeWeight(1.5);
    for (let i = -numVerticalLines; i <= numVerticalLines; i++) {
        // Calcule la position de base de la ligne au premier plan
        const x_bottom = vanishingPointX + i * GRID_LINE_SPACING - groundGridOffset;

        // Calcule la position de la ligne à l'horizon.
        // Pour une perspective parfaite, elles convergent toutes au même point.
        const x_top = vanishingPointX;

        // Dessine la ligne du premier plan vers le point de fuite
        line(x_bottom, groundY, x_top, horizonY);
    }

    // Dessine une ligne de sol principale plus épaisse
    strokeWeight(3);
    line(0, groundY, width, groundY);

    // Désactive l'effet de lueur pour ne pas affecter les autres éléments
    drawingContext.shadowBlur = 0;
    pop();
}

/**
 * Dessine les effets de post-traitement (scanlines, glitch) sur tout le canvas.
 */
function drawPostProcessingEffects() {
    // --- Effet 1: Scanlines ---
    // Dessine de fines lignes noires très transparentes pour simuler un écran CRT
    stroke(0, 15); // Noir avec une très faible opacité
    strokeWeight(1);
    for (let y = 0; y < height; y += 3) {
        line(0, y, width, y);
    }

    // --- Effet 2: Glitch ---
    if (glitchActive) {
        // Choisit une bande horizontale aléatoire de l'écran
        let y = random(height);
        let h = random(10, 50);
        // Choisit un décalage horizontal aléatoire
        let xOffset = random(-20, 20);

        // S'assure que la bande ne dépasse pas les bords du canvas
        if (y + h > height) {
            h = height - y;
        }
        // Copie la bande de l'écran et la redessine avec le décalage
        copy(0, y, width, h, xOffset, y, width, h);
    }
}

// script.js - Jogo FPS 3D Profissional (VERSÃO FINAL CORRIGIDA)
import * as THREE from 'three';

// ====================================================
// CLASSE PRINCIPAL DO JOGO - Game
// ====================================================
class Game {
    constructor() {
        // Estado do jogo
        this.isRunning = false;
        this.isGameOver = false;
        this.startTime = 0;
        this.currentTime = 0;
        this.deltaTime = 0;
        this.lastTime = 0;
        this.fixedDeltaTime = 1 / 60;
        this.accumulator = 0;
        
        // Estatísticas
        this.kills = 0;
        this.currentWave = 1;
        this.enemiesAlive = 0;
        this.waveKillsNeeded = 5;
        
        // Componentes principais
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.clock = null;
        
        // Sistemas
        this.player = null;
        this.weapon = null;
        this.enemyManager = null;
        this.uiManager = null;
        this.particleSystem = null;
        this.audioManager = null;
        this.inputManager = null;
        this.world = null;
        this.physics = null;
        this.cameraController = null;
        
        // Inicialização
        this.init();
    }
    
    async init() {
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupLights();
        this.setupAudio();
        this.setupManagers();
        this.setupEventListeners();
        
        // Iniciar animação
        this.clock = new THREE.Clock();
        this.animate = this.animate.bind(this);
        this.animate();
        
        console.log('Jogo inicializado com sucesso!');
    }
    
    setupRenderer() {
        const gameContainer = document.getElementById('game-container');
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x0a0a2a);
        
        // Garantir que o canvas esteja no container correto e atrás do HUD
        const existingCanvas = gameContainer.querySelector('canvas');
        if (existingCanvas) existingCanvas.remove();
        
        gameContainer.appendChild(this.renderer.domElement);
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '1';
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a2a);
        this.scene.fog = new THREE.FogExp2(0x0a0a2a, 0.008);
    }
    
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.6, 0);
    }
    
    setupLights() {
        // Luz ambiente
        const ambientLight = new THREE.AmbientLight(0x3a4a6a, 0.8);
        this.scene.add(ambientLight);
        
        // Luz direcional principal
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
        mainLight.position.set(10, 20, 5);
        mainLight.castShadow = true;
        mainLight.receiveShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        this.scene.add(mainLight);
        
        // Luz de preenchimento
        const fillLight = new THREE.PointLight(0x6688ff, 0.5);
        fillLight.position.set(0, 5, 0);
        this.scene.add(fillLight);
        
        // Luz de chão
        const groundLight = new THREE.PointLight(0xff6688, 0.3);
        groundLight.position.set(0, -1, 0);
        this.scene.add(groundLight);
    }
    
    setupAudio() {
        this.audioManager = new AudioManager();
    }
    
    setupManagers() {
        this.inputManager = new InputManager();
        this.world = new World(this.scene);
        this.physics = new Physics();
        this.player = new Player(this.camera, this.inputManager, this.physics, this.world);
        this.weapon = new Weapon(this.camera, this.inputManager, this.audioManager, this);
        this.enemyManager = new EnemyManager(this.scene, this.player, this.physics, this.world);
        this.uiManager = new UIManager();
        this.particleSystem = new ParticleSystem(this.scene);
        this.cameraController = new CameraController(this.camera, this.player, this.weapon);
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        const startBtn = document.getElementById('start-button');
        const restartBtn = document.getElementById('restart-button');
        
        if (startBtn) startBtn.addEventListener('click', () => this.startGame());
        if (restartBtn) restartBtn.addEventListener('click', () => this.restartGame());
        
        // Pointer lock no container do jogo
        const gameContainer = document.getElementById('game-container');
        gameContainer.addEventListener('click', () => {
            if (!this.isRunning && !this.isGameOver) {
                gameContainer.requestPointerLock();
            } else if (this.isRunning && !this.isGameOver) {
                gameContainer.requestPointerLock();
            }
        });
        
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
    }
    
    onPointerLockChange() {
        const gameContainer = document.getElementById('game-container');
        const isLocked = document.pointerLockElement === gameContainer;
        if (this.inputManager) {
            this.inputManager.pointerLock = isLocked;
        }
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    startGame() {
        const startScreen = document.getElementById('start-screen');
        startScreen.classList.remove('active');
        
        this.isRunning = true;
        this.isGameOver = false;
        this.startTime = performance.now();
        this.kills = 0;
        this.currentWave = 1;
        this.waveKillsNeeded = 5;
        
        this.player.reset();
        this.weapon.reset();
        this.enemyManager.reset();
        this.uiManager.updateKills(0);
        this.uiManager.updateWave(1);
        this.uiManager.updateHealth(100);
        
        // Spawn inicial
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                if (this.isRunning) this.enemyManager.spawnEnemy();
            }, i * 500);
        }
        
        this.showMessage('COMBATE INICIADO!', '#33ff66');
        this.audioManager.playSound('start');
    }
    
    restartGame() {
        const gameOverScreen = document.getElementById('game-over-screen');
        gameOverScreen.classList.remove('active');
        this.startGame();
    }
    
    gameOver() {
        this.isRunning = false;
        this.isGameOver = true;
        
        const finalTime = Math.floor((performance.now() - this.startTime) / 1000);
        document.getElementById('final-kills').textContent = this.kills;
        document.getElementById('final-waves').textContent = this.currentWave;
        document.getElementById('final-time').textContent = finalTime;
        
        document.getElementById('game-over-screen').classList.add('active');
        document.exitPointerLock();
        
        this.showMessage('VOCÊ MORREU!', '#ff3366');
        this.audioManager.playSound('gameover');
    }
    
    addKill() {
        this.kills++;
        this.enemiesAlive--;
        this.uiManager.updateKills(this.kills);
        
        if (this.kills >= this.waveKillsNeeded * this.currentWave) {
            this.nextWave();
        }
        
        if (this.kills % 10 === 0 && this.kills > 0) {
            this.enemyManager.increaseDifficulty();
            this.showMessage(`DIFICULDADE AUMENTADA!`, '#ffaa00');
        }
    }
    
    nextWave() {
        this.currentWave++;
        const enemiesToSpawn = Math.min(3 + Math.floor(this.currentWave / 2), 8);
        
        this.uiManager.updateWave(this.currentWave);
        this.showMessage(`ONDA ${this.currentWave} - ${enemiesToSpawn} INIMIGOS`, '#ffaa00');
        
        for (let i = 0; i < enemiesToSpawn; i++) {
            setTimeout(() => {
                if (this.isRunning) this.enemyManager.spawnEnemy();
            }, i * 600);
        }
        
        this.audioManager.playSound('wave');
    }
    
    showMessage(text, color = '#ffffff') {
        const messagesDiv = document.getElementById('game-messages');
        const message = document.createElement('div');
        message.className = 'game-message';
        message.textContent = text;
        message.style.borderLeftColor = color;
        messagesDiv.appendChild(message);
        
        setTimeout(() => message.remove(), 3000);
    }
    
    update(deltaTime) {
        if (!this.isRunning) return;
        
        const dt = Math.min(deltaTime, 0.033);
        
        // ORDEM CORRIGIDA: player update ANTES de processar input
        this.player.update(dt);
        this.weapon.update(dt);
        this.enemyManager.update(dt);
        this.cameraController.update(dt);
        this.particleSystem.update(dt);
        
        // Sistema de hit (raycast) - APENAS UMA VEZ
        this.weapon.checkHits(this.enemyManager.enemies, (enemy, hitPoint) => {
            enemy.takeDamage(this.weapon.damage);
            this.particleSystem.addHitEffect(hitPoint);
            this.audioManager.playSound('hit');
            
            if (enemy.health <= 0) {
                this.addKill();
                this.particleSystem.addDeathEffect(enemy.position);
                this.audioManager.playSound('kill');
            }
        });
        
        this.uiManager.updateHealth(this.player.health);
        this.uiManager.updateAmmo(this.weapon.currentAmmo, this.weapon.reserveAmmo);
        this.uiManager.updateEnemyCount(this.enemyManager.enemies.length);
        
        if (this.player.health <= 0 && this.isRunning) {
            this.gameOver();
        }
        
        // InputManager.update() deve ser o ÚLTIMO
        this.inputManager.update();
    }
    
    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    animate() {
        const now = performance.now();
        let delta = this.lastTime ? Math.min(0.033, (now - this.lastTime) / 1000) : 0.016;
        this.lastTime = now;
        
        this.update(delta);
        this.render();
        
        requestAnimationFrame(() => this.animate());
    }
}

// ====================================================
// INPUT MANAGER - CORRIGIDO (mouse smoothing)
// ====================================================
class InputManager {
    constructor() {
        this.keys = {};
        this.mouseDelta = { x: 0, y: 0 };
        this.mouseSensitivity = 0.002;
        this.pointerLock = false;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') e.preventDefault();
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.pointerLock) {
                this.mouseDelta.x = e.movementX * this.mouseSensitivity;
                this.mouseDelta.y = e.movementY * this.mouseSensitivity;
            }
        });
    }
    
    update() {
        // SMOOTHING do mouse para reduzir tremor
        this.mouseDelta.x *= 0.35;
        this.mouseDelta.y *= 0.35;
        
        if (Math.abs(this.mouseDelta.x) < 0.00001) this.mouseDelta.x = 0;
        if (Math.abs(this.mouseDelta.y) < 0.00001) this.mouseDelta.y = 0;
    }
    
    isKeyPressed(code) {
        return this.keys[code] === true;
    }
}

// ====================================================
// PLAYER - CORRIGIDO (movimentação, pulo, headbob)
// ====================================================
class Player {
    constructor(camera, inputManager, physics, world) {
        this.camera = camera;
        this.input = inputManager;
        this.physics = physics;
        this.world = world;
        
        this.health = 100;
        this.maxHealth = 100;
        this.isAlive = true;
        
        this.position = new THREE.Vector3(0, 1.6, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.isGrounded = false;
        
        this.walkSpeed = 5.0;
        this.runSpeed = 8.0;
        this.acceleration = 20;
        this.deceleration = 15;
        this.jumpForce = 6;
        this.gravity = 20;
        
        this.smoothVelocity = new THREE.Vector3(0, 0, 0);
        
        this.bobbingTime = 0;
        this.bobbingSpeed = 10;
        this.bobbingAmount = 0.025;
        
        this.isRunning = false;
        this.inputDirection = new THREE.Vector3(0, 0, 0);
        
        // Vetores reutilizáveis
        this.forward = new THREE.Vector3();
        this.right = new THREE.Vector3();
        this.moveDir = new THREE.Vector3();
        
        this.init();
    }
    
    init() {
        this.camera.position.copy(this.position);
    }
    
    reset() {
        this.health = this.maxHealth;
        this.isAlive = true;
        this.position.set(0, 1.6, 0);
        this.velocity.set(0, 0, 0);
        this.smoothVelocity.set(0, 0, 0);
        this.camera.position.copy(this.position);
    }
    
    takeDamage(amount) {
        if (!this.isAlive) return;
        
        this.health = Math.max(0, this.health - amount);
        
        const damageOverlay = document.getElementById('damage-overlay');
        damageOverlay.classList.add('active');
        setTimeout(() => damageOverlay.classList.remove('active'), 300);
        
        if (this.health <= 0) {
            this.isAlive = false;
        }
    }
    
    update(deltaTime) {
        if (!this.isAlive) return;
        
        this.handleInput();
        this.updateMovement(deltaTime);
        this.updateHeadBobbing(deltaTime);
        this.updateCamera();
    }
    
    handleInput() {
        this.inputDirection.set(0, 0, 0);
        
        if (this.input.isKeyPressed('KeyW')) this.inputDirection.z += 1;
        if (this.input.isKeyPressed('KeyS')) this.inputDirection.z -= 1;
        if (this.input.isKeyPressed('KeyA')) this.inputDirection.x -= 1;
        if (this.input.isKeyPressed('KeyD')) this.inputDirection.x += 1;
        
        if (this.inputDirection.length() > 0) {
            this.inputDirection.normalize();
        }
        
        this.isRunning = this.input.isKeyPressed('ShiftLeft') && 
                       (this.inputDirection.x !== 0 || this.inputDirection.z !== 0);
        
        // Pulo - CORRIGIDO
        if (this.input.isKeyPressed('Space') && this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
            this.input.keys['Space'] = false;
        }
    }
    
    updateMovement(deltaTime) {
        // Direção baseada na câmera
        this.camera.getWorldDirection(this.forward);
        this.forward.y = 0;
        this.forward.normalize();
        
        // CORREÇÃO: cross product na ordem correta para movimento lateral
        this.right.crossVectors(this.forward, new THREE.Vector3(0, 1, 0));
        
        this.moveDir.set(0, 0, 0);
        this.moveDir.addScaledVector(this.forward, this.inputDirection.z);
        this.moveDir.addScaledVector(this.right, this.inputDirection.x);
        
        if (this.moveDir.length() > 0) {
            this.moveDir.normalize();
        }
        
        const currentMaxSpeed = this.isRunning ? this.runSpeed : this.walkSpeed;
        const targetVelocityX = this.moveDir.x * currentMaxSpeed;
        const targetVelocityZ = this.moveDir.z * currentMaxSpeed;
        
        const accel = this.moveDir.length() > 0 ? this.acceleration : this.deceleration;
        this.smoothVelocity.x += (targetVelocityX - this.smoothVelocity.x) * accel * deltaTime;
        this.smoothVelocity.z += (targetVelocityZ - this.smoothVelocity.z) * accel * deltaTime;
        
        let newPosX = this.position.x + this.smoothVelocity.x * deltaTime;
        let newPosZ = this.position.z + this.smoothVelocity.z * deltaTime;
        
        // Colisões
        if (this.world.checkCollision(new THREE.Vector3(newPosX, this.position.y, this.position.z), 0.4)) {
            newPosX = this.position.x;
            this.smoothVelocity.x = 0;
        }
        
        if (this.world.checkCollision(new THREE.Vector3(this.position.x, this.position.y, newPosZ), 0.4)) {
            newPosZ = this.position.z;
            this.smoothVelocity.z = 0;
        }
        
        this.position.x = newPosX;
        this.position.z = newPosZ;
        
        // Gravidade e pulo
        this.velocity.y -= this.gravity * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        
        this.isGrounded = this.position.y <= 1.6;
        if (this.isGrounded) {
            this.position.y = 1.6;
            this.velocity.y = 0;
        }
        
        if (this.moveDir.length() === 0) {
            this.smoothVelocity.x *= (1 - this.deceleration * deltaTime);
            this.smoothVelocity.z *= (1 - this.deceleration * deltaTime);
        }
    }
    
    updateHeadBobbing(deltaTime) {
        const isMoving = (
            Math.abs(this.smoothVelocity.x) > 0.1 ||
            Math.abs(this.smoothVelocity.z) > 0.1
        ) && this.isGrounded;
        
        let bobY = 0;
        
        if (isMoving) {
            const speedFactor = this.isRunning ? 1.5 : 1;
            this.bobbingTime += deltaTime * this.bobbingSpeed * speedFactor;
            bobY = Math.sin(this.bobbingTime) * this.bobbingAmount;
        } else {
            this.bobbingTime = 0;
        }
        
        // HEADBOB SEM QUEBRAR PULO - usa position.y diretamente
        this.camera.position.y = this.position.y + bobY;
    }
    
    updateCamera() {
        this.camera.position.x = this.position.x;
        this.camera.position.z = this.position.z;
    }
    
    getPosition() {
        return this.position.clone();
    }
}

// ====================================================
// WEAPON - CORRIGIDO (sem disparo duplo, raycast otimizado)
// ====================================================
class Weapon {
    constructor(camera, inputManager, audioManager, game) {
        this.camera = camera;
        this.input = inputManager;
        this.audio = audioManager;
        this.game = game;
        
        this.currentAmmo = 30;
        this.reserveAmmo = 999999; // Munição infinita para teste
        this.maxAmmo = 30;
        this.damage = 34;
        this.fireRate = 0.12;
        this.reloadTime = 2.0;
        this.spread = 0.005;
        this.range = 100;
        
        this.isShooting = false;
        this.isReloading = false;
        this.shootCooldown = 0;
        this.lastShootTime = 0;
        this.hasFiredShot = false; // Prevenir disparo duplo
        
        this.recoilAmount = 0.02;
        this.currentRecoil = 0;
        this.recoilRecovery = 6;
        
        this.swayAmount = 0.0015;
        this.swayX = 0;
        this.swayY = 0;
        
        this.weaponGroup = null;
        this.createWeaponModel();
        
        this.raycaster = new THREE.Raycaster();
        
        this.init();
    }
    
    createWeaponModel() {
        if (!this.camera) return;
        
        this.weaponGroup = new THREE.Group();
        
        const bodyGeo = new THREE.BoxGeometry(0.25, 0.15, 0.6);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(0.15, -0.15, -0.3);
        body.castShadow = true;
        this.weaponGroup.add(body);
        
        const barrelGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.9 });
        const barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0.25, -0.08, -0.55);
        barrel.castShadow = true;
        this.weaponGroup.add(barrel);
        
        const stockGeo = new THREE.BoxGeometry(0.2, 0.12, 0.3);
        const stockMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const stock = new THREE.Mesh(stockGeo, stockMat);
        stock.position.set(-0.1, -0.1, 0.1);
        stock.castShadow = true;
        this.weaponGroup.add(stock);
        
        const magGeo = new THREE.BoxGeometry(0.12, 0.2, 0.1);
        const magMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const mag = new THREE.Mesh(magGeo, magMat);
        mag.position.set(0.08, -0.25, -0.2);
        mag.castShadow = true;
        this.weaponGroup.add(mag);
        
        const sightGeo = new THREE.BoxGeometry(0.08, 0.05, 0.08);
        const sightMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x330000 });
        const sight = new THREE.Mesh(sightGeo, sightMat);
        sight.position.set(0.2, 0, -0.45);
        this.weaponGroup.add(sight);
        
        this.camera.add(this.weaponGroup);
        this.weaponGroup.position.set(0.3, -0.2, -0.5);
    }
    
    init() {
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0 && this.game && this.game.isRunning && !this.game.isGameOver && !this.isReloading) {
                this.startShooting();
            }
        });
        
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.stopShooting();
            }
        });
        
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyR' && this.game && this.game.isRunning && !this.isReloading) {
                this.reload();
                e.preventDefault();
            }
        });
    }
    
    reset() {
        this.currentAmmo = this.maxAmmo;
        this.reserveAmmo = 999999; // Munição infinita para teste
        this.isReloading = false;
        this.isShooting = false;
        this.shootCooldown = 0;
        this.currentRecoil = 0;
        this.hasFiredShot = false;
    }
    
    startShooting() {
        this.isShooting = true;
    }
    
    stopShooting() {
        this.isShooting = false;
    }
    
    shoot() {
        const now = performance.now() / 1000;
        
        if (this.currentAmmo <= 0 || this.shootCooldown > 0 || this.isReloading) return;
        
        this.currentAmmo--;
        this.shootCooldown = this.fireRate;
        this.lastShootTime = now;
        
        this.currentRecoil += this.recoilAmount;
        
        this.animateShoot();
        this.audio.playSound('shoot');
        this.createMuzzleFlash();
        
        this.hasFiredShot = true;
    }
    
    createMuzzleFlash() {
        if (!this.weaponGroup) return;
        
        const flashGeo = new THREE.SphereGeometry(0.05, 6, 6);
        const flashMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1 });
        const flash = new THREE.Mesh(flashGeo, flashMat);
        flash.position.set(0.35, -0.1, -0.7);
        this.weaponGroup.add(flash);
        
        setTimeout(() => {
            if (this.weaponGroup && flash.parent) {
                this.weaponGroup.remove(flash);
            }
        }, 50);
    }
    
    animateShoot() {
        if (!this.weaponGroup) return;
        
        const originalPos = this.weaponGroup.position.clone();
        this.weaponGroup.position.z -= 0.05;
        this.weaponGroup.position.y -= 0.02;
        
        setTimeout(() => {
            if (this.weaponGroup) {
                this.weaponGroup.position.copy(originalPos);
            }
        }, 80);
        
        if (this.game && this.game.cameraController) {
            this.game.cameraController.addShake(0.02);
        }
    }
    
    reload() {
        if (this.currentAmmo === this.maxAmmo || this.reserveAmmo === 0) return;
        
        this.isReloading = true;
        this.audio.playSound('reload');
        
        setTimeout(() => {
            if (!this.game || !this.game.isRunning) return;
            
            const needed = this.maxAmmo - this.currentAmmo;
            const taken = Math.min(needed, this.reserveAmmo);
            this.currentAmmo += taken;
            this.reserveAmmo -= taken;
            this.isReloading = false;
            
            this.game.showMessage('RECARREGADO', '#33ff66');
        }, this.reloadTime * 1000);
    }
    
    update(deltaTime) {
        if (this.shootCooldown > 0) {
            this.shootCooldown -= deltaTime;
        }
        
        if (this.currentRecoil > 0) {
            this.currentRecoil -= deltaTime * this.recoilRecovery * 0.6;
            if (this.currentRecoil < 0) this.currentRecoil = 0;
        }
        
        if (this.input && this.input.mouseDelta) {
            this.swayX += this.input.mouseDelta.x * this.swayAmount;
            this.swayY += this.input.mouseDelta.y * this.swayAmount;
            // SWAY MAIS SUAVE
            this.swayX *= 0.88;
            this.swayY *= 0.88;
        }
        
        if (this.weaponGroup) {
            this.weaponGroup.position.x = 0.3 + this.swayX;
            this.weaponGroup.position.y = -0.2 + this.swayY - this.currentRecoil;
        }
        
        if (this.isShooting && this.shootCooldown <= 0 && !this.isReloading) {
            this.shoot();
        }
    }
    
    // RAYCAST CORRIGIDO - sem disparo duplo
    checkHits(enemies, callback) {
        if (!this.hasFiredShot || !this.camera) return;
        
        this.hasFiredShot = false;
        
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        
        direction.x += (Math.random() - 0.5) * this.spread;
        direction.y += (Math.random() - 0.5) * this.spread;
        
        direction.normalize();
        
        this.raycaster.set(this.camera.position, direction);
        
        let closestEnemy = null;
        let closestHit = null;
        let closestDistance = Infinity;
        
        for (const enemy of enemies) {
            if (!enemy.isAlive || !enemy.model) continue;
            
            const hits = this.raycaster.intersectObject(enemy.model, true);
            
            if (hits.length > 0) {
                const hit = hits[0];
                
                if (hit.distance < this.range && hit.distance < closestDistance) {
                    closestDistance = hit.distance;
                    closestEnemy = enemy;
                    closestHit = hit.point;
                }
            }
        }
        
        if (closestEnemy && closestHit) {
            const hitmarker = document.getElementById('hitmarker');
            
            if (hitmarker) {
                hitmarker.classList.add('active');
                
                setTimeout(() => {
                    hitmarker.classList.remove('active');
                }, 120);
            }
            
            callback(closestEnemy, closestHit);
        }
    }
}

// ====================================================
// ENEMY
// ====================================================
class Enemy {
    constructor(scene, position, player, world, index) {
        this.scene = scene;
        this.position = position.clone();
        this.player = player;
        this.world = world;
        this.index = index;
        
        this.health = 100;
        this.maxHealth = 100;
        this.speed = 2.5;
        this.damage = 15;
        this.attackRange = 1.8;
        this.attackCooldown = 0;
        this.attackDelay = 1.0;
        
        this.model = null;
        this.healthBar = null;
        this.createModel();
        
        this.isAlive = true;
        this.attackTimer = 0;
        
        this.direction = new THREE.Vector3();
    }
    
    createModel() {
        this.model = new THREE.Group();
        this.model.userData.isEnemy = true;
        this.model.userData.enemy = this;
        
        const bodyGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.1, 6);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x442233, metalness: 0.3, roughness: 0.6 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        body.receiveShadow = true;
        body.position.y = 0.55;
        this.model.add(body);
        
        const headGeo = new THREE.SphereGeometry(0.35, 12, 12);
        const headMat = new THREE.MeshStandardMaterial({ color: 0x331122 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.1;
        head.castShadow = true;
        this.model.add(head);
        
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 });
        const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
        leftEye.position.set(-0.12, 1.2, 0.35);
        this.model.add(leftEye);
        
        const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
        rightEye.position.set(0.12, 1.2, 0.35);
        this.model.add(rightEye);
        
        const armMat = new THREE.MeshStandardMaterial({ color: 0x442233 });
        const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.6, 4), armMat);
        leftArm.position.set(-0.45, 0.8, 0);
        leftArm.castShadow = true;
        this.model.add(leftArm);
        
        const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.6, 4), armMat);
        rightArm.position.set(0.45, 0.8, 0);
        rightArm.castShadow = true;
        this.model.add(rightArm);
        
        this.model.position.copy(this.position);
        this.scene.add(this.model);
        
        // Barra de vida simplificada
        const barWidth = 0.8;
        const barHeight = 0.08;
        const barGeo = new THREE.BoxGeometry(barWidth, barHeight, 0.05);
        const barMat = new THREE.MeshStandardMaterial({ color: 0xff3366 });
        this.healthBar = new THREE.Mesh(barGeo, barMat);
        this.healthBar.position.y = 1.4;
        this.model.add(this.healthBar);
        
        const bgGeo = new THREE.BoxGeometry(barWidth, barHeight, 0.05);
        const bgMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const bgBar = new THREE.Mesh(bgGeo, bgMat);
        bgBar.position.z = -0.03;
        this.healthBar.add(bgBar);
    }
    
    updateHealthBar() {
        if (!this.healthBar) return;
        const percent = Math.max(0, this.health / this.maxHealth);
        this.healthBar.scale.x = percent;
        this.healthBar.position.x = (percent - 1) * 0.4;
    }
    
    takeDamage(amount) {
        if (!this.isAlive) return;
        
        this.health = Math.max(0, this.health - amount);
        this.updateHealthBar();
        
        if (this.model) {
            const children = this.model.children;
            for (let child of children) {
                if (child.material && child.material.color) {
                    const originalColor = child.material.color.getHex();
                    child.material.color.setHex(0xff0000);
                    setTimeout(() => {
                        if (child.material) child.material.color.setHex(originalColor);
                    }, 100);
                }
            }
        }
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    die() {
        this.isAlive = false;
        
        if (this.model) {
            setTimeout(() => {
                if (this.model && this.scene) {
                    this.scene.remove(this.model);
                }
            }, 200);
        }
    }
    
    update(deltaTime, allEnemies) {
        if (!this.isAlive || !this.player) return;
        
        if (this.attackTimer > 0) {
            this.attackTimer -= deltaTime;
        }
        
        const playerPos = this.player.getPosition();
        this.direction.subVectors(playerPos, this.position);
        const distance = this.direction.length();
        
        if (distance > 0.01) {
            this.direction.y = 0;
            this.direction.normalize();
        }
        
        if (distance > this.attackRange) {
            const moveDelta = this.direction.clone().multiplyScalar(this.speed * deltaTime);
            let newPos = this.position.clone();
            newPos.x += moveDelta.x;
            newPos.z += moveDelta.z;
            
            let collision = false;
            for (let enemy of allEnemies) {
                if (enemy !== this && enemy.isAlive) {
                    if (newPos.distanceTo(enemy.position) < 0.7) {
                        collision = true;
                        break;
                    }
                }
            }
            
            if (!collision) {
                this.position = newPos;
            }
        }
        
        if (distance <= this.attackRange && this.attackTimer <= 0 && this.player.isAlive) {
            this.attack();
            this.attackTimer = this.attackDelay;
        }
        
        if (this.model && distance > 0.01) {
            const angle = Math.atan2(this.direction.x, this.direction.z);
            this.model.rotation.y = angle;
            this.model.position.copy(this.position);
            this.model.position.y = this.position.y + Math.sin(Date.now() * 0.008) * 0.02;
        }
    }
    
    attack() {
        if (!this.isAlive || !this.player) return;
        
        const playerPos = this.player.getPosition();
        const distance = this.position.distanceTo(playerPos);
        
        if (distance <= this.attackRange + 0.3 && this.player.isAlive) {
            this.player.takeDamage(this.damage);
            
            if (this.model) {
                const originalScale = this.model.scale.clone();
                this.model.scale.set(1.15, 1.15, 1.15);
                setTimeout(() => {
                    if (this.model) this.model.scale.copy(originalScale);
                }, 100);
            }
        }
    }
}

// ====================================================
// ENEMY MANAGER - CORRIGIDO (remoção segura)
// ====================================================
class EnemyManager {
    constructor(scene, player, physics, world) {
        this.scene = scene;
        this.player = player;
        this.physics = physics;
        this.world = world;
        
        this.enemies = [];
        this.maxEnemies = 10;
        this.spawnRadius = 10;
        this.spawnTimer = 0;
        this.spawnDelay = 2;
        
        this.difficultyMultiplier = 1;
    }
    
    spawnEnemy() {
        if (this.enemies.length >= this.maxEnemies) return null;
        
        let position = null;
        let attempts = 0;
        
        while (!position && attempts < 15) {
            const angle = Math.random() * Math.PI * 2;
            const radius = this.spawnRadius + Math.random() * 4;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            const testPos = new THREE.Vector3(x, 0, z);
            
            if (this.world && !this.world.checkCollision(testPos, 0.5) && 
                testPos.distanceTo(this.player.getPosition()) > 4) {
                position = testPos;
            }
            
            attempts++;
        }
        
        if (!position) {
            position = new THREE.Vector3(6, 0, 6);
        }
        
        position.y = 0;
        
        const enemy = new Enemy(this.scene, position, this.player, this.world, this.enemies.length);
        this.enemies.push(enemy);
        
        return enemy;
    }
    
    update(deltaTime) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            if (!enemy.isAlive) {
                // REMOÇÃO SEGURA
                if (enemy.model && enemy.model.parent) {
                    enemy.model.parent.remove(enemy.model);
                }
                
                this.enemies.splice(i, 1);
                continue;
            }
            
            enemy.update(deltaTime, this.enemies);
        }
        
        if (this.spawnTimer <= 0 && this.enemies.length < this.maxEnemies) {
            const targetCount = Math.min(3 + Math.floor(this.difficultyMultiplier), this.maxEnemies);
            
            if (this.enemies.length < targetCount) {
                this.spawnEnemy();
                this.spawnTimer = this.spawnDelay;
            }
        } else {
            this.spawnTimer -= deltaTime;
        }
    }
    
    reset() {
        for (let enemy of this.enemies) {
            if (enemy.model && this.scene) {
                this.scene.remove(enemy.model);
            }
        }
        this.enemies = [];
        this.difficultyMultiplier = 1;
        this.spawnTimer = 0;
    }
    
    increaseDifficulty() {
        this.difficultyMultiplier += 0.1;
        
        for (let enemy of this.enemies) {
            enemy.speed = 2.5 + (this.difficultyMultiplier - 1) * 0.4;
        }
        
        this.maxEnemies = Math.min(12, 10 + Math.floor(this.difficultyMultiplier));
    }
}

// ====================================================
// WORLD
// ====================================================
class World {
    constructor(scene) {
        this.scene = scene;
        this.walls = [];
        this.obstacles = [];
        
        this.createGround();
        this.createWalls();
        this.createObstacles();
        this.createDecoration();
    }
    
    createGround() {
        const gridHelper = new THREE.GridHelper(40, 20, 0x3366ff, 0x2244aa);
        gridHelper.position.y = 0;
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.4;
        this.scene.add(gridHelper);
        
        const groundPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(40, 40),
            new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.8, transparent: true, opacity: 0.5 })
        );
        groundPlane.rotation.x = -Math.PI / 2;
        groundPlane.receiveShadow = true;
        groundPlane.position.y = -0.1;
        this.scene.add(groundPlane);
    }
    
    createWalls() {
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x2a3a5a, metalness: 0.4, roughness: 0.3 });
        
        const wallPositions = [
            { x: 0, z: -18, width: 38, height: 4, depth: 1 },
            { x: 0, z: 18, width: 38, height: 4, depth: 1 },
            { x: -18, z: 0, width: 1, height: 4, depth: 38 },
            { x: 18, z: 0, width: 1, height: 4, depth: 38 }
        ];
        
        for (let pos of wallPositions) {
            const wallGeo = new THREE.BoxGeometry(pos.width, pos.height, pos.depth);
            const wall = new THREE.Mesh(wallGeo, wallMaterial);
            wall.position.set(pos.x, pos.height / 2, pos.z);
            wall.receiveShadow = true;
            wall.castShadow = true;
            this.scene.add(wall);
            this.walls.push(wall);
        }
    }
    
    createObstacles() {
        const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, metalness: 0.5, roughness: 0.4 });
        
        const obstaclePositions = [
            { x: -5, z: -4, w: 1.2, h: 1.2, d: 1.2 },
            { x: 4, z: -5, w: 1.2, h: 1.2, d: 1.2 },
            { x: -4, z: 6, w: 1.2, h: 1.2, d: 1.2 },
            { x: 6, z: 3, w: 1.2, h: 1.2, d: 1.2 },
            { x: -6, z: -3, w: 1.2, h: 1.2, d: 1.2 },
            { x: 3, z: -6, w: 1.2, h: 1.2, d: 1.2 },
            { x: -3, z: -7, w: 1.2, h: 1.2, d: 1.2 },
            { x: 7, z: -2, w: 1.2, h: 1.2, d: 1.2 },
            { x: 0, z: 8, w: 1.5, h: 1, d: 1.5 },
            { x: -7, z: 5, w: 1.5, h: 1, d: 1.5 },
            { x: 5, z: -7, w: 1.5, h: 1, d: 1.5 }
        ];
        
        for (let pos of obstaclePositions) {
            const obstacleGeo = new THREE.BoxGeometry(pos.w, pos.h, pos.d);
            const obstacle = new THREE.Mesh(obstacleGeo, obstacleMaterial);
            obstacle.position.set(pos.x, pos.h / 2, pos.z);
            obstacle.castShadow = true;
            obstacle.receiveShadow = true;
            this.scene.add(obstacle);
            this.obstacles.push(obstacle);
        }
    }
    
    createDecoration() {
        const lightPoleMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.7 });
        
        const lightPositions = [
            { x: -10, z: -10 }, { x: 10, z: -10 }, { x: -10, z: 10 }, { x: 10, z: 10 },
            { x: -6, z: 0 }, { x: 6, z: 0 }, { x: 0, z: -6 }, { x: 0, z: 6 }
        ];
        
        for (let pos of lightPositions) {
            const poleGeo = new THREE.CylinderGeometry(0.2, 0.3, 3, 6);
            const pole = new THREE.Mesh(poleGeo, lightPoleMat);
            pole.position.set(pos.x, 1.5, pos.z);
            pole.castShadow = true;
            this.scene.add(pole);
            
            const light = new THREE.PointLight(0xffaa66, 0.4, 12);
            light.position.set(pos.x, 3, pos.z);
            this.scene.add(light);
        }
    }
    
    checkCollision(position, radius) {
        for (let wall of this.walls) {
            const wallBox = new THREE.Box3().setFromObject(wall);
            const playerBox = new THREE.Box3().setFromCenterAndSize(position, new THREE.Vector3(radius * 2, 1.6, radius * 2));
            
            if (wallBox.intersectsBox(playerBox)) {
                return true;
            }
        }
        
        for (let obstacle of this.obstacles) {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            const playerBox = new THREE.Box3().setFromCenterAndSize(position, new THREE.Vector3(radius * 2, 1.6, radius * 2));
            
            if (obstacleBox.intersectsBox(playerBox)) {
                return true;
            }
        }
        
        if (Math.abs(position.x) > 16 || Math.abs(position.z) > 16) {
            return true;
        }
        
        return false;
    }
}

// ====================================================
// UI MANAGER
// ====================================================
class UIManager {
    constructor() {
        this.healthFill = document.getElementById('health-fill');
        this.healthText = document.getElementById('health-text');
        this.currentAmmo = document.getElementById('current-ammo');
        this.reserveAmmo = document.getElementById('reserve-ammo');
        this.ammoFill = document.getElementById('ammo-fill');
        this.killCount = document.getElementById('kill-count');
        this.enemyCount = document.getElementById('enemy-count');
        this.waveCount = document.getElementById('wave-count');
    }
    
    updateHealth(health) {
        if (!this.healthFill || !this.healthText) return;
        
        const percent = Math.max(0, (health / 100) * 100);
        this.healthFill.style.width = `${percent}%`;
        this.healthText.textContent = Math.floor(health);
        
        if (health < 30) {
            this.healthFill.style.background = 'linear-gradient(90deg, #ff0000, #ff3366)';
        } else if (health < 60) {
            this.healthFill.style.background = 'linear-gradient(90deg, #ffaa00, #ff6600)';
        } else {
            this.healthFill.style.background = 'linear-gradient(90deg, #33ff66, #00ff88)';
        }
    }
    
    updateAmmo(current, reserve) {
        if (!this.currentAmmo || !this.reserveAmmo || !this.ammoFill) return;
        
        this.currentAmmo.textContent = current;
        this.reserveAmmo.textContent = reserve;
        
        const percent = (current / 30) * 100;
        this.ammoFill.style.width = `${percent}%`;
        
        if (current <= 5) {
            this.currentAmmo.style.color = '#ff3366';
            this.ammoFill.style.background = '#ff3366';
        } else {
            this.currentAmmo.style.color = '#ffaa00';
            this.ammoFill.style.background = '#ffaa00';
        }
    }
    
    updateKills(kills) {
        if (this.killCount) this.killCount.textContent = kills;
    }
    
    updateEnemyCount(count) {
        if (this.enemyCount) this.enemyCount.textContent = count;
    }
    
    updateWave(wave) {
        if (this.waveCount) this.waveCount.textContent = wave;
    }
}

// ====================================================
// PARTICLE SYSTEM
// ====================================================
class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
    }
    
    addHitEffect(position) {
        const particleCount = 6;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 0.3;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ color: 0xff6600, size: 0.05 });
        const particles = new THREE.Points(geometry, material);
        particles.position.copy(position);
        
        this.scene.add(particles);
        
        setTimeout(() => {
            if (this.scene) this.scene.remove(particles);
        }, 150);
    }
    
    addDeathEffect(position) {
        const particleCount = 12;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 0.8;
            positions[i * 3 + 1] = Math.random() * 1;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ color: 0xff3366, size: 0.07 });
        const particles = new THREE.Points(geometry, material);
        particles.position.copy(position);
        
        this.scene.add(particles);
        
        setTimeout(() => {
            if (this.scene) this.scene.remove(particles);
        }, 300);
    }
    
    update(deltaTime) {}
}

// ====================================================
// AUDIO MANAGER
// ====================================================
class AudioManager {
    constructor() {
        this.audioContext = null;
        
        document.addEventListener('click', () => {
            this.initAudio();
        });
    }
    
    initAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    playSound(soundName) {
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        switch(soundName) {
            case 'shoot':
                oscillator.type = 'sawtooth';
                oscillator.frequency.value = 200;
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
                oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.1);
                break;
            case 'hit':
                oscillator.type = 'sine';
                oscillator.frequency.value = 800;
                gainNode.gain.setValueAtTime(0.15, now);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
                break;
            case 'kill':
                oscillator.type = 'triangle';
                oscillator.frequency.value = 400;
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
                oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.2);
                break;
            case 'reload':
                oscillator.type = 'square';
                oscillator.frequency.value = 300;
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
                break;
            case 'wave':
                oscillator.type = 'sine';
                oscillator.frequency.value = 600;
                gainNode.gain.setValueAtTime(0.15, now);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
                oscillator.frequency.exponentialRampToValueAtTime(300, now + 0.6);
                break;
            case 'start':
                oscillator.type = 'sine';
                oscillator.frequency.value = 800;
                gainNode.gain.setValueAtTime(0.25, now);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
                oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.3);
                break;
            case 'gameover':
                oscillator.type = 'sawtooth';
                oscillator.frequency.value = 200;
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
                oscillator.frequency.exponentialRampToValueAtTime(100, now + 1);
                break;
            default:
                return;
        }
        
        oscillator.start();
        oscillator.stop(now + (soundName === 'wave' ? 1.2 : 0.4));
    }
}

// ====================================================
// CAMERA CONTROLLER - CORRIGIDO (shake sem tremor)
// ====================================================
class CameraController {
    constructor(camera, player, weapon) {
        this.camera = camera;
        this.player = player;
        this.weapon = weapon;
        
        this.pitch = 0;
        this.yaw = -Math.PI / 2;
        this.shakeAmount = 0;
        this.shakeDecay = 6;
        
        this.targetFOV = 75;
        this.currentFOV = 75;
        this.runFOV = 82;
        this.normalFOV = 75;
    }
    
    addShake(amount) {
        this.shakeAmount = Math.min(this.shakeAmount + amount, 0.12);
    }
    
    update(deltaTime) {
        if (!this.camera || !this.player) return;
        
        if (window.game && window.game.inputManager && window.game.inputManager.pointerLock) {
            const mouseDelta = window.game.inputManager.mouseDelta;
            
            this.yaw -= mouseDelta.x;
            this.pitch -= mouseDelta.y;
            
            this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));
        }
        
        const quaternionYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
        const quaternionPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
        this.camera.quaternion.copy(quaternionYaw).multiply(quaternionPitch);
        
        const originalX = this.player.position.x;
        const originalY = this.camera.position.y;
        
        if (this.shakeAmount > 0) {
            this.camera.position.x = originalX + (Math.random() - 0.5) * this.shakeAmount;
            this.camera.position.y = originalY + (Math.random() - 0.5) * this.shakeAmount;
            this.shakeAmount -= deltaTime * this.shakeDecay;
            if (this.shakeAmount < 0) this.shakeAmount = 0;
        }
        
        if (this.player && this.player.isRunning && this.player.isGrounded) {
            this.targetFOV = this.runFOV;
        } else {
            this.targetFOV = this.normalFOV;
        }
        
        this.currentFOV += (this.targetFOV - this.currentFOV) * deltaTime * 6;
        this.camera.fov = this.currentFOV;
        this.camera.updateProjectionMatrix();
    }
}

// ====================================================
// PHYSICS
// ====================================================
class Physics {
    constructor() {
        this.gravity = -18;
        this.velocity = new THREE.Vector3();
    }
    
    update(deltaTime) {}
}

// ====================================================
// INICIALIZAR
// ====================================================
let game = null;

window.addEventListener('load', () => {
    game = new Game();
    window.game = game;
});
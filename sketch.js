// You can embed this using an iframe in Squarespace by uploading the HTML/JS somewhere like Github Pages or an external host
let shapes = [];
let stages = [];
let currentStage = 0;
let nextStageIndex = 1;
let transitionStart = 0;
let transitioning = false;
let transitionDuration = 3000;
let stageTimer = 0;
let stageDuration = 10000;
let centerX, centerY;
let squiggleAmplitude = 20;
let squiggleFrequency = 5;
let heldShape = null;
let holdStartTime = 0;
let holdDuration = 1500;
let globalSpeedMultiplier = 1;
let speedRampStart = null;
let disappearAfter = 4000;

function setup() {
  squiggleAmplitude = 10 + currentStage * 2;
  squiggleFrequency = 2 + currentStage * 0.2;
  createCanvas(windowWidth, windowHeight);
  centerX = width / 2;
  centerY = height / 2;
  initStages();
  setupStage(currentStage);
}

function draw() {
  let pastelBg = color(240, 230, 255);
  let darkBg = transitioning ? lerpColor(stages[currentStage].bg, stages[nextStageIndex].bg, constrain((millis() - transitionStart) / transitionDuration, 0, 1)) : stages[currentStage].bg;
  let bgBlend = heldShape ? 1 : 0;
  if (!heldShape && millis() - holdStartTime < holdDuration) {
    bgBlend = map(millis() - holdStartTime, 0, holdDuration, 1, 0);
  }
  let blendedBg = lerpColor(pastelBg, darkBg, bgBlend);
  noStroke();
  fill(blendedBg.levels[0], blendedBg.levels[1], blendedBg.levels[2], 10);
  rect(0, 0, width, height);
  let t = transitioning ? (millis() - transitionStart) / transitionDuration : 0;
  t = constrain(t, 0, 1);

  for (let s of shapes) {
    s.update();
    s.display(t);
  }

  if (heldShape) {
    heldShape.overridePosition(mouseX, mouseY);
    if (!speedRampStart) speedRampStart = millis();
    let rampElapsed = millis() - speedRampStart;
    globalSpeedMultiplier = 1 + rampElapsed / 1000;

    if (rampElapsed > disappearAfter) {
      let index = shapes.indexOf(heldShape);
      if (index !== -1) {
        shapes.splice(index, 1);
        shapes.push(new OrbitingShape(
          random(stages[currentStage].shapeTypes),
          random(stages[currentStage].palette),
          random(TWO_PI),
          random(50, min(width, height) / 3),
          random(30, 60)
        ));
      }
      heldShape = null;
      globalSpeedMultiplier = 1;
      speedRampStart = null;
    }
  } else {
    globalSpeedMultiplier = 1;
    speedRampStart = null;
  }

  if (!transitioning && millis() - stageTimer > stageDuration) {
    beginTransition();
  } else if (transitioning && t >= 1) {
    currentStage = nextStageIndex;
    setupStage(currentStage);
    transitioning = false;
  }
}

function mousePressed() {
  for (let s of shapes) {
    if (s.contains(mouseX, mouseY)) {
      heldShape = s;
      holdStartTime = millis();
      s.hold();
      break;
    }
  }
}

function mouseReleased() {
  if (heldShape) {
    heldShape.release();
    heldShape = null;
  }
}

function initStages() {
  for (let i = 0; i < 15; i++) {
    stages.push({
      shapeTypes: ["circle", "square", "triangle", "pentagon"].sort(() => 0.5 - random()).slice(0, 2),
      palette: [
        color(random(100, 255), random(100, 255), random(100, 255), 150),
        color(random(100, 255), random(100, 255), random(100, 255), 150),
        color(random(100, 255), random(100, 255), random(100, 255), 150)
      ],
      bg: color(random(30, 100), random(30, 100), random(30, 100))
    });
  }
}

function setupStage(index) {
  squiggleAmplitude = 10 + index * 2;
  squiggleFrequency = 2 + index * 0.2;
  for (let i = 0; i < shapes.length; i++) {
    shapes[i].startType = shapes[i].targetType;
    shapes[i].targetType = random(stages[index].shapeTypes);
    shapes[i].startColor = shapes[i].targetColor;
    shapes[i].targetColor = random(stages[index].palette);
  }
  while (shapes.length < 15) {
    shapes.push(new OrbitingShape(
      random(stages[index].shapeTypes),
      random(stages[index].palette),
      random(TWO_PI),
      random(50, min(width, height) / 3),
      random(30, 60)
    ));
  }
  transitionStart = millis();
  stageTimer = millis();
  stageDuration = int(random(7000, 15000));
}

function beginTransition() {
  transitioning = true;
  transitionStart = millis();
  nextStageIndex = (currentStage + 1) % stages.length;
}

class OrbitingShape {
  constructor(type, color, angle, radius, size) {
    this.startType = type;
    this.targetType = type;
    this.startColor = color;
    this.targetColor = color;
    this.angle = angle;
    this.radius = radius;
    this.speed = random(0.01, 0.03);
    this.size = size * 2;
    this.isHeld = false;
    this.overrideX = null;
    this.overrideY = null;
  }

  update() {
    if (!this.isHeld) {
      this.angle += this.speed * globalSpeedMultiplier;
    } else {
      this.angle += this.speed * 2 * globalSpeedMultiplier;
    }
  }

  display(t) {
    let squiggle = sin(millis() / 100 + this.radius) * squiggleAmplitude;
    let angleOffset = sin(this.angle * squiggleFrequency) * 0.2;
    let x = this.isHeld ? this.overrideX : centerX + (this.radius + squiggle) * cos(this.angle + angleOffset);
    let y = this.isHeld ? this.overrideY : centerY + (this.radius + squiggle) * sin(this.angle + angleOffset);
    let c = lerpColor(this.startColor, this.targetColor, t);
    fill(c);
    noStroke();
    push();
    translate(x, y);
    this.morphBetweenShapes(t);
    pop();
  }

  morphBetweenShapes(t) {
    beginShape();
    let n = 20;
    let radius = this.size / 2;
    for (let i = 0; i < n; i++) {
      let angle = map(i, 0, n, 0, TWO_PI);
      let shapeA = this.shapeFunction(this.startType, angle);
      let shapeB = this.shapeFunction(this.targetType, angle);
      let x = lerp(shapeA.x, shapeB.x, t) * radius;
      let y = lerp(shapeA.y, shapeB.y, t) * radius;
      vertex(x, y);
    }
    endShape(CLOSE);
  }

  shapeFunction(type, angle) {
    switch (type) {
      case "circle": return { x: cos(angle), y: sin(angle) };
      case "square":
        let a = atan2(sin(angle), cos(angle));
        let s = max(abs(cos(a)), abs(sin(a)));
        return { x: cos(a) / s, y: sin(a) / s };
      case "triangle":
        let idx = floor(angle / (TWO_PI / 3));
        let vertices = [
          { x: 0, y: -1 },
          { x: sqrt(3) / 2, y: 0.5 },
          { x: -sqrt(3) / 2, y: 0.5 }
        ];
        let a1 = map(idx, 0, 3, 0, TWO_PI);
        let a2 = map((idx + 1) % 3, 0, 3, 0, TWO_PI);
        let t2 = (angle - a1) / (a2 - a1);
        let v1 = vertices[idx];
        let v2 = vertices[(idx + 1) % 3];
        return {
          x: lerp(v1.x, v2.x, t2),
          y: lerp(v1.y, v2.y, t2)
        };
      case "pentagon":
        let index = floor(angle / (TWO_PI / 5));
        let v = [];
        for (let i = 0; i < 5; i++) {
          let a = TWO_PI * i / 5 - HALF_PI;
          v.push({ x: cos(a), y: sin(a) });
        }
        let a1p = map(index, 0, 5, 0, TWO_PI);
        let a2p = map((index + 1) % 5, 0, 5, 0, TWO_PI);
        let t2p = (angle - a1p) / (a2p - a1p);
        let v1p = v[index];
        let v2p = v[(index + 1) % 5];
        return {
          x: lerp(v1p.x, v2p.x, t2p),
          y: lerp(v1p.y, v2p.y, t2p)
        };
      default:
        return { x: cos(angle), y: sin(angle) };
    }
  }

  contains(px, py) {
    let squiggle = sin(millis() / 100 + this.radius) * squiggleAmplitude;
    let angleOffset = sin(this.angle * squiggleFrequency) * 0.2;
    let x = centerX + (this.radius + squiggle) * cos(this.angle + angleOffset);
    let y = centerY + (this.radius + squiggle) * sin(this.angle + angleOffset);
    return dist(px, py, x, y) < this.size / 2;
  }

  hold() {
    this.isHeld = true;
  }

  release() {
    this.isHeld = false;
    this.overrideX = null;
    this.overrideY = null;
  }

  overridePosition(x, y) {
    this.overrideX = x;
    this.overrideY = y;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  centerX = width / 2;
  centerY = height / 2;
}

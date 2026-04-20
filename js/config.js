window.APP_CONFIG = {
  width: 1920,
  height: 1080,

  assets: {
    startVasilisa: "./assets/Василиса_3.png",
    itemVasilisa: "./assets/Василиса_3.png",
    scrollImage: "./assets/scroll.png",

    // Фон overlay-экранов (старт / выбор предмета / win / lose).
    overlayBackground: "./assets/back.png",

    // Полноэкранный фон. Если не нужен, оставьте пустую строку.
    gameplayBackground: "",

    // Герои в сцене погони.
    heroIvan: "./assets/heroIvan.png",
    heroVasilisa: "./assets/heroVasilisa.png",

    // Погоня.
    chaserMain: "./assets/chaserLeft.png",
    chaserLeft: "./assets/chaserLeft.png",
    chaserRight: "./assets/chaserLeft.png",

    // Иллюстрации финальных экранов.
    loseChaser: "./assets/loseChaser.png",
    loseHeroes: "./assets/loseHeroes.png",
    winVasilisa: "./assets/Василиса_3.png",
    winIvan: "./assets/Иван_нарядный.png",
  },

  // PNG-слои фона. Любой слой можно отключить, оставив src пустым.
  // speed: 0 = неподвижно, 1 = двигается вместе с миром, 0.2/0.4/0.7 = параллакс.
  // repeatX: true = тайлить по горизонтали.
  layers: [
    {
      id: "sky",
      src: "./assets/sky.png",
      speed: 0,
      y: 0,
      width: 1920,
      height: 1080,
      repeatX: false,
    },
    {
      id: "mountains",
      src: "./assets/mountains.png",
      speed: 0.18,
      y: 130,
      width: 1920,
      height: 860,
      repeatX: true,
    },
    {
      id: "treesFar",
      src: "./assets/treesFront.png",
      speed: 0.38,
      y: 300,
      width: 1000,
      height: 700,
      repeatX: true,
    },
    {
      id: "treesFront",
      src: "./assets/treesFront.png",
      speed: 0.62,
      y: 170,
      width: 2000,
      height: 1040,
      repeatX: true,
    },
    {
      id: "groundDecor",
      src: "./assets/groundDecor.png",
      speed: 0.92,
      y: 460,
      width: 1400,
      height: 620,
      repeatX: true,
    },
  ],

  spriteLayout: {
    heroIvan: {
      width: 200,
      height: 150,
      offsetX: 40,
      offsetY: 10,
      bob: 6,
    },
    heroVasilisa: {
      width: 190,
      height: 150,
      offsetX: -28,
      offsetY: 10,
      bob: 6,
    },
    chaserMain: {
      width: 160,
      height: 140,
      offsetX: 0,
      offsetY: 10,
      bob: 6,
    },
    chaserLeft: {
      width: 160,
      height: 140,
      offsetX: -132,
      offsetY: 10,
      bob: 6,
    },
    chaserRight: {
      width: 160,
      height: 140,
      offsetX: 132,
      offsetY: 10,
      bob: 6,
    },

    // Layout предметов. Ключ должен совпадать с items[].id.
    brush: {
      width: 700,
      height: 400,
      offsetX: 260,
      offsetY: 560,
    },
    comb: {
      width: 600,
      height: 650,
      offsetX: 180,
      offsetY: 400,
    },
    towel: {
      width: 600,
      height: 400,
      offsetX: 380,
      offsetY: 600,
    },
  },

  worldLength: 11600,
  finishX: 10200,
  tapBoost: 36,
  tapDecayPerSecond: 170,
  heroBaseSpeed: 148,
  chaserBaseSpeed: 156,
  loseDistance: 170,
  checkpoints: [0.22, 0.5, 0.77],

  items: [
    {
      id: "brush",
      title: "Щётка",
      icon: "🪥",
      description: "Выращивает дремучий лес и задерживает погоню.",
      message:
        "Щётка вырастит перед царём густой лес и запутает дружину в чащобе.",
      slowMultiplier: 0.82,
      duration: 4.8,
      obstacleType: "forest",
      sprite: "./assets/brush.png",
    },
    {
      id: "comb",
      title: "Гребёнка",
      icon: "🪮",
      description: "Поднимает горы и отрезает короткий путь.",
      message:
        "Гребёнка превратится в горную гряду и отрежет царю короткий путь.",
      slowMultiplier: 0.8,
      duration: 4.4,
      obstacleType: "mountains",
      sprite: "./assets/comb.png",
    },
    {
      id: "towel",
      title: "Полотенце",
      icon: "🧣",
      description: "Создаёт бурную реку и сильно замедляет врага.",
      message:
        "Полотенце станет бурной рекой и серьёзно задержит преследователей.",
      slowMultiplier: 0.58,
      duration: 3.8,
      obstacleType: "river",
      sprite: "./assets/towel.png",
    },
  ],

  startTextBefore:
    "Привет добрые молодцы и девушки, помогите мне с моим возлюбленным Иваном сбежать от царя батюшки.",
  startTextAfter: "Быстро тапайте по экрану чтобы помочь нам!",
  itemPrompt:
    "У меня есть волшебные предметы. Выберите один, и я создам преграду для царя и дружины.",
};

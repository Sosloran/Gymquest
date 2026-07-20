// seed.js v3 — Cardinal. Datos de dominio público.
const svg = (emoji)=>`data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><text x='50%' y='55%' font-size='52' text-anchor='middle' dominant-baseline='middle'>${encodeURIComponent(emoji)}</text></svg>`;

const INFLUENCERS = [
  { id:'hemsworth', name:'Chris Hemsworth (estilo)', style:'Funcional / Fuerza', goal:'Cuerpo atlético funcional', note:'Inspirado en programas de entrenamiento funcional tipo Hero. Representativo, no asesoría médica.',
    routine:[ {day:'Lunes',focus:'Tren superior',exercises:['Press militar 4x8','Dominadas 4x8','Remo 4x10','Flexiones 3x15']},
      {day:'Martes',focus:'Pierna',exercises:['Sentadilla 4x8','Peso muerto 4x6','Zancadas 3x12','Pantorrilla 4x15']},
      {day:'Miércoles',focus:'Funcional',exercises:['Burpees 4x12','Kettlebell swing 4x15','Battle rope 3x40s','Plancha 3x60s']},
      {day:'Jueves',focus:'Descanso activo',exercises:['Caminata 30 min','Estiramientos']},
      {day:'Viernes',focus:'Full body',exercises:['Clean & press 4x6','Sentadilla 4x8','Dominadas 4x8','Abdominales 3x20']},
      {day:'Sábado',focus:'Cardio',exercises:['HIIT 20 min','Natación 20 min']},
      {day:'Domingo',focus:'Descanso',exercises:['Movilidad']} ] },
  { id:'nippard', name:'Jeff Nippard (estilo)', style:'Ciencia / Hipertrofia', goal:'Hipertrofia basada en evidencia', note:'Inspirado en enfoques de fuerza y volumen científico. Representativo.',
    routine:[ {day:'Lunes',focus:'Pecho + Tríceps',exercises:['Press banca 4x8','Press inclinado 3x10','Aperturas 3x12','Extensiones polea 3x12']},
      {day:'Martes',focus:'Espalda + Bíceps',exercises:['Jalón 4x10','Remo 4x10','Peso muerto 3x6','Curl 3x12']},
      {day:'Miércoles',focus:'Pierna',exercises:['Sentadilla 4x10','Prensa 3x12','Curl femoral 3x12','Pantorrilla 4x15']},
      {day:'Jueves',focus:'Hombro + Core',exercises:['Elevaciones 3x12','Press militar 3x10','Facepull 3x15','Plancha 3x60s']},
      {day:'Viernes',focus:'Full body',exercises:['Press banca 4x8','Sentadilla 4x8','Dominadas 3x8','Abdominales 3x20']},
      {day:'Sábado',focus:'Cardio ligero',exercises:['Bicicleta 30 min']},
      {day:'Domingo',focus:'Descanso',exercises:['Movilidad']} ] },
  { id:'ana', name:'Ana Coach (estilo)', style:'Tonificación femenina', goal:'Tonificar y energía', note:'Inspirado en entrenamiento de tonificación y bienestar. Representativo.',
    routine:[ {day:'Lunes',focus:'Glúteo + Pierna',exercises:['Sentadilla sumo 4x12','Hip thrust 4x12','Zancadas 3x12','Patada glúteo 3x15']},
      {day:'Martes',focus:'Upper',exercises:['Flexiones 3x12','Remo 3x12','Elevaciones 3x12','Plancha 3x45s']},
      {day:'Miércoles',focus:'Cardio',exercises:['HIIT 20 min','Abdominales 3x20']},
      {day:'Jueves',focus:'Pierna',exercises:['Sentadilla 4x12','Prensa 3x12','Pantorrilla 4x15']},
      {day:'Viernes',focus:'Full body',exercises:['Burpees 3x10','Dominadas 3x8','Plancha 3x60s']},
      {day:'Sábado',focus:'Yoga / Movilidad',exercises:['Yoga 30 min']},
      {day:'Domingo',focus:'Descanso',exercises:['Caminata']} ] }
];

const DIETS = [
  { id:'volumen', name:'Volumen (ganar músculo)', kcalNote:'Superávit ~300 kcal', macros:{protein:'1.8-2.2 g/kg',carbs:'4-6 g/kg',fat:'0.8-1 g/kg'},
    meals:[['Desayuno','Avena + plátano + huevos + mantequilla de maní'],['Almuerzo','Arroz + pechuga + brócoli + aceite oliva'],['Cena','Pasta integral + carne magra + ensalada'],['Snack','Batido proteico + frutos secos']] },
  { id:'definicion', name:'Definición (bajar grasa)', kcalNote:'Déficit ~400 kcal', macros:{protein:'2.2-2.5 g/kg',carbs:'2-3 g/kg',fat:'0.6-0.8 g/kg'},
    meals:[['Desayuno','Huevos revueltos + espinaca + tostada integral'],['Almuerzo','Pechuga a la plancha + quinoa + verduras'],['Cena','Pescado + ensalada grande'],['Snack','Yogur griego + fruta']] },
  { id:'mantenimiento', name:'Mantenimiento', kcalNote:'Calorías de mantenimiento (TDEE)', macros:{protein:'1.6-2 g/kg',carbs:'3-4 g/kg',fat:'0.8-1 g/kg'},
    meals:[['Desayuno','Tostada + huevo + aguacate'],['Almuerzo','Arroz + carne + vegetales'],['Cena','Legumbres + verdura + aceite'],['Snack','Fruta + frutos secos']] }
];

const EXERCISES = [
  {name:'Sentadilla',icon:svg('🏋️'),muscle:'Pierna',type:'Fuerza',tips:'Espalda recta, rodillas alineadas con pies.'},
  {name:'Peso muerto',icon:svg('💪'),muscle:'Pierna/Espalda',type:'Fuerza',tips:'Hombros atrás, cadera atrás, core firme.'},
  {name:'Press banca',icon:svg('🛏️'),muscle:'Pecho',type:'Fuerza',tips:'Escápulas juntas, barra al pecho medio.'},
  {name:'Dominadas',icon:svg('🧗'),muscle:'Espalda',type:'Fuerza',tips:'Cuerpo estable, mentón sobre la barra.'},
  {name:'Hip thrust',icon:svg('🍑'),muscle:'Glúteo',type:'Hipertrofia',tips:'Barra en cadera, sube hasta alinear.'},
  {name:'Burpees',icon:svg('🔥'),muscle:'Full body',type:'Cardio',tips:'Explosivo, ritmo constante.'},
  {name:'Plancha',icon:svg('🧘'),muscle:'Core',type:'Isométrico',tips:'Cuerpo recto, glúteos contraídos.'},
  {name:'Remo',icon:svg('🚣'),muscle:'Espalda',type:'Fuerza',tips:'Tira hacia el ombligo, codo cerca del cuerpo.'},
  {name:'Curl de bíceps',icon:svg('💪'),muscle:'Bíceps',type:'Hipertrofia',tips:'Codo fijo, sube controlado.'},
  {name:'Elevaciones laterales',icon:svg('🤸'),muscle:'Hombro',type:'Hipertrofia',tips:'Codos semi-flexionados, sube a la altura del hombro.'}
];

const QUOTES = [
  'El gym no es un castigo, es un privilegio.','No te obsesiones con el peso, obsesióname con la constancia.',
  'Cada rep cuenta. Cada día cuenta.','Tu cuerpo puede mucho más de lo que tu mente cree.',
  'La disciplina es el puente entre metas y logros.','No tienes que ser extremo, solo consistente.',
  'El hierro no miente: lo que pones, recibes.','Hoy es el día que tu yo del futuro agradecerá.',
  'Una racha no se rompe por un mal día, se rompe por dejar de empezar.','El 80% es aparecer.'
];

const RANKS = [ {min:0,name:'Novato del Sofá'},{min:100,name:'Aprendiz de Hierro'},{min:300,name:'Guerrero del Gimnasio'},{min:600,name:'Atlética/Atlético'},{min:1000,name:'Maestro del Fuerzo'},{min:1500,name:'Leyenda del Hierro'},{min:2500,name:'Mitología del Hierro'} ];
const MISSIONS = { daily:['Entrena hoy 30 min','Bebe 6 vasos de agua','Come 1 comida alta en proteína','Estira 5 min'], weekly:['Entrena 4 días','Quema 1500 kcal','Duerme 7 h promedio','Prueba una rutina nueva'] };
const ACHIEVEMENTS = [
  {id:'first',name:'Primer Paso',desc:'Completa tu 1ª sesión'},{id:'streak7',name:'Semana Imparable',desc:'7 días seguidos'},
  {id:'ten',name:'Diez Sesiones',desc:'10 entrenamientos'},{id:'fifty',name:'Medio Centenar',desc:'50 entrenamientos'},
  {id:'hundred',name:'Centurión',desc:'100 entrenamientos'},{id:'boss1',name:'Cazaboss',desc:'Vence 1 jefe semanal'},
  {id:'measure1',name:'Cartógrafo',desc:'Registra tus medidas'},{id:'photo1',name:'Antes y Después',desc:'Sube una foto de progreso'},
  {id:'pr1',name:'Nuevo Récord',desc:'Marca un PR'},{id:'hydration',name:'Hidratado',desc:'10 días de agua al día'},
  {id:'early',name:'Madrugador',desc:'Entrena antes de las 9am'},{id:'pro',name:'Cardinal Pro',desc:'Activa Cardinal Pro'}
];
const SHOP = [
  {id:'theme_gold',name:'Tema Dorado',cost:200,type:'theme'},{id:'avatar_warrior',name:'Avatar Guerrero',cost:300,type:'avatar'},
  {id:'avatar_legend',name:'Avatar Leyenda',cost:800,type:'avatar'},{id:'confetti_rain',name:'Confeti Extremo',cost:150,type:'effect'},
  {id:'pet_dog',name:'Mascota: Bulldog',cost:500,type:'pet'},{id:'frame_fire',name:'Marco Llama',cost:250,type:'frame'}
];
const COSMETICS = SHOP;
const THEMES = [ {id:'dark',name:'Oscuro',bg:'#0f172a',panel:'#1e293b'},{id:'light',name:'Claro',bg:'#f1f5f9',panel:'#ffffff'},{id:'gold',name:'Dorado',bg:'#1a1505',panel:'#2a2308'},{id:'neon',name:'Neón',bg:'#0a0a1a',panel:'#15152e'} ];
const HABITS = [ {id:'water',name:'💧 Beber agua',xp:5},{id:'sleep',name:'😴 Dormir 7h',xp:10},{id:'steps',name:'🚶 8.000 pasos',xp:8},{id:'stretch',name:'🧘 Estirar',xp:5},{id:'fruit',name:'🍎 Comer fruta',xp:5},{id:'read',name:'📚 Leer 10 min',xp:5} ];
const RECIPES = [
  {name:'Batido de recuperación',tag:'Proteína',ing:'Leche + plátano + avena + proteína',kcal:350},
  {name:'Bowl de atún',tag:'Almuerzo',ing:'Atún + arroz + aguacate + tomate',kcal:450},
  {name:'Pechuga al limón',tag:'Cena',ing:'Pechuga + limón + brócoli al vapor',kcal:300},
  {name:'Huevos revueltos',tag:'Desayuno',ing:'3 huevos + espinaca + aceite',kcal:280},
  {name:'Tostada de aguacate',tag:'Snack',ing:'Pan integral + aguacate + huevo',kcal:320}
];
const TIPS = [
  'Entrena grande primero: pierna y espalda queman más calorías.',
  'Duerme 7-9 h: es cuando crece el músculo.',
  'Come 1.6-2.2 g de proteína por kg de peso para ganar músculo.',
  'Calienta 5 min antes de levantar carga pesada.',
  'Sube el peso solo cuando domines la técnica.',
  'La constancia vence a la intensidad. Mejor 3 días/semana siempre.',
  'Hidrátate: el músculo es 70% agua.',
  'Registra tus PRs para ver progreso real, no solo el espejo.'
];
const MONETIZATION = {
  paypal: '', // <- pega aquí tu correo/link de PayPal (ej: https://paypal.me/tucuenta)
  crypto: { btc:'', eth:'', usdt:'' }, // <- direcciones de billetera
  proPrice: 9.99,
  note: 'Cardinal no cobra nada: TODO el dinero va a tu billetera. Solo configura tus datos en Ajustes > Monetización.'
};

module.exports = { INFLUENCERS, DIETS, EXERCISES, QUOTES, RANKS, MISSIONS, ACHIEVEMENTS, SHOP, COSMETICS, THEMES, HABITS, RECIPES, TIPS, MONETIZATION };

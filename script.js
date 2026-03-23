/* Chaves de Armazenamento */
const STORAGE_KEY = 'kenay_2025_transactions_v1';
const CAT_KEY = 'kenay_2025_categories_v1';
const SALARY_KEY = 'kenay_2025_salary_v1';

/* DOM Elements */
const salaryInput = document.getElementById('salaryInput');
const divisionStrategy = document.getElementById('divisionStrategy');
const valFixed = document.getElementById('valFixed');
const valInvest = document.getElementById('valInvest');
const valLeisure = document.getElementById('valLeisure');

// ... (seus seletores originais de incomeValue, expenseValue, etc.) ...

/* Estado Inicial */
let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let categories = JSON.parse(localStorage.getItem(CAT_KEY) || 'null');
let salaryData = JSON.parse(localStorage.getItem(SALARY_KEY) || '{"value": 0, "strategy": "70,20,10"}');

if(!categories){
  categories = [
    { id: 'alimentacao', name: 'Alimentação', type: 'fixed' },
    { id: 'aluguel', name: 'Aluguel', type: 'fixed' },
    { id: 'invest', name: 'Investimento', type: 'invest' },
    { id: 'lazer', name: 'Lazer', type: 'leisure' }
  ];
  saveCategories();
}

/* Lógica de Planejamento */
function calculateSalaryAllocation() {
  const salary = parseFloat(salaryInput.value) || 0;
  const [pFixed, pInvest, pLeisure] = divisionStrategy.value.split(',').map(Number);

  const targets = {
    fixed: salary * (pFixed / 100),
    invest: salary * (pInvest / 100),
    leisure: salary * (pLeisure / 100)
  };

  valFixed.textContent = formatBRL(targets.fixed);
  valInvest.textContent = formatBRL(targets.invest);
  valLeisure.textContent = formatBRL(targets.leisure);

  salaryData = { value: salary, strategy: divisionStrategy.value };
  localStorage.setItem(SALARY_KEY, JSON.stringify(salaryData));
  
  return targets;
}

/* Scanner Ativo (Refatorado para mostrar Metas vs Real) */
function drawScanner(){
  const ctx = scannerCanvas.getContext('2d');
  const w = scannerCanvas.width, h = scannerCanvas.height;
  const cx=w/2, cy=h/2, r=Math.min(w,h)/2 - 20;
  ctx.clearRect(0,0,w,h);

  const targets = calculateSalaryAllocation();
  
  // Calcular quanto já foi gasto em cada pilar
  const realExpenses = { fixed: 0, invest: 0, leisure: 0 };
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const cat = categories.find(c => c.id === t.category);
    const pilar = cat?.type || 'fixed'; // padrão fixo se não achar
    realExpenses[pilar] += t.amount;
  });

  const drawArc = (index, current, total, color) => {
    const startAngle = -Math.PI / 2;
    const progress = Math.min(current / (total || 1), 1);
    const endAngle = startAngle + (progress * Math.PI * 2);
    
    // Background arc (vazio)
    ctx.beginPath();
    ctx.arc(cx, cy, r - (index * 25), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 15;
    ctx.stroke();

    // Foreground arc (progresso)
    ctx.beginPath();
    ctx.arc(cx, cy, r - (index * 25), startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  drawArc(0, realExpenses.fixed, targets.fixed, '#00eaff');
  drawArc(1, realExpenses.invest, targets.invest, '#00ff88');
  drawArc(2, realExpenses.leisure, targets.leisure, '#ffcc00');

  // Texto central
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = '12px Inter';
  ctx.fillText("Status de Metas", cx, cy);
}

/* Inicialização */
function init() {
  salaryInput.value = salaryData.value || '';
  divisionStrategy.value = salaryData.strategy;
  
  salaryInput.oninput = () => { drawAll(); };
  divisionStrategy.onchange = () => { drawAll(); };
  
  // (mantenha todos os seus outros event listeners originais aqui)
  
  drawAll();
}

// Chame init() ao final
init();

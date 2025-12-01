/* armazenamento local */
const STORAGE_KEY = 'kenay_2025_transactions_v1';
const CAT_KEY = 'kenay_2025_categories_v1';

/* DOM */
const incomeValue = document.getElementById('incomeValue');
const expenseValue = document.getElementById('expenseValue');
const balanceValue = document.getElementById('balanceValue');

const btnNewTransaction = document.getElementById('btnNewTransaction');
const btnAddExpense = document.getElementById('btnAddExpense');
const btnAddIncome = document.getElementById('btnAddIncome');
const btnManageCategories = document.getElementById('btnManageCategories');

const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalType = document.getElementById('modalType');
const modalCategory = document.getElementById('modalCategory');
const modalDescription = document.getElementById('modalDescription');
const modalAmount = document.getElementById('modalAmount');
const modalDate = document.getElementById('modalDate');
const modalSave = document.getElementById('modalSave');
const modalCancel = document.getElementById('modalCancel');

const modalCat = document.getElementById('modalCat');
const catList = document.getElementById('catList');
const newCatName = document.getElementById('newCatName');
const addCatBtn = document.getElementById('addCatBtn');
const closeCat = document.getElementById('closeCat');

const categoriesListEl = document.getElementById('categoriesList');

const scannerCanvas = document.getElementById('scannerChart');
const activityCanvas = document.getElementById('activityChart');

/* dados iniciais */
let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let categories = JSON.parse(localStorage.getItem(CAT_KEY) || 'null');

if(!categories){
  categories = [
    { id: 'alimentacao', name: 'Alimentação' },
    { id: 'aluguel', name: 'Aluguel' },
    { id: 'energia', name: 'Energia+Água+Internet' },
    { id: 'outros', name: 'Outros' }
  ];
  saveCategories();
}

function saveCategories(){ localStorage.setItem(CAT_KEY, JSON.stringify(categories)); }
function saveTransactions(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }

/* ---------- UI helpers ---------- */
function formatBRL(v){ return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }

function calcTotals(){
  const income = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  return { income, expense, balance: income - expense };
}

function renderTotals(){
  const t = calcTotals();
  incomeValue.textContent = formatBRL(t.income);
  expenseValue.textContent = formatBRL(t.expense);
  balanceValue.textContent = formatBRL(t.balance);
  balanceValue.style.color = t.balance < 0 ? '#ff6b6b' : '';
}

/* ---------- Categories UI ---------- */
function renderCategorySelect(){
  modalCategory.innerHTML = '';
  categories.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.name;
    modalCategory.appendChild(opt);
  });
}

function renderCategoriesList(){
  categoriesListEl.innerHTML = '';
  // calcular total por categoria
  const totals = {};
  categories.forEach(c=> totals[c.id]=0);
  transactions.filter(t=>t.type==='expense').forEach(t=>{
    if(!totals[t.category]) totals[t.category]=0;
    totals[t.category] += t.amount;
  });

  const totalExpense = Object.values(totals).reduce((s,v)=>s+v,0) || 1;

  categories.forEach(cat=>{
    const row = document.createElement('div');
    row.className='cat-row';
    const name = document.createElement('div'); name.className='cat-name'; name.textContent = cat.name;
    const progress = document.createElement('div'); progress.className='progress';
    const inner = document.createElement('i');
    const pct = Math.round((totals[cat.id]||0)/totalExpense*100);
    inner.style.width = pct + '%';
    progress.appendChild(inner);

    const val = document.createElement('div'); val.style.minWidth='90px'; val.style.textAlign='right'; val.textContent = formatBRL(totals[cat.id]||0);

    row.appendChild(name); row.appendChild(progress); row.appendChild(val);
    categoriesListEl.appendChild(row);
  });
}

/* ---------- Modais ---------- */
let editingIndex = -1;

function openModal(type='expense', data=null){
  modal.classList.remove('hidden');
  modalType.value = type;
  modalTitle.textContent = data ? 'Editar Transação' : (type==='expense'?'Nova Despesa':'Nova Entrada');
  modalDescription.value = data?.description||'';
  modalAmount.value = data?.amount||'';
  modalDate.value = data?.date || new Date().toISOString().slice(0,10);
  modalCategory.value = data?.category || categories[0].id;
  editingIndex = data?.index ?? -1;
}

function closeModal(){
  modal.classList.add('hidden');
  editingIndex = -1;
}

/* modal categorias */
function openCatModal(){ modalCat.classList.remove('hidden'); renderCatList(); }
function closeCatModal(){ modalCat.classList.add('hidden'); }

function renderCatList(){
  catList.innerHTML='';
  categories.forEach(cat=>{
    const row = document.createElement('div');
    row.style.display='flex'; row.style.justifyContent='space-between'; row.style.alignItems='center';
    row.style.marginBottom='8px';
    const lbl = document.createElement('div'); lbl.textContent=cat.name;
    const actions = document.createElement('div');
    const del = document.createElement('button'); del.textContent='Remover'; del.className='btn';
    del.onclick = ()=>{ categories = categories.filter(c=>c.id!==cat.id); saveCategories(); renderCategorySelect(); renderCatList(); renderCategoriesList(); drawAll(); };
    actions.appendChild(del);
    row.appendChild(lbl); row.appendChild(actions);
    catList.appendChild(row);
  });
}

/* ---------- Transações ---------- */
function addTransaction(obj){
  transactions.push(obj); saveTransactions(); renderCategoriesList(); renderTotals(); drawAll();
}

function updateTransaction(index, obj){
  transactions[index] = obj; saveTransactions(); renderCategoriesList(); renderTotals(); drawAll();
}

/* ---------- Charts simples em Canvas ---------- */

/* Scanner: pizza-like showing expense vs income */
function drawScanner(){
  const ctx = scannerCanvas.getContext('2d');
  const w = scannerCanvas.width, h = scannerCanvas.height;
  ctx.clearRect(0,0,w,h);
  // background circle
  const cx=w/2, cy=h/2, r=Math.min(w,h)/2 - 10;
  ctx.save();
  // glow
  const g = ctx.createRadialGradient(cx,cy,10,cx,cy,r);
  g.addColorStop(0,'rgba(0,234,255,0.14)');
  g.addColorStop(1,'rgba(0,0,0,0.0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx,cy,r+6,0,Math.PI*2); ctx.fill();

  // values
  const totals = calcTotals();
  const inc = totals.income, exp = totals.expense;
  const sum = Math.max(inc+exp, 1);
  let start = -Math.PI/2;
  // income slice
  const incAngle = (inc/sum)*Math.PI*2;
  ctx.beginPath();
  ctx.moveTo(cx,cy);
  ctx.arc(cx,cy,r,start,start+incAngle);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,200,255,0.85)';
  ctx.fill();
  // expense slice
  start += incAngle;
  const expAngle = (exp/sum)*Math.PI*2;
  ctx.beginPath();
  ctx.moveTo(cx,cy);
  ctx.arc(cx,cy,r,start,start+expAngle);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,80,80,0.85)';
  ctx.fill();

  // centre circle (hole) for radar style
  ctx.beginPath(); ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.arc(cx,cy,r*0.45,0,Math.PI*2); ctx.fill();

  // labels
  ctx.fillStyle = 'rgba(0,234,255,0.95)';
  ctx.font = '14px Inter, Arial';
  ctx.fillText('Renda: ' + formatBRL(inc), 12, h - 50);
  ctx.fillStyle = 'rgba(255,120,120,0.95)';
  ctx.fillText('Despesa: ' + formatBRL(exp), 12, h - 30);

  ctx.restore();
}

/* Activity: line chart of all transactions (expenses and incomes plotted as positive/negative) */
function drawActivity(){
  const ctx = activityCanvas.getContext('2d');
  const w = activityCanvas.width = activityCanvas.clientWidth * 1; // responsive
  const h = activityCanvas.height = 240;
  ctx.clearRect(0,0,w,h);
  // prepare series: group by date (day)
  const grouped = {};
  transactions.forEach(t=>{
    const d = (new Date(t.date)).toISOString().slice(0,10);
    if(!grouped[d]) grouped[d]=0;
    grouped[d] += (t.type==='income')? t.amount : -t.amount;
  });
  const labels = Object.keys(grouped).sort();
  if(labels.length===0){
    // draw small axis and message
    ctx.fillStyle = 'rgba(0,234,255,0.08)';
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = 'rgba(0,234,255,0.4)';
    ctx.font = '14px Inter';
    ctx.fillText('Sem transações - adicione despesas ou entradas', 14, 24);
    return;
  }
  const values = labels.map(l=>grouped[l]);
  const max = Math.max(...values.map(v=>Math.abs(v))) || 1;

  // axes
  ctx.strokeStyle = 'rgba(0,234,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(40,10); ctx.lineTo(40,h-30); ctx.lineTo(w-10,h-30); ctx.stroke();

  // draw line
  ctx.beginPath();
  const plotX = (i)=> 40 + ( (w-60) * (i/(labels.length-1||1)) );
  const plotY = (v)=> (h-30) - ( ( (v + max) / (2*max) ) * (h-60) );
  ctx.lineWidth = 2.5; ctx.strokeStyle='rgba(0,234,255,0.95)'; ctx.fillStyle='rgba(0,234,255,0.06)';
  values.forEach((v,i)=>{
    const x=plotX(i), y=plotY(v);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();

  // fill under line
  ctx.lineTo(w-10,h-30); ctx.lineTo(40,h-30); ctx.closePath();
  ctx.fill();

  // points
  ctx.fillStyle='rgba(0,234,255,1)';
  values.forEach((v,i)=>{
    const x=plotX(i), y=plotY(v);
    ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
  });

  // labels xs
  ctx.fillStyle='rgba(0,234,255,0.6)'; ctx.font='11px Inter';
  labels.forEach((l,i)=>{
    if(i%Math.ceil(labels.length/6)===0){
      ctx.fillText(l.slice(5), plotX(i)-14, h-12);
    }
  });
}

/* redraw all */
function drawAll(){
  drawScanner();
  drawActivity();
  renderTotals();
  renderCategoriesList();
}

/* ---------- events ---------- */
btnNewTransaction.onclick = ()=> openModal('expense', null);
btnAddExpense.onclick = ()=> openModal('expense', null);
btnAddIncome.onclick = ()=> openModal('income', null);
btnManageCategories.onclick = ()=> openCatModal();

modalCancel.onclick = ()=> closeModal();

modalSave.onclick = ()=>{
  const type = modalType.value;
  const category = modalCategory.value;
  const description = modalDescription.value.trim() || (type==='income'?'Entrada':'Despesa');
  const amount = Math.abs(parseFloat(modalAmount.value || '0'));
  const date = modalDate.value || new Date().toISOString().slice(0,10);
  if(!amount || amount<=0){ alert('Informe um valor maior que zero'); return; }

  const obj = { type, category, description, amount, date };
  if(editingIndex>=0){
    updateTransaction(editingIndex, obj);
  } else addTransaction(obj);
  closeModal();
};

addCatBtn.onclick = ()=>{
  const name = newCatName.value.trim();
  if(!name) return;
  // gerar id simples
  const id = name.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
  categories.push({id,name}); saveCategories();
  newCatName.value=''; renderCategorySelect(); renderCatList(); renderCategoriesList();
};

closeCat.onclick = ()=> closeCatModal();

/* quick: click outside modal to close */
window.addEventListener('click', (e)=>{
  if(e.target===modal) closeModal();
  if(e.target===modalCat) closeCatModal();
});

/* on load */
renderCategorySelect(); renderCategoriesList(); renderTotals(); drawAll();

/* tiny animation loop for scanner glow */
setInterval(()=> {
  // gently animate canvas size for small glow (just redraw)
  drawScanner();
}, 1200);

/* expose to console for debugging */
window.__kenay = { transactions, categories, drawAll };

/* make canvas responsive on resize */
window.addEventListener('resize', ()=> {
  drawAll();
});

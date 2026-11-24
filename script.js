/* Isoko Online Rwanda — marketplace frontend */
'use strict';

const CONFIG = Object.freeze({
  supabaseUrl: 'https://brpcjntuztqfkfmgiizk.supabase.co',
  supabaseAnonKey: 'sb_publishable_GKt3hYuWU3O-Ewl40Q-AjA_zvxtHFAJ',
  // Keep sandbox enabled until the app is registered and tested by its owner.
  piSandbox: true,
  currency: 'π'
});

const $ = (id) => document.getElementById(id);
const state = { client: null, products: [], stores: [], category: 'all', search: '', cart: [], user: null, piUser: null, authMode: 'signin', store: null, busy: false };
const money = (n) => `${Number(n || 0).toFixed(6).replace(/0+$/, '').replace(/\.$/, '')} π`;
const clean = (v) => String(v ?? '').trim();
const norm = (v) => clean(v).toLocaleLowerCase();
const el = (tag, cls, value) => { const n = document.createElement(tag); if (cls) n.className = cls; if (value !== undefined) n.textContent = value; return n; };
const setStatus = (id, message, kind = '') => { const node = $(id); node.textContent = message; node.className = `notice ${kind}`; node.hidden = !message; };
const toast = (message) => { const node = $('toast'); node.textContent = message; node.classList.add('show'); window.setTimeout(() => node.classList.remove('show'), 3200); };
const safeImage = (url) => { try { const u = new URL(url); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };

function initSupabase() {
  if (!window.supabase?.createClient) throw new Error('Supabase library did not load. Check your internet connection.');
  if (!state.client) state.client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return state.client;
}

async function loadData() {
  const client = initSupabase();
  setStatus('productsStatus', 'Loading products…'); setStatus('storesStatus', 'Loading stores…');
  const [p, s] = await Promise.all([
    client.from('isoko_products').select('id,store_id,name,description,price_pi,category,image_url,created_at,active').eq('active', true).order('created_at', { ascending: false }).limit(100),
    client.from('isoko_stores').select('id,owner_id,name,description,location,whatsapp,created_at').eq('active', true).order('created_at', { ascending: false }).limit(100)
  ]);
  if (p.error) { console.error(p.error); setStatus('productsStatus', 'Products are not connected yet. Complete the database setup in database/schema.sql.', 'warning'); state.products = []; }
  else { state.products = p.data || []; setStatus('productsStatus', state.products.length ? `${state.products.length} products available` : 'No products have been published yet.'); }
  if (s.error) { console.error(s.error); setStatus('storesStatus', 'Stores are not connected yet. Complete the database setup in database/schema.sql.', 'warning'); state.stores = []; }
  else { state.stores = s.data || []; setStatus('storesStatus', state.stores.length ? `${state.stores.length} local stores` : 'No stores have been registered yet.'); }
  renderCategories(); renderProducts(); renderStores();
}

function matches(record, keys) { return !state.search || keys.some(k => norm(record[k]).includes(state.search)); }
function renderCategories() {
  const root = $('categoryList'); root.replaceChildren();
  const cats = ['all', ...new Set(state.products.map(p => clean(p.category)).filter(Boolean))];
  cats.forEach(c => { const b = el('button', `chip ${state.category === c ? 'active' : ''}`, c === 'all' ? 'All' : c); b.type = 'button'; b.dataset.category = c; b.setAttribute('aria-pressed', String(state.category === c)); root.append(b); });
}
function renderProducts() {
  const root = $('productsGrid'); root.replaceChildren();
  const list = state.products.filter(p => (state.category === 'all' || norm(p.category) === norm(state.category)) && matches(p, ['name','description','category']));
  list.forEach(p => {
    const card = el('article', 'product-card');
    const imageUrl = safeImage(p.image_url);
    if (imageUrl) { const img = el('img', 'product-image'); img.src = imageUrl; img.alt = clean(p.name); img.loading = 'lazy'; img.onerror = () => img.remove(); card.append(img); }
    const body = el('div', 'product-body'); body.append(el('span','product-category', clean(p.category) || 'Local product'), el('h3','',clean(p.name)), el('p','product-description',clean(p.description)), el('strong','product-price',money(p.price_pi)));
    const actions = el('div','product-actions'); const add = el('button','btn btn-small','Add to cart'); add.type='button'; add.addEventListener('click',()=>addToCart(p)); actions.append(add); body.append(actions); card.append(body); root.append(card);
  });
  $('productsEmpty').hidden = list.length !== 0;
}
function renderStores() {
  const root = $('storesGrid'); root.replaceChildren();
  const list = state.stores.filter(s => matches(s,['name','description','location']));
  list.forEach(s => { const card=el('article','store-card'); card.append(el('div','store-icon','🏪')); const body=el('div','store-body'); body.append(el('h3','',clean(s.name)),el('p','',clean(s.description)),el('span','store-location',`📍 ${clean(s.location)}`)); if (s.whatsapp) { const wa=clean(s.whatsapp).replace(/[^0-9]/g,''); const a=el('a','btn btn-outline btn-small','Contact seller'); a.href=`https://wa.me/${wa}`; a.target='_blank'; a.rel='noopener noreferrer'; body.append(a); } card.append(body); root.append(card); });
  $('storesEmpty').hidden = list.length !== 0;
}
function addToCart(product) { const item=state.cart.find(x=>x.id===product.id); if(item)item.quantity++; else state.cart.push({...product,quantity:1}); renderCart(); toast('Added to your cart.'); }
function renderCart() {
  $('cartCount').textContent=String(state.cart.reduce((n,p)=>n+p.quantity,0)); const root=$('cartItems'); root.replaceChildren();
  if(!state.cart.length) root.append(el('p','empty-cart','Your cart is empty. Explore products and add something you like.'));
  state.cart.forEach(p=>{ const row=el('div','cart-row'); const info=el('div',''); info.append(el('strong','',p.name),el('small','',`${money(p.price_pi)} each`)); const controls=el('div','quantity-controls'); const minus=el('button','icon-button','−'); minus.type='button'; minus.setAttribute('aria-label',`Remove one ${p.name}`); minus.onclick=()=>changeQty(p.id,-1); const qty=el('span','',String(p.quantity)); const plus=el('button','icon-button','+'); plus.type='button'; plus.setAttribute('aria-label',`Add one ${p.name}`); plus.onclick=()=>changeQty(p.id,1); controls.append(minus,qty,plus); row.append(info,controls,el('strong','',money(Number(p.price_pi)*p.quantity))); root.append(row); });
  $('cartTotal').textContent=money(cartTotal()); $('piCheckout').disabled=!state.cart.length;
}
function changeQty(id,delta){const item=state.cart.find(p=>p.id===id);if(!item)return;item.quantity+=delta;if(item.quantity<=0)state.cart=state.cart.filter(p=>p.id!==id);renderCart();}
function cartTotal(){return state.cart.reduce((n,p)=>n+Number(p.price_pi)*p.quantity,0);}

async function refreshAccount() {
  const {data:{session}}=await initSupabase().auth.getSession(); state.user=session?.user||null;
  if(state.user){$('accountOpen').textContent='My account';$('accountHint').textContent=`Signed in as ${state.user.email}`;$('accountActions').hidden=false;$('signedInAs').textContent=state.user.email;$('authForm').hidden=true;$('authMode').hidden=true;}
  else {$('accountOpen').textContent='Sign in';$('accountActions').hidden=true;$('authForm').hidden=false;$('authMode').hidden=false;}
}
function showAccount(){ $('accountMessage').textContent=''; $('accountModal').showModal(); }
async function authSubmit(e){e.preventDefault();const email=$('authEmail').value.trim(),password=$('authPassword').value;const client=initSupabase();$('authSubmit').disabled=true;
  try{let result;if(state.authMode==='signup')result=await client.auth.signUp({email,password,options:{data:{full_name:$('authName').value.trim()}}});else result=await client.auth.signInWithPassword({email,password});if(result.error)throw result.error;setStatus('accountMessage',state.authMode==='signup'?'Account created. Check your email if confirmation is enabled.':'You are signed in.','success');await refreshAccount();if(state.user){$('accountModal').close();toast('Signed in successfully.');}}
  catch(err){setStatus('accountMessage',err.message||'Could not complete sign-in.','error');}finally{$('authSubmit').disabled=false;}}
async function signOut(){await initSupabase().auth.signOut();state.user=null;await refreshAccount();toast('Signed out.');}

async function openSeller(){if(!state.user){showAccount();setStatus('accountMessage','Create an account or sign in before registering a store.','warning');return;}const {data,error}=await initSupabase().from('isoko_stores').select('*').eq('owner_id',state.user.id).maybeSingle();if(error){setStatus('sellerMessage',error.message,'error');}else if(data){state.store=data;$('storeName').value=data.name||'';$('storeDescription').value=data.description||'';$('storeLocation').value=data.location||'';$('storeWhatsapp').value=data.whatsapp||'';} $('sellerModal').showModal();}
async function saveStore(e){e.preventDefault();if(!state.user)return;const payload={owner_id:state.user.id,name:$('storeName').value.trim(),description:$('storeDescription').value.trim(),location:$('storeLocation').value.trim(),whatsapp:$('storeWhatsapp').value.trim(),active:true};const q=state.store?initSupabase().from('isoko_stores').update(payload).eq('id',state.store.id):initSupabase().from('isoko_stores').insert(payload);const {data,error}=await q.select().single();if(error){setStatus('sellerMessage',error.message,'error');return;}state.store=data;setStatus('sellerMessage','Store saved successfully. You can now publish products.','success');await loadData();}
async function saveProduct(e){e.preventDefault();if(!state.user||!state.store){setStatus('sellerMessage','Register and save your store first.','warning');return;}const payload={store_id:state.store.id,owner_id:state.user.id,name:$('productName').value.trim(),description:$('productDescription').value.trim(),price_pi:Number($('productPrice').value),category:$('productCategory').value,image_url:safeImage($('productImage').value),active:true};if(!(payload.price_pi>0)){setStatus('sellerMessage','Enter a valid price greater than zero.','error');return;}const {error}=await initSupabase().from('isoko_products').insert(payload);if(error){setStatus('sellerMessage',error.message,'error');return;}$('productForm').reset();setStatus('sellerMessage','Product published.','success');await loadData();}

async function piAuthenticate(){if(!window.Pi)throw new Error('Pi SDK not found. Open this app in Pi Browser.');window.Pi.init({version:'2.0',sandbox:CONFIG.piSandbox});const auth=await window.Pi.authenticate(['username','payments'],onIncompletePaymentFound);const response=await fetch('/api/pi/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:auth.accessToken})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Pi identity verification failed.');state.piUser={uid:result.uid,username:result.username,accessToken:auth.accessToken};return state.piUser;}
async function onIncompletePaymentFound(payment){console.info('Incomplete Pi payment found',payment?.identifier);setStatus('paymentMessage','An unfinished Pi payment was detected. Please contact support before starting another payment.','warning');}
async function startPiCheckout(){const status=$('paymentMessage');try{if(!state.cart.length)throw new Error('Your cart is empty.');if(!window.Pi)throw new Error('Pi payments work inside Pi Browser. Open this site in Pi Browser.');if(!state.piUser)await piAuthenticate();if(!state.user)throw new Error('Please sign in to Isoko before checkout.');
    const {data:{session}}=await initSupabase().auth.getSession();if(!session?.access_token)throw new Error('Your Isoko session expired. Sign in again.');
    const orderResponse=await fetch('/api/orders-create',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify({items:state.cart.map(p=>({productId:p.id,quantity:p.quantity})),piAccessToken:state.piUser.accessToken})});
    const orderResult=await orderResponse.json();if(!orderResponse.ok)throw new Error(orderResult.error||'Could not create order.');const order=orderResult.order;
    setStatus('paymentMessage','Confirm the payment in Pi Wallet. Do not close Pi Browser.','warning');
    window.Pi.createPayment({amount:Number(order.amount_pi),memo:`Isoko order ${order.id}`,metadata:{orderId:order.id,app:'isoko-online-rwanda'}},{
      onReadyForServerApproval:async(paymentId)=>{try{const r=await fetch('/api/pi/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paymentId,orderId:order.id})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Payment approval failed.');}catch(err){console.error(err);setStatus('paymentMessage',err.message,'error');}},
      onReadyForServerCompletion:async(paymentId,txid)=>{try{const r=await fetch('/api/pi/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paymentId,txid,orderId:order.id})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Payment completion failed.');state.cart=[];renderCart();setStatus('paymentMessage','Payment confirmed by Pi. Order reference: '+order.id,'success');await loadData();}catch(err){console.error(err);setStatus('paymentMessage','Payment was submitted but final confirmation is pending. Keep your order reference and contact support. '+err.message,'warning');}},
      onCancel:()=>setStatus('paymentMessage','Payment was cancelled. Your order remains unpaid.','warning'),
      onError:(error)=>{console.error(error);setStatus('paymentMessage',error?.message||'Pi payment failed.','error');}
    });
  }catch(err){console.error(err);setStatus('paymentMessage',err.message||'Could not start Pi payment.','error');}}

function bindUI(){
  $('year').textContent=String(new Date().getFullYear());
  $('searchForm').addEventListener('submit',e=>e.preventDefault());$('searchInput').addEventListener('input',e=>{state.search=norm(e.target.value);renderProducts();renderStores();$('searchMessage').textContent=state.search?'Showing matching products and stores.':'Explore products and stores across Rwanda.';});
  $('categoryList').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;state.category=b.dataset.category;renderCategories();renderProducts();});$('clearFilters').onclick=()=>{$('searchInput').value='';state.search='';state.category='all';renderCategories();renderProducts();renderStores();};
  $('cartOpen').onclick=()=>{$('cartModal').showModal();renderCart();};$('accountOpen').onclick=showAccount;$('sellStart').onclick=openSeller;$('menuToggle').onclick=()=>{const open=$('mainNav').classList.toggle('open');$('menuToggle').setAttribute('aria-expanded',String(open));};
  $('authForm').addEventListener('submit',authSubmit);$('authMode').onclick=()=>{state.authMode=state.authMode==='signin'?'signup':'signin';$('accountTitle').textContent=state.authMode==='signup'?'Create your account':'Welcome back';$('authSubmit').textContent=state.authMode==='signup'?'Create account':'Sign in';$('authMode').textContent=state.authMode==='signup'?'I already have an account':'Create account';$('authNameWrap').hidden=state.authMode!=='signup';$('authPassword').autocomplete=state.authMode==='signup'?'new-password':'current-password';};$('signOut').onclick=signOut;
  $('storeForm').addEventListener('submit',saveStore);$('productForm').addEventListener('submit',saveProduct);$('piCheckout').onclick=startPiCheckout;
  initSupabase().auth.onAuthStateChange(()=>{refreshAccount().catch(console.error);});
}

document.addEventListener('DOMContentLoaded',async()=>{bindUI();renderCart();try{await refreshAccount();await loadData();}catch(err){console.error(err);setStatus('productsStatus','Could not connect. Check Supabase setup and internet connection.','error');setStatus('storesStatus','Could not connect. Check Supabase setup and internet connection.','error');}});
